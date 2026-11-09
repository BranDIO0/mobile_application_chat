import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { chatApi } from '../api/chatApi';
import { getServerMode, type ServerMode } from '../api/mockServer';

function getTokenStorageKey(mode: ServerMode): string {
  if (mode === 'mock') return 'token_mock';
  if (mode === 'backup') return 'token_backup';
  return 'token_live';
}

function readStoredToken(mode: ServerMode): string | null {
  if (localStorage.getItem('remember') === 'false') return null;
  const key = getTokenStorageKey(mode);
  const stored = localStorage.getItem(key);
  if (stored) {
    if (mode !== 'mock' && stored.startsWith('mock_tok_')) {
      localStorage.removeItem(key);
      return null;
    }
    return stored;
  }
  const legacy = localStorage.getItem('token');
  if (legacy) {
    const isMockTok = legacy.startsWith('mock_tok_');
    if ((mode === 'mock') === isMockTok) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem('token');
      return legacy;
    }
    localStorage.removeItem('token');
  }
  return null;
}

/** Holds user id + token, persists both in localStorage (when remember is true), and verifies stored tokens on startup. */
export function useAuth() {
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') ?? 'asesit00');
  const [remember, setRememberState] = useState(() => localStorage.getItem('remember') !== 'false');
  const [token, setTokenState] = useState<string | null>(() => readStoredToken(getServerMode()));
  const [validatedToken, setValidatedToken] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => localStorage.setItem('userId', userId), [userId]);

  useEffect(() => {
    const key = getTokenStorageKey(getServerMode());
    localStorage.setItem('remember', String(remember));
    if (!remember || !token) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, token);
    }
  }, [remember, token]);

  // Validate stored token automatically via validatetoken
  useEffect(() => {
    if (!token || validatedToken === token) return;
    let cancelled = false;

    chatApi
      .validateToken(token)
      .then((res) => {
        if (cancelled) return;
        if (res.message && res.message.toLowerCase().includes('not valid')) {
          const key = getTokenStorageKey(getServerMode());
          localStorage.removeItem(key);
          localStorage.removeItem('token');
          setTokenState(null);
          setValidatedToken(null);
          setSessionError('Gespeicherter Token ist abgelaufen. Bitte neu anmelden.');
          return;
        }
        setValidatedToken(token);
        setSessionError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.code === 456 || e.code === 403 || e.code === 404)) {
          const key = getTokenStorageKey(getServerMode());
          localStorage.removeItem(key);
          localStorage.removeItem('token');
          setTokenState(null);
          setValidatedToken(null);
          if (e.code === 456) {
            setSessionError('Sitzung abgelaufen oder Token ungültig (456). Bitte erneut anmelden.');
          }
        } else {
          setTokenState(null);
          setValidatedToken(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, validatedToken]);

  const setToken = (nextToken: string | null, keepSession?: boolean) => {
    setSessionError(null);
    const keep = keepSession !== undefined ? keepSession : remember;
    if (keepSession !== undefined) {
      setRememberState(keepSession);
    }
    const key = getTokenStorageKey(getServerMode());
    if (nextToken && keep) {
      localStorage.setItem(key, nextToken);
    } else if (!nextToken) {
      localStorage.removeItem(key);
      localStorage.removeItem('token');
    }
    if (nextToken) setValidatedToken(nextToken);
    else setValidatedToken(null);
    setTokenState(nextToken);
  };

  /** Switches the active token when the user toggles between HSE-Live, Backup-Server, and Mockup-Daten. */
  const syncModeToken = useCallback((mode: ServerMode) => {
    setSessionError(null);
    const stored = readStoredToken(mode);
    setValidatedToken(null);
    setTokenState(stored);
  }, []);

  const logout = async () => {
    setLoggingOut(true);
    const key = getTokenStorageKey(getServerMode());
    try {
      if (token) await chatApi.logout(token).catch(() => {}); // token is dropped locally anyway
    } finally {
      localStorage.removeItem(key);
      localStorage.removeItem('token');
      setTokenState(null);
      setValidatedToken(null);
      setLoggingOut(false);
    }
  };

  const deleteAccount = async () => {
    if (!token) return;
    const key = getTokenStorageKey(getServerMode());
    await chatApi.deregister(token);
    localStorage.removeItem(key);
    localStorage.removeItem('token');
    setTokenState(null);
    setValidatedToken(null);
  };

  const validatingSession = Boolean(token && validatedToken !== token);
  const isSessionReady = Boolean(token && validatedToken === token);

  return {
    userId,
    setUserId,
    remember,
    setRemember: setRememberState,
    token,
    setToken,
    syncModeToken,
    validatingSession,
    isSessionReady,
    loggingOut,
    sessionError,
    clearSessionError: () => setSessionError(null),
    logout,
    deleteAccount,
  };
}
