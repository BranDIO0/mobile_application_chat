import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { formatError } from '../api/client';
import { chatApi } from '../api/chatApi';
import {
  getServerMode,
  isMockModeEnabled,
  setServerModeStore,
  type ServerMode,
} from '../api/mockServer';
import {
  CATEGORIES,
  INITIAL_MODULES,
  slugifyName,
  TAFEL,
  type Channel,
  type FileAtt,
  type Invitation,
  type Module,
  type Notif,
  type NotifTarget,
  type ScreenId,
} from '../data/catalog';
import { useAuth } from '../hooks/useAuth';
import type { UserProfile } from '../types';
import { fileToBase64 } from '../utils/fileToBase64';
import {
  buildCustomGroupRoomName,
  buildModuleMainRoomName,
  buildSubgroupRoomName,
  formatFileSize,
  parseChatInvite,
  parseChatMessage,
  parseChatRoom,
  syncModulesWithServerRooms,
} from '../utils/roomParser';

export type Dir = 'push' | 'pop' | 'fade';
export type Member = { id: string; role: string; hash?: string };
export type InviteState = { pending: string[]; members: Member[] };
export type OpenFile = { file: FileAtt; sharedBy: string; channelId: string };

const POLL_INTERVAL_MS = 3000;

const MOCK_ARCHIVED_INVITATIONS: Invitation[] = [
  { id: 'arch-1', chatid: 3, room: 'Übungsblatt 3 — Mathe 1', icon: '💬', from: 'abcdit09', when: '3 Tage her', status: 'accepted', channelName: 'Übungsblatt 3' },
  { id: 'arch-2', chatid: 99, room: 'Gaming-Gruppe', icon: '🎮', from: 'abcdit77', when: '1 Woche her', status: 'rejected', channelName: 'Gaming-Gruppe' },
];

const MOCK_INITIAL_NOTIFS: Notif[] = [
  { id: 'n1', unread: true, time: 'vor 2 Stunden', target: { type: 'invitations' }, html: <><strong>abcdit44</strong> hat dich zur <strong>Lerngruppe B</strong> eingeladen.</> },
  { id: 'n2', unread: true, time: 'vor 3 Stunden', target: { type: 'channel', channelId: '1' }, html: <><strong>[Dozent]</strong> prof.mueller hat eine neue Nachricht in <strong>Mathe 1</strong> gepostet.</> },
  { id: 'n3', unread: true, time: 'vor 4 Stunden', target: { type: 'channel', channelId: '2' }, html: <><strong>abcdit09</strong> hat eine Datei in <strong>Lerngruppe A</strong> geteilt.</> },
  { id: 'n4', unread: false, time: 'gestern', target: { type: 'channel', channelId: '4' }, html: <>Du bist <strong>Programmierung 1</strong> beigetreten.</> },
  { id: 'n5', unread: false, time: 'vor 2 Tagen', target: { type: 'channel', channelId: '3' }, html: <><strong>abcdit09</strong> hat deine Einladung zu <strong>Übungsblatt 3</strong> angenommen.</> },
  { id: 'n6', unread: false, time: 'vor 1 Monat', target: { type: 'archive' }, html: <>Kurs <strong>Mathe 1 (SS25)</strong> wurde archiviert. Nur-Lese-Modus aktiv.</> },
];

function useAppState() {
  const auth = useAuth();
  const [serverMode, setServerModeState] = useState<ServerMode>(() => getServerMode());
  const mockMode = serverMode === 'mock';
  const [stack, setStack] = useState<ScreenId[]>(['splash']);
  const [dir, setDir] = useState<Dir>('fade');
  const [navKey, setNavKey] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null);

  const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName') ?? 'Max Mustermann');
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('onboarded') === 'true');
  const [obDone, setObDone] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('obDone');
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('displayName', displayName);
  }, [displayName]);

  useEffect(() => {
    localStorage.setItem('onboarded', String(onboarded));
  }, [onboarded]);

  useEffect(() => {
    localStorage.setItem('obDone', JSON.stringify(obDone));
  }, [obDone]);

  const [modules, setModules] = useState<Module[]>(() =>
    INITIAL_MODULES.map((m) => ({ ...m, joined: isMockModeEnabled() ? m.joined : false })),
  );
  const [channels, setChannels] = useState<Channel[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string>('1');
  const [typing, setTyping] = useState<string | null>(null);
  const [openFileState, setOpenFile] = useState<OpenFile>({ file: TAFEL, sharedBy: 'abcdit09', channelId: '2' });
  const [subgroupModal, setSubgroupModal] = useState<string | null>(null);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [inviteMap, setInviteMap] = useState<Record<string, InviteState>>({});
  const [invitations, setInvitations] = useState<Invitation[]>(() =>
    isMockModeEnabled() ? MOCK_ARCHIVED_INVITATIONS : [],
  );
  const [notifs, setNotifs] = useState<Notif[]>(() =>
    isMockModeEnabled() ? MOCK_INITIAL_NOTIFS : [],
  );
  const [settings, setSettings] = useState({ push: true, mentionsOnly: false, showArchived: true });
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const toggleCollapsed = (id: string) =>
    setCollapsed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const screen = stack[stack.length - 1];
  const bump = (d: Dir) => {
    setDir(d);
    setNavKey((k) => k + 1);
  };

  const navigate = useCallback((id: ScreenId) => {
    setStack((s) => [...s, id]);
    bump('push');
  }, []);

  const replace = (id: ScreenId) => {
    setStack((s) => [...s.slice(0, -1), id]);
    bump('push');
  };

  const reset = (ids: ScreenId | ScreenId[], d: Dir = 'fade') => {
    setStack(Array.isArray(ids) ? ids : [ids]);
    setSubgroupModal(null);
    setModuleModalOpen(false);
    bump(d);
  };

  const back = () => {
    setSubgroupModal(null);
    setModuleModalOpen(false);
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : ['chats']));
    bump('pop');
  };

  const tab = (id: ScreenId) => {
    if (id === 'chats') setOnboarded(true);
    reset(id);
  };

  const toast = useCallback((text: string) => {
    const id = Date.now();
    setToastMsg({ id, text });
    later(() => setToastMsg((t) => (t?.id === id ? null : t)), 2400);
  }, []);

  const setServerMode = (mode: ServerMode) => {
    setServerModeStore(mode);
    setServerModeState(mode);
    auth.syncModeToken(mode);
    const useMock = mode === 'mock';
    setChannels([]);
    setInvitations(useMock ? MOCK_ARCHIVED_INVITATIONS : []);
    setNotifs(useMock ? MOCK_INITIAL_NOTIFS : []);
    setModules(INITIAL_MODULES.map((m) => ({ ...m, joined: useMock ? m.joined : false })));
  };

  const setMockMode = (useMock: boolean) => {
    setServerMode(useMock ? 'mock' : 'live');
  };

  useEffect(() => {
    if (auth.sessionError) {
      toast(auth.sessionError);
      if (screen !== 'login' && screen !== 'register' && screen !== 'splash') {
        reset('login', 'pop');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.sessionError]);

  // ── Load rooms (getchats), invites (getinvites), and profiles (getprofiles) from Backend ──
  const reloadRooms = useCallback(async () => {
    if (!auth.token || !auth.isSessionReady) return;
    setLoadingRooms(true);
    try {
      const [chatsRes, invitesRes, profilesRes] = await Promise.all([
        chatApi.getChats(auth.token),
        chatApi.getInvites(auth.token).catch(() => ({ invites: [] })),
        chatApi.getProfiles(auth.token).catch(() => ({ profiles: [] })),
      ]);

      const rawRooms = chatsRes.chats ?? [];
      const fetchedProfiles = profilesRes.profiles ?? [];
      setProfiles(fetchedProfiles);

      // Update displayName if current user exists in server profiles
      const myProfile = fetchedProfiles.find(
        (p) => p.userid.toLowerCase() === auth.userId.toLowerCase(),
      );
      if (myProfile?.fullname) {
        setDisplayName(myProfile.fullname);
      } else if (myProfile?.nickname) {
        setDisplayName(myProfile.nickname);
      }

      // Sync modules (including dynamically created server modules!)
      const syncedMods = syncModulesWithServerRooms(rawRooms, INITIAL_MODULES, isMockModeEnabled());
      setModules((prevMods) => syncModulesWithServerRooms(rawRooms, prevMods, isMockModeEnabled()));

      setChannels((prev) => {
        const msgMap = new Map(prev.map((c) => [c.id, c.messages]));
        const joinedRooms = rawRooms.filter(
          (r) => r.chatid === 0 || r.joined !== false,
        );
        const parsed = joinedRooms.map((r) =>
          parseChatRoom(r, msgMap.get(String(r.chatid)) ?? [], syncedMods),
        );
        // If no room is active yet or active room is missing, pick the first room
        if (parsed.length > 0 && !parsed.some((c) => c.id === activeChannelId)) {
          setActiveChannelId(parsed[0]!.id);
        }
        return parsed;
      });

      const serverInvites = (invitesRes.invites ?? []).map((inv) =>
        parseChatInvite(inv, syncedMods.length ? syncedMods : INITIAL_MODULES),
      );
      setInvitations((prevInv) => {
        const archivedInv = prevInv.filter((i) => i.status !== 'open');
        const archivedChatIds = new Set(archivedInv.map((i) => i.chatid));
        const openFiltered = serverInvites.filter((i) => !archivedChatIds.has(i.chatid));
        return [...openFiltered, ...archivedInv];
      });

      // Surface real server invitations as notifications in Live mode
      if (!isMockModeEnabled() && serverInvites.length > 0) {
        setNotifs((prevNotifs) => {
          const existingIds = new Set(prevNotifs.map((n) => n.id));
          const inviteNotifs: Notif[] = serverInvites
            .filter((inv) => !existingIds.has(`inv-notif-${inv.id}`))
            .map((inv) => ({
              id: `inv-notif-${inv.id}`,
              unread: true,
              time: inv.when,
              target: { type: 'invitations' as const },
              html: (
                <>
                  <strong>{inv.from}</strong> hat dich zu <strong>{inv.room}</strong> eingeladen.
                </>
              ),
            }));
          return [...inviteNotifs, ...prevNotifs];
        });
      }
    } catch (e) {
      toast(formatError(e));
    } finally {
      setLoadingRooms(false);
    }
  }, [auth.token, auth.isSessionReady, auth.userId, activeChannelId, toast]);

  useEffect(() => {
    if (auth.token && auth.isSessionReady) {
      reloadRooms();
    } else if (!auth.token) {
      setChannels([]);
      setInvitations(isMockModeEnabled() ? MOCK_ARCHIVED_INVITATIONS : []);
    }
  }, [auth.token, auth.isSessionReady, serverMode, reloadRooms]);

  const channel = (id: string) => channels.find((c) => c.id === id);
  const moduleOf = (c?: Channel) => modules.find((m) => m.id === c?.moduleId);
  const activeChannel: Channel = channel(activeChannelId) ??
    channels[0] ?? {
      id: '0',
      chatid: 0,
      rawName: 'Main Chat',
      name: 'Main Chat',
      icon: '💬',
      members: Math.max(1, profiles.length),
      messages: [],
    };

  // ── Load & Poll Messages (getmessages) for activeChannel ──
  const pollMessagesNow = useRef<() => Promise<void>>(async () => {});
  const activeChatId = activeChannel.chatid;

  useEffect(() => {
    if (!auth.token || !auth.isSessionReady) return;
    const targetChatId = activeChatId;
    const targetIdStr = String(targetChatId);
    let lastId = 0;
    let cancelled = false;

    const poll = async () => {
      if (!auth.token || !auth.isSessionReady) return;
      try {
        const res = await chatApi.getMessages(auth.token, targetChatId, lastId);
        if (cancelled) return;
        const rawMsgs = res.messages ?? [];
        if (rawMsgs.length > 0) {
          lastId = Math.max(lastId, ...rawMsgs.map((m) => Number(m.id)));
          const parsedMsgs = rawMsgs.map((m) =>
            parseChatMessage(m, auth.userId, auth.token ?? undefined),
          );
          setChannels((prev) =>
            prev.map((c) => {
              if (c.id !== targetIdStr) return c;
              const knownIds = new Set(c.messages.map((x) => x.id));
              const merged = [...c.messages, ...parsedMsgs.filter((x) => !knownIds.has(x.id))];
              return { ...c, messages: merged };
            }),
          );
        }
      } catch {
        // Ignore transient polling errors
      }
    };

    pollMessagesNow.current = poll;
    poll();

    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [auth.token, auth.isSessionReady, auth.userId, activeChatId]);

  const archivedChatId = channels.find((c) => c.archived)?.chatid;

  useEffect(() => {
    if (screen !== 'archive' || !auth.token || !auth.isSessionReady || archivedChatId === undefined) return;
    const archIdStr = String(archivedChatId);
    chatApi
      .getMessages(auth.token, archivedChatId, 0)
      .then((res) => {
        const parsed = (res.messages ?? []).map((m) =>
          parseChatMessage(m, auth.userId, auth.token ?? undefined),
        );
        setChannels((prev) =>
          prev.map((c) => (c.id === archIdStr ? { ...c, messages: parsed } : c)),
        );
      })
      .catch(() => {});
  }, [screen, auth.token, auth.isSessionReady, auth.userId, archivedChatId]);

  const markOb = (n: number) => setObDone((d) => (d.includes(n) ? d : [...d, n]));

  // ── Auth actions connected to chatApi ──
  const finishSplash = useCallback(() => {
    if (auth.token && auth.isSessionReady && auth.remember) {
      reset(onboarded ? 'chats' : 'onboarding');
    } else {
      reset('login');
    }
  }, [auth.token, auth.isSessionReady, auth.remember, onboarded]);

  const login = async (id: string, password: string, keep: boolean): Promise<string | null> => {
    const cleanId = (id.trim() || auth.userId || 'jaehit00').toLowerCase();
    const cleanPw = password;
    if (!cleanPw) {
      return 'Bitte Passwort eingeben.';
    }
    try {
      const res = await chatApi.login(cleanId, cleanPw);
      if (!res.token) {
        return 'Server hat kein gültiges Session-Token zurückgegeben.';
      }
      auth.setUserId(cleanId);
      auth.setToken(res.token, keep);

      chatApi
        .getProfiles(res.token)
        .then((profRes) => {
          const list = profRes.profiles ?? [];
          setProfiles(list);
          const me = list.find((p) => p.userid.toLowerCase() === cleanId);
          if (me?.fullname) setDisplayName(me.fullname);
          else if (me?.nickname) setDisplayName(me.nickname);
        })
        .catch(() => {});

      reset(onboarded ? 'chats' : 'onboarding', 'push');
      return null;
    } catch (err) {
      const msg = formatError(err);
      toast(msg);
      return msg;
    }
  };

  const register = async (
    id: string,
    nicknameInput: string,
    fullnameInput: string,
    password: string,
  ): Promise<string | null> => {
    const cleanId = id.trim().toLowerCase();
    const nick = (nicknameInput.trim() || cleanId).slice(0, 30);
    const full = (fullnameInput.trim() || nick).slice(0, 30);

    try {
      const res = await chatApi.register(cleanId, password, nick, full);
      if (!res.token) {
        return 'Server hat kein gültiges Session-Token zurückgegeben.';
      }
      auth.setUserId(cleanId);
      setDisplayName(full);
      setOnboarded(false);
      setObDone([]);
      auth.setToken(res.token, true);
      reset('onboarding', 'push');
      return null;
    } catch (err) {
      const msg = formatError(err);
      toast(msg);
      return msg;
    }
  };

  const logout = async () => {
    await auth.logout();
    reset('login', 'pop');
    toast('Abgemeldet');
  };

  // ── Messages & Attachments (postmessage) ──
  const sendMessage = async (chId: string, text: string) => {
    const target = channel(chId) ?? activeChannel;
    if (!auth.token || !text.trim() || target.archived) return;
    try {
      await chatApi.postMessage(auth.token, {
        chatid: target.chatid,
        text: text.trim(),
      });
      await pollMessagesNow.current();
    } catch (e) {
      toast(formatError(e));
    }
  };

  const attachFile = async (chId: string, selectedFile?: File) => {
    const target = channel(chId) ?? activeChannel;
    if (!auth.token || target.archived) return;

    try {
      if (selectedFile) {
        const base64 = await fileToBase64(selectedFile);
        const isImg = selectedFile.type.startsWith('image/');
        const sizeLabel = formatFileSize(selectedFile.size);
        const metaText = `[ATTACHMENT::${selectedFile.name}::${sizeLabel}::${isImg ? 'img' : 'pdf'}]`;

        await chatApi.postMessage(auth.token, {
          chatid: target.chatid,
          text: metaText,
          photo: isImg ? base64 : undefined,
          file: !isImg ? base64 : undefined,
        });
      } else {
        const n = target.messages.filter((m) => m.file && m.from === 'self').length + 1;
        const fname = `Notizen_${n}.pdf`;
        const fsize = `${120 + n * 37} KB`;
        const metaText = `[ATTACHMENT::${fname}::${fsize}::pdf]`;
        await chatApi.postMessage(auth.token, {
          chatid: target.chatid,
          text: metaText,
          file: 'data:application/pdf;base64,JVBERi0xLjQKJcfs...',
        });
      }
      await pollMessagesNow.current();
      toast('Datei hochgeladen');
    } catch (e) {
      toast(formatError(e));
    }
  };

  // ── Room, Module & Subgroup creation / joining / leaving connected to chatApi ──
  const openChannel = (chId: string, push = true) => {
    setActiveChannelId(chId);
    const c = channel(chId);
    if (push) navigate(c?.archived ? 'archive' : 'chat');
  };

  const openFile = (file: FileAtt, sharedBy: string, channelId: string) => {
    setOpenFile({ file, sharedBy, channelId });
    navigate('file');
  };

  const leaveChannel = async (chId: string) => {
    const target = channel(chId);
    if (!target || !auth.token) return;
    try {
      await chatApi.leaveChat(auth.token, target.chatid);
      setChannels((cs) => cs.filter((c) => c.id !== chId));
      toast(`${target.name} verlassen`);
      back();
      reloadRooms();
    } catch (e) {
      toast(formatError(e));
    }
  };

  const deleteChannel = async (chId: string) => {
    const target = channel(chId);
    if (!target || !auth.token) return;
    try {
      await chatApi.deleteChat(auth.token, target.chatid);
      setChannels((cs) => cs.filter((c) => c.id !== chId));
      toast(`${target.name} gelöscht`);
      back();
      reloadRooms();
    } catch (e) {
      toast(formatError(e));
    }
  };

  /**
   * Allows any user to create a brand-new Module (Course) on the server!
   * Creates the Module entry and immediately creates its `WS26:MOD:<Slug>:MAIN` room via `createchat`.
   */
  const createModule = async (
    shortName: string,
    fullName: string,
    codeInput: string,
    profInput: string,
    category: string,
  ): Promise<string | undefined> => {
    if (!auth.token) return undefined;
    const shortClean = shortName.trim().slice(0, 14);
    const fullClean = fullName.trim() || shortClean;
    const slug = slugifyName(shortClean);
    const words = shortClean.split(/\s+/).filter(Boolean);
    const abbr =
      words.length >= 2
        ? `${words[0]![0]}${words[1]![0]}`.toUpperCase()
        : shortClean.slice(0, 2).toUpperCase();

    const newMod: Module = {
      id: `mod_${slug.toLowerCase()}`,
      slug,
      abbr,
      short: shortClean,
      full: fullClean,
      code: codeInput.trim() || `MOD-${abbr}`,
      prof: profInput.trim() || displayName,
      participants: 1,
      category: category || CATEGORIES[0]!,
      joined: true,
    };

    const rawName = buildModuleMainRoomName(newMod);
    try {
      const res = await chatApi.createChat(auth.token, rawName, true);
      const newChatId = Number(res.chatid);
      const newId = String(newChatId);

      setModules((prev) => {
        const exists = prev.some((m) => m.id === newMod.id);
        return exists
          ? prev.map((m) => (m.id === newMod.id ? { ...m, joined: true } : m))
          : [...prev, newMod];
      });

      const mainChannel: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: 'Hauptkanal',
        icon: '💬',
        moduleId: newMod.id,
        members: 1,
        visibility: 'public',
        messages: [],
      };
      setChannels((cs) => [...cs.filter((c) => c.id !== newId), mainChannel]);
      setActiveChannelId(newId);
      setModuleModalOpen(false);
      markOb(1);
      toast(`Modul „${newMod.short}“ angelegt`);
      reloadRooms();
      return newId;
    } catch (e) {
      toast(formatError(e));
      return undefined;
    }
  };

  const createSubgroup = async (moduleId: string, name: string, type: string): Promise<string | undefined> => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || !auth.token) return undefined;
    const rawName = buildSubgroupRoomName(mod, name);
    try {
      const res = await chatApi.createChat(auth.token, rawName, true);
      const newChatId = Number(res.chatid);
      const newId = String(newChatId);
      const optimistic: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: name.trim(),
        icon: '💬',
        moduleId,
        members: 1,
        visibility: 'public',
        messages: [],
      };
      setChannels((cs) => [...cs.filter((c) => c.id !== newId), optimistic]);
      setActiveChannelId(newId);
      setSubgroupModal(null);
      markOb(2);
      toast(`${type} „${name.trim()}“ erstellt`);
      reloadRooms();
      return newId;
    } catch (e) {
      toast(formatError(e));
      return undefined;
    }
  };

  const createCustomGroup = async (name: string, type: string, invitees: string[]) => {
    if (!auth.token) return;
    const rawName = buildCustomGroupRoomName(name);
    const icon = type === 'Studiengruppe' ? '📖' : type.startsWith('AStA') ? '🏛️' : '🔧';
    try {
      const res = await chatApi.createChat(auth.token, rawName, true);
      const newChatId = Number(res.chatid);
      const newId = String(newChatId);
      const optimistic: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: name.trim(),
        icon,
        members: 1,
        visibility: 'public',
        messages: [],
      };
      setChannels((cs) => [...cs.filter((c) => c.id !== newId), optimistic]);
      setInviteMap((m) => ({
        ...m,
        [newId]: { pending: invitees, members: [{ id: 'self', role: 'Ersteller' }] },
      }));

      if (invitees.length > 0) {
        chatApi
          .getProfiles(auth.token)
          .then(async (profRes) => {
            const list = profRes.profiles ?? [];
            setProfiles(list);
            for (const targetUid of invitees) {
              const found = list.find(
                (p) => p.userid.toLowerCase() === targetUid.trim().toLowerCase(),
              );
              if (found && auth.token) {
                await chatApi.invite(auth.token, newChatId, found.hash).catch(() => {});
              }
            }
          })
          .catch(() => {});
      }

      setActiveChannelId(newId);
      replace('chat');
      toast(
        invitees.length
          ? `Gruppe erstellt · ${invitees.length} Einladung(en) gesendet`
          : 'Gruppe erstellt',
      );
      reloadRooms();
    } catch (e) {
      toast(formatError(e));
    }
  };

  const joinModule = async (id: string) => {
    const m = modules.find((x) => x.id === id);
    if (!m || !auth.token) return;

    setModules((ms) => ms.map((x) => (x.id === id ? { ...x, joined: true } : x)));

    const existingMain = channels.find(
      (c) => !c.archived && c.moduleId === id && c.name === 'Hauptkanal',
    );
    if (!existingMain) {
      const rawName = buildModuleMainRoomName(m);
      try {
        const res = await chatApi.createChat(auth.token, rawName, true);
        const newChatId = Number(res.chatid);
        const newId = String(newChatId);
        setChannels((cs) => [
          ...cs.filter((c) => c.id !== newId),
          {
            id: newId,
            chatid: newChatId,
            rawName,
            name: 'Hauptkanal',
            icon: '💬',
            moduleId: id,
            members: m.participants + 1,
            visibility: 'public',
            messages: [],
          },
        ]);
        setActiveChannelId(newId);
        reloadRooms();
      } catch (e) {
        toast(formatError(e));
      }
    }
    markOb(1);
    toast(`${m.full} beigetreten`);
  };

  const joinRoomById = async (targetChatId: number): Promise<boolean> => {
    if (!auth.token) return false;
    try {
      await chatApi.joinChat(auth.token, targetChatId);
      await reloadRooms();
      setActiveChannelId(String(targetChatId));
      toast(`Raum #${targetChatId} beigetreten`);
      return true;
    } catch (e) {
      toast(formatError(e));
      return false;
    }
  };

  // ── Members & Invitations (getprofiles, invite, getinvites, joinchat, rejectinvite) ──
  const inviteState = (chId: string): InviteState => {
    if (inviteMap[chId]) return inviteMap[chId];
    const ch = channel(chId);
    const dynamicSenders = Array.from(
      new Set(
        (ch?.messages ?? [])
          .map((m) => m.senderId)
          .filter(
            (uid): uid is string =>
              typeof uid === 'string' && uid.toLowerCase() !== auth.userId.toLowerCase(),
          ),
      ),
    );
    const defaultMembers: Member[] = [
      { id: 'self', role: 'Ersteller' },
      ...dynamicSenders.map((uid) => ({ id: uid, role: 'Mitglied' })),
    ];
    if (isMockModeEnabled() && defaultMembers.length === 1) {
      defaultMembers.push({ id: 'abcdit09', role: 'Mitglied' });
    }
    return {
      pending: isMockModeEnabled() ? ['abcdit44'] : [],
      members: defaultMembers,
    };
  };

  const updateInvite = (chId: string, fn: (s: InviteState) => InviteState) =>
    setInviteMap((m) => ({ ...m, [chId]: fn(m[chId] ?? inviteState(chId)) }));

  const sendInvite = async (chId: string, targetUser: string): Promise<string | null> => {
    const cleanUser = targetUser.trim().toLowerCase();
    const targetChannel = channel(chId) ?? activeChannel;
    if (!auth.token) return 'Nicht angemeldet';

    try {
      const profRes = await chatApi.getProfiles(auth.token);
      const list = profRes.profiles ?? [];
      setProfiles(list);
      const found = list.find((p) => p.userid.toLowerCase() === cleanUser);

      if (!found && !isMockModeEnabled()) {
        const msg = `Nutzer „${cleanUser}“ ist noch nicht auf dem Server registriert.`;
        toast(msg);
        return msg;
      }

      if (found) {
        await chatApi.invite(auth.token, targetChannel.chatid, found.hash);
      }

      updateInvite(chId, (s) => ({
        ...s,
        pending: s.pending.includes(cleanUser) ? s.pending : [...s.pending, cleanUser],
      }));
      markOb(3);
      toast(`Einladung an ${cleanUser} gesendet`);
      return null;
    } catch (e) {
      const errMsg = formatError(e);
      toast(errMsg);
      return errMsg;
    }
  };

  const withdrawInvite = (chId: string, user: string) => {
    updateInvite(chId, (s) => ({ ...s, pending: s.pending.filter((p) => p !== user) }));
    toast('Einladung zurückgezogen');
  };

  const removeMember = (chId: string, user: string) => {
    updateInvite(chId, (s) => ({ ...s, members: s.members.filter((p) => p.id !== user) }));
    toast(`${user} entfernt`);
  };

  const respondInvitation = async (id: string, accept: boolean) => {
    const inv = invitations.find((i) => i.id === id);
    if (!inv || !auth.token) return;

    setInvitations((is) =>
      is.map((i) =>
        i.id === id
          ? { ...i, status: accept ? 'accepted' : 'rejected', when: 'gerade eben' }
          : i,
      ),
    );

    try {
      if (accept) {
        await chatApi.joinChat(auth.token, inv.chatid);
        await reloadRooms();
        toast(`${inv.channelName} beigetreten`);
      } else {
        await chatApi.rejectInvite(auth.token, inv.chatid);
        toast('Einladung abgelehnt');
      }
    } catch (e) {
      toast(formatError(e));
    }
  };

  // ── Notifications ──
  const markAllRead = () => setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })));
  const openNotif = (n: Notif) => {
    setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    const t: NotifTarget = n.target;
    if (t.type === 'invitations') navigate('invitations');
    else if (t.type === 'archive') {
      const arch = channels.find((c) => c.archived);
      if (arch) openChannel(arch.id);
      else navigate('archive');
    } else if (t.type === 'catalog') navigate('catalog');
    else if (channel(t.channelId)) openChannel(t.channelId);
  };

  return {
    // Auth & Backend Mode
    ...auth,
    serverMode,
    setServerMode,
    mockMode,
    setMockMode,
    displayName,
    setDisplayName,
    onboarded,
    setOnboarded,
    obDone,
    markOb,
    finishSplash,
    login,
    register,
    logout,

    // Navigation & UI
    screen,
    stack,
    dir,
    navKey,
    navigate,
    replace,
    reset,
    back,
    tab,
    toastMsg,
    toast,

    // Rooms, Catalog & Groups
    modules,
    setModules,
    channels,
    setChannels,
    profiles,
    loadingRooms,
    reloadRooms,
    channel,
    moduleOf,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    openChannel,
    leaveChannel,
    deleteChannel,
    createModule,
    createSubgroup,
    createCustomGroup,
    joinModule,
    joinRoomById,

    // Messages & Attachments
    typing,
    setTyping,
    sendMessage,
    attachFile,
    openFile,
    openFileState,

    // Modals, Invites, Members & Notifications
    subgroupModal,
    setSubgroupModal,
    moduleModalOpen,
    setModuleModalOpen,
    inviteState,
    sendInvite,
    withdrawInvite,
    removeMember,
    invitations,
    respondInvitation,
    notifs,
    setNotifs,
    markAllRead,
    openNotif,
    settings,
    setSettings,
    collapsed,
    toggleCollapsed,
  };
}

export type AppContextType = ReturnType<typeof useAppState>;
const Ctx = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppState();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || 'MM';
