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
2. **Benchmark gate** — *run Oct 2026; harness: `bench.html` + `src/bench/bench.ts` + `scripts/bench-electron.mjs` (models mirrored by `scripts/fetch-bench-models.mjs`). Results on an 8-core macOS machine, real 30s speech passage rendered by Kokoro, warm runs, WASM:*
   - **STT: PASS.** transformers.js whisper-tiny q8 transcribes 30s in **~3.0s (RTF 0.10)**, single-thread; 4 threads made no difference. Transcription near-verbatim. Gate was RTF ≤ 0.2 — clears with 2× headroom.
   - **TTS: FAIL.** kokoro-js (same Kokoro-82M the Speaches path serves) q8/WASM synthesizes a 5–6s sentence in **4.5–9s (RTF ~1.2–1.5)** against a 1s per-sentence budget — the streamed reply would stall between sentences. WebGPU (fp16) could not initialize under ORT-web; even a large GPU win wouldn't clear the gate, and GPU backends aren't a dependable default across the student fleet.
   - **Decision: split the retirement.** STT leaves the sidecar (phase 3 unchanged). TTS stays native — but the Python still goes: phase 4 becomes *Piper-as-standalone-binary* (the `piper` executable has no Python dependency; voices stay alan/amy), shrinking the sidecar from ~500MB venv + PyInstaller to a ~40MB binary + voice ONNX files with no venv, pip, or AV-flagged PyInstaller bundle.
3. **`embedded-wasm` STT Provider** — *Shipped.* transformers.js whisper-tiny q8 in an inlined Web Worker behind the `STTConfig` union (`provider: 'wasm'`); models (~40MB) downloaded to `userData` by the main process with SHA-pinned weights + progress events; served to the worker through the privileged `tb-models://` protocol plus a token-guarded 127.0.0.1 asset server (Chromium's module loader only imports http(s), and transformers.js existence probes reject non-http URLs — both discovered the hard way). Verified end-to-end (`verify-stt.html` + `scripts/verify-wasm-stt.mjs`): main-process download → protocol → worker → verbatim transcription of a Kokoro-synthesized sentence. Known tradeoff: transformers.js has no `initial_prompt` yet, so Scenario vocabulary hints are a no-op on this provider (they still bias embedded/Speaches). Follow-up for the next packaged build: confirm the blob-worker + loopback path under `file://` (dev verification ran over http; the code paths are identical but unbuilt).
4. **Piper-binary TTS Provider** — *Shipped.* Standalone `piper` executable (rhasspy 2023.11.14-2 releases — no Python) spawned per utterance by the main process behind the `TTSConfig` union (`provider: 'piper'`); same alan/amy voices (SHA-pinned against setup.sh's values — which still match at the HF repo's *new* `en/en_GB/...` layout; the restructure had silently broken the legacy setup.sh URLs, fixed in passing). Platform recipe: linux/windows archives are self-contained; **macOS archives omit their dylibs**, so the same-train `piper-phonemize` release supplies them, loaded via `DYLD_LIBRARY_PATH` (native arm64 — recipe validated by hand before implementation: RTF 0.046). Verified end-to-end (`verify-piper.html` + `scripts/verify-piper.mjs`): ensure (download+extract+sha-verify) → `piper:speak` IPC → both voices produce real audio, warm synthesis RTF ~0.13, comfortably inside the 1s sentence budget.
5. **Delete** — *Shipped.* `embedded-server/` (Python, venv flow, PyInstaller CI jobs, ffmpeg) deleted; the `extraResources` server bundle removed from electron-builder; the workflow's per-OS PyInstaller steps gone (release builds are Electron-only now). The old `embedded` Provider slot migrates to `wasm`/`piper` at startup (main-process pref migration + defensive resolution in `resolveSTT`/`resolveTTS`), so existing installs keep their offline-speech behaviour — they just see a one-time model download on the new Built-in option. Settings shows two Providers per subsystem (Built-in + Speaches); Diagnostics, glossary, README, and CONTEXT.md's domain language updated ("in-app engine" replaces "embedded server").

**What we give up:** nothing for STT (WASM whisper-tiny matches the quality bar at conversational latencies); the exact Piper voices are *kept* under the revised phase 4. **What we gain:** zero-install offline STT on first launch, no venv/AV/ffmpeg support surface, smaller CI matrix, and a TTS sidecar that is a single binary instead of a Python runtime. The Provider seam (`resolveSTT`/`resolveTTS`) makes every phase invisible to the TurnEngine; a full-Rust-sidecar pivot remains the fallback if a future TTS quality/latency jump (e.g. Kokoro native via `ort`) is wanted.

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
