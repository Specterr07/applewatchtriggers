"""
Shared test setup.

services/config.py and services/auth.py read DATA_DIR and API_KEY from the
environment at *import* time, so both must be set here - before app.py is
imported - or the tests would write into the real tasks.db and skip the
API-key check entirely.
"""

import os
import tempfile

import pytest

TEST_API_KEY = "test-key-for-pytest"

os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="sheev-tests-")
os.environ["API_KEY"] = TEST_API_KEY

from app import app as flask_app  # noqa: E402  (must come after the env setup above)


@pytest.fixture()
def client():
    """A Flask test client - makes requests without running a real server."""
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as test_client:
        yield test_client


@pytest.fixture()
def fresh_tasks_db():
    """Empties tasks.db so each toggle test starts with no open task."""
    from services import tasks_db

    tasks_db.ensure_tasks_db()
    conn = tasks_db.get_db_connection()
    conn.execute("DELETE FROM tasks")
    conn.commit()
    conn.close()
