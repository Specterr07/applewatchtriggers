"""
Task Logger - Flask app wiring.

This file just creates the Flask app, sets up Swagger docs, and registers
the blueprints below. The actual routes and logic live in:
    routes/tasks.py     -> /toggle, /status, /api/logs*      (SQLite, tasks.db)
    routes/planner.py   -> /api/planner*                     (CSV, planner.csv)
    routes/pages.py     -> /, /canvas, /canvas/assets/<file> (static webpage + canvas)
    services/           -> storage (tasks_db.py, planner_csv.py), auth.py, time.py
See PROJECT_STRUCTURE.md for the full layout and why tasks moved to
SQLite while the planner stayed on CSV.
"""

from flask import Flask, jsonify
from flask_swagger_ui import get_swaggerui_blueprint

from routes.tasks import tasks_bp
from routes.planner import planner_bp
from routes.pages import pages_bp

app = Flask(__name__)

# Swagger UI - interactive, browsable API docs at /docs, generated from the
# contract in static/openapi.yaml. This is the file a frontend engineer
# would read to build against this API without touching this Python file.
SWAGGER_URL = "/docs"
OPENAPI_SPEC_URL = "/static/openapi.yaml"
swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    OPENAPI_SPEC_URL,
    config={"app_name": "Sheev API"},
)
app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)
app.register_blueprint(tasks_bp)
app.register_blueprint(planner_bp)
app.register_blueprint(pages_bp)


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
