import { useState, useEffect } from 'react';
import { getAllPreferences } from '../services/sqlite';
import * as speechProvider from '../services/speechProvider';

interface ServiceStatus {
  status: 'connected' | 'error' | 'checking' | 'unknown';
  message?: string;
}

export function StatusFooter() {
  const [statuses, setStatuses] = useState<{
    stt: ServiceStatus;
    tts: ServiceStatus;
    chat: ServiceStatus;
  }>({
    stt: { status: 'unknown' },
    tts: { status: 'unknown' },
    chat: { status: 'unknown' }
  });

  const [preferences, setPreferences] = useState({
    sttUrl: '',
    ttsUrl: '',
    ollamaUrl: '',
    sttApiKey: '',
    ttsApiKey: '',
    ollamaApiKey: ''
  });

  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    loadPreferencesAndCheckStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkAllStatuses, 30000);
    
    // Get app version
    if (window.electronAPI?.app?.getVersion) {
      window.electronAPI.app.getVersion().then(version => {
        setAppVersion(version);
      });
    }
    
    return () => clearInterval(interval);
  }, []);

  const loadPreferencesAndCheckStatus = async () => {
    try {
      const prefs = await getAllPreferences();
      const newPrefs = {
        sttUrl: prefs.sttUrl || '',
        ttsUrl: prefs.ttsUrl || '',
        ollamaUrl: prefs.ollamaUrl || '',
        sttApiKey: prefs.sttApiKey || '',
        ttsApiKey: prefs.ttsApiKey || '',
        ollamaApiKey: prefs.ollamaApiKey || ''
      };
      setPreferences(newPrefs);
      
      // Initial status check
      setTimeout(checkAllStatuses, 1000);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const checkAllStatuses = async () => {
    if (!preferences.sttUrl && !preferences.ttsUrl && !preferences.ollamaUrl) {
      return; // Don't check if no URLs are configured
    }

    const checks = await Promise.allSettled([
      checkServiceStatus('stt'),
      checkServiceStatus('tts'),
      checkServiceStatus('chat')
    ]);

    setStatuses({
      stt: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', message: 'Check failed' },
      tts: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', message: 'Check failed' },
      chat: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'error', message: 'Check failed' }
    });
  };

  const checkServiceStatus = async (serviceType: 'stt' | 'tts' | 'chat'): Promise<ServiceStatus> => {
    try {
      // Use speech provider abstraction for STT/TTS
      if (serviceType === 'stt') {
        const connected = await speechProvider.checkSTTConnection();
        return connected 
          ? { status: 'connected', message: 'Online' }
          : { status: 'error', message: 'Offline' };
      }
      
      if (serviceType === 'tts') {
        const connected = await speechProvider.checkTTSConnection();
        return connected 
          ? { status: 'connected', message: 'Online' }
          : { status: 'error', message: 'Offline' };
      }
      
      // Original logic for chat service
      let baseUrl = preferences.ollamaUrl;

      if (!baseUrl) {
        return { status: 'unknown', message: 'Not configured' };
      }

      const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Quick health check endpoints for chat
      const healthEndpoints = [
        '/health',
        '/status',
        '/api/tags',
        '/'
      ];

      for (const endpoint of healthEndpoints) {
        try {
          const response = await window.electronAPI.fetch({
            url: `${cleanUrl}${endpoint}`,
            options: {
              method: 'GET',
              headers: {}
            }
          });

          if (response.ok || response.status === 405 || response.status === 401) {
            return { status: 'connected', message: 'Online' };
          }
        } catch (e) {
          // Continue to next endpoint
        }
      }

      return { status: 'error', message: 'Unreachable' };
    } catch (error) {
      return { status: 'error', message: 'Connection failed' };
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'checking':
        return 'text-yellow-600';
      case 'unknown':
      default:
        return 'text-gray-500';
    }
  };

  const getStatusDot = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'connected':
        return '●';
      case 'error':
        return '●';
      case 'checking':
        return '●';
      case 'unknown':
      default:
        return '○';
    }
  };

  const getStatusText = (status: ServiceStatus['status'], message?: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return message || 'Error';
      case 'checking':
        return 'Checking...';
      case 'unknown':
      default:
        return 'Unknown';
    }
  };

  const handleStatusClick = () => {
    checkAllStatuses();
  };

  return (
    <footer className="bg-gray-800 text-white px-4 py-2 text-sm border-t border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
            onClick={handleStatusClick}
            title="Click to refresh status"
          >
            <span className="text-gray-300">Speech-to-Text:</span>
            <span className={getStatusColor(statuses.stt.status)}>
              {getStatusDot(statuses.stt.status)}
            </span>
            <span className={getStatusColor(statuses.stt.status)}>
              {getStatusText(statuses.stt.status, statuses.stt.message)}
            </span>
          </div>

          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
            onClick={handleStatusClick}
            title="Click to refresh status"
          >
            <span className="text-gray-300">Text-to-Speech:</span>
            <span className={getStatusColor(statuses.tts.status)}>
              {getStatusDot(statuses.tts.status)}
            </span>
            <span className={getStatusColor(statuses.tts.status)}>
              {getStatusText(statuses.tts.status, statuses.tts.message)}
            </span>
          </div>

          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
            onClick={handleStatusClick}
            title="Click to refresh status"
          >
            <span className="text-gray-300">AI Analysis:</span>
            <span className={getStatusColor(statuses.chat.status)}>
              {getStatusDot(statuses.chat.status)}
            </span>
            <span className={getStatusColor(statuses.chat.status)}>
              {getStatusText(statuses.chat.status, statuses.chat.message)}
            </span>
          </div>
        </div>

        <div className="text-gray-400 text-xs">
          Talk Buddy {appVersion ? `v${appVersion}` : 'v2.0.0'}
        </div>
      </div>
    </footer>
  );
}