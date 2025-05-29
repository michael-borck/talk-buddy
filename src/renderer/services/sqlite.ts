// Client-side SQLite service that communicates with Electron main process
import { Scenario, Session } from '../types';

// Type definitions for Electron API
interface ElectronAPI {
  database: {
    query: (query: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
    run: (query: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
  };
  dialog: {
    openFile: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    saveFile: (defaultPath?: string) => Promise<{ canceled: boolean; filePath?: string }>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  app: {
    getVersion: () => Promise<string>;
    getPath: (name: string) => Promise<string>;
  };
  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Scenario functions
export async function getScenario(id: string): Promise<Scenario | null> {
  const result = await window.electronAPI.database.query(
    'SELECT * FROM scenarios WHERE id = ?',
    [id]
  );
  
  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }
  
  const scenario = result.data[0];
  return {
    ...scenario,
    tags: scenario.tags ? JSON.parse(scenario.tags) : [],
    isPublic: Boolean(scenario.isPublic)
  };
}

export async function listScenarios(filter?: { category?: string; difficulty?: string }): Promise<Scenario[]> {
  let query = 'SELECT * FROM scenarios WHERE 1=1';
  const params: any[] = [];
  
  if (filter?.category) {
    query += ' AND category = ?';
    params.push(filter.category);
  }
  
  if (filter?.difficulty) {
    query += ' AND difficulty = ?';
    params.push(filter.difficulty);
  }
  
  query += ' ORDER BY name';
  
  const result = await window.electronAPI.database.query(query, params);
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((scenario: any) => ({
    ...scenario,
    tags: scenario.tags ? JSON.parse(scenario.tags) : [],
    isPublic: Boolean(scenario.isPublic)
  }));
}

export async function createScenario(scenario: Omit<Scenario, 'id' | 'created' | 'updated'>): Promise<Scenario> {
  const id = `scn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const result = await window.electronAPI.database.run(
    `INSERT INTO scenarios (id, name, description, category, difficulty, estimatedMinutes, 
     systemPrompt, initialMessage, tags, isPublic, voice, created, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      scenario.name,
      scenario.description,
      scenario.category,
      scenario.difficulty,
      scenario.estimatedMinutes,
      scenario.systemPrompt,
      scenario.initialMessage,
      JSON.stringify(scenario.tags || []),
      scenario.isPublic ? 1 : 0,
      scenario.voice,
      now,
      now
    ]
  );
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create scenario');
  }
  
  return {
    ...scenario,
    id,
    created: now,
    updated: now
  };
}

export async function updateScenario(id: string, updates: Partial<Scenario>): Promise<Scenario> {
  const now = new Date().toISOString();
  const scenario = await getScenario(id);
  
  if (!scenario) {
    throw new Error('Scenario not found');
  }
  
  const updatedScenario = { ...scenario, ...updates, updated: now };
  
  const result = await window.electronAPI.database.run(
    `UPDATE scenarios SET name = ?, description = ?, category = ?, difficulty = ?, 
     estimatedMinutes = ?, systemPrompt = ?, initialMessage = ?, tags = ?, 
     isPublic = ?, voice = ?, updated = ? WHERE id = ?`,
    [
      updatedScenario.name,
      updatedScenario.description,
      updatedScenario.category,
      updatedScenario.difficulty,
      updatedScenario.estimatedMinutes,
      updatedScenario.systemPrompt,
      updatedScenario.initialMessage,
      JSON.stringify(updatedScenario.tags || []),
      updatedScenario.isPublic ? 1 : 0,
      updatedScenario.voice,
      now,
      id
    ]
  );
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update scenario');
  }
  
  return updatedScenario;
}

export async function deleteScenario(id: string): Promise<void> {
  const result = await window.electronAPI.database.run(
    'DELETE FROM scenarios WHERE id = ?',
    [id]
  );
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete scenario');
  }
}

// Session functions
export async function createSession(scenarioId: string): Promise<Session> {
  const id = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const result = await window.electronAPI.database.run(
    `INSERT INTO sessions (id, scenario_id, startTime, created, updated)
     VALUES (?, ?, ?, ?, ?)`,
    [id, scenarioId, now, now, now]
  );
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create session');
  }
  
  return {
    id,
    scenario: scenarioId,
    startTime: now,
    created: now,
    updated: now
  };
}

export async function updateSession(id: string, updates: Partial<Session>): Promise<void> {
  const now = new Date().toISOString();
  
  let setClause = ['updated = ?'];
  let params: any[] = [now];
  
  if (updates.endTime !== undefined) {
    setClause.push('endTime = ?');
    params.push(updates.endTime);
  }
  
  if (updates.duration !== undefined) {
    setClause.push('duration = ?');
    params.push(updates.duration);
  }
  
  if (updates.transcript !== undefined) {
    setClause.push('transcript = ?');
    params.push(JSON.stringify(updates.transcript));
  }
  
  if (updates.metadata !== undefined) {
    setClause.push('metadata = ?');
    params.push(JSON.stringify(updates.metadata));
  }
  
  params.push(id);
  
  const result = await window.electronAPI.database.run(
    `UPDATE sessions SET ${setClause.join(', ')} WHERE id = ?`,
    params
  );
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update session');
  }
}

export async function getSession(id: string): Promise<Session | null> {
  const result = await window.electronAPI.database.query(
    'SELECT * FROM sessions WHERE id = ?',
    [id]
  );
  
  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }
  
  const session = result.data[0];
  return {
    ...session,
    transcript: session.transcript ? JSON.parse(session.transcript) : undefined,
    metadata: session.metadata ? JSON.parse(session.metadata) : undefined
  };
}

export async function listSessions(scenarioId?: string): Promise<Session[]> {
  let query = 'SELECT * FROM sessions';
  const params: any[] = [];
  
  if (scenarioId) {
    query += ' WHERE scenario_id = ?';
    params.push(scenarioId);
  }
  
  query += ' ORDER BY created DESC';
  
  const result = await window.electronAPI.database.query(query, params);
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((session: any) => ({
    ...session,
    transcript: session.transcript ? JSON.parse(session.transcript) : undefined,
    metadata: session.metadata ? JSON.parse(session.metadata) : undefined
  }));
}

// User preferences functions
export async function getPreference(key: string): Promise<string | null> {
  const result = await window.electronAPI.database.query(
    'SELECT value FROM user_preferences WHERE key = ?',
    [key]
  );
  
  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }
  
  return result.data[0].value;
}

export async function setPreference(key: string, value: string): Promise<void> {
  const result = await window.electronAPI.database.run(
    'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)',
    [key, value]
  );
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to set preference');
  }
}

export async function getAllPreferences(): Promise<Record<string, string>> {
  const result = await window.electronAPI.database.query(
    'SELECT key, value FROM user_preferences',
    []
  );
  
  if (!result.success || !result.data) {
    return {};
  }
  
  const preferences: Record<string, string> = {};
  result.data.forEach((row: any) => {
    preferences[row.key] = row.value;
  });
  
  return preferences;
}

// Import/Export functions
export async function exportData(): Promise<void> {
  const scenarios = await listScenarios();
  const sessions = await listSessions();
  const preferences = await getAllPreferences();
  
  const exportData = {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    scenarios,
    sessions,
    preferences
  };
  
  const result = await window.electronAPI.dialog.saveFile('talkbuddy-export.json');
  
  if (!result.canceled && result.filePath) {
    // In a real implementation, we'd need to write this through IPC
    // For now, we'll use a download approach
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'talkbuddy-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function importData(fileContent: string): Promise<void> {
  try {
    const data = JSON.parse(fileContent);
    
    // Import scenarios
    if (data.scenarios && Array.isArray(data.scenarios)) {
      for (const scenario of data.scenarios) {
        await createScenario(scenario);
      }
    }
    
    // Import sessions
    if (data.sessions && Array.isArray(data.sessions)) {
      for (const session of data.sessions) {
        const { id, ...sessionData } = session;
        await createSession(sessionData.scenario);
        // Update with full session data
        await updateSession(id, sessionData);
      }
    }
    
    // Import preferences
    if (data.preferences && typeof data.preferences === 'object') {
      for (const [key, value] of Object.entries(data.preferences)) {
        await setPreference(key, value as string);
      }
    }
  } catch (error) {
    throw new Error('Invalid import file format');
  }
}

// Restore default scenarios
export async function restoreDefaultScenarios(): Promise<{ success: boolean, restoredCount?: number, error?: string }> {
  const result = await window.electronAPI.scenarios.restoreDefaults();
  return result;
}