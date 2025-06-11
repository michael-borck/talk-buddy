# Installation Guide

Get ChatterBox installed and running on your system in just a few minutes.

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

## Download ChatterBox

### Option 1: GitHub Releases (Recommended)
1. Visit the [ChatterBox Releases page](https://github.com/michael-borck/chatter-box/releases)
2. Download the latest version for your operating system:
   - **Windows**: `ChatterBox-Setup-X.X.X.exe`
   - **macOS**: `ChatterBox-X.X.X.dmg`
   - **Linux**: `ChatterBox-X.X.X.AppImage`

### Option 2: Direct Download Links
- [Windows Installer](https://github.com/michael-borck/chatter-box/releases/latest/download/ChatterBox-Setup.exe)
- [macOS Disk Image](https://github.com/michael-borck/chatter-box/releases/latest/download/ChatterBox.dmg)
- [Linux AppImage](https://github.com/michael-borck/chatter-box/releases/latest/download/ChatterBox.AppImage)

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
5. **Launch ChatterBox** from the Start Menu or desktop shortcut

**Windows Security Note**: You may see a Windows Defender warning. Click "More info" then "Run anyway" to proceed.

### macOS Installation
1. **Download** the `.dmg` disk image file
2. **Double-click** the downloaded `.dmg` file to mount it
3. **Drag ChatterBox** to your Applications folder
4. **Launch ChatterBox** from Applications or Spotlight search
5. **Handle security dialog**: 
   - If you see "ChatterBox can't be opened", go to System Preferences > Security & Privacy
   - Click "Open Anyway" next to the ChatterBox warning

**macOS Security Note**: You may need to allow the app in Security & Privacy settings since it's not from the Mac App Store.

### Linux Installation
1. **Download** the `.AppImage` file
2. **Make it executable**:
   ```bash
   chmod +x ChatterBox-X.X.X.AppImage
   ```
3. **Run the application**:
   ```bash
   ./ChatterBox-X.X.X.AppImage
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

When you first launch ChatterBox:

1. **Welcome Screen**: You'll see a welcome message with setup instructions
2. **Data Location**: ChatterBox will create its data folder:
   - **Windows**: `%APPDATA%/ChatterBox/`
   - **macOS**: `~/Library/Application Support/ChatterBox/`
   - **Linux**: `~/.config/ChatterBox/`
3. **Default Scenarios**: The app comes with sample scenarios to get you started

## Verification

To verify your installation:

1. **Launch ChatterBox** from your applications menu
2. **Check the sidebar**: You should see menu items like Home, Scenarios, Practice Packs
3. **Visit Settings**: Click on Settings to see service configuration options
4. **Try a scenario**: Go to Scenarios and try running one of the default scenarios

## Next Steps

Once ChatterBox is installed:

1. **[Complete First Setup](first-setup.md)** - Configure services and preferences
2. **[Try Your First Scenario](../workflows/your-first-scenario.md)** - Take ChatterBox for a test drive
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
- Verify the file is executable: `ls -la ChatterBox*.AppImage`
- Install required dependencies (see Linux installation section)
- Try running from terminal to see error messages

**Performance issues**
- Ensure your system meets minimum requirements
- Close other resource-intensive applications
- Restart your computer after installation

### Getting Help

If you continue to have installation issues:

1. Check the [Common Errors](../troubleshooting/common-errors.md) guide
2. Visit the [GitHub Issues page](https://github.com/michael-borck/chatter-box/issues) to search for solutions
3. Create a new issue with your system details and error messages

---

**Ready to get started? Head to [First Setup](first-setup.md) next! →**