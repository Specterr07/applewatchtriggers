import os

from services import notes_db, object_storage
from services.audio_compression import compress_audio
from services.time import local_now
from services.transcription import transcribe_audio


def save_voice_note(original_bytes: bytes, filename: str) -> dict:
    """
    Transcribes audio, compresses it, stores it in Tigris, and saves the note.
    Raises RuntimeError if any step fails.
    Returns a dictionary containing the new note's details.
    """
    # Transcribe from the original (best quality for accuracy) before
    # compressing - but the original bytes are never stored, only used
    # here in memory and then discarded.
    transcript = transcribe_audio(original_bytes, filename)

    input_suffix = os.path.splitext(filename)[1] or ".webm"
    compressed_bytes = compress_audio(original_bytes, input_suffix)

    audio_key = object_storage.new_audio_key()
    object_storage.upload_audio(audio_key, compressed_bytes)

    created_at = local_now().strftime("%Y-%m-%d %H:%M:%S")
    notes_db.ensure_notes_db()
    new_id = notes_db.insert_note(transcript, audio_key, created_at)

    try:
        audio_url = object_storage.presigned_audio_url(audio_key)
    except RuntimeError:
        # The note itself saved fine - just couldn't mint a playback
        # link right this second. The next GET /api/notes will retry.
        audio_url = None

    return {
        "id": new_id,
        "transcript": transcript,
        "audio_url": audio_url,
        "created_at": created_at,
    }
