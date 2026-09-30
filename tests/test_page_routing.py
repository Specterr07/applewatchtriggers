"""
Page routing after the frontend cutover (docs/features/frontend-redesign.md §8.6).

The React app only gets an explicit set of URLs; everything else must keep
returning the JSON 404 the Watch Shortcut and API clients expect.
"""

import pytest

from routes import pages

# Client-side routes from frontend/src/router.tsx. Keep in step with it.
APP_PAGE_URLS = [
    "/",
    "/tasks",
    "/tasks/12",
    "/time-log",
    "/notes",
    "/notes/3",
    "/canvas",
    "/canvas/",
    "/integrations/watch",
    "/integrations/telegram",
    "/settings",
    "/more",
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


# Migration-era /app URLs -> the same path without /app (301, so bookmarks update).
@pytest.mark.parametrize(
    "old_url, new_url",
    [
        ("/app", "/"),
        ("/app/", "/"),
        ("/app/tasks/12", "/tasks/12"),
        ("/app/canvas", "/canvas"),
        ("/app/notes?q=hello", "/notes?q=hello"),
    ],
)
def test_old_app_urls_redirect_to_root(client, old_url, new_url):
    response = client.get(old_url)
    assert response.status_code == 301
    assert response.headers["Location"] == new_url


def test_old_app_redirect_never_points_at_another_site(client):
    # "//evil.example" would be read by browsers as a link to another site.
    location = "/app//evil.example"
    for _hop in range(3):
        response = client.get(location)
        if response.status_code not in (301, 308):
            break
        location = response.headers["Location"]
        assert not location.startswith("//")
    assert location == "/evil.example"


@pytest.mark.parametrize(
    "url",
    ["/nope", "/api/nope", "/api/logs/not-a-number", "/canvas/assets/old.js", "/tasks/abc", "/notes/1/extra"],
)
def test_unknown_urls_still_return_json_404(client, url):
    assert_json_404(client.get(url))


def test_root_no_longer_serves_the_old_webpage(client, fake_web_dist):
    response = client.get("/")
    assert response.status_code == 200
    assert response.get_data(as_text=True) == FAKE_INDEX_HTML


def test_api_docs_still_served(client):
    assert client.get("/docs/").status_code == 200
    assert client.get("/static/openapi.yaml").status_code == 200
