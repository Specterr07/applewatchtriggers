"""
Planner storage (CSV)
---------------------
Moved out of app.py so the file that wires up Flask routes doesn't also
have to contain file I/O. Unchanged behavior/format - planner.csv doesn't
need stable ids the way tasks did, so it stays on CSV (see
PROJECT_STRUCTURE.md for why tasks.csv moved to SQLite and this didn't).
"""

import csv
import fcntl  # used to prevent two requests from writing at the exact same time
import os

from services.config import DATA_DIR

PLANNER_FILE = os.path.join(DATA_DIR, "planner.csv")
PLANNER_HEADERS = ["id", "date", "start_time", "end_time", "title", "completed"]


def ensure_planner_csv():
    """Create planner.csv with headers if it doesn't exist yet."""
    if not os.path.exists(PLANNER_FILE):
        with open(PLANNER_FILE, mode="w", newline="") as f:
            csv.writer(f).writerow(PLANNER_HEADERS)


def read_planner_rows():
    """Reads all planner rows as a list of dicts. Empty list if none."""
    ensure_planner_csv()
    try:
        with open(PLANNER_FILE, mode="r", newline="") as f:
            return list(csv.DictReader(f))
    except Exception as e:
        raise RuntimeError(f"Could not read planner file: {e}")


def write_planner_rows(rows):
    """
    Overwrites planner.csv with the given rows. Unlike tasks (now in
    SQLite, which handles this itself), the planner needs edits/deletes,
    so we rewrite the whole file each time - locked, so concurrent
    requests don't corrupt it.
    """
    try:
        with open(PLANNER_FILE, mode="w", newline="") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            writer = csv.DictWriter(f, fieldnames=PLANNER_HEADERS)
            writer.writeheader()
            writer.writerows(rows)
            fcntl.flock(f, fcntl.LOCK_UN)
    except Exception as e:
        raise RuntimeError(f"Could not write planner file: {e}")
