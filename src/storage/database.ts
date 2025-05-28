import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'talkbuddy.db');
  db = new Database(dbPath);

  // Create tables if they don't exist
  db.exec(`
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
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      startTime DATETIME NOT NULL,
      endTime DATETIME,
      duration INTEGER,
      transcript TEXT, -- JSON stored as text
      metadata TEXT, -- JSON stored as text
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT
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