"""
Tests for text note creation and Telegram text message capture.
"""

from unittest.mock import patch

from conftest import TEST_API_KEY
from services import channels_db, notes_db

HEADERS = {"X-API-Key": TEST_API_KEY}


def test_create_text_note_success(client, monkeypatch):
    monkeypatch.setattr("services.titling.generate_title", lambda text: "Mock Title")
    
    response = client.post(
        "/api/notes",
        headers=HEADERS,
        json={"text": "Meeting notes with client discussing project roadmap"},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["ok"] is True
    note = data["note"]
    assert note["title"] == "Mock Title"
    assert note["transcript"] == "Meeting notes with client discussing project roadmap"
    assert note["audio_url"] is None
    assert note["has_audio"] is False
    assert note["id"] is not None

    # Check listing notes reflects has_audio: False
    list_res = client.get("/api/notes", headers=HEADERS)
    assert list_res.status_code == 200
    list_data = list_res.get_json()
    saved = next(n for n in list_data["notes"] if n["id"] == note["id"])
    assert saved["has_audio"] is False
    assert saved["audio_url"] is None
    assert saved["title"] == "Mock Title"


def test_create_text_note_empty_rejected(client):
    response = client.post(
        "/api/notes",
        headers=HEADERS,
        json={"text": "   "},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert data["ok"] is False
    assert "cannot be empty" in data["message"]


def test_create_text_note_without_key_fails(client):
    response = client.post(
        "/api/notes",
        json={"text": "Hello world"},
    )
    assert response.status_code == 401


def test_telegram_webhook_text_message(client, monkeypatch):
    channels_db.ensure_channels_db()
    # Link a user to chat_id 12345
    channels_db.set_user_channel_link(1, "telegram", "12345", "2026-10-12 12:00:00")
    
    monkeypatch.setattr("services.titling.generate_title", lambda text: "Telegram Idea")
    sent_messages = []
    monkeypatch.setattr("services.telegram.send_message", lambda chat_id, msg: sent_messages.append((chat_id, msg)))

    payload = {
        "update_id": 999123,
        "message": {
            "chat": {"id": 12345},
            "text": "Remember to buy milk on the way home",
        },
    }

    res = client.post("/telegram/webhook", json=payload)
    assert res.status_code == 200

    # Verify message sent to telegram chat
    assert len(sent_messages) == 1
    chat_id, msg = sent_messages[0]
    assert chat_id == 12345
    assert "Saved ✅ Telegram Idea" in msg
    assert "Remember to buy milk on the way home" in msg

    # Verify note in database
    notes = notes_db.fetch_all_notes()
    saved_note = next(n for n in notes if n["transcript"] == "Remember to buy milk on the way home")
    assert saved_note["title"] == "Telegram Idea"
    assert saved_note["audio_key"] == ""
