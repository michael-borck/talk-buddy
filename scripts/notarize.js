// afterSign hook for electron-builder. Bypasses electron-builder's own
// notarize wrapper (which has been buggy across the 24.x line) and calls
// @electron/notarize directly with full options. Skipped on non-mac
// builds and when Apple credentials aren't set (local dev).

const { notarize } = require('@electron/notarize');

module.exports = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

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

  console.log('[notarize] Done');
};
