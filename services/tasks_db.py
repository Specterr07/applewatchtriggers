"""
Tasks storage (SQLite)
----------------------
Every logged task - started from the Watch or the webpage - lives in one
row here: id, name (nullable), start, end (nullable while in progress),
duration_minutes (nullable while in progress). This replaced the old
tasks.csv, which stored a Start row and an End row separately and needed
pairing up on every read. Test data in the old tasks.csv was intentionally
NOT migrated - tasks.db starts empty.

Every function here opens its own connection and closes it before
returning, the same "open the file, do the work, close it" pattern the
planner CSV code uses - so there's never a connection left open between
requests.
"""

import os
import sqlite3
from datetime import datetime

from services.config import DATA_DIR

TASKS_DB_FILE = os.path.join(DATA_DIR, "tasks.db")


def get_db_connection():
    """
    Opens a fresh connection to tasks.db. row_factory makes rows behave
    like dicts (row["name"]) instead of plain tuples, which is much
    easier to read than indexing by position.
    """
    conn = sqlite3.connect(TASKS_DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tasks_db():
    """
    Creates the tasks table if it doesn't exist yet. Runs before every
    request that touches the database, mirroring how the old CSV code
    checked for the file first - so a fresh deploy with an empty volume
    never crashes just because tasks.db hasn't been created yet.

    id uses AUTOINCREMENT (not just INTEGER PRIMARY KEY) so a deleted
    task's id is never reused - the whole reason tasks moved to SQLite
    is so each task has a stable id a bento card / detail-page URL can
    point to. Reusing an id after a delete would make an old link
    silently show a different, unrelated task.
    """
    try:
        conn = get_db_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                start TEXT NOT NULL,
                end TEXT,
                duration_minutes REAL
            )
        """)
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        # Disk full, permissions, a corrupted db file - whatever it is,
        # surface it instead of letting every route crash mysteriously.
        raise RuntimeError(f"Could not set up tasks database: {e}")


def generic_title(start_dt):
    """
    Builds the fallback title for a task that was never named (this is
    what every Watch-logged task gets, since the Watch never sends a
    name). Format: "Task – <weekday>, <time>", e.g. "Task – Fri, 9:00 AM".
    """
    weekday = start_dt.strftime("%a")
    hour_12 = start_dt.strftime("%I").lstrip("0") or "12"  # strip leading zero: "09" -> "9"
    minute = start_dt.strftime("%M")
    am_pm = start_dt.strftime("%p")
    return f"Task – {weekday}, {hour_12}:{minute} {am_pm}"


def task_row_to_dict(row):
    """
    Converts a tasks-table row into the JSON shape the webpage/bento
    cards use: id, name (falls back to the generic title if none was
    set), date, start, end, duration_minutes.
    """
    start_dt = datetime.strptime(row["start"], "%Y-%m-%d %H:%M:%S")
    return {
        "id": row["id"],
        "name": row["name"] or generic_title(start_dt),
        "date": row["start"][:10],
        "start": row["start"],
        "end": row["end"],
        "duration_minutes": row["duration_minutes"],
    }


def get_open_task():
    """
    Returns the task currently in progress (end IS NULL), or None if
    every task has been closed out. There's only ever zero or one -
    start_task() can't create a second one while an open task exists,
    because toggle() always checks this first.
    """
    try:
        conn = get_db_connection()
        row = conn.execute(
            "SELECT * FROM tasks WHERE end IS NULL ORDER BY id DESC LIMIT 1"
        ).fetchone()
        conn.close()
        return row
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not read tasks database: {e}")


def start_task(name, start_str):
    """Inserts a new in-progress task (end/duration left NULL) and returns its id."""
    try:
        conn = get_db_connection()
        cursor = conn.execute(
            "INSERT INTO tasks (name, start, end, duration_minutes) VALUES (?, ?, NULL, NULL)",
            (name, start_str),
        )
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return new_id
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not start task: {e}")


def end_task(task_id, end_str, duration_minutes, name=None):
    """
    Closes an in-progress task by filling in its end time and duration.
    If `name` is given (the webpage's End button can optionally name the
    task as it finishes), it's saved too - the Watch never passes one.
    """
    try:
        conn = get_db_connection()
        if name is not None:
            conn.execute(
                "UPDATE tasks SET end = ?, duration_minutes = ?, name = ? WHERE id = ?",
                (end_str, duration_minutes, name, task_id),
            )
        else:
            conn.execute(
                "UPDATE tasks SET end = ?, duration_minutes = ? WHERE id = ?",
                (end_str, duration_minutes, task_id),
            )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not end task: {e}")


def fetch_all_tasks():
    """Returns every task, newest first - what the bento-card grid loads."""
    try:
        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM tasks ORDER BY id DESC").fetchall()
        conn.close()
        return rows
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not read tasks database: {e}")


def fetch_task(task_id):
    """Returns one task row, or None if no task has that id."""
    try:
        conn = get_db_connection()
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        conn.close()
        return row
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not read task: {e}")


def save_task(task_id, name, start, end, duration_minutes):
    """Overwrites a task's editable fields. Used by PATCH /api/logs/<id>."""
    try:
        conn = get_db_connection()
        conn.execute(
            "UPDATE tasks SET name = ?, start = ?, end = ?, duration_minutes = ? WHERE id = ?",
            (name, start, end, duration_minutes, task_id),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not save task: {e}")


def remove_task(task_id):
    """Deletes one task by id. Returns True if a row was actually deleted."""
    try:
        conn = get_db_connection()
        cursor = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        return deleted
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not delete task: {e}")
