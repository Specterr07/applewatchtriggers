"""
Speech-to-text via the Groq API.
"""

import os

from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# The fast/cheap Whisper variant Groq offers - plenty accurate for short
# spoken voice notes, and quick enough to not add much to the request.
MODEL = "whisper-large-v3-turbo"


def transcribe_audio(audio_bytes, filename):
    """
    Sends audio bytes to Groq's Whisper endpoint and returns the
    transcript text. Raises RuntimeError - never Groq's own exception
    types - so the route can turn any failure into a clean JSON error
    response instead of a raw stack trace.
    """
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set on the server")

    try:
        client = Groq(api_key=GROQ_API_KEY)
        transcription = client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model=MODEL,
        )
    except Exception as e:
        # Network issue, invalid key, Groq outage, an audio format it
        # can't decode - all of these should surface the same way to
        # the caller: a clear message, not a stack trace.
        raise RuntimeError(f"Transcription failed: {e}")

    return transcription.text.strip()
