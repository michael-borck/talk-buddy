# Releasing TalkBuddy Desktop

This guide explains how to create a new release of TalkBuddy that automatically builds for all platforms.

## Prerequisites

1. Make sure you have placeholder icons in the `assets/` folder:
   - `icon.ico` (Windows)
   - `icon.icns` (macOS)  
   - `icon.png` (Linux)

2. Update the version in `package.json`:
   ```json
   "version": "2.0.1",
   ```

3. Commit your changes:
   ```bash
   git add .
   git commit -m "Prepare release v2.0.1"
   git push
   ```

## Creating a Release

1. **Create a git tag** (this triggers the build):
   ```bash
   git tag v2.0.1
   git push origin v2.0.1
   ```

2. **Watch the magic happen**:
   - Go to your repo's Actions tab on GitHub
   - You'll see the "Build and Release" workflow running
   - It builds on all 3 platforms simultaneously
   - Takes about 10-15 minutes

3. **Find your release**:
   - Go to the Releases page on GitHub
   - You'll see a new release with all the installers:
     - `TalkBuddy-Setup-2.0.1.exe` (Windows)
     - `TalkBuddy-2.0.1.dmg` (macOS)
     - `TalkBuddy-2.0.1.AppImage` (Linux)

## How It Works

- **GitHub provides virtual machines** for each OS
- **Your code is built natively** on each platform
- **No cross-compilation issues** - each OS builds its own version
- **Completely free** for public repositories
- **Private repos** get 2,000 minutes/month free

## Manual Release (without CI)

If you prefer to build manually on each platform:

```bash
# On each OS:
git pull
npm install
npm run dist
# Then manually upload to GitHub Releases
```

## Tips

- Test locally first with `npm run dist` before creating a release tag
- The workflow only runs on tags starting with 'v' (e.g., v2.0.0, v2.1.0-beta)
- Check the Actions tab for build logs if something fails
- The GITHUB_TOKEN is automatically provided - no setup needed!