#!/usr/bin/env python3
"""Voicebox round-trip diagnostic: TTS a sentence, then STT it back.

Proves the whole voice chain with REAL audio — no browser, no demo proxy:
  1. list voice profiles, pick the first
  2. POST /generate (TTS) and collect the audio (direct bytes, or poll the
     async queue for a generation id)
  3. POST /transcribe (STT) with that audio
  4. print the transcript — should match (roughly) the input sentence

Run from demo-server/ so .env supplies SPEECH_* values:
  python3 roundtrip.py
Stdlib only; works on Python 3.8+.
"""

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

SENTENCE = ("Good morning, thank you for joining us. I am Ms. Alvarez, "
            "the program director, and this is my colleague Dr. Chen.")


def load_env(path=".env"):
    env = {}
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k] = v
    return env


ENV = load_env()
BASE = (sys.argv[1] if len(sys.argv) > 1 else ENV.get("SPEECH_URL", "")).rstrip("/")
KEY = ENV.get("SPEECH_KEY", "")
MODEL = ENV.get("SPEECH_MODEL", "whisper-turbo")

if not BASE:
    sys.exit("No SPEECH_URL found — run from demo-server/ or pass the base URL.")


def request(path, method="GET", data=None, headers=None, timeout=120):
    """Returns (status, content_type, body). Never raises on HTTP errors."""
    h = {"Authorization": f"Bearer {KEY}"}
    if headers:
        h.update(headers)
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, resp.headers.get("Content-Type", ""), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", ""), e.read()
    except Exception as e:  # noqa: BLE001 — diagnostics: show everything
        return 0, "", str(e).encode()


def as_json(body):
    try:
        return json.loads(body.decode())
    except Exception:  # noqa: BLE001
        return None


def multipart(fields, files):
    """files: list of (field_name, filename, mime, bytes)."""
    b = "----roundtrip" + str(int(time.time() * 1000))
    parts = []
    for name, value in fields:
        parts.append(
            f"--{b}\r\nContent-Disposition: form-data; "
            f"name=\"{name}\"\r\n\r\n{value}\r\n".encode()
        )
    for name, filename, mime, blob in files:
        parts.append(
            f"--{b}\r\nContent-Disposition: form-data; name=\"{name}\"; "
            f"filename=\"{filename}\"\r\nContent-Type: {mime}\r\n\r\n".encode()
        )
        parts.append(blob)
        parts.append(b"\r\n")
    parts.append(f"--{b}--\r\n".encode())
    body = b"".join(parts)
    return body, f"multipart/form-data; boundary={b}"


print(f"Voicebox: {BASE}  (model: {MODEL})")

# ---- 1. Voice profiles ------------------------------------------------------
status, _, body = request("/profiles")
profiles = as_json(body) or []
if isinstance(profiles, dict):
    profiles = profiles.get("profiles") or profiles.get("data") or []
print(f"\n[1] /profiles → {status}, {len(profiles)} profile(s)")
if not profiles:
    sys.exit("No voice profiles — create one in the voicebox UI first.")
for p in profiles[:5]:
    print(f"    · {p.get('name', '?')}  (id={p.get('id', '?')})")
profile_id = profiles[0].get("id")
profile_name = profiles[0].get("name", "first")
print(f"    using: {profile_name}")

# ---- 2. Generate speech -----------------------------------------------------
status, ctype, body = request(
    "/generate",
    method="POST",
    data=json.dumps({"text": SENTENCE, "profile_id": profile_id, "language": "en"}).encode(),
    headers={"Content-Type": "application/json"},
)
print(f"\n[2] /generate → {status} ({ctype})")
audio = None
if ctype.startswith("audio/"):
    audio = body
else:
    data = as_json(body)
    if data is None:
        print("    response was not JSON:", body[:300])
        sys.exit(1)
    print("    response:", json.dumps(data)[:400])
    gen_id = data.get("id") or data.get("generation_id") or (data.get("generation") or {}).get("id")
    if not gen_id:
        sys.exit("No generation id in response — paste the printed JSON and we'll adapt.")

    # Async queue: poll until the generation is ready.
    for attempt in range(30):
        s, _, gb = request(f"/generations/{gen_id}")
        gd = as_json(gb) or {}
        state = str(gd.get("status") or gd.get("state") or "").lower()
        print(f"    poll {attempt + 1}: /generations/{gen_id} → {s} status={state or '?'}")
        if state in ("ready", "completed", "complete", "done", "succeeded"):
            break
        if s == 404:
            break  # status endpoint doesn't exist here
        time.sleep(2)

    # Try known audio locations.
    for cand in (
        f"/generations/{gen_id}/audio",
        f"/generation/{gen_id}/audio",
        f"/generations/{gen_id}/file",
        f"/generations/{gen_id}/download",
        f"/audio/{gen_id}",
        f"/files/{gen_id}",
    ):
        s, c, ab = request(cand)
        print(f"    try {cand} → {s} ({c})")
        if s == 200 and (c.startswith("audio/") or ab[:4] in (b"RIFF", b"OggS", b"\xff\xfb", b"ID3")):
            audio = ab
            break

if not audio:
    sys.exit("Could not obtain audio — paste the output above and we'll adapt.")

ext = "wav" if audio[:4] == b"RIFF" else "mp3" if audio[:3] == b"ID3" or audio[:2] == b"\xff\xfb" else "bin"
path = f"/tmp/roundtrip.{ext}"
open(path, "wb").write(audio)
print(f"    saved {len(audio)} bytes → {path}")

# ---- 3. Transcribe it back --------------------------------------------------
fields = [("model", MODEL)]
files = [
    ("audio", f"roundtrip.{ext}", "audio/wav" if ext == "wav" else "audio/mpeg", audio),
    ("file", f"roundtrip.{ext}", "audio/wav" if ext == "wav" else "audio/mpeg", audio),
]
mp, ctype = multipart(fields, files)
status, _, body = request("/transcribe", method="POST", data=mp, headers={"Content-Type": ctype})
print(f"\n[3] /transcribe → {status}")
print("    transcript:", body.decode()[:300])

print("\nDone. If the transcript resembles the sentence, voicebox STT+TTS are healthy.")
