import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { chatApi } from '../api/chatApi';

/** Holds user id + token, persists both in localStorage, and verifies stored tokens on startup. */
export function useAuth() {
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') ?? 'jaehit00');
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('token'));
  const [validatedToken, setValidatedToken] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => localStorage.setItem('userId', userId), [userId]);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  // Validate stored token automatically via validatetoken
  useEffect(() => {
    if (!token || validatedToken === token) return;
    let cancelled = false;

    chatApi
      .validateToken(token)
      .then(() => {
        if (!cancelled) {
          setValidatedToken(token);
          setSessionError(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.code === 456) {
          setTokenState(null);
          setValidatedToken(null);
          setSessionError('Sitzung abgelaufen oder Token ungültig (456). Bitte erneut anmelden.');
        } else {
          // Keep token on transient network error, mark validation attempt finished
          setValidatedToken(token);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, validatedToken]);

  const setToken = (nextToken: string | null) => {
    setSessionError(null);
    if (nextToken) setValidatedToken(nextToken);
    else setValidatedToken(null);
    setTokenState(nextToken);
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      if (token) await chatApi.logout(token).catch(() => {}); // token is dropped locally anyway
    } finally {
      setTokenState(null);
      setValidatedToken(null);
      setLoggingOut(false);
    }
  };

  const deleteAccount = async () => {
    if (!token) return;
    await chatApi.deregister(token);
    setTokenState(null);
    setValidatedToken(null);
  };

  const validatingSession = Boolean(token && validatedToken !== token);

  return {
    userId,
    setUserId,
    token,
    setToken,
    validatingSession,
    loggingOut,
    sessionError,
    clearSessionError: () => setSessionError(null),
    logout,
    deleteAccount,
  };
}
