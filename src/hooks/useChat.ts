import { useCallback, useEffect, useRef, useState } from 'react';
import { formatError } from '../api/client';
import { chatApi } from '../api/chatApi';
import type { ChatInvite, ChatMessage, ChatRoom, NewMessage } from '../types';

const POLL_INTERVAL_MS = 3000;

function normalizeRoom(r: ChatRoom): ChatRoom {
  return {
    ...r,
    chatid: Number(r.chatid),
    chatname: String(r.chatname ?? `Chat #${r.chatid}`),
    visibility: r.visibility === 'private' ? 'private' : 'public',
  };
}

function normalizeMessage(m: ChatMessage): ChatMessage {
  const rawImportant = m.important as unknown;
  return {
    ...m,
    id: Number(m.id),
    chatid: Number(m.chatid),
    important: Boolean(rawImportant && rawImportant !== '0' && rawImportant !== 'false'),
    text: m.text ?? '',
  };
}

/** Loads rooms (getchats) and messages of the selected room (getmessages) with loading and error states. */
export function useChat(token: string, chatId: number) {
  // Chat list state (getchats)
  const [roomsState, setRoomsState] = useState<{
    token: string;
    list: ChatRoom[];
    initialLoaded: boolean;
    error: string | null;
  }>({
    token: '',
    list: [],
    initialLoaded: false,
    error: null,
  });
  const [invites, setInvites] = useState<ChatInvite[]>([]);
  const [refreshingRooms, setRefreshingRooms] = useState(false);

  // Messages state (getmessages)
  const [messagesState, setMessagesState] = useState<{
    token: string;
    byRoom: Record<number, ChatMessage[]>;
    loadedRooms: Record<number, boolean>;
    errorsByRoom: Record<number, string | null>;
  }>({
    token: '',
    byRoom: {},
    loadedRooms: {},
    errorsByRoom: {},
  });
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Action / Mutation states
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollNow = useRef<() => Promise<void>>(async () => {});

  // Load chat rooms (getchats) + invites (getinvites)
  const reloadRooms = useCallback(async () => {
    setRefreshingRooms(true);
    try {
      const [chatsRes, invitesRes] = await Promise.all([
        chatApi.getChats(token),
        chatApi.getInvites(token).catch(() => ({ invites: [] as ChatInvite[] })),
      ]);
      const normalized = (chatsRes.chats ?? []).map(normalizeRoom);
      setRoomsState({ token, list: normalized, initialLoaded: true, error: null });
      setInvites(
        (invitesRes.invites ?? []).map((inv) => ({
          ...inv,
          chatid: Number(inv.chatid),
        })),
      );
    } catch (e) {
      const errMsg = formatError(e);
      setRoomsState((prev) =>
        prev.token === token
          ? { ...prev, initialLoaded: true, error: errMsg }
          : { token, list: [], initialLoaded: true, error: errMsg },
      );
    } finally {
      setRefreshingRooms(false);
    }
  }, [token]);

  // Initial getchats call when token changes
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      chatApi.getChats(token),
      chatApi.getInvites(token).catch(() => ({ invites: [] as ChatInvite[] })),
    ])
      .then(([chatsRes, invitesRes]) => {
        if (cancelled) return;
        const normalized = (chatsRes.chats ?? []).map(normalizeRoom);
        setRoomsState({ token, list: normalized, initialLoaded: true, error: null });
        setInvites(
          (invitesRes.invites ?? []).map((inv) => ({
            ...inv,
            chatid: Number(inv.chatid),
          })),
        );
      })
      .catch((e) => {
        if (cancelled) return;
        const errMsg = formatError(e);
        setRoomsState((prev) =>
          prev.token === token
            ? { ...prev, initialLoaded: true, error: errMsg }
            : { token, list: [], initialLoaded: true, error: errMsg },
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Load and poll messages for active chatId (getmessages)
  useEffect(() => {
    let lastId = 0;
    let cancelled = false;

    const poll = async (manual = false) => {
      if (manual) setRefreshingMessages(true);
      try {
        const res = await chatApi.getMessages(token, chatId, lastId);
        const fresh = (res.messages ?? []).map(normalizeMessage);
        if (cancelled) return;

        if (fresh.length > 0) {
          lastId = Math.max(lastId, ...fresh.map((m) => m.id));
        }

        setMessagesState((prev) => {
          const baseByRoom = prev.token === token ? prev.byRoom : {};
          const baseLoaded = prev.token === token ? prev.loadedRooms : {};
          const baseErrors = prev.token === token ? prev.errorsByRoom : {};
          const existing = baseByRoom[chatId] ?? [];
          const known = new Set(existing.map((m) => m.id));
          const merged = [...existing, ...fresh.filter((m) => !known.has(m.id))].sort(
            (a, b) => a.id - b.id,
          );
          return {
            token,
            byRoom: { ...baseByRoom, [chatId]: merged },
            loadedRooms: { ...baseLoaded, [chatId]: true },
            errorsByRoom: { ...baseErrors, [chatId]: null },
          };
        });

        setLastSyncedAt(new Date().toLocaleTimeString('de-DE'));
      } catch (e) {
        if (cancelled) return;
        const errMsg = formatError(e);
        setMessagesState((prev) => {
          const baseByRoom = prev.token === token ? prev.byRoom : {};
          const baseLoaded = prev.token === token ? prev.loadedRooms : {};
          const baseErrors = prev.token === token ? prev.errorsByRoom : {};
          return {
            token,
            byRoom: baseByRoom,
            loadedRooms: { ...baseLoaded, [chatId]: true },
            errorsByRoom: { ...baseErrors, [chatId]: errMsg },
          };
        });
      } finally {
        if (!cancelled && manual) setRefreshingMessages(false);
      }
    };

    pollNow.current = () => poll(true);

    poll(false);
    const timer = setInterval(() => {
      poll(false);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, chatId]);

  const reloadMessages = useCallback(async () => {
    await pollNow.current();
  }, []);

  /** Sends a message and returns true on success, false on error. */
  const send = async (message: NewMessage): Promise<boolean> => {
    setSending(true);
    setError(null);
    try {
      await chatApi.postMessage(token, { ...message, chatid: chatId });
      await pollNow.current();
      return true;
    } catch (e) {
      setError(formatError(e));
      return false;
    } finally {
      setSending(false);
    }
  };

  /** Creates a room (public by default) and returns its id. */
  const createRoom = async (name: string, isPublic = true): Promise<number | undefined> => {
    setError(null);
    try {
      const res = await chatApi.createChat(token, name, isPublic);
      await reloadRooms();
      return Number(res.chatid);
    } catch (e) {
      setError(formatError(e));
      return undefined;
    }
  };

  /** Joins a room by chatId and reloads the room list. */
  const joinRoom = async (targetChatId: number): Promise<boolean> => {
    setError(null);
    try {
      await chatApi.joinChat(token, targetChatId);
      await reloadRooms();
      return true;
    } catch (e) {
      setError(formatError(e));
      return false;
    }
  };

  /** Leaves a room by chatId and reloads the room list. */
  const leaveRoom = async (targetChatId: number): Promise<boolean> => {
    setError(null);
    try {
      await chatApi.leaveChat(token, targetChatId);
      await reloadRooms();
      return true;
    } catch (e) {
      setError(formatError(e));
      return false;
    }
  };

  /** Deletes a room by chatId and reloads the room list. */
  const deleteRoom = async (targetChatId: number): Promise<boolean> => {
    setError(null);
    try {
      await chatApi.deleteChat(token, targetChatId);
      await reloadRooms();
      return true;
    } catch (e) {
      setError(formatError(e));
      return false;
    }
  };

  /** Rejects a pending room invite. */
  const declineInvite = async (targetChatId: number): Promise<boolean> => {
    setError(null);
    try {
      await chatApi.rejectInvite(token, targetChatId);
      await reloadRooms();
      return true;
    } catch (e) {
      setError(formatError(e));
      return false;
    }
  };

  const rooms = roomsState.token === token ? roomsState.list : [];
  const loadingRooms = roomsState.token !== token || !roomsState.initialLoaded;
  const roomsError = roomsState.token === token ? roomsState.error : null;

  const messages = messagesState.token === token ? (messagesState.byRoom[chatId] ?? []) : [];
  const loadingMessages = messagesState.token !== token || !messagesState.loadedRooms[chatId];
  const messagesError =
    messagesState.token === token ? (messagesState.errorsByRoom[chatId] ?? null) : null;

  return {
    // Rooms (getchats)
    rooms,
    invites,
    loadingRooms,
    refreshingRooms,
    roomsError,
    reloadRooms,

    // Messages (getmessages)
    messages,
    loadingMessages,
    refreshingMessages,
    messagesError,
    lastSyncedAt,
    reloadMessages,

    // Mutations & Errors
    sending,
    error,
    clearError: () => setError(null),
    send,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    declineInvite,
  };
}
