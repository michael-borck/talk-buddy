import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pb } from '../services/pocketbase';

interface ScenarioUploadProps {
  onUploadSuccess?: () => void;
  onClose?: () => void;
}

export function ScenarioUpload({ onUploadSuccess, onClose }: ScenarioUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateScenario = (data: any): boolean => {
    const required = ['name', 'description', 'systemPrompt', 'initialMessage'];
    for (const field of required) {
      if (!data[field] || typeof data[field] !== 'string' || !data[field].trim()) {
        setError(`Missing or invalid field: ${field}`);
        return false;
      }
    }
    
    if (data.estimatedMinutes && (typeof data.estimatedMinutes !== 'number' || data.estimatedMinutes < 1 || data.estimatedMinutes > 120)) {
      setError('estimatedMinutes must be a number between 1 and 120');
      return false;
    }

    if (data.difficulty && !['beginner', 'intermediate', 'advanced'].includes(data.difficulty)) {
      setError('difficulty must be one of: beginner, intermediate, advanced');
      return false;
    }

    if (data.voice && !['male', 'female'].includes(data.voice)) {
      setError('voice must be either "male" or "female"');
      return false;
    }

    return true;
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file');
      return;
    }

    if (file.size > 1024 * 1024) { // 1MB limit
      setError('File too large. Maximum size is 1MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const content = await file.text();
      let scenarioData;

      try {
        scenarioData = JSON.parse(content);
      } catch (parseError) {
        setError('Invalid JSON format');
        return;
      }

      // Validate the scenario data
      if (!validateScenario(scenarioData)) {
        return;
      }

      // Add default values and user ownership
      const completeScenario = {
        name: scenarioData.name,
        description: scenarioData.description,
        category: scenarioData.category || 'custom',
        difficulty: scenarioData.difficulty || 'beginner',
        estimatedMinutes: scenarioData.estimatedMinutes || 15,
        systemPrompt: scenarioData.systemPrompt,
        initialMessage: scenarioData.initialMessage,
        voice: scenarioData.voice || 'female',
        tags: Array.isArray(scenarioData.tags) ? scenarioData.tags : [],
        isPublic: false, // Always start as private
        createdBy: user?.id
      };

      // Create the scenario
      await pb.collection('scenarios').create(completeScenario);
      
      onUploadSuccess?.();
      onClose?.();
    } catch (err: any) {
      console.error('Upload error:', err);
      if (err.data?.data) {
        const errors = Object.values(err.data.data).flat() as string[];
        setError(errors.join('. '));
      } else {
        setError(err.message || 'Failed to upload scenario');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Scenario</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {uploading ? (
            <div className="py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Uploading scenario...</p>
            </div>
          ) : (
            <div className="py-4">
              <div className="text-4xl mb-2">📁</div>
              <p className="text-gray-600 mb-2">
                Drag and drop a JSON file here, or
              </p>
              <button
                onClick={openFileDialog}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                click to browse
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Max file size: 1MB
              </p>
            </div>
          )}
        </div>

        {/* Example Format */}
        <details className="mt-4">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
            Expected JSON format
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
            <pre className="text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`{
  "name": "Your Scenario Name",
  "description": "What users will practice...",
  "category": "custom",
  "difficulty": "beginner",
  "estimatedMinutes": 15,
  "voice": "female",
  "systemPrompt": "You are...",
  "initialMessage": "Hello, let's begin...",
  "tags": ["tag1", "tag2"]
}`}
            </pre>
          </div>
        </details>

        {/* Buttons */}
        {onClose && (
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}