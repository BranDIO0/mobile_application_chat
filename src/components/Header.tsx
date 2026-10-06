export type Tab = 'test' | 'chat';

interface HeaderProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  userId: string;
  loggedIn: boolean;
  onLogout: () => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'test', label: '1. API Test' },
  { id: 'chat', label: '2. Chat' },
];

export function Header({ tab, onTabChange, userId, loggedIn, onLogout }: HeaderProps) {
  return (
    <header className="border-b bg-white px-6 py-3 shadow-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold">HSE Chat Client</h1>
          <p className="text-xs text-slate-500">
            User: <span className="font-mono font-bold text-blue-600">{userId}</span>
            {loggedIn ? ' · logged in' : ' · not logged in'}
          </p>
        </div>

        <nav className="flex rounded-lg border bg-slate-100 p-1 text-xs font-semibold">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`rounded-md px-4 py-1.5 ${tab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {loggedIn && (
          <button onClick={onLogout} className="btn-secondary text-xs">
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
