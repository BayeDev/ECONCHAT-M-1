import { useState } from 'react';
import ChatInterface from './components/ChatInterface';

function App() {
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const handleReset = async () => {
    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-4 px-6 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18"/>
                <path d="M7 16l4-8 4 6 3-4"/>
              </svg>
              EconChat
            </h1>
            <p className="text-blue-200 text-sm">AI-powered economic data assistant</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-2 text-xs">
              <span className="bg-blue-700/50 px-2 py-1 rounded" title="World Bank Development Indicators">WB</span>
              <span className="bg-blue-700/50 px-2 py-1 rounded" title="IMF World Economic Outlook">IMF</span>
              <span className="bg-blue-700/50 px-2 py-1 rounded" title="FAO FAOSTAT">FAO</span>
              <span className="bg-blue-700/50 px-2 py-1 rounded" title="UN Comtrade">Trade</span>
              <span className="bg-blue-700/50 px-2 py-1 rounded" title="Our World in Data">OWID</span>
            </div>
            <button
              onClick={handleReset}
              className="text-sm bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded transition"
              title="Start new conversation"
            >
              New Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto">
        <ChatInterface sessionId={sessionId} />
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t py-3 px-6 text-center text-sm text-gray-500">
        <p>
          Data sources: World Bank WDI | IMF WEO | FAO FAOSTAT | UN Comtrade | Our World in Data
        </p>
      </footer>
    </div>
  );
}

export default App;
