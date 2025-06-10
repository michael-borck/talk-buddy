const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = process.argv.includes('--dev') || (process.env.NODE_ENV !== 'production' && require('electron-is-dev'));
const Database = require('better-sqlite3');

let mainWindow;
let db;

// Default scenarios data - kept separately for restoration
const DEFAULT_SCENARIOS = [
  {
    name: "Coffee Shop Order",
    description: "Practice ordering coffee and snacks at a coffee shop. Learn common phrases for customizing drinks and handling payment.",
    category: "Restaurant",
    difficulty: "beginner",
    estimatedMinutes: 5,
    systemPrompt: "You are a friendly barista at a coffee shop. Help the customer order their drink, suggest add-ons or food items, and process their payment. Be conversational and helpful.",
    initialMessage: "Good morning! Welcome to The Daily Grind. What can I get started for you today?",
    tags: ["ordering", "food", "drinks", "payment"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "Job Interview - Software Developer",
    description: "Practice answering common software developer interview questions. Focus on technical skills and behavioral questions.",
    category: "Business",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    systemPrompt: "You are conducting a job interview for a software developer position. Ask about their experience, technical skills, past projects, and behavioral questions. Be professional but friendly.",
    initialMessage: "Hello! Thank you for coming in today. I'm the hiring manager for the software developer position. Could you start by telling me a bit about yourself and your experience?",
    tags: ["interview", "job", "technology", "professional"],
    isDefault: true,
    voice: "male"
  },
  {
    name: "Hotel Check-in",
    description: "Practice checking into a hotel, asking about amenities, and handling common requests.",
    category: "Travel",
    difficulty: "beginner",
    estimatedMinutes: 7,
    systemPrompt: "You are a hotel receptionist. Help the guest check in, provide information about hotel amenities, WiFi, breakfast times, and answer any questions they have about their stay.",
    initialMessage: "Good evening! Welcome to the Grand Plaza Hotel. Do you have a reservation with us?",
    tags: ["hotel", "travel", "check-in", "hospitality"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "Restaurant Reservation",
    description: "Practice making a restaurant reservation over the phone, including special requests.",
    category: "Restaurant",
    difficulty: "beginner",
    estimatedMinutes: 5,
    systemPrompt: "You are a restaurant host taking phone reservations. Be helpful and accommodating, ask about party size, preferred time, and any special requests or dietary restrictions.",
    initialMessage: "Thank you for calling Bella Vista Restaurant. How may I help you today?",
    tags: ["restaurant", "reservation", "phone", "booking"],
    isDefault: true,
    voice: "female"
  }
];

function insertSeedScenarios(db) {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO scenarios (
      id, name, description, category, difficulty, estimatedMinutes,
      systemPrompt, initialMessage, tags, isDefault, voice
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  DEFAULT_SCENARIOS.forEach((scenario, index) => {
    const id = `seed_scenario_${index + 1}`;
    insertStmt.run(
      id,
      scenario.name,
      scenario.description,
      scenario.category,
      scenario.difficulty,
      scenario.estimatedMinutes,
      scenario.systemPrompt,
      scenario.initialMessage,
      JSON.stringify(scenario.tags),
      scenario.isDefault ? 1 : 0,
      scenario.voice
    );
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../../dist/index.html')}`
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // Initialize SQLite database
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
      tags TEXT,
      isDefault BOOLEAN DEFAULT 0,
      voice TEXT,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS session_packs (
      id TEXT PRIMARY KEY,
      pack_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pack_id) REFERENCES packs(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
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

    INSERT OR IGNORE INTO user_preferences (key, value) VALUES 
      ('speachesUrl', 'https://speaches.serveur.au'),
      ('sttUrl', 'https://speaches.serveur.au'),
      ('ttsUrl', 'https://speaches.serveur.au'),
      ('sttApiKey', ''),
      ('ttsApiKey', ''),
      ('ollamaUrl', 'https://ollama.serveur.au'),
      ('ollamaApiKey', ''),
      ('ollamaModel', 'llama2'),
      ('voice', 'male'),
      ('sttModel', 'Systran/faster-distil-whisper-small.en'),
      ('ttsModel', 'speaches-ai/Kokoro-82M-v1.0-ONNX-int8'),
      ('maleTTSModel', 'speaches-ai/piper-en_GB-alan-low'),
      ('femaleTTSModel', 'speaches-ai/piper-en_US-amy-low'),
      ('maleVoice', 'alan'),
      ('femaleVoice', 'amy'),
      ('ttsSpeed', '1.25');
  `);
  
  // Insert seed data if no scenarios exist
  const scenarioCount = db.prepare('SELECT COUNT(*) as count FROM scenarios').get();
  if (scenarioCount.count === 0) {
    insertSeedScenarios(db);
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for database operations
ipcMain.handle('db:query', async (event, { query, params }) => {
  try {
    const stmt = db.prepare(query);
    const result = stmt.all(...(params || []));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:run', async (event, { query, params }) => {
  try {
    const stmt = db.prepare(query);
    const result = stmt.run(...(params || []));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// File dialog handlers
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('dialog:saveFile', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

// Open external links
ipcMain.handle('shell:openExternal', async (event, url) => {
  await shell.openExternal(url);
});

// App info
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPath', (event, name) => {
  return app.getPath(name);
});

// Proxy for external API requests to bypass CORS
ipcMain.handle('api:fetch', async (event, { url, options }) => {
  try {
    const { net } = require('electron');
    const request = net.request({
      method: options.method || 'GET',
      url: url,
    });

    // Set headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        request.setHeader(key, value);
      });
    }

    // Send body if present
    if (options.body) {
      request.write(options.body);
    }

    return new Promise((resolve, reject) => {
      let data = [];
      
      request.on('response', (response) => {
        response.on('data', (chunk) => {
          data.push(chunk);
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(data);
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            statusText: response.statusMessage,
            headers: response.headers,
            data: buffer
          });
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.end();
    });
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Restore default scenarios
ipcMain.handle('scenarios:restoreDefaults', async () => {
  try {
    // Get existing scenario names to avoid duplicates
    const existing = db.prepare('SELECT name FROM scenarios').all();
    const existingNames = new Set(existing.map(s => s.name));
    
    let restoredCount = 0;
    const insertStmt = db.prepare(`
      INSERT INTO scenarios (
        id, name, description, category, difficulty, estimatedMinutes,
        systemPrompt, initialMessage, tags, isDefault, voice
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    DEFAULT_SCENARIOS.forEach((scenario, index) => {
      // Only restore if it doesn't already exist
      if (!existingNames.has(scenario.name)) {
        const id = `restored_${Date.now()}_${index}`;
        insertStmt.run(
          id,
          scenario.name,
          scenario.description,
          scenario.category,
          scenario.difficulty,
          scenario.estimatedMinutes,
          scenario.systemPrompt,
          scenario.initialMessage,
          JSON.stringify(scenario.tags),
          1, // isDefault = true
          scenario.voice
        );
        restoredCount++;
      }
    });
    
    return { success: true, restoredCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
});