import type { ChatRoom } from '../../types';

interface RoomListProps {
  rooms: ChatRoom[];
  selectedId: number;
  onSelect: (id: number) => void;
  onNewRoom: () => void;
  onShowUsers: () => void;
}

export function RoomList({ rooms, selectedId, onSelect, onNewRoom, onShowUsers }: RoomListProps) {
  // The main chat (id 0) always exists, even before getchats has answered.
  const allRooms = rooms.some((r) => r.chatid === 0)
    ? rooms
    : [{ chatid: 0, chatname: 'Main Chat', visibility: 'public' as const }, ...rooms];

  return (
    <aside className="card flex w-56 flex-col gap-2 p-3">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="text-sm font-bold">Rooms</span>
        <div className="flex gap-1">
          <button onClick={onShowUsers} className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200">
            Users
          </button>
          <button onClick={onNewRoom} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">
            + Room
          </button>
        </div>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto">
        {allRooms.map((room) => (
          <li key={room.chatid}>
            <button
              onClick={() => onSelect(room.chatid)}
              className={`w-full rounded p-2 text-left text-xs font-medium ${
                room.chatid === selectedId ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
              }`}
            >
              #{room.chatid} {room.chatname}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
