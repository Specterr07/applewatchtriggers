"""
Shared-secret API key protection, used by every route that reads/writes
data (not by the static webpage or canvas routes, which are meant to be
publicly loadable - the data they call back into is what's protected).
"""

from functools import wraps
import os

from flask import jsonify, request

# Once this API is public on the internet, anyone who guesses the URL
# could log fake events without this check. Set API_KEY as an environment
# variable on the server; the Shortcut will send it as ?key=... on every
# request.
API_KEY = os.environ.get("API_KEY")


def require_key(route_function):
    """
    Decorator that protects a route with the shared API key.
    Accepts the key from EITHER:
      - a query param  (?key=...)      <- used by the Watch Shortcut
      - a header  (X-API-Key: ...)     <- used by the webpage's JS
    If API_KEY isn't set on the server at all (e.g. local testing),
    the check is skipped entirely.
    """
    @wraps(route_function)
    def wrapper(*args, **kwargs):
        if API_KEY:
            supplied = request.args.get("key") or request.headers.get("X-API-Key")
            if supplied != API_KEY:
                return jsonify({"ok": False, "message": "Invalid or missing API key"}), 401
        return route_function(*args, **kwargs)
    return wrapper
