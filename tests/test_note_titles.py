"""
AI note titles: cleaning the model's reply, never letting a failed title
block a save, upgrading an old notes.db, and renaming a note by hand.
No real Groq calls - the network bits are replaced with fakes.
"""

import sqlite3

from conftest import TEST_API_KEY
from services import note_pipeline, notes_db, titling
from services.titling import clean_title

HEADERS = {"X-API-Key": TEST_API_KEY}


# --- clean_title: tidying the model's reply ---------------------------------

def test_clean_title_keeps_a_good_title():
    assert clean_title("Call the vet about Bruno") == "Call the vet about Bruno"


def test_clean_title_strips_labels_quotes_and_punctuation():
    assert clean_title('Title: "Groceries for the weekend."') == "Groceries for the weekend"
    assert clean_title("**Plan for Monday standup**") == "Plan for Monday standup"
    assert clean_title("“Ideas for portfolio site”") == "Ideas for portfolio site"


def test_clean_title_uses_only_the_first_line():
    assert clean_title("Gym schedule\nThis title summarises the note.") == "Gym schedule"


def test_clean_title_returns_none_for_nothing_usable():
    for raw in (None, "", "   ", '""', "..."):
        assert clean_title(raw) is None, raw


def test_clean_title_cuts_long_replies_at_a_word():
    title = clean_title("word " * 40)
    assert len(title) <= titling.MAX_TITLE_CHARS + 1
    assert title.endswith("…")
    assert "  " not in title


# --- generate_title: never raises -------------------------------------------

def test_generate_title_skips_empty_transcript(monkeypatch):
    monkeypatch.setattr(titling, "GROQ_API_KEY", "fake")
    assert titling.generate_title("   ") is None


def test_generate_title_returns_none_when_groq_fails(monkeypatch):
    class BrokenGroq:
        def __init__(self, **kwargs):
            raise ConnectionError("rate limited")

    monkeypatch.setattr(titling, "GROQ_API_KEY", "fake")
    monkeypatch.setattr(titling, "Groq", BrokenGroq)
    assert titling.generate_title("Buy milk and eggs") is None


def test_generate_title_sends_only_the_start_of_long_notes(monkeypatch):
    sent = {}

    class FakeGroq:
        def __init__(self, **kwargs):
            self.chat = self
            self.completions = self

        def create(self, **kwargs):
            sent.update(kwargs)
            message = type("M", (), {"content": "Long rambling note"})
            choice = type("C", (), {"message": message})
            return type("R", (), {"choices": [choice]})

    monkeypatch.setattr(titling, "GROQ_API_KEY", "fake")
    monkeypatch.setattr(titling, "Groq", FakeGroq)
    assert titling.generate_title("a" * 10_000) == "Long rambling note"
    assert len(sent["messages"][1]["content"]) == titling.MAX_INPUT_CHARS
    assert sent["temperature"] == 0


# --- pipeline: a failed title never fails the save --------------------------

def _fake_storage(monkeypatch):
    monkeypatch.setattr(note_pipeline, "transcribe_audio", lambda b, f: "Pick up the parcel")
    monkeypatch.setattr(note_pipeline, "compress_audio", lambda b, s: b"small")
    monkeypatch.setattr(note_pipeline.object_storage, "new_audio_key", lambda: "notes/test.ogg")
    monkeypatch.setattr(note_pipeline.object_storage, "upload_audio", lambda k, b: None)
    monkeypatch.setattr(note_pipeline.object_storage, "presigned_audio_url", lambda k: "https://audio")


def test_note_saves_with_title(monkeypatch):
    _fake_storage(monkeypatch)
    monkeypatch.setattr(note_pipeline, "generate_title", lambda t: "Parcel pickup")
    note = note_pipeline.save_voice_note(b"audio", "rec.webm")
    assert note["title"] == "Parcel pickup"
    assert notes_db.fetch_note(note["id"])["title"] == "Parcel pickup"


def test_note_still_saves_when_title_fails(monkeypatch):
    _fake_storage(monkeypatch)
    monkeypatch.setattr(note_pipeline, "generate_title", lambda t: None)
    note = note_pipeline.save_voice_note(b"audio", "rec.webm")
    assert note["title"] is None
    assert notes_db.fetch_note(note["id"])["transcript"] == "Pick up the parcel"


# --- old notes.db gets the title column added in place ----------------------

def test_old_notes_db_is_upgraded(tmp_path, monkeypatch):
    old_db = tmp_path / "notes.db"
    conn = sqlite3.connect(old_db)
    conn.execute(
        "CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, transcript TEXT NOT NULL,"
        " audio_key TEXT NOT NULL, created_at TEXT NOT NULL)"
    )
    conn.execute("INSERT INTO notes (transcript, audio_key, created_at) VALUES ('old one', 'k', '2026-09-01 10:00:00')")
    conn.commit()
    conn.close()

    monkeypatch.setattr(notes_db, "NOTES_DB_FILE", str(old_db))
    notes_db.ensure_notes_db()
    notes_db.ensure_notes_db()  # running twice must be harmless

    rows = notes_db.fetch_untitled_notes()
    assert [r["transcript"] for r in rows] == ["old one"]
    assert notes_db.update_note_title(rows[0]["id"], "An old note")
    assert notes_db.fetch_untitled_notes() == []


# --- PATCH /api/notes/<id> ---------------------------------------------------

def _make_note(title=None):
    notes_db.ensure_notes_db()
    return notes_db.insert_note("Some transcript", "notes/x.ogg", "2026-10-03 12:00:00", title)


def test_patch_renames_a_note(client, monkeypatch):
    monkeypatch.setattr(notes_db_routes().object_storage, "presigned_audio_url", lambda k: None)
    note_id = _make_note()
    response = client.patch(f"/api/notes/{note_id}", json={"title": "  My title  "}, headers=HEADERS)
    assert response.status_code == 200
    assert response.get_json()["note"]["title"] == "My title"


def test_patch_with_empty_title_clears_it(client, monkeypatch):
    monkeypatch.setattr(notes_db_routes().object_storage, "presigned_audio_url", lambda k: None)
    note_id = _make_note("Old")
    response = client.patch(f"/api/notes/{note_id}", json={"title": ""}, headers=HEADERS)
    assert response.get_json()["note"]["title"] is None


def test_patch_rejects_bad_input(client):
    note_id = _make_note()
    assert client.patch(f"/api/notes/{note_id}", json={}, headers=HEADERS).status_code == 400
    assert client.patch(f"/api/notes/{note_id}", json={"title": 5}, headers=HEADERS).status_code == 400
    assert client.patch(f"/api/notes/{note_id}", json={"title": "x" * 200}, headers=HEADERS).status_code == 400
    assert client.patch("/api/notes/999999", json={"title": "x"}, headers=HEADERS).status_code == 404
    assert client.patch(f"/api/notes/{note_id}", json={"title": "x"}).status_code == 401


def notes_db_routes():
    from routes import notes
    return notes
