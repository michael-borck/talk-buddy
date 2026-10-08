// API-key input with environment-variable support — shared by the
// Listening, Voice, and AI Brain tabs.
export function ApiKeyInput({
  value,
  onChange,
  placeholder = "sk-... or leave empty",
  envVarName,
  envPlaceholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  envVarName?: string;
  envPlaceholder?: string;
  fieldName?: string; // accepted for call-site compatibility; not rendered
}) {
  const resolvedEnvPlaceholder = envVarName
    ? `env:${envVarName}`
    : envPlaceholder || 'env:API_KEY_NAME';
  const isEnvVar = value?.startsWith('env:');

  // Progressive disclosure: the common path is a single key field. Reading
  // the key from the system environment stays one click away, but out of the
  // way of a first-run student who just wants to paste a key.
  if (isEnvVar) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={resolvedEnvPlaceholder}
        />
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          ← Paste a key instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
      />
      {envVarName && (
        <button
          type="button"
          onClick={() => onChange(resolvedEnvPlaceholder)}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Read the key from your system environment instead (advanced)
        </button>
      )}
    </div>
  );
}

// Component for Model Selection with dropdown and custom entry
