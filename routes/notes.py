"""
Voice notes routes - POST/GET /api/notes, PATCH/DELETE /api/notes/<id>.

POST does a lot in one request - upload, transcribe (Groq), compress
(ffmpeg), and store (Tigris) - in that specific order, so a failure
partway through never leaves a half-saved note pointing at audio that
was never actually uploaded, or audio in storage with no note record.
"""

from flask import Blueprint, jsonify, request

from services import notes_db, object_storage, titling
from services.auth import require_key
from services.note_pipeline import save_voice_note
from services.time import local_now

notes_bp = Blueprint("notes", __name__)


def _note_to_dict(row, audio_url):
    has_audio = bool(row["audio_key"] and row["audio_key"].strip())
    return {
        "id": row["id"],
        "title": row["title"],
        "transcript": row["transcript"],
        "audio_url": audio_url if has_audio else None,
        "has_audio": has_audio,
        "created_at": row["created_at"],
    }


@notes_bp.route("/api/notes", methods=["POST"])
@require_key
def create_note():
    """
    Creates a note:
    - If JSON body with {"text": "..."}: saves a text note with AI title.
    - If multipart audio file: transcribes it, compresses it, stores
      the compressed audio in Tigris, and saves the note.
    """
    if request.is_json:
        data = request.get_json(silent=True) or {}
        text = data.get("text")
        if not text or not isinstance(text, str) or not text.strip():
            return jsonify({"ok": False, "message": "Note text cannot be empty"}), 400

        text = text.strip()
        created_at = local_now().strftime("%Y-%m-%d %H:%M:%S")
        title = titling.generate_title(text)

        notes_db.ensure_notes_db()
        new_id = notes_db.insert_note(text, audio_key="", created_at=created_at, title=title)

        return jsonify({
            "ok": True,
            "note": {
                "id": new_id,
                "title": title,
                "transcript": text,
                "audio_url": None,
                "has_audio": False,
                "created_at": created_at,
            },
        }), 201

    audio_file = request.files.get("audio")
    if audio_file is None or audio_file.filename == "":
        return jsonify({"ok": False, "message": "No audio file uploaded"}), 400

    original_bytes = audio_file.read()
    if not original_bytes:
        return jsonify({"ok": False, "message": "Uploaded audio was empty"}), 400

    try:
        note_data = save_voice_note(original_bytes, audio_file.filename or "recording.webm")
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    note_data["has_audio"] = True
    return jsonify({
        "ok": True,
        "note": note_data,
    }), 201


@notes_bp.route("/api/notes", methods=["GET"])
@require_key
def list_notes():
    """Returns every note, newest first, each with a fresh playback link if audio exists."""
    try:
        notes_db.ensure_notes_db()
        rows = notes_db.fetch_all_notes()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    notes = []
    for row in rows:
        audio_key = row["audio_key"]
        has_audio = bool(audio_key and audio_key.strip())
        audio_url = None
        if has_audio:
            try:
                audio_url = object_storage.presigned_audio_url(audio_key)
            except RuntimeError:
                audio_url = None
        notes.append(_note_to_dict(row, audio_url))

    return jsonify({"ok": True, "notes": notes}), 200


# Longest title a person can type in by hand.
MAX_TITLE_LENGTH = 120


@notes_bp.route("/api/notes/<int:note_id>", methods=["PATCH"])
@require_key
def update_note(note_id):
    """
    Updates a note:
    - body {"title": "..."} renames the note.
    - body {"text": "..."} or {"transcript": "..."} updates the note content.
    """
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"ok": False, "message": "Send JSON like {\"title\": \"...\"} or {\"text\": \"...\"}"}), 400

    has_title = "title" in body
    has_text = "text" in body or "transcript" in body

    if not has_title and not has_text:
        return jsonify({"ok": False, "message": "Specify 'title' or 'text' to update"}), 400

    notes_db.ensure_notes_db()
    existing_row = notes_db.fetch_note(note_id)
    if not existing_row:
        return jsonify({"ok": False, "message": "No note with that id"}), 404

    try:
        if has_title:
            title = body["title"]
            if title is not None and not isinstance(title, str):
                return jsonify({"ok": False, "message": "title must be text"}), 400
            title = (title or "").strip() or None
            if title is not None and len(title) > MAX_TITLE_LENGTH:
                return jsonify({"ok": False, "message": f"Title must be {MAX_TITLE_LENGTH} characters or fewer"}), 400
            notes_db.update_note_title(note_id, title)

        if has_text:
            text = body.get("text") if "text" in body else body.get("transcript")
            if not isinstance(text, str) or not text.strip():
                return jsonify({"ok": False, "message": "Note text cannot be empty"}), 400
            notes_db.update_note_content(note_id, text.strip())

        row = notes_db.fetch_note(note_id)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    audio_key = row["audio_key"]
    has_audio = bool(audio_key and audio_key.strip())
    audio_url = None
    if has_audio:
        try:
            audio_url = object_storage.presigned_audio_url(audio_key)
        except RuntimeError:
            audio_url = None

    return jsonify({"ok": True, "note": _note_to_dict(row, audio_url)}), 200


@notes_bp.route("/api/notes/<int:note_id>", methods=["DELETE"])
@require_key
def delete_note(note_id):
    """
    Deletes a note's audio from Tigris, then its row in notes.db - in
    that order, so a failed delete never leaves an orphaned audio file
    in storage with no database record pointing at it (worst case on
    failure is a leftover DB row, which is harmless and retryable).
    """
    try:
        notes_db.ensure_notes_db()
        row = notes_db.fetch_note(note_id)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    if row is None:
        return jsonify({"ok": False, "message": "No note with that id"}), 404

    try:
        object_storage.delete_audio(row["audio_key"])
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    try:
        notes_db.remove_note(note_id)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    return jsonify({"ok": True}), 200
