const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { net } = require('electron');
const isDev = process.argv.includes('--dev') || (process.env.NODE_ENV !== 'production' && require('electron-is-dev'));
// node:sqlite ships inside Electron's bundled Node — no native compile,
// no node-gyp/electron-rebuild, and it tracks Electron's V8 automatically.
// API is drop-in for our usage (prepare / run / get / all / exec).
const { DatabaseSync } = require('node:sqlite');
const { autoUpdater } = require('electron-updater');
const { runOperation } = require('./db-operations');

// Disable sandbox on Linux only in development or when explicitly requested
if (process.platform === 'linux' && (isDev || process.argv.includes('--no-sandbox'))) {
  app.commandLine.appendSwitch('no-sandbox');
}

let mainWindow;
let db;
let embeddedServer = null;
let embeddedServerPort = 8765;
let embeddedInstallProcess = null;
// Per-session bearer token for the embedded server: localhost-only
// binding doesn't stop other local processes (or webpage form POSTs)
// from reaching it, so every route except /health requires this.
const embeddedServerToken = require('crypto').randomBytes(32).toString('hex');

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

// Embedded Server Management
function getEmbeddedServerPath() {
  if (isDev) {
    // Development: use Python script directly
    return path.join(__dirname, '../../embedded-server/server.py');
  } else {
    // Production: use bundled executable
    const platform = process.platform;
    const extension = platform === 'win32' ? '.exe' : '';
    return path.join(process.resourcesPath, 'embedded-server', `embedded-server${extension}`);
  }
}

// Check whether the embedded server is ready to spawn. In dev, this
// means BOTH the Python venv exists AND the Piper voice models are
// downloaded — a venv without models leaves the server "running" but
// with TTS silently broken (health check reports services.tts=false).
// Treating missing models as "not installed" lets the UI surface the
// "Set up now" prompt so the user can re-run setup.sh, which is
// idempotent and will only download what's missing.
//
// In prod, this means the bundled standalone executable exists
// (PyInstaller wraps the models into the binary via --add-data).
function getEmbeddedInstallState() {
  const serverPath = getEmbeddedServerPath();
  if (isDev) {
    const rootDir = path.dirname(serverPath);
    const venvPython = path.join(rootDir, 'venv', 'bin', 'python');
    const setupScript = path.join(rootDir, 'setup.sh');
    // Model files the TTS engine needs. If any are missing, we treat
    // the install as incomplete and let the setup flow fill them in.
    const requiredModels = [
      path.join(rootDir, 'models', 'en_GB-alan-low.onnx'),
      path.join(rootDir, 'models', 'en_GB-alan-low.onnx.json'),
      path.join(rootDir, 'models', 'en_US-amy-low.onnx'),
      path.join(rootDir, 'models', 'en_US-amy-low.onnx.json'),
    ];
    const venvOk = fs.existsSync(venvPython);
    const modelsOk = requiredModels.every((p) => fs.existsSync(p));
    return {
      installed: venvOk && modelsOk,
      venvOk,
      modelsOk,
      path: venvPython,
      setupScript: fs.existsSync(setupScript) ? setupScript : null,
      mode: 'dev',
    };
  }
  return {
    installed: fs.existsSync(serverPath),
    venvOk: fs.existsSync(serverPath),
    modelsOk: true,
    path: serverPath,
    setupScript: null,
    mode: 'prod',
  };
}

function findAvailablePort(startPort = 8765) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

async function startEmbeddedServer() {
  if (embeddedServer) {
    console.log('Embedded server already running');
    return true;
  }

  // Fast path: if the embedded server isn't installed, don't spawn
  // anything — just log a tidy one-liner. The user can set it up from
  // Settings → STT/TTS if they want offline speech.
  const installState = getEmbeddedInstallState();
  if (!installState.installed) {
    console.log('[Embedded] Not installed. Using external services. Run Settings → Embedded → Set up to enable offline mode.');
    return false;
  }

  try {
    console.log('Starting embedded TTS/STT server...');

    // Find available port
    embeddedServerPort = await findAvailablePort(8765);
    console.log(`Using port ${embeddedServerPort} for embedded server`);

    const serverPath = getEmbeddedServerPath();
    // Whitelisted environment: the Python server needs none of the
    // shell's secrets (API keys, tokens), so don't hand them over.
    const PASSTHROUGH_ENV = [
      'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_ALL', 'TMPDIR', 'TEMP', 'TMP',
      // Windows process essentials
      'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA',
      'PROGRAMDATA', 'USERPROFILE', 'SYSTEMDRIVE', 'PATHEXT', 'NUMBER_OF_PROCESSORS',
    ];
    const env = {};
    for (const key of PASSTHROUGH_ENV) {
      if (process.env[key] !== undefined) env[key] = process.env[key];
    }
    env.PORT = embeddedServerPort.toString();
    env.HOST = '127.0.0.1';
    env.EMBEDDED_AUTH_TOKEN = embeddedServerToken;

    if (isDev) {
      // Development: run Python script using venv
      const venvPython = path.join(path.dirname(serverPath), 'venv', 'bin', 'python');
      embeddedServer = spawn(venvPython, [serverPath], {
        env,
        cwd: path.dirname(serverPath),
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      // Production: run bundled executable
      embeddedServer = spawn(serverPath, [], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }

    // Handle server output with error handling for EPIPE
    if (embeddedServer.stdout) {
      embeddedServer.stdout.on('data', (data) => {
        try {
          console.log(`[Embedded Server] ${data.toString().trim()}`);
        } catch (err) {
          // Ignore write errors
        }
      });
    }

    if (embeddedServer.stderr) {
      embeddedServer.stderr.on('data', (data) => {
        try {
          console.error(`[Embedded Server Error] ${data.toString().trim()}`);
        } catch (err) {
          // Ignore write errors  
        }
      });
    }

    embeddedServer.on('error', (error) => {
      if (error.code !== 'EPIPE') {
        console.error('Failed to start embedded server:', error);
      }
      embeddedServer = null;
    });

    embeddedServer.on('exit', (code, signal) => {
      if (code !== null || signal !== null) {
        console.log(`Embedded server exited with code ${code}, signal ${signal}`);
      }
      embeddedServer = null;
    });

    // Wait for server to be ready
    const maxRetries = 30; // 30 seconds
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const response = await testEmbeddedServerHealth();
        if (response.ok) {
          console.log('Embedded server is ready');
          // Update database with embedded server URL
          await updateEmbeddedServerConfig();
          // Fire-and-forget warmup so Piper/Whisper load their models in
          // the background instead of on the student's first utterance.
          warmupEmbeddedServer(`http://127.0.0.1:${embeddedServerPort}`);
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }

    console.error('Embedded server failed to start within timeout');
    stopEmbeddedServer();
    return false;

  } catch (error) {
    console.error('Error starting embedded server:', error);
    return false;
  }
}

function stopEmbeddedServer() {
  if (embeddedServer) {
    console.log('Stopping embedded server...');
    
    // Try graceful shutdown first
    try {
      const request = net.request({
        method: 'POST',
        url: `http://127.0.0.1:${embeddedServerPort}/shutdown`
      });
      request.setHeader('Authorization', `Bearer ${embeddedServerToken}`);
      request.end();
    } catch (error) {
      console.log('Graceful shutdown failed, forcing termination');
    }
    
    // Force kill after 5 seconds
    setTimeout(() => {
      if (embeddedServer && !embeddedServer.killed) {
        embeddedServer.kill('SIGTERM');
        setTimeout(() => {
          if (embeddedServer && !embeddedServer.killed) {
            embeddedServer.kill('SIGKILL');
          }
        }, 2000);
      }
    }, 5000);
    
    embeddedServer = null;
  }
}

// Pre-load Piper and Whisper models in the background by firing tiny
// requests against the embedded server right after /health succeeds.
// Both models are otherwise lazy-loaded on first real request, which
// makes the student's first utterance feel laggy. Fire-and-forget;
// failures here are non-fatal.
async function warmupEmbeddedServer(baseUrl) {
  // TTS warmup — Piper loads the voice model on first synth.
  try {
    await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${embeddedServerToken}`,
      },
      body: JSON.stringify({
        model: 'tts-embedded',
        input: 'hi',
        voice: 'amy',
        speed: 1.0,
        response_format: 'wav',
      }),
    });
    console.log('[embedded-server] TTS warmup complete');
  } catch (e) {
    console.warn('[embedded-server] TTS warmup failed (non-fatal):', e.message);
  }

  // STT warmup — Whisper loads the model on first transcription.
  // Build a minimal valid WAV file (header + 0.5s of silence) and POST
  // it as multipart so the server takes the same code path as a real
  // transcription request.
  try {
    const sampleRate = 16000;
    const numSamples = sampleRate / 2; // 0.5s
    const dataSize = numSamples * 2; // 16-bit mono
    const wav = Buffer.alloc(44 + dataSize);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write('WAVE', 8);
    wav.write('fmt ', 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(dataSize, 40);
    // Audio bytes are already zeros from Buffer.alloc → silence.

    const formData = new FormData();
    formData.append('file', new Blob([wav], { type: 'audio/wav' }), 'warmup.wav');
    formData.append('response_format', 'json');
    await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${embeddedServerToken}` },
      body: formData,
    });
    console.log('[embedded-server] STT warmup complete');
  } catch (e) {
    console.warn('[embedded-server] STT warmup failed (non-fatal):', e.message);
  }
}

async function testEmbeddedServerHealth() {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url: `http://127.0.0.1:${embeddedServerPort}/health`
    });

    request.on('response', (response) => {
      resolve({ ok: response.statusCode === 200 });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });
}

async function updateEmbeddedServerConfig() {
  try {
    const embeddedUrl = `http://127.0.0.1:${embeddedServerPort}`;
    
    // Add embedded server URL to user preferences if not already set
    const checkStmt = db.prepare('SELECT value FROM user_preferences WHERE key = ?');
    
    const sttProvider = checkStmt.get('sttProvider');
    if (!sttProvider) {
      db.prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)').run('sttProvider', 'embedded');
    }
    
    const ttsProvider = checkStmt.get('ttsProvider');
    if (!ttsProvider) {
      db.prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)').run('ttsProvider', 'embedded');
    }
    
    // Set embedded server URLs
    db.prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)').run('embeddedSttUrl', embeddedUrl);
    db.prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)').run('embeddedTtsUrl', embeddedUrl);
    
    console.log(`Updated embedded server config: ${embeddedUrl}`);
  } catch (error) {
    console.error('Failed to update embedded server config:', error);
  }
}

// ---- API key storage --------------------------------------------------------
// BYOK keys live in user_preferences but encrypted with the OS keychain
// (safeStorage) rather than plaintext. Stored format: 'enc:v1:<base64>'.
// Values starting with 'env:' are references to environment variables,
// not secrets themselves, and stay readable.
const SECRET_PREF_KEYS = ['sttApiKey', 'ttsApiKey', 'ollamaApiKey'];
const ENC_PREFIX = 'enc:v1:';

function encryptSecret(value) {
  if (!value || value.startsWith('env:') || !safeStorage.isEncryptionAvailable()) {
    return value;
  }
  return ENC_PREFIX + safeStorage.encryptString(value).toString('base64');
}

function decryptSecret(stored) {
  if (!stored || !stored.startsWith(ENC_PREFIX)) return stored || '';
  try {
    return safeStorage.decryptString(Buffer.from(stored.slice(ENC_PREFIX.length), 'base64'));
  } catch (err) {
    // Wrong keychain (copied DB from another machine) — treat as unset
    // rather than handing the renderer ciphertext.
    console.warn('Failed to decrypt stored API key:', err.message);
    return '';
  }
}

// One-time migration: encrypt any plaintext keys already on disk.
function migrateSecretsToSafeStorage() {
  if (!safeStorage.isEncryptionAvailable()) return;
  for (const key of SECRET_PREF_KEYS) {
    const row = db.prepare('SELECT value FROM user_preferences WHERE key = ?').get(key);
    if (row && row.value && !row.value.startsWith(ENC_PREFIX) && !row.value.startsWith('env:')) {
      db.prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)')
        .run(key, encryptSecret(row.value));
    }
  }
}

ipcMain.handle('secrets:get', (event, key) => {
  if (!SECRET_PREF_KEYS.includes(key)) return '';
  const row = db.prepare('SELECT value FROM user_preferences WHERE key = ?').get(key);
  return decryptSecret(row ? row.value : '');
});

ipcMain.handle('secrets:set', (event, { key, value }) => {
  if (!SECRET_PREF_KEYS.includes(key)) return { success: false, error: 'Unknown secret key' };
  db.prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)')
    .run(key, encryptSecret(value || ''));
  return { success: true };
});

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
      ? 'http://localhost:3307'
      : `file://${path.join(__dirname, '../../dist/index.html')}`
  );

  // The renderer is a single-page app: it must never navigate the top
  // frame elsewhere, and window.open should hand web links to the OS
  // browser instead of spawning Electron windows.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appOrigin = isDev ? 'http://localhost:3307' : 'file://';
    if (!url.startsWith(appOrigin)) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      }
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Stop embedded server when main window closes
    stopEmbeddedServer();
  });

  // Dev tools can be opened manually with Ctrl+Shift+I if needed
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }
}

app.whenReady().then(() => {
  // Initialize SQLite database
  const dbPath = path.join(app.getPath('userData'), 'talkbuddy.db');
  db = new DatabaseSync(dbPath);
  
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

    -- Non-network defaults only. Server URLs are deliberately NOT seeded:
    -- a fresh install must not send voice audio or conversation text
    -- anywhere until the user makes the first-run privacy choice
    -- (renderer WelcomePage). Read-time fallbacks live in config.ts.
    INSERT OR IGNORE INTO user_preferences (key, value) VALUES
      ('voice', 'female'),
      ('sttModel', 'Systran/faster-whisper-small'),
      ('ttsModel', 'speaches-ai/Kokoro-82M-v1.0-ONNX'),
      ('maleTTSModel', 'speaches-ai/Kokoro-82M-v1.0-ONNX'),
      ('femaleTTSModel', 'speaches-ai/Kokoro-82M-v1.0-ONNX'),
      ('maleVoice', 'am_adam'),
      ('femaleVoice', 'af_bella'),
      ('ttsSpeed', '1.25'),
      ('conversationCue', 'rise'),
      ('promptTemplate', 'natural'),
      ('customPrompt', ''),
      ('promptBehavior', 'enhance'),
      ('includeResponseFormat', 'true'),
      ('addModelOptimizations', 'false');
  `);

  // Installs that predate the first-run privacy choice already have the
  // server URLs seeded (speachesUrl was in every legacy seed) — treat
  // them as onboarded so the welcome screen only greets new users.
  const onboardedRow = db.prepare("SELECT value FROM user_preferences WHERE key = 'onboardingComplete'").get();
  if (!onboardedRow) {
    const legacy = db.prepare("SELECT value FROM user_preferences WHERE key = 'speachesUrl'").get();
    if (legacy) {
      db.prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)')
        .run('onboardingComplete', 'true');
    }
  }

  migrateSecretsToSafeStorage();
  
  // Insert seed data if no scenarios exist
  const scenarioCount = db.prepare('SELECT COUNT(*) as count FROM scenarios').get();
  if (scenarioCount.count === 0) {
    insertSeedScenarios(db);
  }
  
  // Start embedded server if it's already installed. If not, stay quiet —
  // the user can set it up from Settings and we'll auto-start afterward.
  if (getEmbeddedInstallState().installed) {
    startEmbeddedServer().then((success) => {
      if (success) {
        console.log('Embedded server started successfully');
      } else {
        console.log('[Embedded] Start attempt returned false — check logs above.');
      }
    });
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Auto-updater — skip in dev (no built artifact, no signed build).
  // electron-updater reads the latest-{platform}.yml files that the
  // CI workflow already publishes to GitHub Releases, so we don't
  // need a separate update server. Logs at info level so we can see
  // what happened in production logs without overwhelming the user.
  if (!isDev) {
    autoUpdater.logger = console;
    // Ask before downloading: a privacy-positioned app shouldn't pull
    // and install new binaries silently. One dialog, then install on quit.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', async (info) => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update available',
        message: `Talk Buddy ${info.version} is available.`,
        detail: 'Download now and install when you quit the app?',
        buttons: ['Install on quit', 'Later'],
        defaultId: 0,
        cancelId: 1,
      });
      if (response === 0) {
        autoUpdater.downloadUpdate().catch((err) => {
          console.warn('[auto-updater] Download failed:', err.message);
        });
      }
    });
    // Wait 30s after launch before checking — give the app time to
    // settle (window painted, embedded server warmed up) so the
    // update check doesn't compete for resources at the worst moment.
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[auto-updater] Check failed (non-fatal):', err.message);
      });
    }, 30_000);
  }
});

app.on('window-all-closed', () => {
  stopEmbeddedServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopEmbeddedServer();
});

// IPC Handlers for database operations. The renderer invokes named
// operations with structured params — raw SQL never crosses IPC.
ipcMain.handle('db:op', async (event, { name, params }) => {
  try {
    return { success: true, data: runOperation(db, name, params) };
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

// Open external links. Only web URLs — anything else (file:, smb:,
// app-registered schemes) hands the renderer a way to launch local
// programs, which defeats the sandbox.
function isSafeExternalUrl(url) {
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

ipcMain.handle('shell:openExternal', async (event, url) => {
  if (!isSafeExternalUrl(url)) {
    console.warn(`Blocked openExternal for non-web URL: ${url}`);
    return;
  }
  await shell.openExternal(url);
});

// App info
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPath', (event, name) => {
  return app.getPath(name);
});

// Return a shell environment variable. The renderer can't see process.env
// because webPreferences.nodeIntegration is false and contextIsolation is
// true — its `process` object is a sandboxed polyfill, not the real
// Node process that Electron's main was spawned from. Any feature that
// resolves `env:VAR_NAME` prefs (chat API key, STT API key, TTS API key)
// has to hop through this IPC.
// Allowlisted: only credential vars the env:VAR settings feature is for.
// Without this, a compromised renderer could read ANY shell secret
// (AWS keys, GitHub tokens, ...) through this channel.
const KNOWN_ENV_VARS = new Set([
  'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY',
  'OLLAMA_API_KEY', 'API_KEY',
]);
ipcMain.handle('app:getEnvVar', (event, name) => {
  if (!name || typeof name !== 'string') return null;
  if (!KNOWN_ENV_VARS.has(name) && !/^[A-Z][A-Z0-9_]*_API_KEY$/.test(name)) {
    console.warn(`Blocked getEnvVar for non-allowlisted variable: ${name}`);
    return null;
  }
  return process.env[name] || null;
});

// Speaches STT — multipart upload via main-process fetch. The renderer
// sends the audio as an ArrayBuffer (FormData doesn't serialize across
// IPC). We rebuild FormData here where global fetch handles it natively.
// Main process has no CORS enforcement, so this bypasses the browser
// preflight that blocks direct renderer fetches to speaches.locopuente.org.
ipcMain.handle('speaches:transcribe', async (event, { url, apiKey, audioBuffer, model, filename }) => {
  if (!isAllowedProxyUrl(url)) {
    return { ok: false, status: 0, statusText: 'blocked', error: 'URL is not a configured endpoint' };
  }
  try {
    const formData = new FormData();
    // audioBuffer arrives as a Uint8Array over IPC; wrap in Blob for FormData.
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, filename || 'audio.webm');
    formData.append('model', model);
    formData.append('response_format', 'json');

    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const bodyText = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(bodyText); } catch { /* keep as text */ }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: parsed,
      body: bodyText,
    };
  } catch (err) {
    console.error('speaches:transcribe failed:', err);
    return {
      ok: false,
      status: 0,
      statusText: 'network_error',
      error: err && err.message ? err.message : String(err),
    };
  }
});

// Speaches TTS — JSON POST returning binary audio. The response body is
// returned as a Uint8Array that the renderer wraps in a Blob.
ipcMain.handle('speaches:speak', async (event, { url, apiKey, payload }) => {
  if (!isAllowedProxyUrl(url)) {
    return { ok: false, status: 0, statusText: 'blocked', error: 'URL is not a configured endpoint' };
  }
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        body: bodyText,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      audio: new Uint8Array(arrayBuffer),
      contentType: response.headers.get('content-type') || 'audio/mpeg',
    };
  } catch (err) {
    console.error('speaches:speak failed:', err);
    return {
      ok: false,
      status: 0,
      statusText: 'network_error',
      error: err && err.message ? err.message : String(err),
    };
  }
});

// Proxy for external API requests to bypass CORS. Restricted to the
// endpoints the user has actually configured (plus the hosted provider
// APIs and localhost) — without this check the proxy is an arbitrary
// exfiltration channel for a compromised renderer, bypassing the CSP.
const HOSTED_API_ORIGINS = new Set([
  'https://api.anthropic.com',
  'https://api.openai.com',
  'https://api.groq.com',
  'https://generativelanguage.googleapis.com',
]);

function isAllowedProxyUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') return true;
  if (HOSTED_API_ORIGINS.has(parsed.origin)) return true;
  // User-configured endpoints (BYO server URLs) from preferences.
  const urlPrefKeys = ['speachesUrl', 'sttUrl', 'ttsUrl', 'ollamaUrl'];
  for (const key of urlPrefKeys) {
    const row = db.prepare('SELECT value FROM user_preferences WHERE key = ?').get(key);
    if (row && row.value) {
      try {
        if (new URL(row.value).origin === parsed.origin) return true;
      } catch { /* malformed pref — ignore */ }
    }
  }
  return false;
}

ipcMain.handle('api:fetch', async (event, { url, options }) => {
  if (!isAllowedProxyUrl(url)) {
    console.warn(`Blocked api:fetch to non-configured origin: ${url}`);
    return { ok: false, status: 0, error: 'URL is not a configured endpoint' };
  }
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

// Reset database
ipcMain.handle('db:reset', async () => {
  try {
    // Clear all tables except user_preferences
    db.exec(`
      DELETE FROM sessions;
      DELETE FROM session_packs;
      DELETE FROM pack_scenarios;
      DELETE FROM packs;
      DELETE FROM scenarios;
    `);
    
    // Re-insert seed scenarios
    insertSeedScenarios(db);
    
    return { success: true };
  } catch (error) {
    console.error('Database reset error:', error);
    return { success: false, error: error.message };
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

// Embedded server IPC handlers
ipcMain.handle('embedded-server:status', async () => {
  return {
    running: embeddedServer !== null && !embeddedServer.killed,
    port: embeddedServerPort,
    url: `http://127.0.0.1:${embeddedServerPort}`,
    token: embeddedServerToken
  };
});

ipcMain.handle('embedded-server:start', async () => {
  const success = await startEmbeddedServer();
  return { success };
});

ipcMain.handle('embedded-server:stop', async () => {
  stopEmbeddedServer();
  return { success: true };
});

ipcMain.handle('embedded-server:restart', async () => {
  stopEmbeddedServer();
  // Wait a moment for cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));
  const success = await startEmbeddedServer();
  return { success };
});

// Check whether the embedded server is installed and which setup script
// (if any) is available to install it.
ipcMain.handle('embedded-server:check-install', async () => {
  const state = getEmbeddedInstallState();
  // In dev mode, also tell the renderer whether python3 is available on
  // PATH so the Settings UI can give a specific pre-flight error before
  // the user even clicks Set Up.
  let pythonAvailable = null;
  if (state.mode === 'dev') {
    pythonAvailable = await new Promise((resolve) => {
      const probe = spawn('python3', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
      probe.on('error', () => resolve(false));
      probe.on('exit', (code) => resolve(code === 0));
    });
  }
  return {
    installed: state.installed,
    venvOk: state.venvOk,
    modelsOk: state.modelsOk,
    mode: state.mode,
    path: state.path,
    hasSetupScript: state.setupScript !== null,
    pythonAvailable,
  };
});

// Run the embedded-server setup script, streaming stdout + stderr to the
// renderer over 'embedded-install:output' so the Settings modal can show
// live progress. Returns the final exit code.
//
// Only valid in dev mode. In a packaged build the embedded server ships
// as a pre-built executable and never needs installing at runtime.
ipcMain.handle('embedded-server:install', async () => {
  const state = getEmbeddedInstallState();
  if (state.mode !== 'dev') {
    return { ok: false, error: 'Install flow is only available in dev builds — packaged releases bundle the embedded server.' };
  }
  if (!state.setupScript) {
    return { ok: false, error: 'setup.sh not found in embedded-server/ — the repo may be incomplete.' };
  }
  if (embeddedInstallProcess) {
    return { ok: false, error: 'Install already in progress.' };
  }

  const sendOutput = (stream, text) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('embedded-install:output', { stream, text });
    }
  };

  sendOutput('info', `Running ${state.setupScript}\n`);

  return new Promise((resolve) => {
    const child = spawn('bash', [state.setupScript], {
      cwd: path.dirname(state.setupScript),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    embeddedInstallProcess = child;

    child.stdout.on('data', (chunk) => sendOutput('stdout', chunk.toString()));
    child.stderr.on('data', (chunk) => sendOutput('stderr', chunk.toString()));

    child.on('error', (err) => {
      embeddedInstallProcess = null;
      sendOutput('error', `Failed to spawn setup.sh: ${err.message}\n`);
      resolve({ ok: false, error: err.message });
    });

    child.on('exit', (code, signal) => {
      embeddedInstallProcess = null;
      if (signal) {
        sendOutput('info', `\nInstall cancelled (${signal}).\n`);
        resolve({ ok: false, cancelled: true });
        return;
      }
      if (code === 0) {
        sendOutput('info', '\nInstall complete.\n');
        resolve({ ok: true });
      } else {
        sendOutput('error', `\nInstall exited with code ${code}.\n`);
        resolve({ ok: false, error: `Exit code ${code}` });
      }
    });
  });
});

ipcMain.handle('embedded-server:install-cancel', async () => {
  if (embeddedInstallProcess) {
    embeddedInstallProcess.kill('SIGTERM');
    return { ok: true };
  }
  return { ok: false, error: 'No install in progress.' };
});