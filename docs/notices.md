# Notices — how Talk Buddy tells you something went wrong

Every user-facing failure and result goes through one channel:
`src/renderer/services/notices.ts`. Callers pass a `NoticeCode`, not a sentence.

```
notify('scenario.saveFailed');
notifyCaught('conversation.startFailed', err);   // folds err.message into the detail
notify('session.started');
```

## Why codes, not strings

- **Enumerability.** `NoticeCode` is a union; `messageFor` is a `switch` with no
  `default`, so adding a code without wording it fails `tsc`.
- **One voice.** Wording lives in `messageFor`, not scattered across pages. A copy
  change is one edit, not a grep-and-replace across 9 files.
- **A debug log.** `getNotices()` keeps the last 50 notices so the diagnostics
  panel can show what actually happened this session — the answer to "it failed
  silently."

## Adding a failure

1. Add the code to `NoticeCode` and a level (error / success / info) in `LEVEL`.
2. Add a case to `defaultMessage` — TypeScript will point at the missing one.
3. Call `notify` / `notifyCaught` where the failure happens.

`detail` carries what only the call site knows (a model name, a raw error,
`err.message`). It is appended to the canned sentence for errors, and used
verbatim for `import.succeeded` / `scenarios.restoredDefaults` / `inputMode.changed`
(backend- or caller-supplied words).

## Level → toast

`error` → `toast.error` (vermilion left rule), `success` → `toast.success`,
`info` → plain toast. `opts.id` collapses repeats (the input-mode toggle).