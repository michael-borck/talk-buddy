const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = process.argv.includes('--dev') || (process.env.NODE_ENV !== 'production' && require('electron-is-dev'));
const Database = require('better-sqlite3');

let mainWindow;
let db;

// Default scenarios data - kept separately for restoration
const DEFAULT_SCENARIOS = [
  // Business Communication & Professional Skills
  {
    name: "Job Interview - Marketing Manager",
    description: "Practice interviewing for a marketing manager position. Focus on marketing strategies, campaign experience, and leadership skills.",
    category: "Business",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    systemPrompt: "You are a hiring manager conducting an interview for a Marketing Manager position at a mid-size company. Ask about their marketing experience, campaign successes, team leadership, and strategic thinking. Be professional but encouraging.",
    initialMessage: "Good morning! Thank you for your interest in our Marketing Manager position. I'd like to start by having you tell me about your background in marketing and what draws you to this role.",
    tags: ["interview", "marketing", "leadership", "professional"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "Client Presentation - IT Solutions",
    description: "Present an IT solution to a potential business client. Practice explaining technical concepts in business terms.",
    category: "Technology",
    difficulty: "advanced",
    estimatedMinutes: 12,
    systemPrompt: "You are a business decision-maker listening to an IT consultant's presentation about implementing new technology solutions. Ask relevant questions about cost, implementation timeline, security, and business benefits. Show interest but be appropriately skeptical.",
    initialMessage: "Thank you for coming in today. We're looking to modernize our IT infrastructure. Could you start by outlining what you're proposing for our company?",
    tags: ["presentation", "technology", "consulting", "business"],
    isDefault: true,
    voice: "male"
  },
  {
    name: "Team Meeting - Project Status",
    description: "Lead or participate in a team meeting discussing project progress, challenges, and next steps.",
    category: "Management",
    difficulty: "intermediate",
    estimatedMinutes: 10,
    systemPrompt: "You are a team member in a project status meeting. The user is leading the meeting. Ask questions about deadlines, resource needs, and potential roadblocks. Provide realistic updates and collaborate on solutions.",
    initialMessage: "Good morning everyone. Let's start our weekly project meeting. Could you give us an update on where we stand with the current deliverables?",
    tags: ["teamwork", "project management", "meetings", "collaboration"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "Sales Call - Software Product",
    description: "Practice selling enterprise software to a business customer. Handle objections and explain value propositions.",
    category: "Sales",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    systemPrompt: "You are a potential customer interested in business software solutions but have concerns about cost, implementation complexity, and ROI. Ask probing questions, raise common objections, and be moderately skeptical but open to being convinced.",
    initialMessage: "Hello, I understand you have a software solution that might help our business operations. Could you tell me more about what it does and how it might benefit our company?",
    tags: ["sales", "software", "negotiation", "value proposition"],
    isDefault: true,
    voice: "male"
  },

  // Customer Service & Communication
  {
    name: "Customer Service - Product Return",
    description: "Handle a customer service situation involving a product return or complaint. Practice professional problem-solving.",
    category: "Customer Service",
    difficulty: "beginner",
    estimatedMinutes: 8,
    systemPrompt: "You are a customer who purchased a product online that didn't meet expectations. You want to return it but aren't sure about the process. Be polite but express your concerns clearly. The user is the customer service representative.",
    initialMessage: "Hi, I need help with returning a product I ordered last week. It's not what I expected and I'd like to get a refund or exchange.",
    tags: ["customer service", "returns", "problem solving", "communication"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "Vendor Negotiation - Service Contract",
    description: "Negotiate terms with a service vendor for your company. Practice professional negotiation skills.",
    category: "Business",
    difficulty: "advanced",
    estimatedMinutes: 15,
    systemPrompt: "You are a vendor representative trying to sell services to a business. The user represents the company. Be professional, flexible on some terms but firm on others. Try to reach a mutually beneficial agreement.",
    initialMessage: "Thank you for considering our services for your upcoming project. I'd like to discuss the terms of our service agreement and see how we can best meet your needs.",
    tags: ["negotiation", "contracts", "business", "vendors"],
    isDefault: true,
    voice: "male"
  },

  // Networking & Professional Development
  {
    name: "Networking Event - Industry Conference",
    description: "Practice networking at a business conference. Make connections and discuss industry trends.",
    category: "Networking",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    systemPrompt: "You are a professional at an industry networking event. The user will approach you for conversation. Be friendly and open to discussion about business trends, career development, and potential collaborations. Share your background when asked.",
    initialMessage: "Hi there! I don't think we've met. I'm working in digital marketing at Tech Innovations. What brings you to this conference?",
    tags: ["networking", "conferences", "professional development", "industry"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "Performance Review Meeting",
    description: "Participate in an annual performance review. Discuss accomplishments, goals, and career development.",
    category: "Management",
    difficulty: "intermediate",
    estimatedMinutes: 12,
    systemPrompt: "You are a manager conducting a performance review with an employee. Be constructive and supportive. Ask about their achievements, challenges, and career goals. Provide feedback and discuss development opportunities.",
    initialMessage: "Good afternoon! I'm glad we could schedule this time for your annual review. Let's start by having you tell me about your key accomplishments this year and what you're most proud of.",
    tags: ["performance review", "career development", "management", "goals"],
    isDefault: true,
    voice: "male"
  },

  // Business Operations & Strategy
  {
    name: "Budget Planning Meeting",
    description: "Discuss budget allocation and financial planning for a department or project.",
    category: "Finance",
    difficulty: "advanced",
    estimatedMinutes: 10,
    systemPrompt: "You are a finance manager or CFO reviewing budget proposals with a department head. Ask detailed questions about expenses, ROI projections, and cost justifications. Be analytical but fair in your questioning.",
    initialMessage: "Thank you for submitting your budget proposal for next quarter. I've reviewed the numbers, and I'd like to discuss some of the line items in more detail. Could you walk me through your main expenditure categories?",
    tags: ["budgeting", "finance", "planning", "business operations"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "Product Launch Strategy Meeting",
    description: "Plan the launch strategy for a new product or service. Discuss marketing, timeline, and resource allocation.",
    category: "Marketing",
    difficulty: "advanced",
    estimatedMinutes: 15,
    systemPrompt: "You are a senior marketing executive or product manager collaborating on a product launch. Ask strategic questions about target market, positioning, timeline, and success metrics. Be collaborative but thorough.",
    initialMessage: "Excellent work on developing this new product. Now we need to plan the launch strategy. What's your vision for how we should position this in the market, and who do you see as our primary target audience?",
    tags: ["product launch", "marketing strategy", "planning", "collaboration"],
    isDefault: true,
    voice: "male"
  },

  // Technology & Information Systems
  {
    name: "IT Security Briefing",
    description: "Present or discuss cybersecurity policies and best practices with non-technical stakeholders.",
    category: "Technology",
    difficulty: "intermediate",
    estimatedMinutes: 10,
    systemPrompt: "You are a business manager receiving an IT security briefing. You're not highly technical but understand the business implications. Ask practical questions about implementation, costs, and how policies affect daily operations.",
    initialMessage: "I understand we need to update our cybersecurity policies. Could you explain what changes you're proposing and how they'll affect our team's day-to-day work?",
    tags: ["cybersecurity", "IT policy", "business communication", "technology"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "System Implementation Planning",
    description: "Plan the implementation of a new business system. Discuss timeline, training, and change management.",
    category: "Technology",
    difficulty: "advanced",
    estimatedMinutes: 12,
    systemPrompt: "You are a department head whose team will be affected by a new system implementation. You want to ensure minimal disruption to operations and adequate training for your staff. Ask about timeline, training programs, and support during transition.",
    initialMessage: "I understand we're implementing a new CRM system next quarter. My team is concerned about the transition period. Could you walk me through the implementation plan and how we'll ensure our staff is properly trained?",
    tags: ["system implementation", "change management", "training", "planning"],
    isDefault: true,
    voice: "male"
  },

  // Academic & Professional Scenarios
  {
    name: "Business Case Study Presentation",
    description: "Present findings and recommendations from a business case study to executives or professors.",
    category: "Academic",
    difficulty: "intermediate",
    estimatedMinutes: 10,
    systemPrompt: "You are a professor or executive listening to a case study presentation. Ask challenging questions about methodology, assumptions, and recommendations. Push for deeper analysis and practical implementation considerations.",
    initialMessage: "Thank you for your presentation on this case study. Your analysis is interesting. I'd like to dig deeper into your recommendations. What evidence supports your conclusion that this strategy would be most effective?",
    tags: ["case study", "analysis", "presentation", "academic"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "Internship Interview - Business Student",
    description: "Interview for a business internship position. Practice discussing academic projects and career goals.",
    category: "Academic",
    difficulty: "beginner",
    estimatedMinutes: 12,
    systemPrompt: "You are an HR manager or internship coordinator interviewing a business student. Ask about their coursework, projects, career interests, and what they hope to learn from the internship. Be encouraging and helpful.",
    initialMessage: "Welcome! Thank you for your interest in our internship program. I'd love to learn more about your background. Could you tell me about your studies and what aspects of business interest you most?",
    tags: ["internship", "student", "career development", "academic"],
    isDefault: true,
    voice: "male"
  },

  // Cross-Cultural Business Communication
  {
    name: "International Business Call",
    description: "Participate in a business call with international colleagues. Practice clear, professional communication.",
    category: "International",
    difficulty: "intermediate",
    estimatedMinutes: 10,
    systemPrompt: "You are a business colleague from another country participating in an international business call. Speak clearly and professionally. Ask for clarification when needed and be mindful of cultural differences in communication styles.",
    initialMessage: "Good morning everyone, and thank you for accommodating the time difference for this call. I'd like to discuss our progress on the global expansion project. Could you start by updating us on the market research findings?",
    tags: ["international business", "cross-cultural", "global", "communication"],
    isDefault: true,
    voice: "female"
  },
  {
    name: "Trade Show Booth Conversation",
    description: "Represent your company at a trade show. Practice engaging with potential customers and partners.",
    category: "Marketing",
    difficulty: "beginner",
    estimatedMinutes: 8,
    systemPrompt: "You are a visitor at a trade show who stops by the user's company booth. You're potentially interested in their products/services but need more information. Ask relevant questions about features, pricing, and implementation.",
    initialMessage: "Hi there! I was walking by your booth and your display caught my attention. Could you tell me more about what your company does and how you might be able to help businesses like mine?",
    tags: ["trade shows", "marketing", "networking", "business development"],
    isDefault: true,
    voice: "male"
  }
];

function insertSeedScenarios(db) {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO scenarios (
      id, name, description, category, difficulty, estimatedMinutes,
      systemPrompt, initialMessage, tags, isPublic, isDefault, voice, archived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      1, // isPublic = true (defaults)
      scenario.isDefault ? 1 : 0,
      scenario.voice,
      0  // archived = false
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
  const dbPath = path.join(app.getPath('userData'), 'chatterbox.db');
  db = new Database(dbPath);
  
  // Add missing columns to existing databases
  try {
    db.exec('ALTER TABLE scenarios ADD COLUMN isPublic BOOLEAN DEFAULT 1');
  } catch (e) {
    // Column already exists, ignore error
  }

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
      isPublic BOOLEAN DEFAULT 1,
      isDefault BOOLEAN DEFAULT 0,
      voice TEXT,
      archived BOOLEAN DEFAULT 0,
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
    // Check if isDefault column exists, if not add it
    try {
      db.exec('ALTER TABLE scenarios ADD COLUMN isDefault BOOLEAN DEFAULT 0');
    } catch (e) {
      // Column already exists, ignore error
    }
    
    // Check if archived column exists, if not add it
    try {
      db.exec('ALTER TABLE scenarios ADD COLUMN archived BOOLEAN DEFAULT 0');
    } catch (e) {
      // Column already exists, ignore error
    }
    
    // First, delete all existing default scenarios (try both approaches for safety)
    try {
      const deleteStmt = db.prepare('DELETE FROM scenarios WHERE isDefault = 1');
      deleteStmt.run();
    } catch (e) {
      // If isDefault column doesn't work, delete scenarios that look like defaults
      const deleteStmt = db.prepare(`DELETE FROM scenarios WHERE name IN (
        'Coffee Shop Order', 'Job Interview - Software Developer', 'Hotel Check-in', 'Restaurant Reservation'
      )`);
      deleteStmt.run();
    }
    
    let restoredCount = 0;
    const insertStmt = db.prepare(`
      INSERT INTO scenarios (
        id, name, description, category, difficulty, estimatedMinutes,
        systemPrompt, initialMessage, tags, isPublic, isDefault, voice, archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    DEFAULT_SCENARIOS.forEach((scenario, index) => {
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
        1, // isPublic = true
        1, // isDefault = true
        scenario.voice,
        0  // archived = false
      );
      restoredCount++;
    });
    
    return { success: true, restoredCount };
  } catch (error) {
    console.error('Restore defaults error:', error);
    return { success: false, error: error.message };
  }
});