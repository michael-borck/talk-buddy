// electron-builder config in JS form so we can read environment variables
// and use a custom afterSign hook for notarization.

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
  // electron-builder's own notarize wrapper has been buggy across 24.x.
  // We disable it here and run @electron/notarize directly from the
  // afterSign hook, which gives us full control over the options object.
  afterSign: './scripts/notarize.js',
  mac: {
    category: 'public.app-category.education',
    icon: 'assets/icon.icns',
    hardenedRuntime: true,
    notarize: false,
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
    // .deb dropped temporarily — electron-builder hits a race condition
    // downloading the AppImage runtime when both targets are built in
    // the same job. AppImage is the more universally compatible target
    // anyway. Re-add .deb once the upstream issue is resolved or we
    // pre-cache the runtime.
    target: [
      { target: 'AppImage', arch: ['x64'] },
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
