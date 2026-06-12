// Client-side SQLite service that communicates with Electron main process
import { Scenario, Session, Pack, PackWithScenarios, SessionPack, SessionPackWithSessions } from '../types';

// Type definitions for Electron API
interface ElectronAPI {
  database: {
    op: (name: string, params?: Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string }>;
    reset: () => Promise<{ success: boolean; error?: string }>;
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
    getEnvVar: (name: string) => Promise<string | null>;
  };
  scenarios: {
    restoreDefaults: () => Promise<{ success: boolean; restoredCount?: number; error?: string }>;
  };
  platform: string;
  secrets: {
    get: (key: string) => Promise<string>;
    set: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  };
  fetch: (params: { url: string; options: any }) => Promise<{ ok: boolean; status?: number; statusText?: string; headers?: any; data?: any; error?: string }>;
  fetchText: (url: string) => Promise<{ ok: boolean; text?: string; error?: string }>;
  speaches: {
    transcribe: (params: {
      url: string;
      apiKey: string;
      audioBuffer: Uint8Array;
      model: string;
      filename?: string;
    }) => Promise<{
      ok: boolean;
      status: number;
      statusText: string;
      data?: { text: string; duration?: number } | null;
      body?: string;
      error?: string;
    }>;
    speak: (params: {
      url: string;
      apiKey: string;
      payload: Record<string, unknown>;
    }) => Promise<{
      ok: boolean;
      status: number;
      statusText: string;
      audio?: Uint8Array;
      contentType?: string;
      body?: string;
      error?: string;
    }>;
  };
  embeddedServerStatus: () => Promise<{ running: boolean; url: string; port: number; token?: string }>;
  embeddedServerStart: () => Promise<{ success: boolean; error?: string }>;
  embeddedServerStop: () => Promise<{ success: boolean; error?: string }>;
  embeddedServerRestart: () => Promise<{ success: boolean; error?: string }>;
  embeddedInstall: {
    check: () => Promise<{
      installed: boolean;
      venvOk: boolean;
      modelsOk: boolean;
      mode: 'dev' | 'prod';
      path: string;
      hasSetupScript: boolean;
      pythonAvailable: boolean | null;
    }>;
    run: () => Promise<{ ok: boolean; error?: string; cancelled?: boolean }>;
    cancel: () => Promise<{ ok: boolean; error?: string }>;
    onOutput: (
      callback: (payload: { stream: 'stdout' | 'stderr' | 'info' | 'error'; text: string }) => void
    ) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Scenario functions
export async function getScenario(id: string): Promise<Scenario | null> {
  const result = await window.electronAPI.database.op('scenarios:get', { id });

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
  const result = await window.electronAPI.database.op('scenarios:list', { filter: filter || {} });
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((scenario: any) => ({
    ...scenario,
    tags: scenario.tags ? JSON.parse(scenario.tags) : [],
    isPublic: Boolean(scenario.isPublic),
    archived: Boolean(scenario.archived)
  }));
}

export async function createScenario(scenario: Omit<Scenario, 'id' | 'created' | 'updated'>): Promise<Scenario> {
  const id = `scn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const result = await window.electronAPI.database.op('scenarios:create', {
    id,
    name: scenario.name,
    description: scenario.description,
    category: scenario.category,
    difficulty: scenario.difficulty,
    estimatedMinutes: scenario.estimatedMinutes,
    systemPrompt: scenario.systemPrompt,
    initialMessage: scenario.initialMessage,
    tags: JSON.stringify(scenario.tags || []),
    isPublic: scenario.isPublic ? 1 : 0,
    voice: scenario.voice,
    created: now,
    updated: now
  });
  
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
  
  const result = await window.electronAPI.database.op('scenarios:update', {
    id,
    fields: {
      name: updatedScenario.name,
      description: updatedScenario.description,
      category: updatedScenario.category,
      difficulty: updatedScenario.difficulty,
      estimatedMinutes: updatedScenario.estimatedMinutes,
      systemPrompt: updatedScenario.systemPrompt,
      initialMessage: updatedScenario.initialMessage,
      tags: JSON.stringify(updatedScenario.tags || []),
      isPublic: updatedScenario.isPublic ? 1 : 0,
      voice: updatedScenario.voice,
      updated: now
    }
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update scenario');
  }
  
  return updatedScenario;
}

export async function deleteScenario(id: string): Promise<void> {
  const result = await window.electronAPI.database.op('scenarios:delete', { id });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete scenario');
  }
}

// Session functions (deprecated - use startStandaloneSession or startSessionFromPack instead)
export async function createSession(scenarioId: string): Promise<Session> {
  return startStandaloneSession(scenarioId);
}

export async function updateSession(id: string, updates: Partial<Session>): Promise<void> {
  const now = new Date().toISOString();

  const fields: Record<string, any> = { updated: now };

  if (updates.startTime !== undefined) {
    fields.startTime = updates.startTime;
  }

  if (updates.endTime !== undefined) {
    fields.endTime = updates.endTime;
  }

  if (updates.duration !== undefined) {
    fields.duration = updates.duration;
  }

  if (updates.transcript !== undefined) {
    fields.transcript = JSON.stringify(updates.transcript);
  }

  if (updates.metadata !== undefined) {
    fields.metadata = JSON.stringify(updates.metadata);
  }

  if (updates.status !== undefined) {
    fields.status = updates.status;
  }

  const result = await window.electronAPI.database.op('sessions:update', { id, fields });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update session');
  }
}

export async function getSession(id: string): Promise<Session | null> {
  const result = await window.electronAPI.database.op('sessions:get', { id });
  
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
  const result = await window.electronAPI.database.op('sessions:list', { scenarioId });
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((session: any) => ({
    ...session,
    transcript: session.transcript ? JSON.parse(session.transcript) : undefined,
    metadata: session.metadata ? JSON.parse(session.metadata) : undefined,
    packName: session.packName || undefined
  }));
}

export async function deleteSession(id: string): Promise<void> {
  const result = await window.electronAPI.database.op('sessions:delete', { id });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete session');
  }
}

// User preferences functions.
//
// API-key preferences are encrypted at rest (main process, safeStorage).
// These three keys are transparently routed through the secrets IPC so
// every existing caller keeps seeing plaintext in memory while the DB
// row holds ciphertext.
const SECRET_PREF_KEYS = ['sttApiKey', 'ttsApiKey', 'ollamaApiKey'];

export async function getPreference(key: string): Promise<string | null> {
  if (SECRET_PREF_KEYS.includes(key)) {
    const value = await window.electronAPI.secrets.get(key);
    return value || null;
  }
  const result = await window.electronAPI.database.op('prefs:get', { key });

  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }

  return result.data[0].value;
}

export async function setPreference(key: string, value: string): Promise<void> {
  if (SECRET_PREF_KEYS.includes(key)) {
    const result = await window.electronAPI.secrets.set(key, value);
    if (!result.success) throw new Error(result.error || 'Failed to store API key');
    return;
  }
  const result = await window.electronAPI.database.op('prefs:set', { key, value });

  if (!result.success) {
    throw new Error(result.error || 'Failed to set preference');
  }
}

export async function getAllPreferences(): Promise<Record<string, string>> {
  const result = await window.electronAPI.database.op('prefs:getAll');

  if (!result.success || !result.data) {
    return {};
  }

  const preferences: Record<string, string> = {};
  result.data.forEach((row: any) => {
    preferences[row.key] = row.value;
  });

  // Replace ciphertext with decrypted values for the key prefs.
  for (const key of SECRET_PREF_KEYS) {
    if (preferences[key] !== undefined) {
      preferences[key] = await window.electronAPI.secrets.get(key);
    }
  }

  return preferences;
}

// Import/Export functions for individual scenarios and packages
export async function exportScenario(scenarioId: string, fileName?: string): Promise<void> {
  const scenario = await getScenario(scenarioId);
  if (!scenario) {
    throw new Error('Scenario not found');
  }

  const exportData = {
    formatVersion: "2.0",
    type: "scenario",
    metadata: {
      exportedBy: "Talk Buddy v2.0.0",
      exportDate: new Date().toISOString(),
      title: scenario.name
    },
    scenario
  };

  const defaultFileName = fileName || `${scenario.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
  const result = await window.electronAPI.dialog.saveFile(defaultFileName);
  
  if (!result.canceled && result.filePath) {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function exportScenarios(scenarioIds: string[], fileName?: string): Promise<void> {
  const scenarios = await Promise.all(scenarioIds.map(id => getScenario(id)));
  const validScenarios = scenarios.filter(s => s !== null) as Scenario[];

  const exportData = {
    formatVersion: "2.0",
    type: "scenarios",
    metadata: {
      exportedBy: "Talk Buddy v2.0.0",
      exportDate: new Date().toISOString(),
      title: `${validScenarios.length} Scenarios`,
      count: validScenarios.length
    },
    scenarios: validScenarios
  };

  const defaultFileName = fileName || `scenarios-${new Date().toISOString().split('T')[0]}.json`;
  const result = await window.electronAPI.dialog.saveFile(defaultFileName);
  
  if (!result.canceled && result.filePath) {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function exportPackage(packId: string, fileName?: string): Promise<void> {
  const pack = await getPack(packId);
  if (!pack) {
    throw new Error('Package not found');
  }

  const scenarios = await getPackScenarios(packId);

  const exportData = {
    formatVersion: "2.0",
    type: "skill_package",
    metadata: {
      exportedBy: "Talk Buddy v2.0.0",
      exportDate: new Date().toISOString(),
      title: pack.name,
      description: pack.description,
      scenarioCount: scenarios.length
    },
    package: {
      name: pack.name,
      description: pack.description,
      color: pack.color,
      icon: pack.icon,
      difficulty: pack.difficulty,
      estimatedMinutes: pack.estimatedMinutes,
      scenarios
    }
  };

  const defaultFileName = fileName || `${pack.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
  const result = await window.electronAPI.dialog.saveFile(defaultFileName);
  
  if (!result.canceled && result.filePath) {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function importFromFile(fileContent: string): Promise<{ success: boolean; message: string; imported: any }> {
  try {
    const data = JSON.parse(fileContent);
    
    // Validate format
    if (!data.formatVersion || !data.type) {
      throw new Error('Invalid Talk Buddy export file format');
    }

    if (data.formatVersion !== "2.0") {
      throw new Error(`Unsupported format version: ${data.formatVersion}`);
    }

    let imported: any = {};

    switch (data.type) {
      case 'scenario':
        if (!data.scenario) {
          throw new Error('No scenario data found in file');
        }
        // Strip fields that should be auto-generated and any extra fields
        const { id, created, updated, isDefault, archived, ...cleanScenarioData } = data.scenario;
        const scenario = await createScenario(cleanScenarioData);
        imported = { type: 'scenario', scenario };
        return { success: true, message: `Imported scenario: ${scenario.name}`, imported };

      case 'scenarios':
        if (!data.scenarios || !Array.isArray(data.scenarios)) {
          throw new Error('No scenarios data found in file');
        }
        const importedScenarios = [];
        for (const scenarioData of data.scenarios) {
          try {
            // Strip fields that should be auto-generated and any extra fields
            const { id, created, updated, isDefault, archived, ...cleanScenarioData } = scenarioData;
            const scenario = await createScenario(cleanScenarioData);
            importedScenarios.push(scenario);
          } catch (error) {
            console.warn(`Failed to import scenario ${scenarioData.name}:`, error);
          }
        }
        imported = { type: 'scenarios', scenarios: importedScenarios };
        return { 
          success: true, 
          message: `Imported ${importedScenarios.length} of ${data.scenarios.length} scenarios`, 
          imported 
        };

      case 'skill_package':
        if (!data.package) {
          throw new Error('No package data found in file');
        }
        
        // Create the pack
        const packData = data.package;
        const pack = await createPack({
          name: packData.name,
          description: packData.description,
          color: packData.color || '#3B82F6',
          icon: packData.icon || 'BookOpen',
          difficulty: packData.difficulty,
          estimatedMinutes: packData.estimatedMinutes,
          orderIndex: 0
        });

        // Import scenarios and add to pack
        const importedPackScenarios = [];
        if (packData.scenarios && Array.isArray(packData.scenarios)) {
          for (let i = 0; i < packData.scenarios.length; i++) {
            const scenarioData = packData.scenarios[i];
            try {
              // Strip fields that should be auto-generated and any extra fields
              const { id, created, updated, isDefault, archived, ...cleanScenarioData } = scenarioData;
              console.log('Importing scenario:', cleanScenarioData.name, 'Data:', cleanScenarioData);
              const scenario = await createScenario(cleanScenarioData);
              console.log('Created scenario:', scenario.id);
              await addScenarioToPack(pack.id, scenario.id, i);
              console.log('Added scenario to pack:', pack.id);
              importedPackScenarios.push(scenario);
            } catch (error) {
              console.error(`Failed to import scenario ${scenarioData.name}:`, error);
            }
          }
        }

        imported = { type: 'skill_package', pack, scenarios: importedPackScenarios };
        return { 
          success: true, 
          message: `Imported skill package "${pack.name}" with ${importedPackScenarios.length} scenarios`, 
          imported 
        };

      default:
        throw new Error(`Unknown export type: ${data.type}`);
    }
  } catch (error) {
    console.error('Import error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to import file',
      imported: null
    };
  }
}

// Legacy export function for full data export
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
  
  const result = await window.electronAPI.dialog.saveFile('talk-buddy-export.json');
  
  if (!result.canceled && result.filePath) {
    // In a real implementation, we'd need to write this through IPC
    // For now, we'll use a download approach
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'talk-buddy-export.json';
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

// Reset database (clear all data and restore defaults)
export async function resetDatabase(): Promise<{ success: boolean, error?: string }> {
  const result = await window.electronAPI.database.reset();
  return result;
}

// Pack functions
export async function getPack(id: string): Promise<Pack | null> {
  const result = await window.electronAPI.database.op('packs:get', { id });
  
  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }
  
  const pack = result.data[0];
  return {
    ...pack,
    orderIndex: pack.order_index
  };
}

export async function listPacks(): Promise<Pack[]> {
  const result = await window.electronAPI.database.op('packs:list');
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((pack: any) => ({
    ...pack,
    orderIndex: pack.order_index,
    archived: Boolean(pack.archived)
  }));
}

export async function listPacksWithScenarios(): Promise<PackWithScenarios[]> {
  const packs = await listPacks();
  const packsWithScenarios: PackWithScenarios[] = [];
  
  for (const pack of packs) {
    const scenarios = await getPackScenarios(pack.id);
    packsWithScenarios.push({
      ...pack,
      scenarios,
      scenarioCount: scenarios.length
    });
  }
  
  return packsWithScenarios;
}

export async function createPack(pack: Omit<Pack, 'id' | 'created' | 'updated'>): Promise<Pack> {
  const id = `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const result = await window.electronAPI.database.op('packs:create', {
    id,
    name: pack.name,
    description: pack.description || null,
    color: pack.color,
    icon: pack.icon,
    difficulty: pack.difficulty || null,
    estimatedMinutes: pack.estimatedMinutes || null,
    orderIndex: pack.orderIndex,
    created: now,
    updated: now
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create pack');
  }
  
  return {
    ...pack,
    id,
    created: now,
    updated: now
  };
}

export async function updatePack(id: string, updates: Partial<Pack>): Promise<Pack> {
  const now = new Date().toISOString();
  const pack = await getPack(id);
  
  if (!pack) {
    throw new Error('Pack not found');
  }
  
  const updatedPack = { ...pack, ...updates, updated: now };
  
  const result = await window.electronAPI.database.op('packs:update', {
    id,
    fields: {
      name: updatedPack.name,
      description: updatedPack.description || null,
      color: updatedPack.color,
      icon: updatedPack.icon,
      difficulty: updatedPack.difficulty || null,
      estimatedMinutes: updatedPack.estimatedMinutes || null,
      order_index: updatedPack.orderIndex,
      updated: now
    }
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update pack');
  }
  
  return updatedPack;
}

export async function deletePack(id: string): Promise<void> {
  const result = await window.electronAPI.database.op('packs:delete', { id });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete pack');
  }
}

// Pack-Scenario relationship functions
export async function addScenarioToPack(packId: string, scenarioId: string, orderIndex: number = 0): Promise<void> {
  const now = new Date().toISOString();
  
  const result = await window.electronAPI.database.op('packScenarios:add', {
    packId,
    scenarioId,
    orderIndex,
    created: now
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to add scenario to pack');
  }
}

export async function removeScenarioFromPack(packId: string, scenarioId: string): Promise<void> {
  const result = await window.electronAPI.database.op('packScenarios:remove', { packId, scenarioId });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to remove scenario from pack');
  }
}

export async function getPackScenarios(packId: string): Promise<Scenario[]> {
  const result = await window.electronAPI.database.op('packScenarios:listScenarios', { packId });
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((scenario: any) => ({
    ...scenario,
    tags: scenario.tags ? JSON.parse(scenario.tags) : [],
    isPublic: Boolean(scenario.isPublic)
  }));
}

export async function getScenarioPacks(scenarioId: string): Promise<Pack[]> {
  const result = await window.electronAPI.database.op('packScenarios:listPacks', { scenarioId });
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((pack: any) => ({
    ...pack,
    orderIndex: pack.order_index
  }));
}

export async function updatePackScenarioOrder(packId: string, scenarioId: string, newOrderIndex: number): Promise<void> {
  const result = await window.electronAPI.database.op('packScenarios:updateOrder', {
    packId,
    scenarioId,
    orderIndex: newOrderIndex
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update scenario order');
  }
}

// Session Pack functions
export async function createSessionPack(packId: string): Promise<SessionPack> {
  // First get the original pack data
  const pack = await getPack(packId);
  if (!pack) {
    throw new Error('Practice pack not found');
  }

  const sessionPackId = `spack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  // Create the session pack
  const result = await window.electronAPI.database.op('sessionPacks:create', {
    id: sessionPackId,
    packId,
    name: pack.name,
    description: pack.description,
    color: pack.color,
    created: now,
    updated: now
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create session pack');
  }

  // Get all scenarios from the original pack
  const scenarios = await getPackScenarios(packId);
  
  // Create session slots for each scenario in the pack
  for (const scenario of scenarios) {
    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await window.electronAPI.database.op('sessions:createInPack', {
      id: sessionId,
      scenarioId: scenario.id,
      sessionPackId,
      created: now,
      updated: now
    });
  }

  return {
    id: sessionPackId,
    packId,
    name: pack.name,
    description: pack.description,
    color: pack.color,
    created: now,
    updated: now
  };
}

export async function getSessionPack(id: string): Promise<SessionPack | null> {
  const result = await window.electronAPI.database.op('sessionPacks:get', { id });
  
  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }
  
  const sessionPack = result.data[0];
  return {
    ...sessionPack,
    packId: sessionPack.pack_id
  };
}

export async function listSessionPacks(): Promise<SessionPack[]> {
  const result = await window.electronAPI.database.op('sessionPacks:list');
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((sessionPack: any) => ({
    ...sessionPack,
    packId: sessionPack.pack_id
  }));
}

export async function listSessionPacksWithSessions(): Promise<SessionPackWithSessions[]> {
  const sessionPacks = await listSessionPacks();
  const sessionPacksWithSessions: SessionPackWithSessions[] = [];
  
  for (const sessionPack of sessionPacks) {
    const sessions = await getSessionPackSessions(sessionPack.id);
    const completedSessions = sessions.filter(s => s.status === 'ended').length;
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'paused').length;
    
    sessionPacksWithSessions.push({
      ...sessionPack,
      sessions,
      sessionCount: sessions.length,
      completedSessions,
      activeSessions
    });
  }
  
  return sessionPacksWithSessions;
}

export async function getSessionPackSessions(sessionPackId: string): Promise<Session[]> {
  const result = await window.electronAPI.database.op('sessions:listByPack', { sessionPackId });
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((session: any) => ({
    ...session,
    transcript: session.transcript ? JSON.parse(session.transcript) : undefined,
    metadata: session.metadata ? JSON.parse(session.metadata) : undefined
  }));
}

export async function deleteSessionPack(id: string): Promise<void> {
  const result = await window.electronAPI.database.op('sessionPacks:delete', { id });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete session pack');
  }
  // Sessions are automatically deleted due to CASCADE constraint
}

// Enhanced session functions for new workflow
export async function startSessionFromPack(packId: string, scenarioId: string): Promise<{ sessionPack: SessionPack; session: Session }> {
  // Check if a session pack already exists for this practice pack
  const existingSessionPacks = await window.electronAPI.database.op('sessionPacks:getByPack', { packId });

  let sessionPack: SessionPack;
  
  if (existingSessionPacks.success && existingSessionPacks.data && existingSessionPacks.data.length > 0) {
    // Use existing session pack
    sessionPack = {
      ...existingSessionPacks.data[0],
      packId: existingSessionPacks.data[0].pack_id
    };
  } else {
    // Create new session pack
    sessionPack = await createSessionPack(packId);
  }

  // Find the session for this scenario in the session pack
  const sessionResult = await window.electronAPI.database.op('sessions:findInPack', {
    sessionPackId: sessionPack.id,
    scenarioId
  });

  if (!sessionResult.success || !sessionResult.data || sessionResult.data.length === 0) {
    throw new Error('Session not found in pack');
  }

  const sessionData = sessionResult.data[0];
  const now = new Date().toISOString();

  // Update session to active status and set start time if not already started
  await window.electronAPI.database.op('sessions:activate', {
    id: sessionData.id,
    status: 'active',
    now
  });

  const session: Session = {
    id: sessionData.id,
    scenario: sessionData.scenario_id,
    sessionPackId: sessionData.session_pack_id,
    startTime: sessionData.startTime || now,
    endTime: sessionData.endTime,
    duration: sessionData.duration,
    transcript: sessionData.transcript ? JSON.parse(sessionData.transcript) : undefined,
    metadata: sessionData.metadata ? JSON.parse(sessionData.metadata) : undefined,
    status: 'active',
    created: sessionData.created,
    updated: now
  };

  return { sessionPack, session };
}

export async function startStandaloneSession(scenarioId: string): Promise<Session> {
  const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const result = await window.electronAPI.database.op('sessions:createStandalone', {
    id: sessionId,
    scenarioId,
    startTime: now,
    created: now,
    updated: now
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create session');
  }
  
  return {
    id: sessionId,
    scenario: scenarioId,
    sessionPackId: undefined,
    startTime: now,
    status: 'active',
    created: now,
    updated: now
  };
}

// Archive functions
export async function listArchivedScenarios(): Promise<Scenario[]> {
  const result = await window.electronAPI.database.op('scenarios:listArchived');
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((scenario: any) => ({
    ...scenario,
    tags: scenario.tags ? JSON.parse(scenario.tags) : [],
    isPublic: Boolean(scenario.isPublic),
    archived: Boolean(scenario.archived)
  }));
}

export async function listArchivedPacks(): Promise<Pack[]> {
  const result = await window.electronAPI.database.op('packs:listArchived');
  
  if (!result.success || !result.data) {
    return [];
  }
  
  return result.data.map((pack: any) => ({
    ...pack,
    orderIndex: pack.order_index,
    archived: Boolean(pack.archived)
  }));
}

export async function archiveScenario(id: string): Promise<void> {
  const now = new Date().toISOString();
  const result = await window.electronAPI.database.op('scenarios:archive', { id, updated: now });

  if (!result.success) {
    throw new Error(result.error || 'Failed to archive scenario');
  }
}

export async function unarchiveScenario(id: string): Promise<void> {
  const now = new Date().toISOString();
  const result = await window.electronAPI.database.op('scenarios:unarchive', { id, updated: now });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to unarchive scenario');
  }
}

export async function archivePack(id: string): Promise<void> {
  const now = new Date().toISOString();
  const result = await window.electronAPI.database.op('packs:archive', { id, updated: now });

  if (!result.success) {
    throw new Error(result.error || 'Failed to archive pack');
  }
}

export async function unarchivePack(id: string): Promise<void> {
  const now = new Date().toISOString();
  const result = await window.electronAPI.database.op('packs:unarchive', { id, updated: now });
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to unarchive pack');
  }
}

export async function bulkArchiveScenarios(ids: string[]): Promise<void> {
  const now = new Date().toISOString();
  
  for (const id of ids) {
    const result = await window.electronAPI.database.op('scenarios:archive', { id, updated: now });

    if (!result.success) {
      throw new Error(result.error || `Failed to archive scenario ${id}`);
    }
  }
}

export async function bulkArchivePacks(ids: string[]): Promise<void> {
  const now = new Date().toISOString();
  
  for (const id of ids) {
    const result = await window.electronAPI.database.op('packs:archive', { id, updated: now });

    if (!result.success) {
      throw new Error(result.error || `Failed to archive pack ${id}`);
    }
  }
}