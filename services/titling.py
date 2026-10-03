"""
Short AI titles for voice notes, via a small, fast LLM on Groq
(openai/gpt-oss-20b).

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
import sys

from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# Groq's smallest current chat model. (The first choice,
# llama-3.1-8b-instant, was shut down by Groq on 2026-08-16 - which is why
# the error logging below exists.) Groq lists retirements at
# https://console.groq.com/docs/deprecations - if titles stop appearing,
# check there first and swap the name here.
# Free tier: 30 requests/min, 1,000/day - far more than voice notes need.
MODEL = "openai/gpt-oss-20b"

# gpt-oss "thinks" before answering, and that thinking counts against the
# token cap. A title needs almost none, so: least thinking, don't send the
# thinking back, and a cap with room for a little thinking + the title.
REASONING_EFFORT = "low"
MAX_COMPLETION_TOKENS = 300

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
    if not text:
        return None
    if not GROQ_API_KEY:
        print("[titling] GROQ_API_KEY is not set - skipping the title", file=sys.stderr)
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
            reasoning_effort=REASONING_EFFORT,
            include_reasoning=False,
            max_completion_tokens=MAX_COMPLETION_TOKENS,
        )
        raw = response.choices[0].message.content
    except Exception as e:
        # Rate limit (429), network, Groq outage, bad key, retired model -
        # all the same to us: no title this time, the note still saves.
        # But say why (it shows up in `fly logs`), or failures are invisible.
        print(f"[titling] title call failed: {type(e).__name__}: {e}", file=sys.stderr)
        return None

    return clean_title(raw)
