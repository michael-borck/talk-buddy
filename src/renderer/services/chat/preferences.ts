// AI Brain settings, read once per Turn.
import { resolveChat, loadPreferences } from '../config';
import { resolveApiKey } from './secrets';
import type { ChatProvider } from '../../types/settings';

// These delegate to the config module's pure resolveChat() so AI Brain
// defaults and the provider-conditional URL live in exactly one place
// (services/config.ts). resolveChat returns the RAW apiKey; only
// getChatApiKey resolves an env:VAR reference, just before use.
async function getChatApiUrl(): Promise<string> {
  return resolveChat(await loadPreferences()).url;
}

async function getChatProvider(): Promise<ChatProvider> {
  return resolveChat(await loadPreferences()).provider;
}

async function getChatModel(): Promise<string> {
  return resolveChat(await loadPreferences()).model;
}

async function getChatApiKey(): Promise<string> {
  return resolveApiKey(resolveChat(await loadPreferences()).apiKey);
}

export { getChatApiUrl, getChatProvider, getChatModel, getChatApiKey };
