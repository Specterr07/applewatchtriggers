"""
One-time: give an AI title to every voice note that doesn't have one yet
(notes recorded before titles existed).

Run it once on Fly:
    fly ssh console -C "python scripts/backfill_note_titles.py"
Or locally (uses ./notes.db unless DATA_DIR is set):
    .venv/bin/python scripts/backfill_note_titles.py

Safe to re-run: it only touches notes whose title is still empty, so if
it stops partway (e.g. a Groq rate limit), just run it again.
"""

import os
import sys
import time

# Lets `python scripts/backfill_note_titles.py` import services/ from the repo root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services import notes_db  # noqa: E402
from services.titling import generate_title  # noqa: E402

# Groq's free tier allows ~30 requests a minute. One every 2 seconds keeps
# us well under that, even if Whisper is being used at the same time.
SECONDS_BETWEEN_CALLS = 2


def main():
    notes_db.ensure_notes_db()
    notes = notes_db.fetch_untitled_notes()
    print(f"{len(notes)} note(s) without a title")

    titled = 0
    for i, note in enumerate(notes):
        if i > 0:
            time.sleep(SECONDS_BETWEEN_CALLS)
        title = generate_title(note["transcript"])
        if title is None:
            # services/titling.py prints the real reason on the line above.
            reason = "empty transcript" if not (note["transcript"] or "").strip() else "title call failed - see the [titling] line above"
            print(f"  #{note['id']}: skipped ({reason})")
            continue
        notes_db.update_note_title(note["id"], title)
        titled += 1
        print(f"  #{note['id']}: {title}")

    print(f"Done - titled {titled} of {len(notes)}")


if __name__ == "__main__":
    main()
