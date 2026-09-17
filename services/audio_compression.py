"""
Audio compression (ffmpeg)
--------------------------
Re-encodes an uploaded voice recording to a small, low-bitrate mono
file before it's ever stored. The original high-quality upload is
never written anywhere permanent - only the compressed bytes this
module produces reach Tigris.
"""

import os
import subprocess
import tempfile

# Speech doesn't need music-quality audio. Mono + a low bitrate keeps
# these small (a couple of minutes of talking fits in well under 1 MB)
# without hurting a human ear's - or Whisper's - ability to make it out.
OUTPUT_BITRATE = "32k"
FFMPEG_TIMEOUT_SECONDS = 60


def compress_audio(input_bytes, input_suffix=".webm"):
    """
    Re-encodes raw audio bytes to a mono, low-bitrate MP3 via ffmpeg.
    Returns the compressed bytes.

    Writes to temp files instead of piping through ffmpeg's stdin/stdout
    because ffmpeg's format auto-detection is more reliable against a
    real file than a bare byte stream - and both temp files are removed
    in `finally`, so the original recording never lingers on disk.
    """
    in_path = None
    out_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=input_suffix, delete=False) as in_file:
            in_file.write(input_bytes)
            in_path = in_file.name

        out_path = in_path + "-compressed.mp3"

        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", in_path,
                "-ac", "1",  # mono
                "-b:a", OUTPUT_BITRATE,
                "-f", "mp3",
                out_path,
            ],
            capture_output=True,
            timeout=FFMPEG_TIMEOUT_SECONDS,
        )
        if result.returncode != 0:
            # Most likely an empty/corrupt recording ffmpeg can't decode -
            # surface ffmpeg's own explanation rather than a bare failure.
            stderr_tail = result.stderr.decode(errors="replace")[-500:]
            raise RuntimeError(f"Could not process this recording: {stderr_tail}")

        with open(out_path, "rb") as f:
            return f.read()
    except FileNotFoundError:
        # ffmpeg itself isn't installed/on PATH - a deployment problem,
        # not a bad recording, so say so clearly instead of a generic error.
        raise RuntimeError("ffmpeg is not installed on this server")
    except subprocess.TimeoutExpired:
        raise RuntimeError("Compressing this recording took too long")
    finally:
        for path in (in_path, out_path):
            if path and os.path.exists(path):
                os.remove(path)
