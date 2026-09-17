"""
Canvas API routes - GET/PUT /api/canvas.

Server-side persistence for the tldraw canvas (frontend/App.tsx), so the
same drawing is available across devices instead of being stuck in one
browser's local storage. Both routes are protected the same way every
other data endpoint is.

Not to be confused with routes/pages.py's /canvas route, which serves the
compiled canvas app's HTML/JS/CSS - this file is the API it talks to.
"""

from flask import Blueprint, jsonify, request

from services import canvas_db
from services.auth import require_key

canvas_bp = Blueprint("canvas", __name__)


@canvas_bp.route("/api/canvas", methods=["GET"])
@require_key
def get_canvas():
    """
    Returns the saved canvas snapshot for the frontend to load on
    mount. snapshot is null if nothing has been saved yet (a brand-new
    canvas).
    """
    try:
        canvas_db.ensure_canvas_db()
        saved = canvas_db.get_canvas_snapshot()
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    if saved is None:
        return jsonify({"ok": True, "snapshot": None, "updated_at": None}), 200

    return jsonify({"ok": True, "snapshot": saved["snapshot"], "updated_at": saved["updated_at"]}), 200


@canvas_bp.route("/api/canvas", methods=["PUT"])
@require_key
def put_canvas():
    """
    Saves the canvas snapshot, called a few seconds after the last edit
    (debounced on the frontend, not here). Expects JSON body:
    { "snapshot": {...} } - whatever tldraw's getSnapshot() produced.
    """
    data = request.get_json(silent=True) or {}
    snapshot = data.get("snapshot")
    if snapshot is None:
        return jsonify({"ok": False, "message": "Missing snapshot"}), 400

    try:
        canvas_db.ensure_canvas_db()
        updated_at = canvas_db.save_canvas_snapshot(snapshot)
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 500

    return jsonify({"ok": True, "updated_at": updated_at}), 200
