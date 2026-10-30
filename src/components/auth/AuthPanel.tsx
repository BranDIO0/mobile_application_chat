import { useState } from 'react';
import { ApiError, formatError } from '../../api/client';
import { chatApi } from '../../api/chatApi';
import { isMockModeEnabled, setMockModeEnabled } from '../../api/mockServer';

interface AuthPanelProps {
  userId: string;
  setUserId: (id: string) => void;
  onToken: (token: string) => void;
  sessionError?: string | null;
  onOpenApiTest?: () => void;
}

export function AuthPanel({ userId, setUserId, onToken, sessionError, onOpenApiTest }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('Jae');
  const [fullname, setFullname] = useState('Jae Student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [mockActive, setMockActive] = useState(() => isMockModeEnabled());

  const runAuth = async () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const cleanId = userId.trim();
      setUserId(cleanId);
      const pwd = password.length >= 6 ? password : 'password123';
      const res =
        mode === 'login'
          ? await chatApi.login(cleanId, password || pwd)
          : await chatApi.register(cleanId, password || pwd, nickname.trim(), fullname.trim());

      if (res.token) {
        onToken(res.token);
      } else {
        setError('Server hat kein gültiges Session-Token zurückgegeben.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorCode(err.code);
      }
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAuth();
  };

  const switchToMockAndLogin = async () => {
    setMockModeEnabled(true);
    setMockActive(true);
    if (password.length < 6) {
      setPassword('password123');
    }
    await runAuth();
  };

  const toggleBackend = (useMock: boolean) => {
    setMockModeEnabled(useMock);
    setMockActive(useMock);
    setError(null);
    setErrorCode(null);
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
    setErrorCode(null);
  };

  const isServerUnreachable =
    !mockActive && (errorCode === 404 || (errorCode !== null && errorCode >= 500) || (error !== null && errorCode === null));

  return (
    <div className="mx-auto my-6 max-w-md space-y-4">
      {sessionError && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <b>Hinweis zur Sitzung:</b> {sessionError}
        </div>
      )}

      <section className="card space-y-4">
        <div className="space-y-1 border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">HSE Hochschul-Chat</h2>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
              Alpha v0.1
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Anmeldung mit deinem Hochschulkürzel (keine Telefonnummer oder E-Mail erforderlich).
          </p>
        </div>

        {/* Backend source selector */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-medium text-slate-600">Backend:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => toggleBackend(false)}
              className={`rounded px-2 py-1 text-[11px] font-semibold ${
                !mockActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              HSE-Server
            </button>
            <button
              type="button"
              onClick={() => toggleBackend(true)}
              className={`rounded px-2 py-1 text-[11px] font-semibold ${
                mockActive ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Lokaler Mock-Server
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => switchMode('login')}
            disabled={loading}
            className={`rounded-md py-1.5 transition-colors ${
              mode === 'login' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Anmelden (Login)
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            disabled={loading}
            className={`rounded-md py-1.5 transition-colors ${
              mode === 'register' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-900'
            }`}
          >
            Registrieren
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            <div className="flex items-start justify-between gap-2">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="font-bold text-red-600 hover:text-red-900"
                aria-label="Fehlermeldung schließen"
              >
                ✕
              </button>
            </div>

            {errorCode === 452 && mode === 'register' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full rounded border border-red-300 bg-white px-2.5 py-1.5 font-semibold text-red-700 hover:bg-red-100"
              >
                Account existiert bereits → Zum Login wechseln
              </button>
            )}

            {isServerUnreachable && (
              <div className="space-y-1.5 border-t border-red-200 pt-2">
                <p className="text-[11px] text-red-700">
                  Der Hochschul-Endpunkt <code className="font-mono">~chkohl/chat</code> antwortet
                  derzeit mit 404. Du kannst für Tests auf den integrierten lokalen Mock-Server
                  umschalten:
                </p>
                <button
                  type="button"
                  onClick={switchToMockAndLogin}
                  disabled={loading}
                  className="w-full rounded bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
                >
                  Lokalen Mock-Server aktivieren & direkt anmelden
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Hochschulkürzel (User-ID)
            </label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="z. B. jaehit00"
              required
              disabled={loading}
              className="input font-mono"
            />
            <span className="mt-0.5 block text-[11px] text-slate-400">
              Format: 4 Buchstaben + &quot;it&quot; + 2 Ziffern (z. B. jaehit00)
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Passwort <span className="font-normal text-slate-400">(mind. 6 Zeichen, nicht dein echtes HS-Passwort)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              minLength={6}
              required
              disabled={loading}
              className="input"
            />
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Nickname
                </label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="2–30 Zeichen"
                  minLength={2}
                  maxLength={30}
                  required
                  disabled={loading}
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Vollständiger Name
                </label>
                <input
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="2–30 Zeichen"
                  minLength={2}
                  maxLength={30}
                  required
                  disabled={loading}
                  className="input"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
            {loading && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {loading
              ? mode === 'login'
                ? 'Anmeldung läuft…'
                : 'Registrierung läuft…'
              : mode === 'login'
                ? 'Anmelden'
                : 'Account registrieren'}
          </button>
        </form>

        {onOpenApiTest && (
          <div className="border-t border-slate-100 pt-2 text-center">
            <button
              type="button"
              onClick={onOpenApiTest}
              className="text-xs text-slate-500 underline hover:text-blue-600"
            >
              Zur API-Testbench (Token-Validierung & Fehlercode-Tests)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
