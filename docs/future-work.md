# Future work — parked ideas

Ideas worth doing but not yet scheduled. Each entry should explain *why* it's parked (cost, dependency, low priority, design uncertainty) so future-Michael knows whether to revive it. Newest entries at the top.

Grouped roughly by size: **architecture decisions** (multi-day, design-heavy), **conversation features** (variable, design-heavy).

---

## Architecture decisions

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
