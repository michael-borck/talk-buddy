// afterSign hook for electron-builder. Bypasses electron-builder's own
// notarize wrapper (which has been buggy across the 24.x line) and calls
// @electron/notarize directly with full options. Skipped on non-mac
// builds and when Apple credentials aren't set (local dev).

const { notarize } = require('@electron/notarize');
const { execFileSync } = require('child_process');

// electron-builder loads this hook via `require(path).default`, NOT
// `require(path)` directly — so the function MUST be exported on the
// `default` property. Using `module.exports = fn` results in the hook
// being silently ignored (no log, no error). See:
// https://www.electron.build/hooks
exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Diagnostic — confirms electron-builder loaded this hook at all.
  console.log(`[notarize] afterSign hook entered (platform=${electronPlatformName})`);

  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Read from NOTARIZE_*-prefixed env vars (not APPLE_*) so electron-builder's
  // auto-detection doesn't fire its own buggy notarize wrapper alongside ours.
  const appleId = process.env.NOTARIZE_APPLE_ID;
  const appleIdPassword = process.env.NOTARIZE_APPLE_PASSWORD;
  const teamId = process.env.NOTARIZE_APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('[notarize] Skipping — NOTARIZE_APPLE_ID / NOTARIZE_APPLE_PASSWORD / NOTARIZE_APPLE_TEAM_ID not all set');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;
  const appBundleId = context.packager.appInfo.id;

  console.log(`[notarize] Notarizing ${appPath} (bundleId=${appBundleId}, teamId=${teamId})`);

  await notarize({
    tool: 'notarytool',
    appBundleId,
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });

  console.log('[notarize] Notarisation accepted; stapling ticket');

  // Staple the notarisation ticket into the .app so Gatekeeper can verify
  // offline (and during Apple-server outages). Notarytool itself does not
  // staple — @electron/notarize only submits and polls. Stapling failures
  // are logged but do not fail the build: the app is still validly
  // notarised, the ticket is just fetched online instead of embedded.
  try {
    execFileSync('xcrun', ['stapler', 'staple', appPath], { stdio: 'inherit' });
    console.log('[notarize] Stapled');
  } catch (err) {
    console.warn(`[notarize] Staple failed (build will continue): ${err.message}`);
  }
};
