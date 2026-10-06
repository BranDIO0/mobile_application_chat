import { useState } from 'react';
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

export function ChatPage({ token, userId }: ChatPageProps) {
  const [chatId, setChatId] = useState(0);
  const { rooms, messages, error, clearError, send, createRoom } = useChat(token, chatId);

  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [profiles, setProfiles] = useState<UserProfile[] | null>(null);

  const submitNewRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await createRoom(newRoomName.trim());
    setNewRoomOpen(false);
    setNewRoomName('');
    if (id !== undefined) setChatId(id);
  };

  const showUsers = async () => {
    const res = await chatApi.getProfiles(token);
    setProfiles(res.profiles ?? []);
  };

  return (
    <div className="mx-auto flex h-[75vh] max-w-5xl gap-4">
      <RoomList
        rooms={rooms}
        selectedId={chatId}
        onSelect={setChatId}
        onNewRoom={() => setNewRoomOpen(true)}
        onShowUsers={showUsers}
      />

      <section className="card flex flex-1 flex-col gap-3">
        <h2 className="border-b pb-2 text-sm font-bold">Room #{chatId}</h2>
        {error && (
          <p className="flex justify-between rounded bg-red-50 p-2 text-xs text-red-700">
            {error}
            <button onClick={clearError}>✕</button>
          </p>
        )}
        <MessageList messages={messages} userId={userId} />
        <MessageComposer onSend={send} />
      </section>

      {newRoomOpen && (
        <Modal title="Create room" onClose={() => setNewRoomOpen(false)}>
          <form onSubmit={submitNewRoom} className="space-y-3">
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name (min. 2 characters)"
              minLength={2}
              required
              className="input"
            />
            <button type="submit" className="btn-primary w-full">
              Create
            </button>
          </form>
        </Modal>
      )}

      {profiles && (
        <Modal title="Registered users" onClose={() => setProfiles(null)}>
          <ul className="max-h-60 space-y-2 overflow-y-auto text-xs">
            {profiles.map((p) => (
              <li key={p.hash} className="flex justify-between rounded border bg-slate-50 p-2">
                <span>
                  <b>{p.nickname}</b> <span className="text-slate-500">{p.fullname}</span>
                </span>
                <span className="font-mono text-blue-600">{p.userid}</span>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}
