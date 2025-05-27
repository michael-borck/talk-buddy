import { BrowserRouter } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              TalkBuddy
            </h1>
            <p className="text-gray-600">
              AI-powered conversation practice
            </p>
            <p className="text-sm text-gray-500 mt-8">
              React + Vite + TypeScript + Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App