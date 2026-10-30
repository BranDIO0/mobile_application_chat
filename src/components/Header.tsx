import { useEffect, useState } from 'react';
import { isMockModeEnabled, setMockModeEnabled } from '../api/mockServer';

export type Tab = 'chat' | 'profile' | 'test';

interface HeaderProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  userId: string;
  loggedIn: boolean;
  validatingSession?: boolean;
  loggingOut?: boolean;
  onLogout: () => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'profile', label: 'Profil' },
  { id: 'test', label: 'API-Test' },
];

export function Header({
  tab,
  onTabChange,
  userId,
  loggedIn,
  validatingSession = false,
  loggingOut = false,
  onLogout,
}: HeaderProps) {
  const [mockMode, setMockMode] = useState(() => isMockModeEnabled());

  useEffect(() => {
    const sync = () => setMockMode(isMockModeEnabled());
    window.addEventListener('hse-mock-mode-change', sync);
    return () => window.removeEventListener('hse-mock-mode-change', sync);
  }, []);

  const toggleMock = () => {
    const next = !mockMode;
    setMockModeEnabled(next);
    setMockMode(next);
  };

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-2.5 shadow-2xs sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">HSE Chat</h1>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                Alpha
              </span>
              <button
                type="button"
                onClick={toggleMock}
                title="Zwischen echtem HSE-Server und lokalem Mock-Server wechseln"
                className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  mockMode
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {mockMode ? 'Backend: Lokal (Mock)' : 'Backend: HSE-Server'}
              </button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  validatingSession
                    ? 'animate-pulse bg-amber-400'
                    : loggedIn
                      ? 'bg-emerald-500'
                      : 'bg-slate-300'
                }`}
              />
              <span>Nutzer:</span>
              <span className="font-mono font-bold text-blue-600">{userId}</span>
              <span>
                {validatingSession
                  ? '· Prüfe Sitzung…'
                  : loggedIn
                    ? '· Angemeldet'
                    : '· Nicht angemeldet'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`rounded-md px-3.5 py-1.5 transition-colors ${
                  tab === t.id
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {loggedIn && (
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              {loggingOut ? 'Abmelden…' : 'Abmelden'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
