# Conversation branching ("Try this turn differently") — design + implementation plan

> Status: design draft. This plan is intentionally light on code in the early sections — the design decisions matter more than the implementation details, which fall out once the data model is settled. Don't start typing until the brainstorming-pass questions are answered.

## Problem statement

ESL students often want to retry an earlier turn with a different phrasing — "what if I had said it more politely?", "what if I had used a different vocabulary choice?", "what would the AI have said if I'd asked instead of stated?" The current app forces them to either restart the entire scenario or live with their first attempt. Teachers similarly want to demonstrate alternative approaches mid-session without losing the first thread.

Today's transcript is a flat list of messages. Branching turns it into a tree.

## What this is NOT

- **Time travel.** The AI's responses are stochastic — replaying turn N with the same user input produces a different AI response, not the original one. So we can't "rewind" in the YouTube-scrub sense; we can only "branch" (fork at a chosen point and grow a new path forward).
- **Undo.** Branching preserves the original; it never deletes or replaces a turn the user already took.
- **Multi-user collaboration.** Single-user only; this is solo practice.

## Design decisions to settle BEFORE coding

### 1. Storage shape

Three viable models:

**A. Single session, branches as siblings.** A session has many "branches"; each branch has a sequence of turns. Branches share a common prefix up to a fork point.

  *Pro:* one session id maps to one practice attempt; library shows "you practised X scenario, with 3 branches explored". Conceptually clean for teacher sharing.
  *Con:* schema change to messages table (add `branchId`); transcript queries get tree-walk semantics; UI has to handle the "you're on branch B" indicator everywhere.

**B. Each branch is a separate session, linked by `parentSessionId` + `forkAtMessageId`.** The library shows two sessions; the second is marked "branched from session #45 at turn 6".

  *Pro:* zero schema change to messages — sessions just gain two nullable columns. Existing transcript view code keeps working unchanged. Library list naturally shows alternatives as siblings.
  *Con:* user might struggle to find related branches without good UI grouping. Practice attempts proliferate in the library.

**C. Hybrid: branches stored as separate sessions, but the conversation page shows a unified branch-switcher when viewing any branch.**

  *Pro:* combines A's user mental model with B's storage simplicity.
  *Con:* most code; both library and conversation page need branch awareness.

**Recommendation:** start with **B** — minimal schema, natural library behavior, preserves all existing code paths. Revisit if usage data shows branches are heavily related and users want unified navigation.

### 2. What does "fork from turn N" actually do?

Two reasonable semantics:

**A. Fork includes turn N as already taken.** Click the fork icon on the user's turn 6, and the new session inherits turns 1-6 verbatim. The user's next action is to take turn 7 (the AI replies first to turn 6 in the new branch — same user input, different AI response, demonstrating that conversations diverge even at fixed input).

  Useful for: "I want to see what else the AI might have said to my message."

**B. Fork rewinds to BEFORE turn N.** Click the fork icon on the user's turn 6, and the new session inherits turns 1-5 (i.e., everything UP TO turn 6, not including it). The user's next action is to take turn 6 again — differently this time.

  Useful for: "I want to retry MY message with different wording."

These are different features for different intents. **Recommendation: support B initially** — that's what students will ask for first ("let me try that turn again"). A is interesting but more niche; defer.

### 3. UI affordance for the fork action

Where does "fork from here" live?

- **Hover-on-message ▶** — small icon on the user's message in the transcript, like rehear is for AI messages. Discoverable, contextual, low-friction.
- **Right-click context menu** — discoverable for power users, invisible for first-timers. Risk: many ESL students won't think to right-click.
- **Selection-mode button** — click a "fork" mode in the toolbar, then tap the turn to fork from. Two clicks but more deliberate.

**Recommendation: hover-on-message ▶** matching the rehear pattern. Same small-button-next-to-the-role-label style.

### 4. UX for entering the new branch

After clicking fork, do we:

- **Open the new branch in place** — current page reloads with the truncated transcript and lets the user take the next turn. Risk: lose the original branch view; user might forget where they came from.
- **Open in a new "branched session" view** — original stays accessible (back button or library), new branch loads fresh. Clearer mental model; more navigation.
- **Side-by-side view** — original on left, new branch on right. Beautiful for teaching demos, complex for casual use.

**Recommendation: open in place with a clear "branched from session #45 · back to original" link in the header.** Keeps single-pane simplicity, one clearly-marked escape hatch. Side-by-side can come later if teachers ask for it.

### 5. Naming branched sessions in the library

Sessions need labels users can recognize. Options:

- "Vendor Negotiation (branch from turn 6)"
- "Vendor Negotiation · alternative #1"
- Same name, sub-grouped under the original in the library list

**Recommendation: same scenario name, indented under the original in the library, with a small "branched at turn N" caption.** Visual nesting > textual nesting.

---

## Implementation plan (after design is settled)

> Each task is a separate commit. Estimate: ~1 day total once the design choices above are locked in.

### Task 1: Schema — add branch columns to sessions

**Files:**
- `src/main/index.js` — sqlite schema migration (add `parentSessionId` TEXT NULL, `forkAtMessageId` TEXT NULL to sessions table)
- `src/renderer/types.ts` — extend `Session` interface
- `src/renderer/services/sqlite.ts` — `createSession` accepts optional parent + fork-at; `getSession` returns them

Migration must be backwards-compat (existing sessions get NULL for both). No existing query needs to change.

### Task 2: Fork action — create a child session

**Files:**
- `src/renderer/pages/ConversationPage.tsx` — new `forkFromMessage(msgId)` function

```typescript
const forkFromMessage = async (msgId: string) => {
  if (!session || !scenario) return;
  // Find the message and slice the transcript up to (not including) it
  const idx = messages.findIndex((m) => m.id === msgId);
  if (idx < 0) return;
  const inheritedTranscript = messages.slice(0, idx);

  const childSession = await createSession(scenario.id, {
    parentSessionId: session.id,
    forkAtMessageId: msgId,
    initialTranscript: inheritedTranscript,
  });

  // Stop everything in the current session
  stopSpeaking();
  stopReplay();

  // Navigate to the child — the existing resume-session path will load it
  navigate(`/scenarios/${scenario.id}?sessionId=${childSession.id}`);
};
```

### Task 3: Fork button on user messages in the transcript

**Files:**
- `src/renderer/pages/ConversationPage.tsx` — render section

Add a `GitBranch` icon button (lucide) next to the "you" label, mirroring the rehear button on AI messages. Confirm with a small popover or just trigger immediately — leaning toward immediate (same as rehear; trust the user).

### Task 4: Header indicator on branched sessions

**Files:**
- `src/renderer/pages/ConversationPage.tsx` — header section

When `session.parentSessionId` is non-null, render a small subhead under the scenario title:

```
Vendor Negotiation · Service Contract
BUSINESS · ADVANCED · BRANCHED FROM turn 6 of original  [back to original]
```

### Task 5: Library grouping

**Files:**
- `src/renderer/pages/SessionHistoryPage.tsx` — group sessions by parent

Sessions with `parentSessionId` set render indented under their parent, with a "branched at turn N" caption. Visual hierarchy makes the relationship obvious without text.

### Task 6: Audio cache on branched sessions

**Files:**
- `src/renderer/pages/ConversationPage.tsx` — `audioByMessageRef` initialization

The inherited transcript's AI messages have NO audio cache (they were synthesised in a different component instance). The recently-shipped re-synthesis fallback (commit 40ef8fd) handles this transparently — clicking replay on an inherited message synthesises on-demand. No extra work needed.

---

## Open questions for product

- **Fork limit?** Should we cap branches per session at some number (e.g., 5) to prevent runaway practice attempts cluttering the library? Probably yes, but defer.
- **Cross-branch comparison?** Could a teacher pull up two branches side-by-side to highlight differences? Cool but speculative; defer.
- **Branch naming?** Should the user be able to rename branches ("first attempt", "more polite version")? Probably yes, but defer until usage shows what's confusing.

---

## Validation plan

Before claiming done:

1. **Single-fork flow:** start session, take 3 turns, fork from turn 2, take alternative turn 2, see new branch in library.
2. **Multi-fork flow:** fork from the same point twice, get 3 sibling sessions in the library (original + 2 branches).
3. **Resumed-branch replay:** close the app, reopen, navigate to a branched session from the library, click replay on an inherited message → re-synthesis fallback fires.
4. **Back-to-original:** branched session → click "back to original" link → original session loads at the right turn.
5. **Schema migration:** install over an existing 2.10.x install; existing sessions still load and show no broken UI.
