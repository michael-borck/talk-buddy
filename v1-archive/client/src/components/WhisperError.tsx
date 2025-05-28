import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

interface WhisperErrorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhisperError({ isOpen, onClose }: WhisperErrorProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl">
          <DialogTitle className="text-xl font-semibold text-gray-900 mb-3">
            Speech Service Not Available
          </DialogTitle>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              The speech recognition service is not running. Please make sure the Whisper server is started.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">To start the service:</h4>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. Open a terminal in the <code className="bg-blue-100 px-1 rounded">server</code> directory</li>
                <li>2. Run: <code className="bg-blue-100 px-1 rounded">./start-all.sh</code></li>
                <li>3. Wait for both services to start</li>
                <li>4. Refresh this page</li>
              </ol>
            </div>
            
            <p className="text-sm text-gray-500">
              The Whisper server provides speech-to-text functionality for all browsers.
            </p>
          </div>
          
          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              OK
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}