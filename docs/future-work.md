# Future work — parked ideas

Ideas worth doing but not yet scheduled. Each entry should explain *why* it's parked (cost, dependency, low priority, design uncertainty) so future-Michael knows whether to revive it.

## Conversation rewind / branch

**Idea:** Let the user click an earlier turn in the transcript and "resume from here" — effectively forking the conversation at that point and trying a different reply.

**Why this is interesting (especially for ESL students):**
- "What if I had said it more politely?" → practice a different register without restarting the whole scenario
- "I want to try the same opening again with a different vocabulary choice"
- Teachers can use it to demonstrate alternatives mid-session

**Why it's parked:**
- Conversations are stochastic — replaying turn N with a different user input doesn't reproduce the original AI response, it generates a new one. So this isn't "rewind" in the time-travel sense; it's branching.
- Schema implications: a session becomes a tree, not a list. Need to decide whether to store branches as separate sessions, sibling threads under one session, or something else.
- UI implications: the transcript view needs to show "you are on branch B" indicators, let users navigate between branches, possibly compare them.
- The single-line **rehear** action (replay the audio of an earlier AI message in place) gets ~80% of the practical value with ~5% of the complexity, and is being shipped first. Branch can wait until rehear's usage data shows whether the deeper version is worth building.

**When to revive:** if students start asking "I wish I could try that turn again differently," or if a teacher's classroom workflow demands it.

---

(Add new entries above. Keep it short and motivated — if an idea isn't worth a paragraph of "why," it isn't worth parking.)
