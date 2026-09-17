"""
Audio storage - Tigris (Fly.io's S3-compatible object storage), via boto3.

Only the compressed voice-note audio ever reaches here (see
services/audio_compression.py); this module just knows how to put it in
the bucket, get a temporary link to play it back, and take it out again.
"""

import os
import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_ENDPOINT_URL_S3 = os.environ.get("AWS_ENDPOINT_URL_S3")
BUCKET_NAME = os.environ.get("BUCKET_NAME")

# How long a playback link stays valid. Regenerated fresh every time
# GET /api/notes is called, so it only needs to outlive one page view -
# not be a permanent link stored anywhere.
PRESIGNED_URL_EXPIRY_SECONDS = 3600


def _get_client():
    if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, BUCKET_NAME]):
        raise RuntimeError(
            "Tigris storage isn't configured - AWS_ACCESS_KEY_ID, "
            "AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, and BUCKET_NAME "
            "must all be set as environment variables."
        )
    return boto3.client(
        "s3",
        endpoint_url=AWS_ENDPOINT_URL_S3,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name="auto",
        # Tigris isn't AWS, so it needs SigV4 explicitly - boto3's legacy
        # default (SigV2, in regions that still support it) doesn't apply
        # here, and presigned URLs would come out invalid without this.
        config=Config(signature_version="s3v4"),
    )


def new_audio_key():
    """A unique object key for one note's compressed audio file."""
    return f"notes/{uuid.uuid4().hex}.mp3"


def upload_audio(key, audio_bytes):
    """Uploads compressed audio bytes to Tigris under `key`."""
    try:
        client = _get_client()
        client.put_object(Bucket=BUCKET_NAME, Key=key, Body=audio_bytes, ContentType="audio/mpeg")
    except (BotoCoreError, ClientError) as e:
        raise RuntimeError(f"Could not upload audio to storage: {e}")


def delete_audio(key):
    """Deletes one audio object from Tigris. (S3 DELETE is a no-op if it's already gone.)"""
    try:
        client = _get_client()
        client.delete_object(Bucket=BUCKET_NAME, Key=key)
    except (BotoCoreError, ClientError) as e:
        raise RuntimeError(f"Could not delete audio from storage: {e}")


def presigned_audio_url(key):
    """
    A temporary URL the browser can use to play one note's audio.
    Generated fresh on every read rather than stored, since a stored
    "permanent" URL would just be a presigned one that quietly expires -
    the object key (stable) is what's actually kept in notes.db.
    """
    try:
        client = _get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": key},
            ExpiresIn=PRESIGNED_URL_EXPIRY_SECONDS,
        )
    except (BotoCoreError, ClientError) as e:
        raise RuntimeError(f"Could not create an audio playback link: {e}")
