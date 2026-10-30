import { useState } from 'react';
import { formatError } from '../api/client';
import { chatApi } from '../api/chatApi';
import { useChat } from '../hooks/useChat';
import type { UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { RoomList } from '../components/chat/RoomList';
import { MessageList } from '../components/chat/MessageList';
import { MessageComposer } from '../components/chat/MessageComposer';

interface ChatPageProps {
  token: string;
  userId: string;
}

type MessageFilter = 'all' | 'important' | 'attachments';

export function ChatPage({ token, userId }: ChatPageProps) {
  const [chatId, setChatId] = useState(0);
  const [mobileView, setMobileView] = useState<'rooms' | 'chat'>('chat');

  const {
    rooms,
    invites,
    loadingRooms,
    refreshingRooms,
    roomsError,
    reloadRooms,
    messages,
    loadingMessages,
    refreshingMessages,
    messagesError,
    lastSyncedAt,
    reloadMessages,
    sending,
    error,
    clearError,
    send,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    declineInvite,
  } = useChat(token, chatId);

  // Message filter & search
  const [filter, setFilter] = useState<MessageFilter>('all');
  const [messageQuery, setMessageQuery] = useState('');

  // Create room modal state
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPublic, setNewRoomPublic] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Join room by ID modal state
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinIdInput, setJoinIdInput] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);

  // Profiles & invite modal state
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [invitingHash, setInvitingHash] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  // Room action loading state
  const [roomActionBusy, setRoomActionBusy] = useState(false);

  const activeRoom = rooms.find((r) => r.chatid === chatId) ?? {
    chatid: chatId,
    chatname: chatId === 0 ? 'Main Chat' : `Raum #${chatId}`,
    visibility: 'public' as const,
  };

  const selectRoom = (id: number) => {
    setChatId(id);
    setMobileView('chat');
    clearError();
  };

  const submitNewRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || creatingRoom) return;
    setCreatingRoom(true);
    try {
      const id = await createRoom(newRoomName.trim(), newRoomPublic);
      if (id !== undefined) {
        setNewRoomOpen(false);
        setNewRoomName('');
        setNewRoomPublic(true);
        selectRoom(id);
      }
    } finally {
      setCreatingRoom(false);
    }
  };

  const submitJoinById = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = Number(joinIdInput.trim());
    if (Number.isNaN(targetId) || joiningRoom) return;
    setJoiningRoom(true);
    try {
      const ok = await joinRoom(targetId);
      if (ok) {
        setJoinModalOpen(false);
        setJoinIdInput('');
        selectRoom(targetId);
      }
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleAcceptInvite = async (targetChatId: number) => {
    const ok = await joinRoom(targetChatId);
    if (ok) selectRoom(targetChatId);
  };

  const handleLeaveCurrentRoom = async () => {
    if (chatId === 0 || roomActionBusy) return;
    setRoomActionBusy(true);
    try {
      const ok = await leaveRoom(chatId);
      if (ok) setChatId(0);
    } finally {
      setRoomActionBusy(false);
    }
  };

  const handleDeleteCurrentRoom = async () => {
    if (chatId === 0 || roomActionBusy) return;
    setRoomActionBusy(true);
    try {
      const ok = await deleteRoom(chatId);
      if (ok) setChatId(0);
    } finally {
      setRoomActionBusy(false);
    }
  };

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    setProfilesError(null);
    try {
      const res = await chatApi.getProfiles(token);
      setProfiles(res.profiles ?? []);
    } catch (e) {
      setProfilesError(formatError(e));
    } finally {
      setLoadingProfiles(false);
    }
  };

  const openUsersModal = () => {
    setUsersModalOpen(true);
    setInviteFeedback(null);
    loadProfiles();
  };

  const handleInviteUser = async (profile: UserProfile) => {
    if (chatId === 0 || invitingHash) return;
    setInvitingHash(profile.hash);
    setInviteFeedback(null);
    setProfilesError(null);
    try {
      await chatApi.invite(token, chatId, profile.hash);
      setInviteFeedback(`${profile.nickname} (${profile.userid}) wurde in #${chatId} eingeladen.`);
    } catch (e) {
      setProfilesError(formatError(e));
    } finally {
      setInvitingHash(null);
    }
  };

  // Apply message filters
  const filteredMessages = messages.filter((m) => {
    if (filter === 'important' && !m.important) return false;
    if (filter === 'attachments' && !m.photoid && !m.fileid) return false;
    if (messageQuery.trim()) {
      const q = messageQuery.trim().toLowerCase();
      const inText = m.text?.toLowerCase().includes(q);
      const inSender =
        m.userid?.toLowerCase().includes(q) || m.usernick?.toLowerCase().includes(q);
      if (!inText && !inSender) return false;
    }
    return true;
  });

  const hasActiveFilter = filter !== 'all' || Boolean(messageQuery.trim());
  const isMessagesBusy = loadingMessages || refreshingMessages;

  const filteredProfiles = userSearch.trim()
    ? profiles.filter((p) => {
        const q = userSearch.trim().toLowerCase();
        return (
          p.userid.toLowerCase().includes(q) ||
          p.nickname.toLowerCase().includes(q) ||
          p.fullname.toLowerCase().includes(q)
        );
      })
    : profiles;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3">
      {/* Mobile switcher between Chatliste and active Chat */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-1.5 text-xs md:hidden">
        <button
          type="button"
          onClick={() => setMobileView('rooms')}
          className={`flex-1 rounded-md py-1.5 font-semibold ${
            mobileView === 'rooms' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Chatliste ({rooms.length || 1})
        </button>
        <button
          type="button"
          onClick={() => setMobileView('chat')}
          className={`flex-1 rounded-md py-1.5 font-semibold ${
            mobileView === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}
        >
          Aktiver Chat: #{chatId} {activeRoom.chatname}
        </button>
      </div>

      <div className="flex h-[calc(100vh-10rem)] min-h-[520px] gap-4">
        {/* Left sidebar: Chatliste (getchats) */}
        <div className={`${mobileView === 'rooms' ? 'flex w-full' : 'hidden'} md:flex md:w-auto`}>
          <RoomList
            rooms={rooms}
            invites={invites}
            selectedId={chatId}
            loading={loadingRooms}
            refreshing={refreshingRooms}
            error={roomsError}
            onSelect={selectRoom}
            onReload={reloadRooms}
            onNewRoom={() => setNewRoomOpen(true)}
            onJoinById={() => setJoinModalOpen(true)}
            onShowUsers={openUsersModal}
            onAcceptInvite={handleAcceptInvite}
            onDeclineInvite={declineInvite}
          />
        </div>

        {/* Right panel: Active Chat (getmessages & postmessage) */}
        <section
          className={`card flex flex-1 flex-col gap-2.5 overflow-hidden p-4 ${
            mobileView === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Room Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                #{chatId}
              </span>
              <h2 className="text-sm font-bold text-slate-900">{activeRoom.chatname}</h2>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  activeRoom.visibility === 'private'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {activeRoom.visibility === 'private' ? 'Privat' : 'Öffentlich'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] text-slate-400">
                {isMessagesBusy
                  ? 'Synchronisiere…'
                  : lastSyncedAt
                    ? `Stand: ${lastSyncedAt} (${messages.length} Nachr.)`
                    : `${messages.length} Nachr.`}
              </span>

              <button
                type="button"
                onClick={reloadMessages}
                disabled={isMessagesBusy}
                title="Nachrichten jetzt abrufen (getmessages)"
                className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <span className={isMessagesBusy ? 'inline-block animate-spin' : 'inline-block'}>↻</span>{' '}
                Aktualisieren
              </button>

              {chatId !== 0 && (
                <>
                  <button
                    type="button"
                    onClick={openUsersModal}
                    className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    + Einladen
                  </button>
                  <button
                    type="button"
                    onClick={handleLeaveCurrentRoom}
                    disabled={roomActionBusy}
                    className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Verlassen
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCurrentRoom}
                    disabled={roomActionBusy}
                    className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Löschen
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Filter & Search bar for messages */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: `Alle (${messages.length})` },
                  {
                    id: 'important',
                    label: `★ Wichtig (${messages.filter((m) => m.important).length})`,
                  },
                  {
                    id: 'attachments',
                    label: `📎 Dateien/Fotos (${messages.filter((m) => m.photoid || m.fileid).length})`,
                  },
                ] as { id: MessageFilter; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    filter === item.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={messageQuery}
              onChange={(e) => setMessageQuery(e.target.value)}
              placeholder="Im Verlauf suchen…"
              className="input w-full py-1 text-xs sm:w-52"
            />
          </div>

          {/* Action / Send Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
            >
              <span>
                <b>Fehler:</b> {error}
              </span>
              <button
                type="button"
                onClick={clearError}
                className="font-bold text-red-600 hover:text-red-900"
                aria-label="Fehlermeldung schließen"
              >
                ✕
              </button>
            </div>
          )}

          {/* Messages Stream (getmessages) */}
          <MessageList
            messages={filteredMessages}
            userId={userId}
            token={token}
            loading={loadingMessages}
            refreshing={refreshingMessages}
            error={messagesError}
            hasActiveFilter={hasActiveFilter}
            onRetry={reloadMessages}
          />

          {/* Message Composer (postmessage) */}
          <MessageComposer onSend={send} sending={sending} />
        </section>
      </div>

      {/* Modal: Create new room (createchat) */}
      {newRoomOpen && (
        <Modal title="Neuen Chatraum erstellen" onClose={() => setNewRoomOpen(false)}>
          <form onSubmit={submitNewRoom} className="space-y-3 text-xs">
            <div>
              <label className="mb-1 block font-medium text-slate-700">Raumname (2–30 Zeichen)</label>
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="z. B. Mobile UI Lerngruppe"
                minLength={2}
                maxLength={30}
                required
                disabled={creatingRoom}
                className="input"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={newRoomPublic}
                disabled={creatingRoom}
                onChange={(e) => setNewRoomPublic(e.target.checked)}
              />
              <span>Öffentlicher Raum (für andere per Raum-ID beitretbar)</span>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNewRoomOpen(false)}
                disabled={creatingRoom}
                className="btn-secondary text-xs"
              >
                Abbrechen
              </button>
              <button type="submit" disabled={creatingRoom} className="btn-primary text-xs">
                {creatingRoom ? 'Erstelle Raum…' : 'Raum anlegen'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Join room by ID (joinchat) */}
      {joinModalOpen && (
        <Modal title="Chatraum per ID beitreten" onClose={() => setJoinModalOpen(false)}>
          <form onSubmit={submitJoinById} className="space-y-3 text-xs">
            <div>
              <label className="mb-1 block font-medium text-slate-700">Chat-ID</label>
              <input
                type="number"
                min={0}
                value={joinIdInput}
                onChange={(e) => setJoinIdInput(e.target.value)}
                placeholder="z. B. 12"
                required
                disabled={joiningRoom}
                className="input font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setJoinModalOpen(false)}
                disabled={joiningRoom}
                className="btn-secondary text-xs"
              >
                Abbrechen
              </button>
              <button type="submit" disabled={joiningRoom} className="btn-primary text-xs">
                {joiningRoom ? 'Trete bei…' : 'Beitreten'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Users & Invite (getprofiles & invite) */}
      {usersModalOpen && (
        <Modal
          title={chatId !== 0 ? `Nutzerverzeichnis & Einladen in #${chatId}` : 'Registrierte Nutzer (getprofiles)'}
          onClose={() => setUsersModalOpen(false)}
        >
          <div className="space-y-3 text-xs">
            <div className="flex gap-2">
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Nutzer suchen (Name oder Kürzel)…"
                className="input py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={loadProfiles}
                disabled={loadingProfiles}
                className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
              >
                {loadingProfiles ? '…' : '↻'}
              </button>
            </div>

            {inviteFeedback && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">
                ✓ {inviteFeedback}
              </div>
            )}

            {profilesError && (
              <div
                role="alert"
                className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800"
              >
                <div>{profilesError}</div>
                <button
                  type="button"
                  onClick={loadProfiles}
                  disabled={loadingProfiles}
                  className="rounded border border-red-300 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                >
                  Erneut versuchen
                </button>
              </div>
            )}

            {loadingProfiles ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span>Lade Nutzerprofile (getprofiles)…</span>
              </div>
            ) : (
              <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {filteredProfiles.length === 0 ? (
                  <li className="py-6 text-center text-slate-400">Keine passenden Nutzer gefunden.</li>
                ) : (
                  filteredProfiles.map((p) => (
                    <li
                      key={p.hash}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-800">
                          {p.nickname}{' '}
                          <span className="font-normal text-slate-500">({p.fullname})</span>
                        </div>
                        <div className="font-mono text-[11px] text-blue-600">{p.userid}</div>
                      </div>
                      {chatId !== 0 && p.userid.toLowerCase() !== userId.toLowerCase() && (
                        <button
                          type="button"
                          onClick={() => handleInviteUser(p)}
                          disabled={invitingHash === p.hash}
                          className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {invitingHash === p.hash ? 'Lädt…' : 'Einladen'}
                        </button>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
