# Shell redesign — decision record (2026-06-11)

## Question

The original shell (persistent 8-item left sidebar + status footer on
every screen) read as an IDE. What should a conversation-first
Talk Buddy shell look like?

## Process

Four throwaway variants were prototyped on a `/#/prototype` route and
evaluated side by side:

- **A — Open to the dial**: practice space as home screen, dial hero,
  scenario shelf, top nav.
- **B — Coach**: session-centric home (today's session, streak stats,
  journal), bottom tab bar.
- **C — Stage & wings**: chrome-free conversation window; drawer + ⌘K
  switcher as the only navigation.
- **D — B home → C session**: B as the shell, C as the live
  Conversation view.

## Decision: D

B kept winning as the opening screen because it *proposes* a session
rather than guessing one — a stage-as-home (A/C) has to guess which
conversation the user wants and a wrong guess is the daily first
impression. C's minimalism is right *during* a Conversation, where
navigation is unnecessary, and wrong as the whole app (discoverability,
⌘K as primary nav).

Also decided: **no user-configurable layout setting.** It would double
the design/test surface permanently, and "choose your layout" is itself
the IDE-ism being removed.

## Resulting structure

- `HomePage` (Coach home): today's session, streak/minutes/conversations,
  journal of recent Sessions.
- `TabBar` (Today · Explore · Journal · Settings) replaces the sidebar.
- `/conversation/*` renders with no chrome at all — the Conversation
  owns the window.
- Re-homed pages: Packs and Archive link from Scenarios (Explore);
  Help/Documentation/About/License link from Settings. StatusFooter
  (service health) now renders only on Settings.
