"""
Telegram & messaging channels routes.

Endpoints:
- POST /telegram/webhook: Receives incoming updates from Telegram Bot API.
- POST /api/channels/telegram/link: Generates one-time link code & t.me URL.
- POST /api/channels/test: Sends test message to linked user.
"""

from datetime import datetime, timedelta
import secrets

from flask import Blueprint, jsonify, request

from services import channels, channels_db, telegram
from services.auth import require_key
from services.note_pipeline import save_voice_note
from services.time import TIMEZONE, local_now

telegram_bp = Blueprint("telegram", __name__)


def _is_code_valid(code_row, now_dt: datetime) -> bool:
    if not code_row or code_row["used_at"] is not None:
        return False
    try:
        created_dt = datetime.strptime(code_row["created_at"], "%Y-%m-%d %H:%M:%S")
        diff = now_dt - created_dt
        return timedelta(0) <= diff <= timedelta(minutes=10)
    except Exception:
        return False


@telegram_bp.route("/telegram/webhook", methods=["POST"])
def telegram_webhook():
    """
    Receives incoming webhook updates from Telegram.
    Validates secret header: X-Telegram-Bot-Api-Secret-Token
    """
    expected_secret = telegram.TELEGRAM_WEBHOOK_SECRET
    if expected_secret:
        received_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if received_secret != expected_secret:
            return jsonify({"ok": False, "message": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    update_id = payload.get("update_id")
    if update_id is None:
        return jsonify({"ok": True, "message": "No update_id"}), 200

    channels_db.ensure_channels_db()
    now_str = local_now().strftime("%Y-%m-%d %H:%M:%S")

    # Idempotency check: ignore already seen updates
    if not channels_db.record_seen_update(update_id, now_str):
        return jsonify({"ok": True, "message": "Already processed"}), 200

    message = payload.get("message")
    if not message:
        return jsonify({"ok": True, "message": "Ignored non-message update"}), 200

    chat = message.get("chat", {})
    chat_id = chat.get("id")
    if not chat_id:
        return jsonify({"ok": True}), 200

    text = message.get("text", "").strip()

    # 1. Check if user is initiating the link handshake: /start <code_or_empty>
    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        start_param = parts[1].strip() if len(parts) > 1 else ""

        if not start_param:
            telegram.send_message(chat_id, "Welcome! Link this chat from the Notes tab in your web app.")
            return jsonify({"ok": True}), 200

        now_dt = local_now()
        code_row = channels_db.get_link_code(start_param)
        if not _is_code_valid(code_row, now_dt):
            telegram.send_message(chat_id, "Link expired, get a new one from the app")
            return jsonify({"ok": True}), 200

        user_id = code_row["user_id"]
        channels_db.set_user_channel_link(user_id, "telegram", str(chat_id), now_str)
        channels_db.mark_link_code_used(start_param, now_str)
        telegram.send_message(chat_id, "Connected ✅")
        return jsonify({"ok": True}), 200

    # 2. Check if this chat_id is linked to user
    link = channels_db.get_channel_link_by_channel_user("telegram", str(chat_id))
    if not link:
        telegram.send_message(chat_id, "This chat isn't linked")
        return jsonify({"ok": True}), 200

    # 3. Check if it is a voice note
    voice = message.get("voice") or message.get("audio")
    if not voice:
        telegram.send_message(chat_id, "Send me a voice note")
        return jsonify({"ok": True}), 200

    file_id = voice.get("file_id")
    if not file_id:
        telegram.send_message(chat_id, "Couldn't save that, try again")
        return jsonify({"ok": True}), 200

    try:
        audio_bytes = telegram.download_voice(file_id)
        # Telegram voice notes are usually .oga / .ogg (Opus)
        note = save_voice_note(audio_bytes, "telegram_voice.oga")
        transcript = note.get("transcript", "")
        telegram.send_message(chat_id, f"Saved ✅\n\n{transcript}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        telegram.send_message(chat_id, f"Couldn't save that: {e}")

    return jsonify({"ok": True}), 200


@telegram_bp.route("/api/channels/telegram/link", methods=["POST"])
@require_key
def create_telegram_link():
    """
    Generates a 10-minute one-time code and returns the t.me link.
    """
    channels_db.ensure_channels_db()
    code = f"lnk_{secrets.token_hex(4)}"
    now_str = local_now().strftime("%Y-%m-%d %H:%M:%S")
    # For now, single user prototype -> user_id = 1
    user_id = 1
    channels_db.save_link_code(code, user_id, now_str)

    bot_username = telegram.TELEGRAM_BOT_USERNAME or ""
    # Clean @ prefix if user provided it with @
    if bot_username.startswith("@"):
        bot_username = bot_username[1:]

    link_url = f"https://t.me/{bot_username}?start={code}" if bot_username else ""

    return jsonify({
        "ok": True,
        "code": code,
        "link_url": link_url,
        "expires_in_minutes": 10,
    }), 201


@telegram_bp.route("/api/channels/test", methods=["POST"])
@require_key
def send_test_message():
    """
    Sends a test message to user 1's linked channel.
    """
    user_id = 1
    try:
        channels.send_to_user(user_id, "Test ✅")
        return jsonify({"ok": True, "message": "Test message sent"}), 200
    except RuntimeError as e:
        return jsonify({"ok": False, "message": str(e)}), 400
