"""
Page routes - the React app. No API key required - these just serve
HTML/JS/CSS files; the data endpoints they call back into are what's
protected (see services/auth.py).

After the frontend cutover (docs/features/frontend-redesign.md §8.6):
- "/" and each screen URL ("/tasks", "/canvas", ...) serve the React app's
  index.html (built into web_dist/); its router picks the screen.
- "/app/assets/..." serves the app's built JS/CSS (Vite's `base` is still
  '/app/', so asset URLs didn't change).
- "/app" and "/app/..." 301-redirect to the same path without "/app", so
  bookmarks from the migration keep working.

Only an explicit list of page URLs returns HTML. Everything else (typos,
unknown /api/* paths) still falls through to app.py's JSON 404 handler,
which the Apple Watch Shortcut relies on for clean error responses.
"""

from flask import Blueprint, redirect, request, send_from_directory

pages_bp = Blueprint("pages", __name__)

# The compiled React app (frontend/dist, copied here by the Dockerfile).
# Relative paths are resolved against the app's root folder (where app.py
# lives), the same way the "static" folder is.
WEB_DIST = "web_dist"


# Screen URLs from frontend/src/router.tsx - keep the two lists in step
# (tests/test_page_routing.py checks them).
@pages_bp.route("/")
@pages_bp.route("/tasks")
@pages_bp.route("/tasks/<int:task_id>")
@pages_bp.route("/time-log")
@pages_bp.route("/notes")
@pages_bp.route("/notes/<int:note_id>")
@pages_bp.route("/canvas")
@pages_bp.route("/canvas/")
@pages_bp.route("/integrations/<name>")
@pages_bp.route("/settings")
@pages_bp.route("/more")
def web_app(**_url_params):
    """
    Serves the React app's index.html for every screen URL; the app's own
    router then decides which screen to show (and shows its own "Page not
    found" for e.g. an /integrations/<name> it doesn't know).
    """
    return send_from_directory(WEB_DIST, "index.html")


@pages_bp.route("/app/assets/<path:filename>")
def web_app_assets(filename):
    """
    Serves the React app's built JS/CSS/font files. A missing file is a
    real 404 (JSON), not index.html - otherwise a stale script URL would
    get HTML back and fail confusingly in the browser.
    """
    return send_from_directory(f"{WEB_DIST}/assets", filename)


@pages_bp.route("/app")
@pages_bp.route("/app/")
@pages_bp.route("/app/<path:subpath>")
def old_app_url(subpath=""):
    """
    The React app lived under /app during the migration. A permanent
    redirect to the same path (and query string) without "/app" keeps old
    bookmarks and links working. /app/assets/... is matched by the more
    specific route above, so built files are never redirected.
    """
    # lstrip: "/app//evil.com" must not become "//evil.com", which browsers
    # read as a link to another site (an open redirect).
    target = "/" + subpath.lstrip("/")
    if request.query_string:
        target += "?" + request.query_string.decode()
    return redirect(target, code=301)
