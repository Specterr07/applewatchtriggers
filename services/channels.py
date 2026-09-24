"""
Channels service
----------------
Provides unified abstractions for outbound messaging (`send_to_user`) across
supported messaging channels (currently Telegram).
"""

from services import channels_db, telegram


def send_to_user(user_id: int, text: str) -> dict:
    """
    Sends a message to the user on their linked channel.
    Raises RuntimeError if no channel is linked or if delivery fails.
    """
    channels_db.ensure_channels_db()
    link = channels_db.get_user_channel_link(user_id, "telegram")
    if not link:
        raise RuntimeError("No channel linked for user")

    chat_id = link["channel_user_id"]
    return telegram.send_message(chat_id, text)
