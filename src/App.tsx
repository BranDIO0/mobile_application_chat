import { useState, useEffect } from 'react';
import { ApiTestView } from './components/ApiTestView';
import { ChatView } from './components/ChatView';

export function App() {
  const [tab, setTab] = useState<'test' | 'chat'>('test');

  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('hse_userId') || 'jaehit00';
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('hse_chatToken') || null;
  });

  useEffect(() => {
    localStorage.setItem('hse_userId', userId);
  }, [userId]);

  useEffect(() => {
    if (token) localStorage.setItem('hse_chatToken', token);
    else localStorage.removeItem('hse_chatToken');
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">HS Esslingen — Chat Client & API-Test</h1>
            <p className="text-xs text-slate-500">
              Kennung: <span className="font-mono font-bold text-blue-600">{userId}</span>
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg border text-xs font-semibold">
            <button
              onClick={() => setTab('test')}
              className={`px-4 py-1.5 rounded-md transition-colors ${
                tab === 'test' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🧪 1. API-Test (Übung)
            </button>
            <button
              onClick={() => setTab('chat')}
              className={`px-4 py-1.5 rounded-md transition-colors ${
                tab === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              💬 2. Live Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {tab === 'test' && (
          <ApiTestView
            token={token}
            setToken={setToken}
            userId={userId}
            setUserId={setUserId}
          />
        )}

        {tab === 'chat' && (
          <ChatView
            token={token}
            userId={userId}
            onOpenTest={() => setTab('test')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-slate-500">
        Mobile UI — Chat Server Website (Hochschule Esslingen)
      </footer>
    </div>
  );
}

export default App;
