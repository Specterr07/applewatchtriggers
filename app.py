"""
Task Logger API
----------------
A tiny Flask API that toggles between "Start Task" and "End Task"
every time it's called, and logs each event to a CSV file
(which you can open directly in Excel).

Endpoints:
    GET /toggle   -> logs Start or End depending on current state
    GET /status   -> tells you what the NEXT press will do (optional, handy for debugging)
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_swagger_ui import get_swaggerui_blueprint
from datetime import datetime
from functools import wraps
from zoneinfo import ZoneInfo
import csv
import os
import uuid
import fcntl  # used to prevent two requests from writing at the exact same time

app = Flask(__name__)

# Which timezone "now" means for every timestamp this app writes or reads.
#
# Why this exists: `datetime.now()` uses whatever timezone the OS clock is
# set to. On your Mac that's your local timezone, so testing locally looks
# fine - but the Fly.io container's clock runs in UTC. Without pinning a
# timezone explicitly, the exact same code logs a task started at 9:00 AM
# local time as 3:30 AM once deployed (UTC is 5:30 behind IST) - which is
# the "sometimes logged wrong" bug. Set TIMEZONE as an env var to override;
# defaults to Asia/Kolkata (IST).
TIMEZONE = ZoneInfo(os.environ.get("TIMEZONE", "Asia/Kolkata"))


def local_now():
    """
    Current wall-clock time in TIMEZONE, as a naive datetime (no tzinfo
    attached). Naive on purpose: tasks.csv only ever stores a plain
    "YYYY-MM-DD HH:MM:SS" string, so every place that reads or writes that
    string needs to agree on ONE timezone's wall clock - this is it. Using
    this everywhere instead of datetime.now() means "now" no longer depends
    on which machine (your Mac vs. the Fly container) happens to run it.
    """
    return datetime.now(TIMEZONE).replace(tzinfo=None)

# Simple shared-secret protection. Once this API is public on the internet,
# anyone who guesses the URL could log fake events without this check.
# Set API_KEY as an environment variable on the server; the Shortcut will
# send it as ?key=... on every request.
API_KEY = os.environ.get("API_KEY")

# Swagger UI - interactive, browsable API docs at /docs, generated from the
# contract in static/openapi.yaml. This is the file a frontend engineer
# would read to build against this API without touching this Python file.
SWAGGER_URL = "/docs"
OPENAPI_SPEC_URL = "/static/openapi.yaml"
swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    OPENAPI_SPEC_URL,
    config={"app_name": "Task Logger API"},
)
app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

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


CSV_HEADERS = ["event", "timestamp", "duration_minutes"]

# DATA_DIR lets us point at Fly.io's persistent volume (mounted at /data)
# in production, while defaulting to the current folder for local testing.
# This means the SAME code works locally and on the server - no edits needed.
DATA_DIR = os.environ.get("DATA_DIR", ".")
os.makedirs(DATA_DIR, exist_ok=True)  # create it if it doesn't exist yet
CSV_FILE = os.path.join(DATA_DIR, "tasks.csv")

PLANNER_FILE = os.path.join(DATA_DIR, "planner.csv")
PLANNER_HEADERS = ["id", "date", "start_time", "end_time", "title", "completed"]


def ensure_csv_exists():
    """
    If tasks.csv doesn't exist yet, create it with headers.
    This runs before every request that touches the file, so we
    never crash just because the file is missing.
    """
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, mode="w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(CSV_HEADERS)


def get_last_row():
    """
    Reads the CSV and returns the last row as a dict, or None if
    the file is empty (only headers, or doesn't exist yet).

    Wrapped in try/except because reading a file can fail in ways
    we don't control (disk issue, permissions, corrupted file).
    """
    try:
        with open(CSV_FILE, mode="r", newline="") as f:
            reader = list(csv.DictReader(f))
            if not reader:
                return None
            return reader[-1]
    except FileNotFoundError:
        # File genuinely doesn't exist - treat as "no history yet"
        return None
    except Exception as e:
        # Any other read error - we don't want to guess, so raise it
        # upward and let the route handler turn it into a proper
        # error response instead of crashing the server.
        raise RuntimeError(f"Could not read log file: {e}")


def append_row(event, timestamp, duration_minutes=""):
    """
    Appends a single row to the CSV.

    Uses a file lock (fcntl) so that if two requests somehow arrive
    at nearly the same instant, they don't corrupt the file by
    writing at the same time. This is a common beginner pitfall -
    without locking, "double taps" or network retries can garble
    your data.
    """
    try:
        with open(CSV_FILE, mode="a", newline="") as f:
            fcntl.flock(f, fcntl.LOCK_EX)  # exclusive lock - wait if someone else is writing
            writer = csv.writer(f)
            writer.writerow([event, timestamp, duration_minutes])
            fcntl.flock(f, fcntl.LOCK_UN)  # release lock
    except Exception as e:
        raise RuntimeError(f"Could not write to log file: {e}")


@app.route("/toggle", methods=["GET"])
@require_key
def toggle():
    """
    The main endpoint your Apple Watch Shortcut (and now the webpage's
    "Start/End" button) calls. Decides whether this press means Start
    or End, logs it, and returns a short JSON message.
    """
    ensure_csv_exists()

    try:
        last_row = get_last_row()
    except RuntimeError as e:
        # Something went wrong reading the file - tell the caller
        # clearly instead of silently guessing "Start".
        return jsonify({"ok": False, "message": str(e)}), 500

    now = local_now()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")

    # Decide: are we starting, or ending?
    if last_row is None or last_row.get("event") == "End":
        # No history yet, OR the last thing that happened was an End
        # -> this press is a Start
        try:
            append_row("Start", now_str)
        except RuntimeError as e:
            return jsonify({"ok": False, "message": str(e)}), 500

        return jsonify({
            "ok": True,
            "action": "Start",
            "message": f"Task started at {now.strftime('%H:%M')}"
        }), 200

    else:
        # Last event was a Start -> this press is an End
        try:
            start_time = datetime.strptime(last_row["timestamp"], "%Y-%m-%d %H:%M:%S")
        except (ValueError, KeyError):
            # The last row's timestamp is missing or malformed.
            # Don't crash - log the End anyway, just without a duration.
            append_row("End", now_str, "unknown")
            return jsonify({
                "ok": True,
                "action": "End",
                "message": "Task ended (couldn't calculate duration - previous entry was malformed)"
            }), 200

        duration = round((now - start_time).total_seconds() / 60, 1)

        try:
            append_row("End", now_str, duration)
        except RuntimeError as e:
            return jsonify({"ok": False, "message": str(e)}), 500

        return jsonify({
            "ok": True,
            "action": "End",
            "message": f"Task ended after {duration} min"
        }), 200


@app.route("/status", methods=["GET"])
@require_key
def status():
    """
    Optional helper: tells you what the NEXT toggle press will do,
    without actually logging anything. Useful for testing.
    """
    ensure_csv_exists()

    try:
        last_row = get_last_row()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    if last_row is None or last_row.get("event") == "End":
        return jsonify({"ok": True, "next_action": "Start"}), 200
    else:
        return jsonify({"ok": True, "next_action": "End"}), 200


@app.route("/api/logs", methods=["GET"])
@require_key
def api_logs():
    """
    Returns logged time as a list of {start, end, duration_minutes}
    sessions (pairing up Start/End rows), newest first, for the
    webpage's history table. A trailing unmatched "Start" (task
    currently in progress) is included with end=None.
    """
    ensure_csv_exists()
    try:
        with open(CSV_FILE, mode="r", newline="") as f:
            rows = list(csv.DictReader(f))
    except Exception as e:
        return jsonify({"ok": False, "message": f"Could not read log file: {e}"}), 500

    sessions = []
    pending_start = None
    for row in rows:
        if row.get("event") == "Start":
            pending_start = row.get("timestamp")
        elif row.get("event") == "End":
            sessions.append({
                "start": pending_start,
                "end": row.get("timestamp"),
                "duration_minutes": row.get("duration_minutes"),
            })
            pending_start = None
    if pending_start:
        # A Start with no matching End yet - task currently in progress
        sessions.append({"start": pending_start, "end": None, "duration_minutes": None})

    sessions.reverse()  # newest first
    return jsonify({"ok": True, "sessions": sessions}), 200


def ensure_planner_csv():
    """Create planner.csv with headers if it doesn't exist yet."""
    if not os.path.exists(PLANNER_FILE):
        with open(PLANNER_FILE, mode="w", newline="") as f:
            csv.writer(f).writerow(PLANNER_HEADERS)


def read_planner_rows():
    """Reads all planner rows as a list of dicts. Empty list if none."""
    ensure_planner_csv()
    try:
        with open(PLANNER_FILE, mode="r", newline="") as f:
            return list(csv.DictReader(f))
    except Exception as e:
        raise RuntimeError(f"Could not read planner file: {e}")


def write_planner_rows(rows):
    """
    Overwrites planner.csv with the given rows. Unlike tasks.csv (which
    we only ever append to), the planner needs edits/deletes, so we
    rewrite the whole file each time - locked, so concurrent requests
    don't corrupt it.
    """
    try:
        with open(PLANNER_FILE, mode="w", newline="") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            writer = csv.DictWriter(f, fieldnames=PLANNER_HEADERS)
            writer.writeheader()
            writer.writerows(rows)
            fcntl.flock(f, fcntl.LOCK_UN)
    except Exception as e:
        raise RuntimeError(f"Could not write planner file: {e}")


@app.route("/api/planner", methods=["GET"])
@require_key
def get_planner():
    """
    Returns planner items for a given date, e.g. /api/planner?date=2026-09-02
    Defaults to today if no date is given.
    """
    # Use local_now(), not datetime.now() - defaulting to the SERVER's date
    # (UTC in production) would show yesterday's planner for a few hours
    # after midnight local time.
    date = request.args.get("date") or local_now().strftime("%Y-%m-%d")
    try:
        rows = read_planner_rows()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    items = [r for r in rows if r.get("date") == date]
    items.sort(key=lambda r: r.get("start_time", ""))
    return jsonify({"ok": True, "date": date, "items": items}), 200


@app.route("/api/planner", methods=["POST"])
@require_key
def add_planner_item():
    """
    Adds a new planner item. Expects JSON body:
    { "date": "2026-09-02", "start_time": "09:00", "end_time": "10:00", "title": "Deep work" }
    """
    data = request.get_json(silent=True) or {}
    required = ["date", "start_time", "end_time", "title"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"ok": False, "message": f"Missing fields: {', '.join(missing)}"}), 400

    new_item = {
        "id": uuid.uuid4().hex[:8],
        "date": data["date"],
        "start_time": data["start_time"],
        "end_time": data["end_time"],
        "title": data["title"],
        "completed": "False",
    }

    try:
        rows = read_planner_rows()
        rows.append(new_item)
        write_planner_rows(rows)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    return jsonify({"ok": True, "item": new_item}), 201


@app.route("/api/planner/<item_id>", methods=["PATCH"])
@require_key
def update_planner_item(item_id):
    """
    Updates fields on an existing planner item (e.g. mark completed,
    or edit its time/title). Expects a JSON body with any subset of
    date/start_time/end_time/title/completed.
    """
    data = request.get_json(silent=True) or {}

    try:
        rows = read_planner_rows()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    updated_item = None
    for row in rows:
        if row.get("id") == item_id:
            for field in ["date", "start_time", "end_time", "title", "completed"]:
                if field in data:
                    row[field] = str(data[field])
            updated_item = row
            break

    if updated_item is None:
        return jsonify({"ok": False, "message": "No planner item with that id"}), 404

    try:
        write_planner_rows(rows)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    return jsonify({"ok": True, "item": updated_item}), 200


@app.route("/api/planner/<item_id>", methods=["DELETE"])
@require_key
def delete_planner_item(item_id):
    """Deletes a planner item by id."""
    try:
        rows = read_planner_rows()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    remaining = [r for r in rows if r.get("id") != item_id]
    if len(remaining) == len(rows):
        return jsonify({"ok": False, "message": "No planner item with that id"}), 404

    try:
        write_planner_rows(remaining)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    return jsonify({"ok": True}), 200


CANVAS_DIST = os.path.join(os.path.dirname(__file__), "canvas_dist")


@app.route("/canvas")
@app.route("/canvas/")
def canvas():
    """Serves the compiled tldraw canvas app's entry HTML."""
    return send_from_directory(CANVAS_DIST, "index.html")


@app.route("/canvas/assets/<path:filename>")
def canvas_assets(filename):
    """Serves the canvas app's built JS/CSS files."""
    return send_from_directory(os.path.join(CANVAS_DIST, "assets"), filename)


@app.route("/")
def index():
    """Serves the webpage (static/index.html) - the login screen, time
    log view, and planner all live in that one file."""
    return send_from_directory("static", "index.html")


# Catch-all for any URL that doesn't match a route above,
# so the Shortcut gets a clean 404 message instead of a broken response.
@app.errorhandler(404)
def not_found(e):
    return jsonify({"ok": False, "message": "Unknown endpoint. Try /toggle or /status"}), 404


if __name__ == "__main__":
    # host="0.0.0.0" makes it reachable from outside your own machine
    # (needed later when this runs on a server / you hit it from your Watch)
    # Port 8080 - port 5000 conflicts with AirPlay Receiver on Mac.
    app.run(host="0.0.0.0", port=8080, debug=True)
