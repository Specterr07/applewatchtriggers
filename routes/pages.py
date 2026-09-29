"""
Page routes - the old webpage and the new React app. No API key required -
these just serve HTML/JS/CSS files; the data endpoints they call back into
are what's protected (see services/auth.py).

During the frontend migration (docs/features/frontend-redesign.md §10):
- "/" still serves the old single-file webpage (static/index.html).
- "/app/..." serves the new React app (built into web_dist/).
- "/canvas" redirects to the canvas inside the new app.

Only an explicit list of page URLs returns HTML. Everything else (typos,
unknown /api/* paths) still falls through to app.py's JSON 404 handler,
which the Apple Watch Shortcut relies on for clean error responses.
"""

from flask import Blueprint, redirect, send_from_directory

pages_bp = Blueprint("pages", __name__)

# The compiled React app (frontend/dist, copied here by the Dockerfile).
# Relative paths are resolved against the app's root folder (where app.py
# lives), the same way the "static" folder below is.
WEB_DIST = "web_dist"


@pages_bp.route("/app")
@pages_bp.route("/app/")
@pages_bp.route("/app/<path:subpath>")
def web_app(subpath=None):
    """
    Serves the React app's index.html for every /app/... page URL; the
    app's own router then decides which screen to show (and shows its own
    "Page not found" for URLs it doesn't know).
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


@pages_bp.route("/canvas")
@pages_bp.route("/canvas/")
def canvas():
    """
    The canvas now lives inside the React app. The redirect keeps old
    links working - including the "Canvas" tab on the old webpage.
    """
    return redirect("/app/canvas", code=302)


@pages_bp.route("/")
def index():
    """Serves the old webpage (static/index.html) - login, Time Log and
    Notes in one file. Removed only after the new app reaches parity."""
    return send_from_directory("static", "index.html")
