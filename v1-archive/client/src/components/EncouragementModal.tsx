import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

interface EncouragementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const encouragements = [
  {
    title: "You're Doing Great! 🌟",
    message: "Remember, everyone feels nervous when practicing conversations. It's completely normal!",
    tips: [
      "Take a deep breath before speaking",
      "It's okay to pause and think",
      "The AI is here to help, not judge"
    ]
  },
  {
    title: "Keep Going! 💪",
    message: "Practice makes perfect. Every conversation helps you improve!",
    tips: [
      "Focus on expressing your ideas, not perfect grammar",
      "Short responses are perfectly fine",
      "You can restart anytime if you need to"
    ]
  },
  {
    title: "You've Got This! 🎯",
    message: "Feeling nervous is a sign that you're challenging yourself - that's how we grow!",
    tips: [
      "Try to relax your shoulders",
      "Speak at your own pace",
      "Remember, this is a safe space to practice"
    ]
  }
];

export function EncouragementModal({ isOpen, onClose }: EncouragementModalProps) {
  // Pick a random encouragement
  const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl">
          <DialogTitle className="text-xl font-semibold text-gray-900 mb-3">
            {encouragement.title}
          </DialogTitle>
          
          <p className="text-gray-600 mb-4">
            {encouragement.message}
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Quick Tips:</h4>
            <ul className="space-y-1">
              {encouragement.tips.map((tip, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              I'm Ready!
            </button>
            <button
              onClick={() => {
                // TODO: Implement restart session
                onClose();
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Restart Session
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}