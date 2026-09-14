"""
Time Log routes - /toggle, /status, /api/logs*.

/toggle is the endpoint your Apple Watch Shortcut hits (and the webpage's
own Start/End button). Everything here reads/writes tasks.db through
services/tasks_db.py - this file only handles the HTTP side: parsing the
request, calling the right storage function, and shaping the JSON reply.
"""

from datetime import datetime

from flask import Blueprint, jsonify, request

from services import tasks_db
from services.auth import require_key
from services.time import local_now

tasks_bp = Blueprint("tasks", __name__)


@tasks_bp.route("/toggle", methods=["GET"])
@require_key
def toggle():
    """
    The main endpoint your Apple Watch Shortcut (and the webpage's own
    Start/End button) calls. Decides whether this press means Start or
    End, logs it to tasks.db, and returns a short JSON message.
    """
    try:
        tasks_db.ensure_tasks_db()
        open_task = tasks_db.get_open_task()
    except RuntimeError as e:
        # Something went wrong reading the database - tell the caller
        # clearly instead of silently guessing "Start".
        return jsonify({"ok": False, "message": str(e)}), 500

    now = local_now()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")

    # Optional task name. Only the webpage's own Start/End button ever
    # sends this, as a query param - /toggle stays a plain GET request so
    # the Watch Shortcut (which can't attach a body to a GET) keeps
    # working completely unchanged. The Watch never sends a name.
    name = request.args.get("name") or None

    if open_task is None:
        # No task in progress -> this press is a Start
        try:
            new_id = tasks_db.start_task(name, now_str)
        except RuntimeError as e:
            return jsonify({"ok": False, "message": str(e)}), 500

        return jsonify({
            "ok": True,
            "action": "Start",
            "id": new_id,
            "message": f"Task started at {now.strftime('%H:%M')}"
        }), 200

    else:
        # A task is already in progress -> this press is an End
        try:
            start_time = datetime.strptime(open_task["start"], "%Y-%m-%d %H:%M:%S")
            duration = round((now - start_time).total_seconds() / 60, 1)
        except (ValueError, KeyError):
            # The open task's start time is missing or malformed.
            # Don't crash - log the End anyway, just without a duration.
            duration = None

        try:
            tasks_db.end_task(open_task["id"], now_str, duration, name)
        except RuntimeError as e:
            return jsonify({"ok": False, "message": str(e)}), 500

        message = (
            f"Task ended after {duration} min" if duration is not None
            else "Task ended (couldn't calculate duration - previous entry was malformed)"
        )
        return jsonify({"ok": True, "action": "End", "id": open_task["id"], "message": message}), 200


@tasks_bp.route("/status", methods=["GET"])
@require_key
def status():
    """
    Optional helper: tells you what the NEXT toggle press will do,
    without actually logging anything. Useful for testing.
    """
    try:
        tasks_db.ensure_tasks_db()
        open_task = tasks_db.get_open_task()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    return jsonify({"ok": True, "next_action": "End" if open_task else "Start"}), 200


@tasks_bp.route("/api/logs", methods=["GET"])
@require_key
def api_logs():
    """
    Returns every logged task - id, name (or a generic title if it was
    never named), date, start, end, duration_minutes - newest first.
    Everything a bento-card grid needs to render without a second
    request. A currently in-progress task has end/duration_minutes as
    null. Kept under the "sessions" key for backward compatibility with
    the webpage's existing Time Log view.
    """
    try:
        tasks_db.ensure_tasks_db()
        rows = tasks_db.fetch_all_tasks()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    sessions = [tasks_db.task_row_to_dict(row) for row in rows]
    return jsonify({"ok": True, "sessions": sessions}), 200


@tasks_bp.route("/api/logs/<int:task_id>", methods=["GET"])
@require_key
def get_log(task_id):
    """Full detail for one task - what the (upcoming) detail page loads."""
    try:
        tasks_db.ensure_tasks_db()
        row = tasks_db.fetch_task(task_id)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    if row is None:
        return jsonify({"ok": False, "message": "No task with that id"}), 404

    return jsonify({"ok": True, "task": tasks_db.task_row_to_dict(row)}), 200


@tasks_bp.route("/api/logs/<int:task_id>", methods=["PATCH"])
@require_key
def update_log(task_id):
    """
    Edits any subset of a task's name/start/end. If start or end
    changes, duration_minutes is recalculated here so it never gets left
    stale after an edit. Expects a JSON body with any subset of
    { "name": ..., "start": "YYYY-MM-DD HH:MM:SS", "end": "YYYY-MM-DD HH:MM:SS" }.
    """
    data = request.get_json(silent=True) or {}
    updates = {k: v for k, v in data.items() if k in ("name", "start", "end")}
    if not updates:
        return jsonify({"ok": False, "message": "Nothing to update - provide name, start, and/or end"}), 400

    # Validate any provided timestamps up front, before touching the
    # database, so a typo can't leave the task half-updated.
    for field in ("start", "end"):
        value = updates.get(field)
        if value is not None:
            try:
                datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
            except (ValueError, TypeError):
                return jsonify({"ok": False, "message": f'"{field}" must look like YYYY-MM-DD HH:MM:SS'}), 400

    try:
        tasks_db.ensure_tasks_db()
        task = tasks_db.fetch_task(task_id)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    if task is None:
        return jsonify({"ok": False, "message": "No task with that id"}), 404

    new_name = updates.get("name", task["name"])
    new_start = updates.get("start", task["start"])
    new_end = updates.get("end", task["end"])

    if "start" in updates or "end" in updates:
        # A timestamp changed - recompute duration so it can't drift out
        # of sync with what's actually being edited.
        if new_end:
            start_dt = datetime.strptime(new_start, "%Y-%m-%d %H:%M:%S")
            end_dt = datetime.strptime(new_end, "%Y-%m-%d %H:%M:%S")
            new_duration = round((end_dt - start_dt).total_seconds() / 60, 1)
        else:
            new_duration = None
    else:
        new_duration = task["duration_minutes"]

    try:
        tasks_db.save_task(task_id, new_name, new_start, new_end, new_duration)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    updated_row = {
        "id": task_id,
        "name": new_name,
        "start": new_start,
        "end": new_end,
        "duration_minutes": new_duration,
    }
    return jsonify({"ok": True, "task": tasks_db.task_row_to_dict(updated_row)}), 200


@tasks_bp.route("/api/logs/<int:task_id>", methods=["DELETE"])
@require_key
def delete_log(task_id):
    """Permanently deletes a task."""
    try:
        tasks_db.ensure_tasks_db()
        deleted = tasks_db.remove_task(task_id)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    if not deleted:
        return jsonify({"ok": False, "message": "No task with that id"}), 404

    return jsonify({"ok": True}), 200
