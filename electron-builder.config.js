// electron-builder config in JS form so we can read environment variables
// (specifically APPLE_TEAM_ID for macOS notarization). Mirrors what used
// to live under "build" in package.json.

const teamId = process.env.APPLE_TEAM_ID;

module.exports = {
  appId: 'com.talkbuddy.desktop',
  productName: 'TalkBuddy',
  directories: {
    output: 'dist',
  },
  compression: 'maximum',
  files: [
    'dist/**/*',
    'src/main/**/*',
    'node_modules/**/*',
  ],
  extraResources: [
    {
      from: 'dist-server',
      to: 'embedded-server',
      filter: ['**/*'],
    },
  ],
  mac: {
    category: 'public.app-category.education',
    icon: 'assets/icon.icns',
    hardenedRuntime: true,
    // @electron/notarize requires teamId explicitly when using password
    // credentials. If APPLE_TEAM_ID is unset (e.g. local dev), fall back
    // to disabling notarization so the build still completes locally.
    notarize: teamId ? { teamId } : false,
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
    ],
  },
  win: {
    target: 'nsis',
    icon: 'assets/icon.ico',
  },
  linux: {
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb', arch: ['x64'] },
    ],
    icon: 'assets/icon.png',
    category: 'Education',
    maintainer: 'Michael Borck <michael@talkbuddy.app>',
    executableName: 'TalkBuddy',
    synopsis: 'AI-powered conversation practice desktop app',
    desktop: {
      Name: 'TalkBuddy',
      Comment: 'AI-powered conversation practice',
      Categories: 'Education;Languages;',
      Keywords: 'ai;conversation;practice;language;learning;',
    },
    extraResources: [],
  },
};
