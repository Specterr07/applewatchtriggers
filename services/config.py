"""
Shared configuration read from environment variables.

Both services/tasks_db.py (SQLite) and services/planner_csv.py (CSV) need to
know where to put their data file, so that one setting lives here instead of
being duplicated in both files.
"""

import os

# Lets us point at Fly.io's persistent volume (mounted at /data) in
# production, while defaulting to the current folder for local testing.
# This means the SAME code works locally and on the server - no edits needed.
DATA_DIR = os.environ.get("DATA_DIR", ".")
os.makedirs(DATA_DIR, exist_ok=True)  # create it if it doesn't exist yet
