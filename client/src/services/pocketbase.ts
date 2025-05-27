import PocketBase from 'pocketbase';
import { config } from '../config';

export const pb = new PocketBase(config.pocketbaseUrl);

// Types for our collections
export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  systemPrompt: string;
  initialMessage: string;
  tags: string[];
  isPublic: boolean;
  created: string;
  updated: string;
}

export interface Session {
  id: string;
  user: string;
  scenario: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  transcript?: any;
  metadata?: any;
  created: string;
  updated: string;
}

// Scenario functions
export async function getScenario(id: string): Promise<Scenario> {
  return await pb.collection('scenarios').getOne(id);
}

export async function listScenarios(filter?: string): Promise<Scenario[]> {
  const records = await pb.collection('scenarios').getFullList<Scenario>({
    filter: filter || 'isPublic = true',
    sort: 'name',
  });
  return records;
}

// Session functions
export async function createSession(scenarioId: string, userId: string): Promise<Session> {
  const data = {
    user: userId,
    scenario: scenarioId,
    startTime: new Date().toISOString(),
    transcript: [],
    metadata: {},
  };
  return await pb.collection('sessions').create(data);
}

export async function updateSession(sessionId: string, data: Partial<Session>): Promise<Session> {
  return await pb.collection('sessions').update(sessionId, data);
}