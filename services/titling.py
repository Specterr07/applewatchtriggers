"""
Short AI titles for voice notes, via a small, fast LLM on Groq.

A transcript on its own is hard to scan in a list, so every new note gets
a 3-7 word title. Uses the same Groq key and SDK as Whisper
(services/transcription.py), on Groq's free tier.

The one rule here: a title must NEVER stop a note from saving.
generate_title() never raises - on any problem (no key, rate limit,
network, junk output) it returns None, and the UI falls back to showing
the first words of the transcript.
"""

import os
import re

from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# Small 8B model: a 3-7 word title is a tiny task, so a big model would
# just be slower and use up more of the free-tier limits. Swap to
# "llama-3.3-70b-versatile" here if titles ever feel off.
MODEL = "llama-3.1-8b-instant"

# The topic of a voice note is almost always in its first few sentences,
# so we only send the start. Keeps every call small and the cost flat,
# however long the note is.
MAX_INPUT_CHARS = 1500

# Longest title we'll keep. Anything longer means the model rambled.
MAX_TITLE_CHARS = 60

SYSTEM_PROMPT = (
    "You write titles for voice notes. "
    "Reply with ONLY a title of 3 to 7 words that says what the note is about. "
    "Use the same language as the note. "
    "No quotes, no emojis, no ending punctuation, no explanation."
)


def clean_title(raw):
    """
    Tidies whatever the model replied into a usable title, or returns
    None if there's nothing usable. Small models sometimes add things
    like 'Title: "..."' or a trailing full stop - this strips those.
    Pure function (no network), so it's easy to unit-test.
    """
    if not raw:
        return None

    # Only the first non-empty line - anything after is the model explaining itself.
    lines = [line.strip() for line in raw.strip().splitlines() if line.strip()]
    if not lines:
        return None
    title = lines[0]

    # Drop a leading "Title:" label, markdown bold/heading marks, and wrapping quotes.
    title = re.sub(r"^\s*(title)\s*[:\-]\s*", "", title, flags=re.IGNORECASE)
    title = title.strip("*#`_ ")
    title = title.strip("\"'“”‘’ ")
    # Trailing punctuation like "." or "!" doesn't belong in a title.
    title = title.rstrip(".!?,;: ")
    # Collapse any repeated spaces.
    title = re.sub(r"\s+", " ", title).strip()

    if not title:
        return None

    if len(title) > MAX_TITLE_CHARS:
        # Cut at the last whole word that fits, rather than mid-word.
        cut = title[:MAX_TITLE_CHARS].rsplit(" ", 1)[0].strip()
        title = (cut or title[:MAX_TITLE_CHARS]).rstrip(".,;:- ") + "…"

    return title


def generate_title(transcript):
    """
    Returns a short title for a transcript, or None if one couldn't be
    made. Never raises.
    """
    text = (transcript or "").strip()
    if not text or not GROQ_API_KEY:
        return None

    try:
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text[:MAX_INPUT_CHARS]},
            ],
            # 0 = always the most likely answer: consistent, no creative wandering.
            temperature=0,
            # A 7-word title is ~10 tokens; this cap stops a rambling reply early.
            max_tokens=20,
        )
        raw = response.choices[0].message.content
    except Exception:
        # Rate limit (429), network, Groq outage, bad key - all the same
        # to us: no title this time, the note still saves.
        return None

    return clean_title(raw)
