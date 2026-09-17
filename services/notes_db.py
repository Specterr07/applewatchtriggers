"""
Notes storage (SQLite)
-----------------------
Each voice note's metadata - its transcript, where its compressed audio
lives in Tigris (audio_key), and when it was recorded - lives in one
row here. The audio bytes themselves are never stored in this database,
only in Tigris (services/object_storage.py); this table just points at
them.

Every function here opens its own connection and closes it before
returning, the same pattern services/tasks_db.py and
services/canvas_db.py use.
"""

import os
import sqlite3

from services.config import DATA_DIR

NOTES_DB_FILE = os.path.join(DATA_DIR, "notes.db")


def get_db_connection():
    """Opens a fresh connection to notes.db."""
    conn = sqlite3.connect(NOTES_DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_notes_db():
    """
    Creates the notes table if it doesn't exist yet. Runs before every
    request that touches the database, mirroring services/tasks_db.py -
    so a fresh deploy with an empty volume never crashes just because
    notes.db hasn't been created yet.
    """
    try:
        conn = get_db_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transcript TEXT NOT NULL,
                audio_key TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not set up notes database: {e}")


def insert_note(transcript, audio_key, created_at):
    """Saves a new note and returns its id."""
    try:
        conn = get_db_connection()
        cursor = conn.execute(
            "INSERT INTO notes (transcript, audio_key, created_at) VALUES (?, ?, ?)",
            (transcript, audio_key, created_at),
        )
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return new_id
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not save note: {e}")


def fetch_all_notes():
    """Returns every note, newest first."""
    try:
        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM notes ORDER BY id DESC").fetchall()
        conn.close()
        return rows
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not read notes database: {e}")


def fetch_note(note_id):
    """Returns one note row, or None if no note has that id."""
    try:
        conn = get_db_connection()
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        conn.close()
        return row
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not read note: {e}")


def remove_note(note_id):
    """Deletes one note's row by id. Returns True if a row was actually deleted."""
    try:
        conn = get_db_connection()
        cursor = conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        return deleted
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not delete note: {e}")
