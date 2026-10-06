import { useState } from 'react';
import { api } from '../api';
import { ERROR_CODES, type ApiResponse } from '../types';

interface ApiTestViewProps {
  token: string | null;
  setToken: (t: string | null) => void;
  userId: string;
  setUserId: (u: string) => void;
}

export function ApiTestView({ token, setToken, userId, setUserId }: ApiTestViewProps) {
  const [password, setPassword] = useState('Pass1234');
  const [nickname, setNickname] = useState('Jae');
  const [fullname, setFullname] = useState('Jae Student');
  
  const [resData, setResData] = useState<ApiResponse | null>(null);
  const [validateInfo, setValidateInfo] = useState<{ msg: string; ms: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCodeInfo, setErrorCodeInfo] = useState<{ code: number; text: string } | null>(null);

  // 1. Register
  const handleRegister = async () => {
    setLoading(true);
    setResData(null);
    try {
      const res = await api.register(userId, password, nickname, fullname);
      setResData(res);
      if (res.token) setToken(res.token);
    } catch (err: any) {
      setResData(err.response || { status: 'error', code: err.code || 500, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 1b. Login (if 452)
  const handleLogin = async () => {
    setLoading(true);
    setResData(null);
    try {
      const res = await api.login(userId, password);
      setResData(res);
      if (res.token) setToken(res.token);
    } catch (err: any) {
      setResData(err.response || { status: 'error', code: err.code || 500, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 3. Validate Token
  const handleValidate = async () => {
    if (!token) return;
    setLoading(true);
    const start = performance.now();
    try {
      const res = await api.validateToken(token);
      const elapsed = Math.round(performance.now() - start);
      setValidateInfo({ msg: res.message, ms: elapsed });
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setValidateInfo({ msg: err.message || 'Token ungültig', ms: elapsed });
    } finally {
      setLoading(false);
    }
  };

  // 4. Test error codes
  const testErrorCode = async (code: number) => {
    setErrorCodeInfo(null);
    try {
      if (code === 451) await api.register('falsche_id', 'Pass123', 'Nick', 'Name');
      else if (code === 452) await api.register(userId, password, nickname, fullname);
      else if (code === 453) await api.register('testit99', '123', 'Nick', 'Name');
      else if (code === 454) await api.login('unbekanntit00', 'Pass123');
      else if (code === 455) await api.login(userId, 'falschespasswort');
      else if (code === 456) await api.validateToken('invalid_token');
      else if (code === 466) await api.register('testit98', 'Pass123', 'A', 'Name');
      else if (code === 467) await api.register('testit97', 'Pass123', 'A'.repeat(35), 'Name');
      else if (code === 468) await api.register('testit96', 'Pass123', 'Nick', 'B');
      else if (code === 469) await api.register('testit95', 'Pass123', 'Nick', 'B'.repeat(35));
    } catch (err: any) {
      const c = err.code || err.response?.code || 500;
      setErrorCodeInfo({ code: c, text: ERROR_CODES[c] || err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900 text-sm">
        <h2 className="font-bold text-base mb-1">Aufgabe: Gemeinsamer API-Test</h2>
        <p className="text-xs text-blue-700">
          Diese Ansicht führt die Schritte 1 bis 4 der Vorlesung aus: Registrieren, Token sichern, Validieren (1s Delay) & Fehlercodes deuten.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Schritt 1: Registrierung */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
            <span>Registrieren</span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-600 block">User-ID (HSE-Kennung)</label>
              <input value={userId} onChange={(e) => setUserId(e.target.value)} className="input text-xs font-mono" />
            </div>
            <div>
              <label className="text-xs text-slate-600 block">Passwort (min. 6 Zeichen)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input text-xs" />
            </div>
            <div>
              <label className="text-xs text-slate-600 block">Nickname</label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="input text-xs" />
            </div>
            <div>
              <label className="text-xs text-slate-600 block">Fullname</label>
              <input value={fullname} onChange={(e) => setFullname(e.target.value)} className="input text-xs" />
            </div>
          </div>

          <button onClick={handleRegister} disabled={loading} className="btn-primary w-full text-xs py-2">
            {loading ? 'Sende...' : '1. Account Registrieren'}
          </button>

          {resData?.code === 452 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5">
              <span className="font-semibold text-amber-800 block">HTTP 452: User existiert bereits</span>
              <button onClick={handleLogin} disabled={loading} className="btn-secondary w-full text-xs py-1">
                Stattdessen Einloggen (login)
              </button>
            </div>
          )}
        </div>

        {/* Schritt 2: Token */}
        <div className="card space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
              <span>Token Notieren</span>
            </div>

            {token ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                <span className="text-xs font-semibold text-emerald-800 block">Aktives Token:</span>
                <div className="font-mono text-xs text-emerald-900 bg-white p-2 rounded border border-emerald-300 break-all select-all">
                  {token}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 p-4 border border-dashed rounded-lg text-center">
                Noch kein Token. Bitte Schritt 1 ausführen.
              </div>
            )}
          </div>

          {resData && (
            <div className="bg-slate-50 p-2.5 rounded-lg border text-xs font-mono text-slate-700 space-y-1">
              <div>Status: {resData.code || 200}</div>
              <div className="truncate">Msg: "{resData.message}"</div>
            </div>
          )}
        </div>

        {/* Schritt 3: Validieren */}
        <div className="card space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
              <span>Token Validieren</span>
            </div>

            <p className="text-xs text-slate-500">
              Prüft <code className="bg-slate-100 px-1 py-0.5 rounded">validatetoken</code>. Server antwortet mit bewusster 1s Verzögerung.
            </p>

            {validateInfo && (
              <div className="p-3 bg-slate-50 border rounded-lg text-xs space-y-1">
                <div className="font-bold text-slate-800">Antwort: "{validateInfo.msg}"</div>
                <div className="text-slate-500 font-mono">Dauer: {validateInfo.ms} ms (Server Delay)</div>
              </div>
            )}
          </div>

          <button onClick={handleValidate} disabled={!token || loading} className="btn-primary w-full text-xs py-2 bg-emerald-600 hover:bg-emerald-700">
            3. Token Validieren (1s Delay)
          </button>
        </div>
      </div>

      {/* Schritt 4: Fehler-Deutung */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">4</span>
          <span>Schritt 4: Fehler-Deutung (HTTP-Statuscodes 451-469)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[451, 452, 453, 454, 455, 456, 466, 467, 468, 469].map((code) => (
            <button
              key={code}
              onClick={() => testErrorCode(code)}
              className="p-2 border rounded-lg text-left hover:bg-slate-50 transition-colors text-xs space-y-0.5"
            >
              <div className="font-bold text-blue-600 font-mono">HTTP {code}</div>
              <div className="text-[11px] text-slate-500 truncate">Testen</div>
            </button>
          ))}
        </div>

        {errorCodeInfo && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
            <div className="font-bold text-amber-900">Empfangener Status: HTTP {errorCodeInfo.code}</div>
            <div className="text-amber-800">{errorCodeInfo.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}
