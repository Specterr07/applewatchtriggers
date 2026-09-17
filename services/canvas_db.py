"""
Canvas storage (SQLite)
-----------------------
Server-side persistence for the tldraw canvas, so the same drawing shows
up on every device instead of being stuck in one browser's local
storage. There's only ever one canvas, so this is a single row (id=1)
holding its full serialized snapshot as JSON, overwritten on every save.

Every function here opens its own connection and closes it before
returning, the same pattern services/tasks_db.py uses.
"""

import json
import os
import sqlite3

from services.config import DATA_DIR
from services.time import local_now

CANVAS_DB_FILE = os.path.join(DATA_DIR, "canvas.db")


def get_db_connection():
    """Opens a fresh connection to canvas.db."""
    conn = sqlite3.connect(CANVAS_DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_canvas_db():
    """
    Creates the canvas table if it doesn't exist yet. Runs before every
    request that touches the database, mirroring services/tasks_db.py -
    so a fresh deploy with an empty volume never crashes just because
    canvas.db hasn't been created yet.

    The CHECK(id = 1) constraint enforces "only ever one row" at the
    database level, not just by convention in the Python code above it.
    """
    try:
        conn = get_db_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS canvas (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                snapshot TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not set up canvas database: {e}")


def get_canvas_snapshot():
    """
    Returns {"snapshot": <parsed JSON>, "updated_at": <str>}, or None if
    nothing has ever been saved yet (a brand-new canvas, before its
    first debounced save has landed).
    """
    try:
        conn = get_db_connection()
        row = conn.execute("SELECT snapshot, updated_at FROM canvas WHERE id = 1").fetchone()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not read canvas database: {e}")

    if row is None:
        return None

    try:
        snapshot = json.loads(row["snapshot"])
    except (json.JSONDecodeError, TypeError) as e:
        # Stored data doesn't parse as JSON - a corrupted row shouldn't
        # crash the request; let the caller (the route) decide how to
        # respond instead of an unhandled exception turning into a 500
        # with no useful message.
        raise RuntimeError(f"Stored canvas snapshot is corrupted: {e}")

    return {"snapshot": snapshot, "updated_at": row["updated_at"]}


def save_canvas_snapshot(snapshot):
    """
    Overwrites the single canvas row with a new snapshot - a JSON-
    serializable object, exactly what tldraw's getSnapshot() produces.
    Returns the timestamp it was saved at.
    """
    try:
        snapshot_json = json.dumps(snapshot)
    except TypeError as e:
        # Only happens if the frontend ever sent something that isn't
        # actually JSON-serializable (shouldn't happen - Flask already
        # parsed the request body as JSON to get here).
        raise RuntimeError(f"Canvas snapshot could not be serialized: {e}")

    now_str = local_now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        conn = get_db_connection()
        conn.execute(
            """
            INSERT INTO canvas (id, snapshot, updated_at) VALUES (1, ?, ?)
            ON CONFLICT (id) DO UPDATE SET snapshot = excluded.snapshot, updated_at = excluded.updated_at
            """,
            (snapshot_json, now_str),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not save canvas: {e}")

    return now_str
