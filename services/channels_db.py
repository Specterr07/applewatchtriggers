"""
Channels storage (SQLite)
-------------------------
Manages messaging channel links (e.g. Telegram chat_id to user_id mapping),
one-time link codes for pairing, and seen webhook update IDs for idempotency.

Tables:
- links: user_id, channel, channel_user_id, linked_at
- link_codes: code, user_id, created_at, used_at
- seen_updates: update_id, seen_at

Every function opens its own connection and closes it before returning.
"""

import os
import sqlite3

from services.config import DATA_DIR
from services.time import local_now

CHANNELS_DB_FILE = os.path.join(DATA_DIR, "channels.db")


def get_db_connection():
    """Opens a fresh connection to channels.db."""
    conn = sqlite3.connect(CHANNELS_DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_channels_db():
    """
    Creates channels tables if they don't exist yet.
    Runs defensively before channel operations.
    """
    try:
        conn = get_db_connection()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS links (
                user_id INTEGER NOT NULL,
                channel TEXT NOT NULL,
                channel_user_id TEXT NOT NULL,
                linked_at TEXT NOT NULL,
                PRIMARY KEY (user_id, channel)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS link_codes (
                code TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                used_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS seen_updates (
                update_id INTEGER PRIMARY KEY,
                seen_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not set up channels database: {e}")


def save_link_code(code: str, user_id: int, created_at: str):
    """Saves a newly generated one-time link code."""
    try:
        conn = get_db_connection()
        conn.execute(
            "INSERT INTO link_codes (code, user_id, created_at, used_at) VALUES (?, ?, ?, NULL)",
            (code, user_id, created_at),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not save link code: {e}")


def get_link_code(code: str):
    """Fetches a link code record by code."""
    try:
        conn = get_db_connection()
        row = conn.execute("SELECT * FROM link_codes WHERE code = ?", (code,)).fetchone()
        conn.close()
        return row
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not fetch link code: {e}")


def mark_link_code_used(code: str, used_at: str):
    """Marks a link code as used."""
    try:
        conn = get_db_connection()
        conn.execute("UPDATE link_codes SET used_at = ? WHERE code = ?", (used_at, code))
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not mark link code used: {e}")


def set_user_channel_link(user_id: int, channel: str, channel_user_id: str, linked_at: str):
    """
    Saves or replaces a channel link for a user.
    Linking again replaces the previous link for that channel.
    """
    try:
        conn = get_db_connection()
        conn.execute(
            """
            INSERT INTO links (user_id, channel, channel_user_id, linked_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, channel) DO UPDATE SET
                channel_user_id = excluded.channel_user_id,
                linked_at = excluded.linked_at
            """,
            (user_id, channel, str(channel_user_id), linked_at),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not set user channel link: {e}")


def get_channel_link_by_channel_user(channel: str, channel_user_id: str):
    """Finds user link for a given channel and external channel_user_id (e.g. chat_id)."""
    try:
        conn = get_db_connection()
        row = conn.execute(
            "SELECT * FROM links WHERE channel = ? AND channel_user_id = ?",
            (channel, str(channel_user_id)),
        ).fetchone()
        conn.close()
        return row
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not query channel link: {e}")


def get_user_channel_link(user_id: int, channel: str):
    """Fetches channel link for a specific user and channel."""
    try:
        conn = get_db_connection()
        row = conn.execute(
            "SELECT * FROM links WHERE user_id = ? AND channel = ?",
            (user_id, channel),
        ).fetchone()
        conn.close()
        return row
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not query user channel link: {e}")


def record_seen_update(update_id: int, seen_at: str) -> bool:
    """
    Attempts to record an update_id in seen_updates.
    Returns True if newly recorded, False if already seen (duplicate).
    """
    try:
        conn = get_db_connection()
        cursor = conn.execute(
            "INSERT OR IGNORE INTO seen_updates (update_id, seen_at) VALUES (?, ?)",
            (update_id, seen_at),
        )
        conn.commit()
        inserted = cursor.rowcount > 0
        conn.close()
        return inserted
    except sqlite3.Error as e:
        raise RuntimeError(f"Could not record seen update: {e}")
