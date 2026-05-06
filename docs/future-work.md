# Future work — parked ideas

Ideas worth doing but not yet scheduled. Each entry should explain *why* it's parked (cost, dependency, low priority, design uncertainty) so future-Michael knows whether to revive it. Newest entries at the top.

Grouped roughly by size: **UX improvements** (half a day to a day), **architecture decisions** (multi-day, design-heavy), **conversation features** (variable, design-heavy).

---

## UX improvements

### Re-synthesis fallback for replay on resumed sessions

**Idea:** Replay button currently only appears for AI messages whose audio was synthesized in the current component instance (cache lives in a `useRef` Map). Resume a saved session from the library and the cache is empty — no replay buttons appear even for messages that have full text.

**Why parked:** scope creep at the time. The current behavior is honest (the button reflects actual cache state) but disappointing for resumed sessions, which are exactly when you'd want to re-listen.

**When to revive:** when students start using Save & Exit / library resume regularly. Fix is to re-synthesize on first replay click for resumed messages, then cache the result. Adds a TTS round-trip on first click (couple of seconds), free thereafter.

### Push-to-talk toggle alternative

**Idea:** Spacebar is hold-to-talk. For younger learners or users with motor difficulties, click-to-start / click-to-stop is friendlier. Settings option to switch between hold and toggle modes.

**Why parked:** out of scope for the streaming pipeline work. UX-only change, no architectural impact.

**When to revive:** when a student or teacher reports the hold gesture as friction.

### Visualizer reacts during replay

**Idea:** The voice-rings visualizer sits idle while replay audio plays because the AnalyserNode isn't hooked up to the replay audio element. Connecting it would make the visualizer ripple in time with replay too.

**Why parked:** the message-level visual indicator (sage left border + "REPLAYING" status word) provides enough feedback that the audio is playing. Hooking the analyser would be ~15 lines but adds complexity to the replay teardown path.

**When to revive:** if "is anything actually playing?" feedback feels weak in observed use.

### Per-provider timeout / retry policy

**Idea:** Wrap each provider's streaming fetch in a uniform `AbortSignal.timeout(20000)` plus 1 retry on network errors. Currently a flaky provider call (Groq sometimes drops mid-SSE) hangs the whole turn until the user hits Esc.

**Why parked:** has been working OK so far. Adds nontrivial state machinery (distinguishing retryable network errors from real provider errors, deciding whether to replay tokens already received before the disconnect).

**When to revive:** first time a student reports "the AI just stopped" with no error in the toast. Likely manifests on cellular networks more than wifi.

---

## Architecture decisions

### Web Speech fallback — wire it up or delete it

**Idea:** `src/renderer/services/webspeech.ts` was the original justification for choosing Electron over Tauri (browser-context Web Speech API for system-voice TTS/STT fallback), but it's never been wired into the conversation flow. Two paths:

1. **Wire it as a third-tier fallback** behind cloud and embedded — if both fail, use system voices via Web Speech API. ~2 hours to wire properly into `speechProvider.ts`.
2. **Delete the file** — accepts that the Electron-vs-Tauri justification was aspirational, not load-bearing. ~10 minutes.

**Why parked:** decision needed about whether the Electron-only justification still matters strategically. Connects to the Tauri migration question below — they're really one decision.

**When to revive:** when the orphan cleanup happens, or when the Tauri question gets re-evaluated.

### Tauri migration

**Idea:** Port from Electron 28 to Tauri 2 (Rust + WebView). Smaller binaries (~5MB vs ~150MB), better native integration, modern stack.

**Why parked:** original analysis (see Dexter inspiration in commit history) flagged the Web Speech fallback as the main blocker. That fallback turns out to be aspirational, so the blocker is dissolved — but the migration is still a multi-day rewrite touching the entire main process (sqlite, embedded server lifecycle, code signing, notarization, auto-updater path, GitHub Actions matrix). Not worth doing for its own sake.

**When to revive:** if Electron 28→34+ bump (already parked separately) becomes painful enough that "just rewrite the main process" looks comparable in effort.

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
