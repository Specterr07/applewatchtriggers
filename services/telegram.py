"""
Telegram Bot API client
-----------------------
Handles interacting with the Telegram Bot API:
- sending text messages (`send_message`)
- downloading voice notes (`download_voice`)
- setting up webhook (`set_webhook`)

All calls use Python standard library urllib to avoid extra dependencies.
"""

import json
import os
import urllib.parse
import urllib.request

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_BOT_USERNAME = os.environ.get("TELEGRAM_BOT_USERNAME")
TELEGRAM_WEBHOOK_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET")

TELEGRAM_API_BASE = "https://api.telegram.org"


def _bot_url(method: str) -> str:
    token = os.environ.get("TELEGRAM_BOT_TOKEN") or TELEGRAM_BOT_TOKEN
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    return f"{TELEGRAM_API_BASE}/bot{token}/{method}"


def _file_url(file_path: str) -> str:
    token = os.environ.get("TELEGRAM_BOT_TOKEN") or TELEGRAM_BOT_TOKEN
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    return f"{TELEGRAM_API_BASE}/file/bot{token}/{file_path}"


def send_message(chat_id: str | int, text: str) -> dict:
    """
    Sends a plain text message to the specified Telegram chat_id.
    """
    url = _bot_url("sendMessage")
    payload = json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            if not result.get("ok"):
                raise RuntimeError(f"Telegram API error: {result.get('description')}")
            return result
    except Exception as e:
        raise RuntimeError(f"Failed to send Telegram message: {e}")


def get_file_info(file_id: str) -> dict:
    """
    Calls getFile to fetch file metadata (including file_path) from Telegram.
    """
    url = _bot_url("getFile")
    payload = json.dumps({"file_id": file_id}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            if not result.get("ok") or "result" not in result:
                raise RuntimeError(f"Telegram getFile error: {result.get('description')}")
            return result["result"]
    except Exception as e:
        raise RuntimeError(f"Failed to get file info from Telegram: {e}")


def download_voice(file_id: str) -> bytes:
    """
    Downloads audio bytes for a voice note by file_id from Telegram servers.
    """
    file_info = get_file_info(file_id)
    file_path = file_info.get("file_path")
    if not file_path:
        raise RuntimeError("Telegram getFile did not return a file_path")

    download_url = _file_url(file_path)
    req = urllib.request.Request(download_url)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.read()
    except Exception as e:
        raise RuntimeError(f"Failed to download audio from Telegram: {e}")


def set_webhook(webhook_url: str, secret_token: str) -> dict:
    """
    Configures Telegram bot webhook URL with secret_token.
    """
    url = _bot_url("setWebhook")
    payload = json.dumps({
        "url": webhook_url,
        "secret_token": secret_token,
        "allowed_updates": ["message"],
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            if not result.get("ok"):
                raise RuntimeError(f"Telegram setWebhook error: {result.get('description')}")
            return result
    except Exception as e:
        raise RuntimeError(f"Failed to set Telegram webhook: {e}")
