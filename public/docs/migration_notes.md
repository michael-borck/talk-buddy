# ChatterBox Migration Notes: Web to Desktop

## Migration Date: 2025-01-28

## Overview
This document tracks the migration of ChatterBox from a web-based architecture (React + PocketBase + Flask servers) to a desktop application (React + Electron) with simplified external service dependencies.

## Architecture Changes

### Removed Components
1. **Authentication System**
   - Removed LoginModal.tsx, RegisterModal.tsx, UserMenu.tsx
   - Removed AuthContext.tsx and all authentication hooks
   - Removed user-specific data tracking

2. **Backend Services**
   - Removed PocketBase server dependency
   - Removed whisper-server.py (Flask STT server)
   - Removed piper-server.py (Flask TTS server)
   - Removed all server setup scripts

3. **User Management**
   - Removed createdBy fields from scenarios
   - Removed user field from sessions
   - Removed all user authentication checks

### New Components
1. **Local Storage**
   - SQLite database for local data persistence
   - No authentication required
   - All data stored locally

2. **External Services**
   - Speaches server for STT/TTS (replaces whisper + piper)
   - Ollama server for AI conversations (unchanged)

3. **Desktop Features**
   - Electron main process for desktop APIs
   - Native file dialogs for import/export
   - Cross-platform packaging

## Data Model Changes

### Scenarios Table
- Removed: createdBy field
- Removed: user access controls
- All scenarios are now locally stored

### Sessions Table  
- Removed: user field
- Removed: user-specific queries
- All sessions are now locally stored

## Component Migration Guide

### Kept Components (Modified)
- ConversationPage.tsx - Removed auth checks
- ScenariosPage.tsx - Simplified to show all local scenarios
- ScenarioFormPage.tsx - Removed user association
- SessionHistoryPage.tsx - Shows all local sessions
- MyScenariosPage.tsx - Renamed to LocalScenariosPage, shows all scenarios

### Removed Components
- LoginModal.tsx
- RegisterModal.tsx
- UserMenu.tsx
- AuthContext.tsx

### New Components
- services/sqlite.ts - Local database operations
- services/electron-api.ts - IPC bridge for Electron
- components/ImportExport.tsx - Data import/export functionality

## Service Layer Changes

### pocketbase.ts → sqlite.ts
- Replaced PocketBase API calls with SQLite queries
- Removed authentication tokens
- Simplified data models

### conversation.ts & session.ts
- Updated to use local SQLite storage
- Removed user-specific filtering
- Simplified session tracking

### whisper.ts & speech.ts
- Updated to use Speaches API endpoints
- Combined STT and TTS into single service

## Build & Distribution

### Development
```bash
npm run dev  # Runs React dev server + Electron
```

### Production Build
```bash
npm run dist  # Creates platform-specific installers
```

### Platforms
- Windows: .exe installer
- macOS: .dmg installer  
- Linux: .AppImage

## External Dependencies

### Required Services
1. **Speaches Server**
   - Default URL: http://localhost:8000
   - Provides STT and TTS functionality
   
2. **Ollama Server**
   - Default URL: http://localhost:11434
   - Provides AI conversation functionality

## Migration Steps Completed
1. ✅ Analyzed existing codebase
2. ✅ Created v1-archive folder
3. ⏳ Setting up new Electron + React structure
4. ⏳ Migrating components
5. ⏳ Creating SQLite storage
6. ⏳ Updating service layer
7. ⏳ Implementing Electron features
8. ⏳ Creating desktop packaging

## Notes for Developers
- All user authentication code has been removed
- Local storage is now the single source of truth
- External services (Speaches, Ollama) must be running separately
- Desktop app works offline except for AI/speech processing