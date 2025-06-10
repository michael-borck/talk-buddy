import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'talkbuddy.db');
  db = new Database(dbPath);

  // Create tables if they don't exist
  db.exec(`
    -- Migration: Add new columns to existing sessions table if they don't exist
    PRAGMA foreign_keys=off;
    
    -- Check if we need to migrate sessions table
    CREATE TABLE IF NOT EXISTS sessions_new (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      session_pack_id TEXT,
      startTime DATETIME,
      endTime DATETIME,
      duration INTEGER,
      transcript TEXT,
      metadata TEXT,
      status TEXT CHECK(status IN ('not_started', 'active', 'paused', 'ended')) DEFAULT 'not_started',
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
      FOREIGN KEY (session_pack_id) REFERENCES session_packs(id) ON DELETE CASCADE
    );
    
    -- Copy existing sessions data if table exists
    INSERT OR IGNORE INTO sessions_new (id, scenario_id, startTime, endTime, duration, transcript, metadata, created, updated, status)
    SELECT id, scenario_id, startTime, endTime, duration, transcript, metadata, created, updated, 
           CASE 
             WHEN endTime IS NOT NULL THEN 'ended'
             WHEN startTime IS NOT NULL THEN 'active' 
             ELSE 'not_started'
           END as status
    FROM sessions WHERE EXISTS (SELECT name FROM sqlite_master WHERE type='table' AND name='sessions');
    
    -- Drop old sessions table if it exists
    DROP TABLE IF EXISTS sessions;
    
    -- Rename new table
    ALTER TABLE sessions_new RENAME TO sessions;
    
    PRAGMA foreign_keys=on;
    
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
      estimatedMinutes INTEGER,
      systemPrompt TEXT,
      initialMessage TEXT,
      tags TEXT, -- JSON array stored as text
      isPublic BOOLEAN DEFAULT 1,
      voice TEXT,
      archived BOOLEAN DEFAULT 0,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS session_packs (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL, -- reference to original Practice Pack template
      name TEXT NOT NULL, -- copied from original pack at creation time
      description TEXT, -- copied from original pack
      color TEXT, -- copied from original pack
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pack_id) REFERENCES packs(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      session_pack_id TEXT, -- NULL for standalone sessions, references session_packs(id) for pack sessions
      startTime DATETIME, -- NULL if not started yet
      endTime DATETIME,
      duration INTEGER,
      transcript TEXT, -- JSON stored as text
      metadata TEXT, -- JSON stored as text
      status TEXT CHECK(status IN ('not_started', 'active', 'paused', 'ended')) DEFAULT 'not_started',
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
      FOREIGN KEY (session_pack_id) REFERENCES session_packs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS packs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'BookOpen',
      difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
      estimatedMinutes INTEGER,
      order_index INTEGER DEFAULT 0,
      archived BOOLEAN DEFAULT 0,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pack_scenarios (
      pack_id TEXT NOT NULL,
      scenario_id TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (pack_id, scenario_id),
      FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    );

    -- Insert default preferences if not exist
    INSERT OR IGNORE INTO user_preferences (key, value) VALUES 
      ('speachesUrl', 'http://localhost:8000'),
      ('ollamaUrl', 'http://localhost:11434'),
      ('ollamaModel', 'llama2'),
      ('voice', 'male');
  `);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// CommonJS export for Electron main process
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initDatabase, getDatabase };
}