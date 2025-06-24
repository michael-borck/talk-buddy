# macOS Code Signing Setup

This guide explains how to set up code signing certificates for building and distributing Talk Buddy on macOS.

## Prerequisites

You need an Apple Developer account ($99/year) from https://developer.apple.com

## Steps

### 1. Create Certificates

1. Go to https://developer.apple.com/account/resources/certificates/list
2. Create two certificates:
   - **Developer ID Application** - For distributing DMG files outside the Mac App Store
   - **Mac App Distribution** - For Mac App Store distribution

### 2. Export Certificate from Keychain

1. Open **Keychain Access** on macOS
2. Find your certificates under "My Certificates"
3. Right-click on the certificate → Export
4. Save as a `.p12` file
5. Set a password when prompted (remember this password - it will be your `MAC_CERTS_PASSWORD`)

### 3. Convert Certificate to Base64

```bash
base64 -i your-certificate.p12 -o certificate-base64.txt
```

### 4. Add to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add two secrets:
   - **Name**: `MAC_CERTS`  
     **Value**: Contents of `certificate-base64.txt` (the entire base64 string)
   - **Name**: `MAC_CERTS_PASSWORD`  
     **Value**: The password you set when exporting the .p12 file

## Alternative: Building Without Code Signing

If you're building for personal use or testing, you can build unsigned apps:

1. Remove the `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables from the workflow
2. Users will see security warnings when opening the app
3. They can bypass by right-clicking and selecting "Open" on macOS

## Notes

- The Developer ID Application certificate is for apps distributed outside the App Store
- The Mac App Distribution certificate is specifically for Mac App Store submissions
- Certificates expire annually and need to be renewed
- You can use the same certificate across multiple projects