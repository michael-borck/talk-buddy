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

## Phase 1 — Correctness batch (done)

- [x] **Catch-all route.** `App.tsx` has no `path="*"`; any unknown hash renders a permanently blank window with no way back. Add `<Route path="*" element={<Navigate to="/" replace />} />`.
- [x] **Error boundary.** None exists anywhere. A render crash = blank window. Add `components/ErrorBoundary.tsx` (class component, Studio Calm styled) around `AppContent`, copy that reassures about saved sessions, plus a Reload action.
- [x] **AI Brain guard in ConversationPage.** Check `resolveChat(prefs).url` before creating a session; render `OllamaSetupCard` (already exists, already used on Home) instead of letting the student practise into a failure.
- [x] **`alert()` → toast sweep** (43 sites, 8 files: SessionHistoryPage, ScenariosPage, ArchivePage, PracticePacksPage, HomePage, PackDetailPage, LocalScenariosPage, ScenarioFormPage). Failures → `toast.error`, import/save successes → `toast.success`, required-fields → inline error under the field.
- [x] **ScenariosPage N+1.** Add a `packScenarios:listAll` DB op returning every `pack_scenarios` row; build the scenario→packs map client-side from one round trip.

**Verify:** `npm run test:run` (110 passing), `npx tsc --noEmit`, `npx vite build` — all green. Still worth a manual pass in the running app: delete a session (toast, not dialog), deep-link a bogus hash (lands on Today), start a conversation with no AI Brain configured (setup card, not a failure mid-answer), and confirm the Scenarios page still shows pack chips per card.

---

## Phase 2 — Structure (after Phase 1 is stable)

- [x] **Split `SettingsPage.tsx` (1,865 lines)** into `settings/SttTab.tsx`, `settings/TtsTab.tsx`, `settings/ChatTab.tsx`, `settings/StyleTab.tsx`, `settings/DataTab.tsx` sharing one preferences source. Diagnostics already had its own `DiagnosticsPanel`. The page is now 730 lines of state, handlers, and layout; the tab JSX moved verbatim. The file being 1,865 lines is why the phase-5 Provider edits were surgical.
- [x] **Extract the shared settings state** (`settings/SettingsContext.tsx`) so tabs read one typed source. `SettingsPreferences` also pins the shape the `useState` literal never declared — `sttUrl` and `ttsUrl` were always in state but no tab ever read or wrote them, since both tabs fall back to `speachesUrl`. Left in place as the likely intent; flagged here rather than silently deleted.
- [x] **`chat.ts` (1,082 lines)** — split per Provider dialect under `services/chat/` (`providers/gemini`, `providers/openaiCompatible`, `providers/ollama`, plus `prompts`, `secrets`, `preferences`, `transport`, `types`). `chat.ts` stays the entry point with an unchanged exported surface. The dialects genuinely differ, so this is a seam, not a filing exercise: Gemini authenticates by `?key=` and uses `systemInstruction` with `model` roles; Ollama threads a numeric `context` through a Turn. Also collapsed three separate copies of the `ChatProvider` union onto the canonical one in `types/settings.ts`.
- [x] **Page scaffolding** — `components/layout/PageShell.tsx` now owns `PageHeader`, `LoadingState` and `EmptyState`. Eight pages had a byte-identical loading block, six the same empty-state card, four the same title block; they had already drifted. Page-specific markup (filters, lists, the buttons that offer a way out of an empty state) passes through children.

### Configuration surface (added after the audit question)

Asked whether `sttUrl`/`ttsUrl` were really used — they are, and always were; every control writes them. The confusion was `speachesUrl`, a legacy third key whose `key || speachesUrl || default` precedence had been re-typed in five files. Now migrated away and deleted, and `speaches.ts` takes a resolved config instead of re-reading preferences behind `speechProvider`'s back. Two dead hooks (`useSettings`, `useModelFetcher`, zero importers) removed. Configuring the stack is now: pick a Provider, set its URL and key.

---

## Found by the visual check (not by the audit)

- [x] **Dark mode was broken on every Studio Calm page.** `tailwind.config.js` hardcoded the `ink` and `paper` scales as hex while `--paper` resolved from `html[data-theme='dark']`, so the background flipped and the text did not: measured `rgb(37,36,32)` on `rgb(27,26,23)`, about 1.1:1. Every heading on Home, Conversation, Settings and Scenarios was invisible.

  Fixed by resolving those scales from RGB channel variables with `<alpha-value>` — channels, not plain `var()`, because `border-ink/10` appears 19 times and a bare var cannot carry an alpha. (The functional form `({ opacityValue }) => ({...})` silently emits `--tw-text-opacity` with *no* colour; `<alpha-value>` is the one that works.) Home went from 1.1:1 to 15.01:1.

  Two things surfaced only after measuring rather than looking:
  - `paper` was hardcoded too, so fixing ink alone left near-white stat cards with light text on them — a regression caught by the contrast tool, not by eye.
  - Form controls had no background utility at all and were inheriting the browser's white default, which put themed light text on white fields. Fixed at the source with a token-based base rule at `input` specificity, so an explicit utility still wins.

  `scripts/contrast.mjs` audits both themes; all 54 sampled pairs now meet WCAG AA, and light mode is byte-identical to before.

- [x] **Legacy grey and blue ramps, dark mode.** Unmigrated pages used literal Tailwind greys that stayed light on a dark page — a gray-800 heading measured 1.19:1. Remapped under `html[data-theme='dark']` in CSS rather than in the Tailwind config, because `bg-blue-700` and friends are dark surfaces paired with hardcoded `text-white`; flipping them as config values would have put white text on a white button. Targeting `.text-blue-*` only leaves those buttons alone. Also themed the success green, which measured 2.92:1 as light-mode text.

- [ ] **Legacy pages are still visually light-mode only.** Archive, Session History, the Settings tabs and About/License/Documentation are legible in dark mode now, but they have not been migrated to the Studio Calm tokens, so they do not *look* like the rest of the app. Roughly 350 legacy `text-gray-*` usages across 20 files. The compatibility shim in `index.css` exists so this can be done page by page; delete each remap as its page migrates.

---

## Phase 3 — Layout

- [x] **Unify column widths.** The plan estimated ~880–960px; measuring at a 1680px window found four unrelated widths — 640, 896, 1152 and 1280 — with no logic behind which page got which, plus gutters varying from 32px to 64px. At an 820px window the grid pages ran edge-to-edge while prose stayed at 640.

  Now two widths and one gutter, declared once as `--measure` (640px), `--canvas` (1152px) and `--gutter` (2rem), applied via `.page` / `.page-measure` / `.page-canvas` so the rule is greppable rather than scattered across fifteen `max-w-*` values. Reading and configuring get the measure; browsing a collection gets the canvas. Conversation keeps its own two-column split — its transcript column lands near 544px, a fine measure in its own right.
- [ ] **Put the empty rail to work on `xl`.** A left column carrying persistent context (current scenario, last session, streak) turns dead space into the reassurance Studio Calm is built for.
- [ ] **Bottom tab bar → left rail at ≥1024px**, keeping the bottom bar for narrow windows. Most opinionated change in this plan; do it only after the width unification lands and only if the rail doesn't crowd the reading column.

---

## Phase 4 — UX features (each needs its own session + screenshot review)

- [x] **Pre-flight setup check** (highest value for this audience). `/setup-check`: speak a phrase → live level meter → the transcript you just produced → one line of voice played back. Catches permission denial, wrong input device, a quiet mic, and an unready Provider *before* the student invests emotionally in a Scenario. Offered on Home until it has passed once. Walks the real Turn ports, so a pass means a Turn will work.

  Three decisions worth keeping:
  - **A silent mic is reported as a microphone problem, not a transcription failure.** A peak is tracked across the whole take, and an empty transcript is routed to volume advice only when something was actually audible.
  - **A dead microphone does not stop the Voice check.** One pass reports everything that needs fixing. Skipped steps say so and are excluded from the failure count, so a mic problem is never reported as two.
  - **Only a pass is recorded.** A stack that later breaks — server moved, model deleted — starts offering the check again rather than trusting a stale pass.

  Failure → remedy mapping lives in `services/setupCheck.ts` (21 tests) rather than in the page, because "which fix applies" is the part worth being sure about. Settings now honours `?tab=`, so each remedy links to the tab that fixes it.
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

---

## Log

- **b720df2** catch-all route + ErrorBoundary (+3 tests for the boundary)
- **581b58a** AI Brain guard in ConversationPage
- **21de45b** `alert()` → toast sweep across 8 pages (43 sites)
- **<this step>** ScenariosPage N+1 → one `packScenarios:listAll` query (+2 DB tests)

The two `ConversationPage.tsx(6x)` `t`-before-declaration type errors are a pre-existing baseline, unrelated to this plan — `npm run build` is vite-only and never ran `tsc`. Worth a separate five-minute fix.
