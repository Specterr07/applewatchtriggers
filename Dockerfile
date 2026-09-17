# ---- Stage 1: build the React/tldraw canvas app ----
# This stage installs Node + npm packages and runs the Vite build.
# None of this (node_modules, npm, source .tsx files) ends up in the
# final image - only the compiled output does.
FROM node:20-slim AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .
RUN npm run build
# Output lands in /frontend/dist


# ---- Stage 2: the actual Flask app ----
FROM python:3.12-slim

WORKDIR /app

# ffmpeg re-encodes voice notes to a small, low-bitrate file before
# storage (services/audio_compression.py) - python:3.12-slim doesn't
# ship it, so it has to come from apt. Cleaning up the apt lists after
# install keeps them from bloating the image.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY app.py .
COPY routes ./routes
COPY services ./services
COPY static ./static

# Copy ONLY the compiled canvas app from stage 1 - no Node, no npm,
# no source files end up in this final image.
COPY --from=frontend-build /frontend/dist ./canvas_dist

EXPOSE 8080

# --timeout 120: POST /api/notes does upload + Groq transcription +
# ffmpeg compression + a Tigris upload all in one request. gunicorn's
# 30s default is comfortable for everything else in this app but too
# tight for a longer voice note - a killed worker there would look like
# a failed save, not a fast one.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--timeout", "120", "app:app"]
