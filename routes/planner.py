"""
Day planner routes - /api/planner*. Unchanged behavior/format, still
CSV-backed (see PROJECT_STRUCTURE.md for why this didn't move to SQLite
along with tasks). Moved out of app.py so each route file covers one
feature.
"""

import uuid

from flask import Blueprint, jsonify, request

from services import planner_csv
from services.auth import require_key
from services.time import local_now

planner_bp = Blueprint("planner", __name__)


@planner_bp.route("/api/planner", methods=["GET"])
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
        rows = planner_csv.read_planner_rows()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    items = [r for r in rows if r.get("date") == date]
    items.sort(key=lambda r: r.get("start_time", ""))
    return jsonify({"ok": True, "date": date, "items": items}), 200


@planner_bp.route("/api/planner", methods=["POST"])
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
        rows = planner_csv.read_planner_rows()
        rows.append(new_item)
        planner_csv.write_planner_rows(rows)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    return jsonify({"ok": True, "item": new_item}), 201


@planner_bp.route("/api/planner/<item_id>", methods=["PATCH"])
@require_key
def update_planner_item(item_id):
    """
    Updates fields on an existing planner item (e.g. mark completed,
    or edit its time/title). Expects a JSON body with any subset of
    date/start_time/end_time/title/completed.
    """
    data = request.get_json(silent=True) or {}

    try:
        rows = planner_csv.read_planner_rows()
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
        planner_csv.write_planner_rows(rows)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    return jsonify({"ok": True, "item": updated_item}), 200


@planner_bp.route("/api/planner/<item_id>", methods=["DELETE"])
@require_key
def delete_planner_item(item_id):
    """Deletes a planner item by id."""
    try:
        rows = planner_csv.read_planner_rows()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    remaining = [r for r in rows if r.get("id") != item_id]
    if len(remaining) == len(rows):
        return jsonify({"ok": False, "message": "No planner item with that id"}), 404

    try:
        planner_csv.write_planner_rows(remaining)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    return jsonify({"ok": True}), 200
