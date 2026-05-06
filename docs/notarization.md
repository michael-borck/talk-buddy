# macOS code signing and notarization — how this repo's pipeline works

This doc is the reference for what the macOS build is doing and why. It captures the actual config and the lessons from getting from "DMG with Gatekeeper warnings" to "DMG that opens like an App Store app." For the cross-project version of the same knowledge, see the `electron-notarization` skill in `~/.claude/skills/electron-notarization/SKILL.md`.

## TL;DR

- electron-builder config lives in [`electron-builder.config.js`](../electron-builder.config.js) (NOT in `package.json`'s `build` block)
- macOS notarization runs from a custom afterSign hook at [`scripts/notarize.js`](../scripts/notarize.js)
- electron-builder's own notarize wrapper is disabled (`mac.notarize: false`)
- The hook calls `@electron/notarize` directly with explicit options
- CI passes Apple credentials under renamed env vars (`NOTARIZE_APPLE_*`) so electron-builder can't auto-detect them and trigger its broken wrapper

## Required CI secrets

All set in `Settings → Secrets and variables → Actions`:

| Secret | What it is |
|---|---|
| `APPLE_ID` | Apple ID email associated with the Developer Program |
| `APPLE_ID_PASSWORD` | App-specific password (NOT the Apple ID password) — generated at https://appleid.apple.com → Sign-In and Security → App-Specific Passwords |
| `APPLE_TEAM_ID` | 10-char team ID from https://developer.apple.com/account → Membership Details |
| `MACOS_CERTIFICATE` | base64 of the Developer ID Application `.p12` file |
| `MACOS_CERTIFICATE_PWD` | Password used when exporting the `.p12` |

The workflow renames `APPLE_*` → `NOTARIZE_APPLE_*` when passing to the build step (see "trap 4" below).

## When notarization fails

**99% of the time it's one of these:**

1. **Apple agreement expired** — the notarytool returns `HTTP status code: 403. A required agreement is missing or has expired.` Sign in at https://developer.apple.com/account/ and look for pending agreements. Also check https://appstoreconnect.apple.com/agreements/. Wait ~5-10 min after signing, then re-run the failed job (no need to bump version — use `gh run rerun <run-id> --failed`).
2. **Certificate expired** — Developer ID Application certs are valid for 5 years. Check https://developer.apple.com/account/resources/certificates/list. If expired, generate a new one in Xcode, export to `.p12`, base64 it, update the `MACOS_CERTIFICATE` secret.
3. **App-specific password revoked** — happens if you regenerate it. Update `APPLE_ID_PASSWORD`.

**If the hook itself isn't running** (no `[notarize]` log lines):
- Check `package.json`'s `electron:build` script still has `--config electron-builder.config.js`
- Check `scripts/notarize.js` still uses `exports.default = ...` (NOT `module.exports = ...`)
- Both of these are easy to break in a refactor — the hook then silently no-ops

## How to verify a built DMG is properly notarized

After downloading the DMG locally:

```bash
spctl -a -vvv -t install ~/Downloads/TalkBuddy-2.9.6-arm64.dmg
# Expected: "accepted, source=Notarized Developer ID"

xcrun stapler validate ~/Downloads/TalkBuddy-2.9.6-arm64.dmg
# Expected: "The validate action worked!"
```

If both pass, opening the DMG and dragging the app to Applications will work without any Gatekeeper warning on a fresh Mac.

## How we got here (the seven traps)

These are the silent-failure modes we hit between v2.9.0 and v2.9.6 (six failed builds before the first green one). The notarization knowledge in `~/.claude/skills/electron-notarization/SKILL.md` covers each in detail. The short version:

1. **`mac.notarize: true`** — fails on newer @electron/notarize with "teamId is required." Use `false` + afterSign hook.
2. **`module.exports = fn`** in the hook — silently no-ops because electron-builder calls `require(path).default`. Use `exports.default = fn`.
3. **`electron-builder.config.js` not auto-detected** — pass `--config electron-builder.config.js` explicitly.
4. **`APPLE_*` env vars trigger electron-builder's broken auto-notarize** alongside our hook — rename to `NOTARIZE_APPLE_*`.
5. **matrix `fail-fast: true`** kills nearly-done platforms when one fails — set `fail-fast: false`.
6. **Apple PLA expires periodically** — sign at https://developer.apple.com/account/.
7. **Linux `.deb` + `AppImage` race** on runtime download — build AppImage only.

## Re-running a failed build

If the only failure was notarization (e.g. agreement expired and you've now signed it):

```bash
gh run rerun <run-id> --failed     # re-runs only the failed jobs in that run
```

The run id is the number after `Build and Release` in `gh run list --workflow=build.yml --limit 5`.

## Related

- [`electron-builder.config.js`](../electron-builder.config.js) — full electron-builder config
- [`scripts/notarize.js`](../scripts/notarize.js) — the afterSign hook
- [`.github/workflows/build.yml`](../.github/workflows/build.yml) — CI definition
- `~/.claude/skills/electron-notarization/SKILL.md` — generalized version for use across other Electron projects
