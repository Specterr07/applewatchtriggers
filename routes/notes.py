"""
Voice notes routes - POST/GET /api/notes, PATCH/DELETE /api/notes/<id>.

POST does a lot in one request - upload, transcribe (Groq), compress
(ffmpeg), and store (Tigris) - in that specific order, so a failure
partway through never leaves a half-saved note pointing at audio that
was never actually uploaded, or audio in storage with no note record.
"""

from flask import Blueprint, jsonify, request

from services import notes_db, object_storage
from services.auth import require_key
from services.note_pipeline import save_voice_note

notes_bp = Blueprint("notes", __name__)


def _note_to_dict(row, audio_url):
    return {
        "id": row["id"],
        "title": row["title"],
        "transcript": row["transcript"],
        "audio_url": audio_url,
        "created_at": row["created_at"],
    }

@notes_bp.route("/api/notes", methods=["POST"])
@require_key
def create_note():
    """
    Uploads a voice recording: transcribes it, compresses it, stores
    the compressed audio in Tigris, and saves the note.
    """
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

    return jsonify({
        "ok": True,
        "note": note_data,
    }), 201


@notes_bp.route("/api/notes", methods=["GET"])
@require_key
def list_notes():
    """Returns every voice note, newest first, each with a fresh playback link."""
    try:
        notes_db.ensure_notes_db()
        rows = notes_db.fetch_all_notes()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    notes = []
    for row in rows:
        try:
            audio_url = object_storage.presigned_audio_url(row["audio_key"])
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
    Renames a note: body {"title": "..."}. An empty title clears it, so the
    UI goes back to showing the first words of the transcript.
    """
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or "title" not in body:
        return jsonify({"ok": False, "message": "Send JSON like {\"title\": \"...\"}"}), 400

    title = body["title"]
    if title is not None and not isinstance(title, str):
        return jsonify({"ok": False, "message": "title must be text"}), 400

    title = (title or "").strip() or None
    if title is not None and len(title) > MAX_TITLE_LENGTH:
        return jsonify({"ok": False, "message": f"Title must be {MAX_TITLE_LENGTH} characters or fewer"}), 400

    try:
        notes_db.ensure_notes_db()
        if not notes_db.update_note_title(note_id, title):
            return jsonify({"ok": False, "message": "No note with that id"}), 404
        row = notes_db.fetch_note(note_id)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    try:
        audio_url = object_storage.presigned_audio_url(row["audio_key"])
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
