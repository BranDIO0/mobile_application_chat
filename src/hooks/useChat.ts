import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi } from '../api/chatApi';
import type { ChatMessage, ChatRoom, NewMessage } from '../types';

const POLL_INTERVAL_MS = 3000;

/** Loads rooms and messages of the selected room and polls for new messages. */
export function useChat(token: string, chatId: number) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  // Messages are stored together with their room, so switching rooms needs no reset.
  const [loaded, setLoaded] = useState<{ chatId: number; list: ChatMessage[] }>({ chatId, list: [] });
  const [error, setError] = useState<string | null>(null);
  const pollNow = useRef<() => Promise<void>>(async () => {});

  const loadRooms = useCallback(async () => {
    const res = await chatApi.getChats(token);
    setRooms(res.chats ?? []);
  }, [token]);

  useEffect(() => {
    let lastId = 0; // highest message id received in this room
    let cancelled = false; // ignore late responses after a room switch

    /** Fetches only messages newer than `lastId` and appends them (without duplicates). */
    const poll = async () => {
      const res = await chatApi.getMessages(token, chatId, lastId);
      const fresh = res.messages ?? [];
      if (cancelled) return;
      lastId = Math.max(lastId, ...fresh.map((m) => m.id));
      setLoaded((prev) => {
        const list = prev.chatId === chatId ? prev.list : [];
        const known = new Set(list.map((m) => m.id));
        return { chatId, list: [...list, ...fresh.filter((m) => !known.has(m.id))] };
      });
    };

    pollNow.current = poll;
    chatApi
      .getChats(token)
      .then((res) => !cancelled && setRooms(res.chats ?? []))
      .catch((e) => setError(e.message));
    poll().catch((e) => setError(e.message));
    const timer = setInterval(() => poll().catch(() => {}), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, chatId]);

  const send = async (message: NewMessage) => {
    try {
      await chatApi.postMessage(token, { ...message, chatid: chatId });
      setError(null);
      await pollNow.current();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  /** Creates a public room and returns its id. */
  const createRoom = async (name: string) => {
    try {
      const res = await chatApi.createChat(token, name);
      await loadRooms();
      return res.chatid;
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return {
    rooms,
    messages: loaded.chatId === chatId ? loaded.list : [],
    error,
    clearError: () => setError(null),
    send,
    createRoom,
  };
}
