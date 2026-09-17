"""
Static webpage + compiled canvas app routes. No API key required - these
just serve HTML/JS/CSS files; the data endpoints they call back into are
what's protected (see services/auth.py).
"""

from flask import Blueprint, send_from_directory

pages_bp = Blueprint("pages", __name__)

# Relative to the working directory the app is started from (the repo
# root locally, /app in the Docker image) - same pattern as the "static"
# folder below, which Flask has always resolved this way.
CANVAS_DIST = "canvas_dist"


@pages_bp.route("/canvas")
@pages_bp.route("/canvas/")
def canvas():
    """Serves the compiled tldraw canvas app's entry HTML."""
    return send_from_directory(CANVAS_DIST, "index.html")


@pages_bp.route("/canvas/assets/<path:filename>")
def canvas_assets(filename):
    """Serves the canvas app's built JS/CSS files."""
    return send_from_directory(f"{CANVAS_DIST}/assets", filename)


@pages_bp.route("/")
def index():
    """Serves the webpage (static/index.html) - the login screen and time
    log view live in that one file."""
    return send_from_directory("static", "index.html")
