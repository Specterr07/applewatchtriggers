"""
Voice notes routes - POST/GET /api/notes, DELETE /api/notes/<id>.

POST does a lot in one request - upload, transcribe (Groq), compress
(ffmpeg), and store (Tigris) - in that specific order, so a failure
partway through never leaves a half-saved note pointing at audio that
was never actually uploaded, or audio in storage with no note record.
"""

import os

from flask import Blueprint, jsonify, request

from services import notes_db, object_storage
from services.audio_compression import compress_audio
from services.auth import require_key
from services.time import local_now
from services.transcription import transcribe_audio

notes_bp = Blueprint("notes", __name__)


def _note_to_dict(row, audio_url):
    return {
        "id": row["id"],
        "transcript": row["transcript"],
        "audio_url": audio_url,
        "created_at": row["created_at"],
    }


@notes_bp.route("/api/notes", methods=["POST"])
@require_key
def create_note():
    """
    Uploads a voice recording: transcribes it, compresses it, stores
    the compressed audio in Tigris, and saves the note. The original
    high-quality upload is read into memory and used for transcription,
    but never written anywhere permanent - only the compressed version
    this route produces afterward reaches storage.
    """
    audio_file = request.files.get("audio")
    if audio_file is None or audio_file.filename == "":
        return jsonify({"ok": False, "message": "No audio file uploaded"}), 400

    original_bytes = audio_file.read()
    if not original_bytes:
        return jsonify({"ok": False, "message": "Uploaded audio was empty"}), 400

    # Transcribe from the original (best quality for accuracy) before
    # compressing - but the original bytes are never stored, only used
    # here in memory and then discarded when this request ends.
    try:
        transcript = transcribe_audio(original_bytes, audio_file.filename or "recording.webm")
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    input_suffix = os.path.splitext(audio_file.filename or "")[1] or ".webm"
    try:
        compressed_bytes = compress_audio(original_bytes, input_suffix)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    audio_key = object_storage.new_audio_key()
    try:
        object_storage.upload_audio(audio_key, compressed_bytes)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    created_at = local_now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        notes_db.ensure_notes_db()
        new_id = notes_db.insert_note(transcript, audio_key, created_at)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    try:
        audio_url = object_storage.presigned_audio_url(audio_key)
    except RuntimeError:
        # The note itself saved fine - just couldn't mint a playback
        # link right this second. The next GET /api/notes will retry.
        audio_url = None

    return jsonify({
        "ok": True,
        "note": {"id": new_id, "transcript": transcript, "audio_url": audio_url, "created_at": created_at},
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
