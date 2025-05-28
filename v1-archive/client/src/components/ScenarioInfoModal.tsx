import type { Scenario } from '../services/pocketbase';

interface ScenarioInfoModalProps {
  scenario: Scenario;
  isOpen: boolean;
  onClose: () => void;
}

export function ScenarioInfoModal({ scenario, isOpen, onClose }: ScenarioInfoModalProps) {
  if (!isOpen) return null;

  const getDifficultyColor = () => {
    switch (scenario.difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-semibold text-gray-900">
              {scenario.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
            <p className="text-gray-600">{scenario.description}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Category</h3>
              <p className="text-gray-600 capitalize">{scenario.category}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Difficulty</h3>
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor()}`}>
                {scenario.difficulty}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Estimated Duration</h3>
            <p className="text-gray-600">{scenario.estimatedMinutes} minutes</p>
          </div>

          {/* Tags */}
          {scenario.tags && scenario.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {scenario.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-1">💡 Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Take your time to think before answering</li>
              <li>• Use specific examples from your experience</li>
              <li>• It's okay to ask for clarification</li>
              <li>• Remember, this is practice - mistakes help you learn!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}