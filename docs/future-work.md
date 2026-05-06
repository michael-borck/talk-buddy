# Future work — parked ideas

Ideas worth doing but not yet scheduled. Each entry should explain *why* it's parked (cost, dependency, low priority, design uncertainty) so future-Michael knows whether to revive it. Newest entries at the top.

Grouped roughly by size: **architecture decisions** (multi-day, design-heavy), **conversation features** (variable, design-heavy).

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
