# TalkBuddy Server (PocketBase)

This directory contains the PocketBase backend for TalkBuddy.

## Setup

1. Download PocketBase from https://pocketbase.io/docs/
2. Place the `pocketbase` binary in this directory
3. Run `./pocketbase serve` to start the server

## Default URLs

- Admin UI: http://127.0.0.1:8090/_/
- API: http://127.0.0.1:8090/api/

## Collections

The following collections will be created:
- `scenarios` - Interview scenarios
- `sessions` - User practice sessions
- `messages` - Conversation messages

## First Time Setup

1. Start PocketBase: `./pocketbase serve`
2. Go to http://127.0.0.1:8090/_/
3. Create admin account
4. Import schema from `pb_schema.json` (when available)