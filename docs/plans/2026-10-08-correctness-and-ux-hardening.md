# Correctness & UX Hardening

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Solo-dev project on `main` — no worktree, no feature branch. Commit per logical step (granular revert > branches).

**Goal:** Close the gaps found in the post-v3.0.0 audit: five correctness defects that can strand or dead-end a user, the structural debt behind them, and the highest-value UX improvements for ESL students practising high-stakes conversations.

**Architecture:** Phase 1 is deliberately dependency-free — no new state, no new Provider, no schema change. Each step is independently testable and revertable. Later phases build on a stable base rather than on a UI with dead-ends in it.

**Tech stack:** Electron 42, React 18, TypeScript, Vite, vitest, react-hot-toast (already the app's feedback mechanism), Tailwind + Studio Calm tokens.

---

## Critical context (preserve across sessions)

1. **The app is a 1200×800 window holding a 640px column.** The Conversation page already uses the full window (two columns at `lg`); Today/Explore/Journal/Settings are a phone-width strip with a bottom tab bar. Switching between them is a layout jump, and ~45% of the window sits empty. This is the root of the Phase 3 work — not the tab bar per se.
2. **`prefers-reduced-motion`, focus-visible, and the toast system already exist.** Phase 1 must use what's there, not add a parallel mechanism. Toasts are configured globally in `App.tsx` with the Studio Calm treatment.
3. **Of the 43 `alert()` sites, ~40 are failure messages, not confirmations.** So the sweep is a mechanical `alert(x)` → `toast.error(x)` / `toast.success(x)`, not a redesign of confirmations. The exceptions are ScenarioFormPage's required-fields validation (wants an inline message) and the "Scenario not found" alerts (the page navigates away anyway).
4. **HomePage guards a missing AI Brain with `OllamaSetupCard`, but ConversationPage does not.** `startConversation` (ConversationPage:299) creates a session immediately — a student who skips setup speaks a full answer into the void and only then sees "AI Brain request failed." The fix is to reuse the same card, not invent a second pattern.
5. **ScenariosPage does an N+1 over IPC**: `scenarioList.map(async s => getScenarioPacks(s.id))` (ScenariosPage:71) — one IPC round trip per scenario, 21+ on a default install. A single `pack_scenarios` query replaces it.
6. **Sessions are persisted per-turn** (`saveTranscript` on every Turn), so an error boundary crash does not lose the conversation. The boundary's copy should say so — that reassurance is the design system's core promise.
7. **Studio Calm's own rules answer most layout questions**: legibility over aesthetics, whitespace as calm, no mobile cosplay. When a Phase 3/4 idea contradicts the design doc (e.g. adding badges/gamification), the doc wins.

---

## Phase 1 — Correctness batch (in progress)

- [ ] **Catch-all route.** `App.tsx` has no `path="*"`; any unknown hash renders a permanently blank window with no way back. Add `<Route path="*" element={<Navigate to="/" replace />} />`.
- [ ] **Error boundary.** None exists anywhere. A render crash = blank window. Add `components/ErrorBoundary.tsx` (class component, Studio Calm styled) around `AppContent`, copy that reassures about saved sessions, plus a Reload action.
- [ ] **AI Brain guard in ConversationPage.** Check `resolveChat(prefs).url` before creating a session; render `OllamaSetupCard` (already exists, already used on Home) instead of letting the student practise into a failure.
- [ ] **`alert()` → toast sweep** (43 sites, 8 files: SessionHistoryPage, ScenariosPage, ArchivePage, PracticePacksPage, HomePage, PackDetailPage, LocalScenariosPage, ScenarioFormPage). Failures → `toast.error`, import/save successes → `toast.success`, required-fields → inline error under the field.
- [ ] **ScenariosPage N+1.** Add a `packScenarios:listAll` DB op returning every `pack_scenarios` row; build the scenario→packs map client-side from one round trip.

**Verify:** `npm run test:run`, `npx tsc --noEmit`, `npx vite build`, then a manual pass: delete a session (toast, not dialog), deep-link to a bogus hash (lands on Today), start a conversation with no AI Brain configured (setup card, not a failure mid-answer).

---

## Phase 2 — Structure (after Phase 1 is stable)

- [ ] **Split `SettingsPage.tsx` (1,865 lines)** into `settings/SttTab.tsx`, `settings/TtsTab.tsx`, `settings/ChatTab.tsx`, `settings/StyleTab.tsx`, `settings/DataTab.tsx`, `settings/DiagnosticsTab.tsx` sharing one preferences hook. The file being 1,865 lines is why the phase-5 Provider edits were surgical.
- [ ] **Extract the preferences hook** (`useSettingsPage`) so tabs read one source instead of each page re-implementing load/save.
- [ ] **`chat.ts` (1,082 lines)** — review for a per-provider split behind the existing interface. Only if it stays under pressure after the Settings split.
- [ ] **Page scaffolding** — the header/loading/empty-state block is re-implemented per page; extract the common shape.

---

## Phase 3 — Layout

- [ ] **Unify column widths.** Today/Explore/Journal/Settings grow toward ~880–960px on wide windows, matching the Conversation's existing `lg` treatment. Keep 640px below `lg`. One width rule everywhere — no layout jump when leaving a conversation.
- [ ] **Put the empty rail to work on `xl`.** A left column carrying persistent context (current scenario, last session, streak) turns dead space into the reassurance Studio Calm is built for.
- [ ] **Bottom tab bar → left rail at ≥1024px**, keeping the bottom bar for narrow windows. Most opinionated change in this plan; do it only after the width unification lands and only if the rail doesn't crowd the reading column.

---

## Phase 4 — UX features (each needs its own session + screenshot review)

- [ ] **Pre-flight mic check** (highest value for this audience). Before the first session: speak a phrase → live level meter + the transcript you just produced → one line of voice played back. Catches permission denial, wrong input device, and a quiet mic *before* the student invests emotionally in a scenario. Today all three surface as mysterious mid-conversation failures.
- [ ] **Explain the suggestion.** Home picks "most recently updated" scenario. Show the reason ("not practised in 6 days") and rotate toward least-recently-practised — a fixed "Today" that never changes trains nothing.
- [ ] **Provider readiness on the Today card.** If in-app models aren't downloaded, say "Offline speech isn't set up yet — one click" instead of failing on first use.
- [ ] **Journal entries invite re-reading.** Show a two-line transcript excerpt instead of "3 min · 240 words". The journal is a learning artefact; it currently reads as a log.
- [ ] **After "End session"**, land on the analysis with a "Practise again" action rather than stranding the student on a summary.
- [ ] **"Still listening…" affordance** — prolonged silence in hands-free mode is ambiguous (thinking? broken? finished?). A quiet, non-alarming hint after ~3s of no speech stops students talking over the AI to check.
- [ ] **`aria-live` on the conversation status** so phase changes are announced. Cheap; the visualizer itself stays decorative (`aria-hidden`).

---

## Out of scope

- **Trash / soft-delete with 30-day purge** — already in `TODO.md`; belongs with the Journal work in Phase 4, not here.
- **i18n of the UI** — parked in `docs/future-work.md`; the ESL audience is the case *for* it, not the timing.
- **Tauri migration** — parked, and this audit found no new reason to revive it.
- **Bulk selection / tagging / smart collections** — `TODO.md` backlog, unchanged.

## Already solid — protect these

The turn architecture (`turnEngine` / `handsFree` / the Provider seam) is clean and covered by 105 tests; `prefers-reduced-motion` is handled globally; the design system documents its own rationale well enough that most decisions are self-justifying. Phase 3/4 work must not erode that.
