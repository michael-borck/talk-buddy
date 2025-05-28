# App Icons Required

Before building the desktop app, you need to provide the following icon files:

## Required Files

1. **icon.ico** (Windows)
   - Size: 256x256 pixels
   - Format: ICO (can contain multiple resolutions)
   - Tool: Use an ICO converter or icon editor

2. **icon.icns** (macOS)
   - Size: 1024x1024 pixels (will be scaled down)
   - Format: ICNS
   - Tool: Use `iconutil` on Mac or online converters

3. **icon.png** (Linux)
   - Size: 512x512 pixels
   - Format: PNG with transparency
   - This is the simplest - just a standard PNG

## Quick Solution

For testing, you can:
1. Create a simple 512x512 PNG icon
2. Use online converters to create ICO and ICNS versions
3. Or use electron-builder's auto-icon generation (may have quality issues)

## Icon Generators
- https://www.icoconverter.com/ (PNG to ICO)
- https://cloudconvert.com/png-to-icns (PNG to ICNS)
- Or use electron-icon-builder npm package