# Future work — parked ideas

Ideas worth doing but not yet scheduled. Each entry should explain *why* it's parked (cost, dependency, low priority, design uncertainty) so future-Michael knows whether to revive it. Newest entries at the top.

Grouped roughly by size: **architecture decisions** (multi-day, design-heavy), **conversation features** (variable, design-heavy).

---

## Architecture decisions

### Replace the Python embedded server with in-renderer speech (plan approved, in progress)

**Idea:** Kill the Python venv sidecar (~500MB download + setup step, PyInstaller AV false-positives on Windows, hidden ffmpeg runtime dependency, four per-OS CI jobs) by running speech ML directly in the Electron renderer — the same onnxruntime-web runtime already shipped for Silero VAD.

**Why this shape:** the sidecar's Python is only glue — the ML is already native (whisper.cpp via pywhispercpp, Piper ONNX voices). What Python buys (Flask + PyInstaller + nice bindings) costs more than it returns for whisper-**tiny**-quality offline STT. `@huggingface/transformers` runs Whisper in a Web Worker; `kokoro-js` runs the *same Kokoro model the Speaches cloud path already uses*. No native binaries, no model-format forks, identical behaviour on Win/Mac/Linux. Electron stays — its Chromium audio stack (consistent MediaRecorder/Web Audio across OSes, unlike system WebViews — the issue the brief Tauri evaluation hit), node:sqlite, safeStorage, and the updater pipeline are unrelated to speech.

**Phases (each independently shippable):**

1. **PCM capture refactor** — record 16kHz mono `Float32Array` via an AudioWorklet tap instead of MediaRecorder webm; ~20-line JS WAV encoder for upload paths. Kills ffmpeg everywhere: embedded server gets a 16k-mono-WAV fast path that hands the file straight to whisper.cpp (pywhispercpp reads WAV natively). *Shipped.*
2. **Benchmark gate** (½ day) — transformers.js whisper-tiny vs pywhispercpp-tiny on a 30s turn; kokoro-js sentence latency vs the TTSPipeline ~1s budget. *Decision gate: fail → pivot to a Rust sidecar (Handy's transcribe-cpp pattern); phases 3–5 unchanged.*
3. **`embedded-wasm` STT Provider** — new member of the `STTConfig` union; whisper-tiny in a Web Worker; model downloaded to `userData` with progress + SHA-pinning (reuse setup.sh's checksum discipline); vocabulary `initial_prompt` already flows. Python server stays selectable for a transition release.
4. **`embedded-wasm` TTS Provider** — kokoro-js in a worker behind TTSPipeline; voices `af_bella`/`am_adam` to match Speaches defaults, so built-in and cloud sound alike. Retires the Piper alan/amy voices.
5. **Delete** — `embedded-server/`, PyInstaller CI jobs, the setup modal, bearer-token plumbing; docs update.

**What we give up:** native whisper.cpp speed (WASM ~2–4× slower CPU-side; partially recoverable via WebGPU in Electron's Chromium), and the exact Piper voices (replaced by Kokoro). **What we gain:** zero install step (offline speech works on first launch), no AV flags, no ffmpeg, no venv support tickets, smaller CI matrix. The Provider seam (`resolveSTT`/`resolveTTS`) makes every phase invisible to the TurnEngine, and a Rust-sidecar pivot reuses phases 1, 3–5 unchanged.

### Tauri migration

**Idea:** Port from Electron 28 to Tauri 2 (Rust + WebView). Smaller binaries (~5MB vs ~150MB), better native integration, modern stack.

**Why parked indefinitely:** the original analysis (see Dexter inspiration in commit history) flagged the now-deleted Web Speech fallback as the only architectural reason to stay on Electron. With that gone, the reason-not-to dissolves — but no positive reason emerged either. The migration is a 1-2 week rewrite touching the entire main process (sqlite, embedded server lifecycle, code signing, notarization, auto-updater path, GitHub Actions matrix). Real user-facing benefit for ESL students: roughly zero — binary size doesn't matter for desktop installs, perceived performance is identical (both are Chromium rendering a React app), the rewrite cost is high. Pure engineer-aesthetic at this point.

**When to revive:** only if Electron 28→34+ bump (parked separately in project memory) becomes painful enough that "rewrite the main process" looks comparable in effort. Until then, this is not worth a session.

---

## Conversation features

### Conversation rewind / branch

**Idea:** Let the user click an earlier turn in the transcript and "resume from here" — effectively forking the conversation at that point and trying a different reply.

**Why this is interesting (especially for ESL students):**
- "What if I had said it more politely?" → practice a different register without restarting the whole scenario
- "I want to try the same opening again with a different vocabulary choice"
- Teachers can use it to demonstrate alternatives mid-session

**Why it's parked:**
- Conversations are stochastic — replaying turn N with a different user input doesn't reproduce the original AI response, it generates a new one. So this isn't "rewind" in the time-travel sense; it's branching.
- Schema implications: a session becomes a tree, not a list. Need to decide whether to store branches as separate sessions, sibling threads under one session, or something else.
- UI implications: the transcript view needs to show "you are on branch B" indicators, let users navigate between branches, possibly compare them.
- The single-line **rehear** action (replay the audio of an earlier AI message in place) gets ~80% of the practical value with ~5% of the complexity, and shipped first. Branch can wait until rehear's usage data shows whether the deeper version is worth building.

**When to revive:** if students start asking "I wish I could try that turn again differently," or if a teacher's classroom workflow demands it.

---

## Notes

- The user-level memory at `~/.claude/projects/-Users-michael-Projects-talk-buddy/memory/project_future_ideas.md` also tracks longer-standing project items (auto-updater, Electron major bumps, Dependabot config, portal app, dark mode, paper grain). That file is auto-loaded into every Claude session for this project; this doc is for human-readable in-repo reference. There's some duplication risk — periodically reconcile.
