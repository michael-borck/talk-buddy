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

## Run it on the VPS (Docker)

The proxy ships as a tiny container (no dependencies beyond Node in the
image; nothing sensitive baked in — the key arrives via `.env`).

```bash
# 1. Clone / pull on the VPS
git pull   # from the repo root; demo-server/ holds everything

# 2. Configure (one-time)
cd demo-server
cp .env.example .env
nano .env            # OLLAMA_URL, OLLAMA_KEY, OLLAMA_MODEL

# 3. Build + run
docker compose up -d --build

# 4. Verify
curl -s http://localhost:8787/api/health
curl -s -X POST http://localhost:8787/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Hello, I am ready for my interview."}]}'
```

Later updates are exactly:

```bash
git pull && cd demo-server && docker compose up -d --build
```

The container publishes port 8787 on all host interfaces so containerised
Caddy on the same host can reach it via `host.docker.internal`
(host-gateway); a loopback-only bind would refuse. Caddy remains the public
front door (see TLS below).

### Keep it running

`compose.yaml` sets `restart: unless-stopped`, so the container survives
reboots. Logs (counts only, never transcripts):

```bash
docker compose logs -f demo-proxy
```

### TLS in front (required — the page is HTTPS)

The demo page calls `https://demo.talkbuddy.borck.education`, so the subdomain
needs TLS. Caddy does it automatically — first add a DNS `A` record for
`demo.talkbuddy.borck.education` pointing at the VPS, then one block in the
Caddyfile:

```
demo.talkbuddy.borck.education {
    reverse_proxy host.docker.internal:8787
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
}
```

Caddy runs in Docker here, so the upstream is `host.docker.internal`, not
`127.0.0.1`. The `tls` block uses DNS-01 (the convention for every host in
the Caddyfile) — required anyway because the name is two labels deep, which
Cloudflare Universal SSL can't cover; the A record stays unproxied, as with
`app.slidestream.borck.education`.

nginx equivalent: a TLS server block for the same hostname with
`proxy_pass http://127.0.0.1:8787;` and
`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
(the rate limiter keys off that header).

DNS: an `A` record `demo.talkbuddy.borck.education → 31.97.67.189` already
exists in Cloudflare (unproxied, matching the other VPS apps).

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

`docker compose logs --since 24h demo-proxy | grep -E 'chat |go '` gives two
numbers: `total=` chats served and `total=` download clicks. Chats → clicks
is your teaser conversion rate. No transcript content appears in logs, by
design.
