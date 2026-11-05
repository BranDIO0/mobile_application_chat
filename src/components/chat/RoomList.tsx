import { useState } from 'react';
import type { ChatInvite, ChatRoom } from '../../types';

interface RoomListProps {
  rooms: ChatRoom[];
  invites: ChatInvite[];
  selectedId: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onSelect: (id: number) => void;
  onReload: () => void;
  onNewRoom: () => void;
  onJoinById: () => void;
  onShowUsers: () => void;
  onAcceptInvite: (chatId: number) => void;
  onDeclineInvite: (chatId: number) => void;
}

export function RoomList({
  rooms,
  invites,
  selectedId,
  loading,
  refreshing,
  error,
  onSelect,
  onReload,
  onNewRoom,
  onJoinById,
  onShowUsers,
  onAcceptInvite,
  onDeclineInvite,
}: RoomListProps) {
  const [search, setSearch] = useState('');

  // Main chat (id 0) always exists, even before getchats has answered.
  const allRooms: ChatRoom[] = rooms.some((r) => r.chatid === 0)
    ? rooms
    : [{ chatid: 0, chatname: 'Main Chat', visibility: 'public' }, ...rooms];

  const query = search.trim().toLowerCase();
  const filteredRooms = query
    ? allRooms.filter(
        (r) =>
          r.chatname.toLowerCase().includes(query) ||
          String(r.chatid).includes(query),
      )
    : allRooms;

  const isBusy = loading || refreshing;

  return (
    <aside className="card flex w-full flex-col gap-2.5 p-3 md:w-72 md:shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-bold text-slate-900">Chatliste</h2>
          <span
            className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600"
            title="Anzahl geladener Räume (getchats)"
          >
            {allRooms.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onReload}
            disabled={isBusy}
            title="Chatliste aktualisieren (getchats)"
            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <span className={isBusy ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
          </button>
          <button
            type="button"
            onClick={onNewRoom}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            + Raum
          </button>
        </div>
      </div>

      {/* Search filter */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Chats filtern (Name oder #ID)…"
        className="input py-1.5 text-xs"
      />

      {/* Error state for getchats */}
      {error && (
        <div
          role="alert"
          className="space-y-1.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
        >
          <div className="font-semibold">Fehler beim Laden der Chatliste</div>
          <p className="text-[11px] leading-relaxed text-red-700">{error}</p>
          <button
            type="button"
            onClick={onReload}
            disabled={isBusy}
            className="w-full rounded border border-red-300 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {isBusy ? 'Lade erneut…' : 'Erneut versuchen (getchats)'}
          </button>
        </div>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-xs">
          <div className="font-semibold text-blue-900">Offene Einladungen ({invites.length})</div>
          <ul className="space-y-1">
            {invites.map((inv) => (
              <li
                key={inv.chatid}
                className="flex items-center justify-between gap-1 rounded border border-blue-100 bg-white p-1.5"
              >
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-mono text-[11px] text-slate-500">#{inv.chatid}</span>{' '}
                  <span className="font-medium text-slate-800">{inv.chatname}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onAcceptInvite(inv.chatid)}
                    className="rounded bg-blue-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-blue-700"
                  >
                    Beitreten
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeclineInvite(inv.chatid)}
                    className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-700 hover:bg-slate-300"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading state for getchats */}
      {loading ? (
        <div className="flex-1 space-y-2 py-2" aria-live="polite">
          <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Lade Chatliste (getchats)…</span>
          </div>
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <ul className="flex-1 space-y-1 overflow-y-auto pr-0.5">
          {filteredRooms.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              Kein Chatraum für &quot;{search}&quot; gefunden.
            </li>
          ) : (
            filteredRooms.map((room) => {
              const isSelected = room.chatid === selectedId;
              return (
                <li key={room.chatid}>
                  <button
                    type="button"
                    onClick={() => onSelect(room.chatid)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-transparent bg-slate-50 text-slate-800 hover:border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-[11px] ${
                            isSelected ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          #{room.chatid}
                        </span>
                        <span className="truncate font-semibold">{room.chatname}</span>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        isSelected
                          ? 'bg-blue-700 text-blue-100'
                          : room.visibility === 'private'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {room.visibility === 'private' ? 'Privat' : 'Öffentlich'}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {/* Footer actions */}
      <div className="grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-2">
        <button
          type="button"
          onClick={onJoinById}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          # Raum beitreten
        </button>
        <button
          type="button"
          onClick={onShowUsers}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          Nutzer ({/* profiles */}Liste)
        </button>
      </div>
    </aside>
  );
}
