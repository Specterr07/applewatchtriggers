"""
The Apple Watch contract: GET /toggle and GET /status.

The Shortcut on the Watch can't be updated in lockstep with a deploy, so
these URLs, the ?key= query param, and the JSON response shapes must never
change. If one of these tests fails, the Watch is (or would be) broken.
"""

from conftest import TEST_API_KEY


def test_status_accepts_key_as_query_param(client, fresh_tasks_db):
    response = client.get(f"/status?key={TEST_API_KEY}")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True, "next_action": "Start"}


def test_status_accepts_key_as_header(client, fresh_tasks_db):
    response = client.get("/status", headers={"X-API-Key": TEST_API_KEY})
    assert response.status_code == 200
    assert response.get_json()["next_action"] == "Start"


def test_wrong_or_missing_key_is_rejected_with_json(client):
    for url in ("/status?key=wrong", "/status", "/toggle?key=wrong"):
        response = client.get(url)
        assert response.status_code == 401, url
        body = response.get_json()
        assert body["ok"] is False
        assert body["message"]


def test_toggle_starts_then_ends_a_task(client, fresh_tasks_db):
    start = client.get(f"/toggle?key={TEST_API_KEY}")
    assert start.status_code == 200
    start_body = start.get_json()
    assert set(start_body) == {"ok", "action", "id", "message"}
    assert start_body["ok"] is True
    assert start_body["action"] == "Start"
    assert isinstance(start_body["id"], int)

    assert client.get(f"/status?key={TEST_API_KEY}").get_json()["next_action"] == "End"

    end = client.get(f"/toggle?key={TEST_API_KEY}")
    end_body = end.get_json()
    assert end.status_code == 200
    assert set(end_body) == {"ok", "action", "id", "message"}
    assert end_body["action"] == "End"
    assert end_body["id"] == start_body["id"]


def test_toggle_name_is_saved_on_start(client, fresh_tasks_db):
    client.get(f"/toggle?key={TEST_API_KEY}&name=Write%20tests")
    sessions = client.get(f"/api/logs?key={TEST_API_KEY}").get_json()["sessions"]
    assert sessions[0]["name"] == "Write tests"
    assert sessions[0]["end"] is None
