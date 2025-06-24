# Installation Guide

Get Talk Buddy installed and running on your system in just a few minutes.

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10, macOS 10.14, or Ubuntu 18.04 (or equivalent Linux distribution)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 500MB free space
- **Network**: Internet connection for AI services (optional for offline scenarios)

### Recommended Requirements
- **RAM**: 8GB or more
- **Storage**: 2GB free space (for scenarios and session data)
- **Network**: Stable broadband connection for best AI interaction quality

## Download Talk Buddy

### Option 1: GitHub Releases (Recommended)
1. Visit the [Talk Buddy Releases page](https://github.com/michael-borck/talk-buddy/releases)
2. Download the latest version for your operating system:
   - **Windows**: `TalkBuddy-Setup-X.X.X.exe`
   - **macOS**: `TalkBuddy-X.X.X.dmg`
   - **Linux**: `TalkBuddy-X.X.X.AppImage`

### Option 2: Direct Download Links
- [Windows Installer](https://github.com/michael-borck/talk-buddy/releases/latest/download/TalkBuddy-Setup.exe)
- [macOS Disk Image](https://github.com/michael-borck/talk-buddy/releases/latest/download/TalkBuddy.dmg)
- [Linux AppImage](https://github.com/michael-borck/talk-buddy/releases/latest/download/TalkBuddy.AppImage)

## Installation Instructions

### Windows Installation
1. **Download** the `.exe` installer file
2. **Right-click** the downloaded file and select "Run as administrator"
3. **Follow the installation wizard**:
   - Click "Next" to proceed through the welcome screen
   - Accept the license agreement
   - Choose installation directory (default is recommended)
   - Select Start Menu folder (default is recommended)
   - Choose whether to create a desktop shortcut
4. **Click "Install"** and wait for the process to complete
5. **Launch Talk Buddy** from the Start Menu or desktop shortcut

**Windows Security Note**: You may see a Windows Defender warning. Click "More info" then "Run anyway" to proceed.

### macOS Installation
1. **Download** the `.dmg` disk image file
2. **Double-click** the downloaded `.dmg` file to mount it
3. **Drag Talk Buddy** to your Applications folder
4. **Launch Talk Buddy** from Applications or Spotlight search
5. **Handle security dialog**: 
   - If you see "Talk Buddy can't be opened", go to System Preferences > Security & Privacy
   - Click "Open Anyway" next to the Talk Buddy warning

**macOS Security Note**: You may need to allow the app in Security & Privacy settings since it's not from the Mac App Store.

### Linux Installation
1. **Download** the `.AppImage` file
2. **Make it executable**:
   ```bash
   chmod +x TalkBuddy-X.X.X.AppImage
   ```
3. **Run the application**:
   ```bash
   ./TalkBuddy-X.X.X.AppImage
   ```
4. **Optional**: Move to `/opt` or `~/Applications` for system-wide access

**Linux Note**: Some distributions may require additional dependencies. If you encounter issues, install these packages:
```bash
# Ubuntu/Debian
sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0

# Fedora/CentOS
sudo dnf install gtk3 libnotify nss libXScrnSaver libXtst xdg-utils at-spi2-atk
```

## First Launch

When you first launch Talk Buddy:

1. **Welcome Screen**: You'll see a welcome message with setup instructions
2. **Data Location**: Talk Buddy will create its data folder:
   - **Windows**: `%APPDATA%/TalkBuddy/`
   - **macOS**: `~/Library/Application Support/TalkBuddy/`
   - **Linux**: `~/.config/TalkBuddy/`
3. **Default Scenarios**: The app comes with sample scenarios to get you started

## Verification

To verify your installation:

1. **Launch Talk Buddy** from your applications menu
2. **Check the sidebar**: You should see menu items like Home, Scenarios, Practice Packs
3. **Visit Settings**: Click on Settings to see service configuration options
4. **Try a scenario**: Go to Scenarios and try running one of the default scenarios

## Next Steps

Once Talk Buddy is installed:

1. **[Complete First Setup](first-setup.md)** - Configure services and preferences
2. **[Try Your First Scenario](../workflows/your-first-scenario.md)** - Take Talk Buddy for a test drive
3. **[Explore the Interface](../interface-guide/home-dashboard.md)** - Get familiar with the layout

## Troubleshooting Installation

### Common Issues

**Installation fails on Windows**
- Run the installer as Administrator
- Temporarily disable antivirus software
- Ensure you have sufficient disk space

**App won't open on macOS**
- Check Security & Privacy settings
- Try right-clicking the app and selecting "Open"
- Ensure you're running macOS 10.14 or later

**AppImage won't run on Linux**
- Verify the file is executable: `ls -la TalkBuddy*.AppImage`
- Install required dependencies (see Linux installation section)
- Try running from terminal to see error messages

**Performance issues**
- Ensure your system meets minimum requirements
- Close other resource-intensive applications
- Restart your computer after installation

### Getting Help

If you continue to have installation issues:

1. Check the [Common Errors](../troubleshooting/common-errors.md) guide
2. Visit the [GitHub Issues page](https://github.com/michael-borck/talk-buddy/issues) to search for solutions
3. Create a new issue with your system details and error messages

---

**Ready to get started? Head to [First Setup](first-setup.md) next! →**