"""
Which timezone "now" means for every timestamp this app writes or reads.
"""

import os
from datetime import datetime
from zoneinfo import ZoneInfo

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
    attached). Naive on purpose: both tasks.db and planner.csv only ever
    store a plain "YYYY-MM-DD HH:MM:SS" (or date) string, so every place
    that reads or writes it needs to agree on ONE timezone's wall clock -
    this is it. Using this everywhere instead of datetime.now() means
    "now" no longer depends on which machine (your Mac vs. the Fly
    container) happens to run it.
    """
    return datetime.now(TIMEZONE).replace(tzinfo=None)
