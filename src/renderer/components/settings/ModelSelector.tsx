// Model picker — shared by the Listening, Voice, and AI Brain tabs.
import { useState, useEffect } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';

export function ModelSelector({ 
  value, 
  onChange, 
  placeholder = "Select or enter model",
  models,
  loading,
  error,
  onRefresh,
  label,
  description
}: { 
  value: string; 
  onChange: (value: string) => void;
  placeholder?: string;
  models: string[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  label: string;
  description?: string;
}) {
  const [isCustom, setIsCustom] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Check if current value is in the models list
  useEffect(() => {
    if (value && models.length > 0) {
      setIsCustom(!models.includes(value));
    }
  }, [value, models]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.model-selector-dropdown')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  const handleModelSelect = (selectedModel: string) => {
    if (selectedModel === '__custom__') {
      setIsCustom(true);
      setShowDropdown(false);
    } else {
      setIsCustom(false);
      onChange(selectedModel);
      setShowDropdown(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="flex-1 relative model-selector-dropdown">
          {isCustom ? (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={placeholder}
            />
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white flex items-center justify-between"
              >
                <span className={value ? "text-gray-900" : "text-gray-500"}>
                  {value || placeholder}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {models.length > 0 ? (
                    <>
                      {models.map((model) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => handleModelSelect(model)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        >
                          {model}
                        </button>
                      ))}
                      <div className="border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => handleModelSelect('__custom__')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-blue-600"
                        >
                          📝 Custom (manual entry)
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-2 text-gray-500">
                      {loading ? 'Loading models...' : 'No models available'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {isCustom && (
            <button
              type="button"
              onClick={() => {
                setIsCustom(false);
                if (models.length > 0) {
                  onChange(models[0]);
                }
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-blue-600 hover:text-blue-700"
            >
              Back to list
            </button>
          )}
        </div>
        
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          title="Refresh models"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {description && (
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
