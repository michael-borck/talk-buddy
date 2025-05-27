import { useState } from 'react';
import { ollamaService } from '../services/ollama';
import { config } from '../config';

export function OllamaDebugger() {
  const [status, setStatus] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkConfig = () => {
    setStatus(`
Config Check:
- URL: ${config.ollamaUrl || 'NOT SET'}
- API Key: ${config.ollamaApiKey ? '✓ Set (' + config.ollamaApiKey.substring(0, 10) + '...)' : '✗ NOT SET'}
    `);
  };

  const testHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const healthy = await ollamaService.checkHealth();
      setStatus(`Health check: ${healthy ? '✅ OK' : '❌ FAILED'}`);
    } catch (err: any) {
      setError(`Health check error: ${err.message}`);
    }
    setLoading(false);
  };

  const testModelsList = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      // Test the /api/tags endpoint to list models
      const headers: any = {};
      if (config.ollamaApiKey) {
        headers['Authorization'] = `Bearer ${config.ollamaApiKey}`;
      }
      const response = await fetch(`${config.ollamaUrl}/api/tags`, { headers });
      
      const responseText = await response.text();
      console.log('Models response:', response.status, responseText);
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${responseText}`);
      }
      
      const data = JSON.parse(responseText);
      const models = data.models || [];
      setStatus(`Found ${models.length} models:\n${models.map((m: any) => m.name).join('\n')}`);
      
      // Check if granite3.2 is in the list
      const hasGranite = models.some((m: any) => m.name.includes('granite'));
      if (!hasGranite) {
        setError('Warning: granite3.2 model not found in list!');
      }
    } catch (err: any) {
      setError(`Models list error: ${err.message}`);
    }
    setLoading(false);
  };

  const testBothProtocols = async () => {
    setLoading(true);
    setError('');
    setStatus('Testing HTTPS only (HTTP blocked by browser)...\n');
    
    const headers = {
      'Content-Type': 'application/json'
    };

    // Test HTTPS with full logging
    try {
      console.log('Testing HTTPS:', config.ollamaUrl);
      console.log('Headers:', headers);
      
      const response = await fetch(`${config.ollamaUrl}/api/tags`, { headers });
      const responseText = await response.text();
      
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      console.log('Response text:', responseText);
      
      if (response.ok) {
        setStatus(`HTTPS: ✅ OK\n${responseText.substring(0, 200)}...`);
      } else {
        setStatus(`HTTPS: ❌ ${response.status}\n${responseText}`);
        if (response.status === 403) {
          setError('403 Forbidden - Check if Ollama needs authentication or if nginx still has auth rules');
        }
      }
    } catch (err: any) {
      console.error('HTTPS error:', err);
      setStatus(`HTTPS: ❌ ${err.message}`);
      setError('Check browser console for details');
    }

    setLoading(false);
  };

  const testSimplePrompt = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    try {
      setStatus('Sending test prompt to Ollama...');
      
      // Test direct API call like your Python code
      const testRequest = {
        model: 'granite3.2',
        prompt: 'Say hello in 5 words or less.',
        system: 'You are a helpful assistant. Keep responses very brief.',
        stream: false
      };
      
      console.log('Test request:', testRequest);
      
      const response = await fetch(`${config.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testRequest)
      });
      
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${responseText}`);
      }
      
      const data = JSON.parse(responseText);
      setResponse(data.response || 'No response field');
      setStatus('✅ Success!');
    } catch (err: any) {
      setError(`Generation error: ${err.message}`);
      setStatus('❌ Failed');
    }
    setLoading(false);
  };

  const testScenarioPrompt = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    try {
      setStatus('Testing coffee shop scenario...');
      const result = await ollamaService.generateResponse(
        'You are a friendly barista at a coffee shop. Be helpful and casual.',
        [
          { role: 'user', content: 'Hi there!' },
          { role: 'assistant', content: 'Good morning! What can I get started for you today?' }
        ],
        'I would like a large coffee please'
      );
      setResponse(result);
      setStatus('✅ Scenario test success!');
    } catch (err: any) {
      setError(`Scenario error: ${err.message}`);
      setStatus('❌ Scenario test failed');
    }
    setLoading(false);
  };

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-2xl max-w-md border-4 border-blue-500 z-[9999]" style={{ zIndex: 9999 }}>
      <h3 className="font-bold mb-2 text-lg">🤖 Ollama Debugger</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={checkConfig}
          className="bg-gray-500 text-white px-3 py-1 rounded text-sm w-full"
        >
          1. Check Config
        </button>
        
        <button
          onClick={testBothProtocols}
          disabled={loading}
          className="bg-orange-500 text-white px-3 py-1 rounded text-sm w-full disabled:opacity-50"
        >
          2. Test HTTPS Connection
        </button>
        
        <button
          onClick={testModelsList}
          disabled={loading}
          className="bg-yellow-500 text-white px-3 py-1 rounded text-sm w-full disabled:opacity-50"
        >
          3. List Models
        </button>
        
        <button
          onClick={testHealth}
          disabled={loading}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm w-full disabled:opacity-50"
        >
          4. Test Connection
        </button>
        
        <button
          onClick={testSimplePrompt}
          disabled={loading}
          className="bg-green-500 text-white px-3 py-1 rounded text-sm w-full disabled:opacity-50"
        >
          5. Test Simple Prompt
        </button>
        
        <button
          onClick={testScenarioPrompt}
          disabled={loading}
          className="bg-purple-500 text-white px-3 py-1 rounded text-sm w-full disabled:opacity-50"
        >
          6. Test Scenario
        </button>
      </div>

      {loading && (
        <div className="text-center text-blue-600 font-bold animate-pulse mb-2">
          Loading...
        </div>
      )}

      {status && (
        <div className="mb-2 p-2 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap">
          {status}
        </div>
      )}

      {response && (
        <div className="mb-2 p-2 bg-green-100 rounded">
          <strong className="text-sm">Response:</strong>
          <p className="text-sm mt-1">{response}</p>
        </div>
      )}

      {error && (
        <div className="mb-2 p-2 bg-red-100 rounded">
          <strong className="text-sm">Error:</strong>
          <p className="text-sm mt-1 text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}