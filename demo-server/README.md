# Talk Buddy demo proxy

A single-file, zero-dependency Node 18+ server that lets the browser demo
(`docs/demo/index.html`, served by GitHub Pages) hold spoken panel-interview
conversations through your own Ollama instance.

Why a server at all: GitHub Pages is static — it cannot keep a secret. The
Ollama bearer key therefore lives **here**, in this process's environment,
never in the page.

## What it does

| Route        | Purpose                                                                    |
|--------------|----------------------------------------------------------------------------|
| `POST /api/chat` | Prepends the Panel Interview director prompt, forwards the turn to Ollama (`think` off), returns the reply |
| `GET /api/health` | Liveness check                                                         |
| `GET /go`    | Counts a download-button click, then 302s to the GitHub release (conversion metric) |

Hard limits: per-IP rate limit (default 30 chats/hour), message count and
length caps, 64 KB body cap, 90 s upstream timeout. **Transcripts are never
logged or stored** — logs carry counts, IPs, statuses, and timings only.

## Run it on the VPS

```bash
# 1. Copy server.js to the VPS, e.g. /opt/talkbuddy-demo/server.js

# 2. Smoke-test by hand (adjust model name to match `ollama list`):
OLLAMA_URL=http://127.0.0.1:11434 \
OLLAMA_KEY=your-bearer-key \
OLLAMA_MODEL=gemma4 \
PORT=8787 \
node server.js

# 3. Try it:
curl -s http://localhost:8787/api/health
curl -s -X POST http://localhost:8787/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Hello, I am ready for my interview."}]}'
```

### Keep it running (systemd)

`/etc/systemd/system/talkbuddy-demo.service`:

```ini
[Unit]
Description=Talk Buddy demo proxy
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/talkbuddy-demo/server.js
Environment=OLLAMA_URL=http://127.0.0.1:11434
Environment=OLLAMA_KEY=CHANGE_ME
Environment=OLLAMA_MODEL=gemma4
Environment=ALLOWED_ORIGIN=https://talkbuddy.borck.education
Environment=PORT=8787
Restart=always
User=nobody
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now talkbuddy-demo
```

### TLS in front (required — the page is HTTPS)

The demo page calls `https://demo.talkbuddy.borck.education`, so the subdomain
needs TLS. Caddy does it automatically — first add a DNS `A` record for
`demo.talkbuddy.borck.education` pointing at the VPS, then one block in the
Caddyfile:

```
demo.talkbuddy.borck.education {
    reverse_proxy 127.0.0.1:8787
}
```

nginx equivalent: a TLS server block for the same hostname with
`proxy_pass http://127.0.0.1:8787;` and
`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
(the rate limiter keys off that header).

## Point the page at it

In `docs/demo/index.html`, one line near the top of the script:

```js
const PROXY_BASE = 'https://demo.YOUR-DOMAIN';
```

Commit and push — GitHub Pages redeploys the site automatically.

## Tuning knobs (env vars)

| Var                   | Default                          | Notes                                    |
|-----------------------|----------------------------------|------------------------------------------|
| `OLLAMA_URL`          | — (required)                     | Your Ollama, or a reverse-proxied URL    |
| `OLLAMA_KEY`          | — (optional)                     | Sent as `Authorization: Bearer …`        |
| `OLLAMA_MODEL`        | `gemma4`                         | Must match `ollama list`                 |
| `THINK`               | `false`                          | `true` enables gemma's thinking mode     |
| `RATE_LIMIT_PER_HOUR` | `30`                             | Chats per IP per rolling hour            |
| `ALLOWED_ORIGIN`      | `https://talkbuddy.borck.education` | CORS lock — the only origin allowed   |

## Checking the funnel

`journalctl -u talkbuddy-demo | grep -E 'chat |go '` gives two numbers:
`total=` chats served and `total=` download clicks. Chats → clicks is your
teaser conversion rate. No transcript content appears in logs, by design.
