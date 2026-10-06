import { useEffect, useState } from 'react';
import { chatApi } from '../api/chatApi';

/** Holds user id + token and persists both in localStorage. */
export function useAuth() {
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') ?? 'jaehit00');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  useEffect(() => localStorage.setItem('userId', userId), [userId]);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  const logout = async () => {
    if (token) await chatApi.logout(token).catch(() => {}); // token is dropped locally anyway
    setToken(null);
  };

  return { userId, setUserId, token, setToken, logout };
}
