"""
Page routing during the frontend migration (docs/features/frontend-redesign.md §8.6).

The React app only gets an explicit set of URLs; everything else must keep
returning the JSON 404 the Watch Shortcut and API clients expect.
"""

import pytest

from routes import pages

# Client-side routes from frontend/src/router.tsx. Keep in step with it.
APP_PAGE_URLS = [
    "/app",
    "/app/",
    "/app/tasks",
    "/app/tasks/12",
    "/app/time-log",
    "/app/notes",
    "/app/notes/3",
    "/app/canvas",
    "/app/integrations/watch",
    "/app/integrations/telegram",
    "/app/settings",
    "/app/more",
]

FAKE_INDEX_HTML = "<!doctype html><title>Sheev test build</title>"


@pytest.fixture()
def fake_web_dist(tmp_path, monkeypatch):
    """A stand-in for the built React app, so tests don't need `npm run build`."""
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text(FAKE_INDEX_HTML)
    (tmp_path / "assets" / "index-abc123.js").write_text("console.log('app')")
    monkeypatch.setattr(pages, "WEB_DIST", str(tmp_path))


def assert_json_404(response):
    assert response.status_code == 404
    body = response.get_json()
    assert body is not None, "expected a JSON error body, got HTML"
    assert body["ok"] is False


@pytest.mark.parametrize("url", APP_PAGE_URLS)
def test_app_pages_serve_the_react_index(client, fake_web_dist, url):
    response = client.get(url)
    assert response.status_code == 200
    assert FAKE_INDEX_HTML in response.get_data(as_text=True)


def test_app_assets_are_served_as_files(client, fake_web_dist):
    response = client.get("/app/assets/index-abc123.js")
    assert response.status_code == 200
    assert "console.log('app')" in response.get_data(as_text=True)


def test_missing_app_asset_is_a_json_404_not_index_html(client, fake_web_dist):
    assert_json_404(client.get("/app/assets/missing-file.js"))


@pytest.mark.parametrize("url", ["/canvas", "/canvas/"])
def test_old_canvas_url_redirects_into_the_app(client, url):
    response = client.get(url)
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/app/canvas")


@pytest.mark.parametrize("url", ["/nope", "/api/nope", "/api/logs/not-a-number", "/canvas/assets/old.js"])
def test_unknown_urls_still_return_json_404(client, url):
    assert_json_404(client.get(url))


def test_old_webpage_still_served_at_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Sheev" in response.get_data(as_text=True)


def test_api_docs_still_served(client):
    assert client.get("/docs/").status_code == 200
    assert client.get("/static/openapi.yaml").status_code == 200
