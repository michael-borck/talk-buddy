# Database Setup Guide

This guide explains how to set up the PocketBase database with initial scenarios for TalkBuddy.

## Quick Start

For new users who want to get started quickly:

```bash
# 1. Start PocketBase
./pocketbase serve

# 2. In another terminal, import the included scenarios
./import-scenarios.sh
```

## Manual Setup

If the import script fails, you can set up the database manually:

1. Start PocketBase:
   ```bash
   ./pocketbase serve
   ```

2. Open the admin panel: http://127.0.0.1:8090/_/

3. Create an admin account (first time only)

4. The migrations will automatically create the required collections:
   - `scenarios` - Conversation scenarios
   - `sessions` - User session data

5. To import scenarios:
   - Go to Collections > scenarios > API Rules
   - Temporarily clear the "Create rule" (make it empty)
   - Run `./import-scenarios.sh`
   - Restore the "Create rule" to: `@request.auth.id != ""`

## Included Scenarios

The `scenarios-export.json` file contains pre-configured scenarios including:
- Coffee Shop Order (Beginner)
- Hotel Check-in (Intermediate)
- Restaurant Reservation (Intermediate)
- And more...

## Creating Your Own Scenarios

You can add scenarios through:
1. The PocketBase admin panel
2. The API (see seed-scenarios-simple.js for examples)
3. Modifying scenarios-export.json and re-importing

## Exporting Data

To export your current scenarios (useful for sharing or backup):

```bash
./export-scenarios.sh
```

This creates/updates `scenarios-export.json` with your current data.

## Troubleshooting

### "Forbidden" errors during import
- The scenarios collection has API rules that require authentication
- Follow the manual setup steps to temporarily disable the Create rule

### Port 8090 already in use
- Another instance of PocketBase is running
- Kill it with: `killall pocketbase`
- Or use a different port: `./pocketbase serve --http="127.0.0.1:8091"`