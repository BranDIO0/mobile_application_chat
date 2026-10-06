import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { ChatMessage, ChatRoom, UserProfile } from '../types';

interface ChatViewProps {
  token: string | null;
  userId: string;
  onOpenTest: () => void;
}

export function ChatView({ token, userId, onOpenTest }: ChatViewProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  // Form states
  const [text, setText] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);

  // New room modal
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showProfiles, setShowProfiles] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load rooms
  const loadRooms = async () => {
    if (!token) return;
    try {
      const res = await api.getChats(token);
      if (res.chats) setRooms(res.chats);
    } catch (err) {
      console.error(err);
    }
  };

  // Load messages
  const loadMessages = async (chatId: number) => {
    if (!token) return;
    try {
      const res = await api.getMessages(token, chatId, 0);
      if (res.messages) setMessages(res.messages);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      loadRooms();
      loadMessages(selectedChatId);
    }
  }, [token, selectedChatId]);

  // Polling loop
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      loadMessages(selectedChatId);
    }, 3000);
    return () => clearInterval(interval);
  }, [token, selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || (!text.trim() && !photoBase64 && !fileBase64)) return;

    try {
      await api.postMessage(token, {
        text: text.trim(),
        chatid: selectedChatId,
        photo: photoBase64 || undefined,
        file: fileBase64 || undefined,
        position: position || undefined,
        important: isImportant,
      });

      setText('');
      setPhotoBase64(null);
      setFileBase64(null);
      setFileName(null);
      setPosition(null);
      setIsImportant(false);
      loadMessages(selectedChatId);
    } catch (err: any) {
      alert(err.message || 'Fehler beim Senden');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newRoomName.trim()) return;
    try {
      const res = await api.createChat(token, newRoomName.trim(), true);
      setNewRoomName('');
      setShowNewRoom(false);
      await loadRooms();
      if (res.chatid !== undefined) setSelectedChatId(res.chatid);
    } catch (err: any) {
      alert(err.message || 'Fehler beim Erstellen');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoBase64(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileBase64(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const loadProfilesList = async () => {
    if (!token) return;
    try {
      const res = await api.getProfiles(token);
      if (res.profiles) setProfiles(res.profiles);
      setShowProfiles(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (!token) {
    return (
      <div className="card max-w-md mx-auto my-12 text-center space-y-3">
        <h3 className="font-bold text-slate-800 text-base">Anmeldung erforderlich</h3>
        <p className="text-xs text-slate-600">Bitte generiere zuerst ein Token auf der Test-Seite.</p>
        <button onClick={onOpenTest} className="btn-primary text-xs">
          Zur Token-Erstellung
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto h-[75vh] flex gap-4">
      {/* Sidebar */}
      <div className="w-64 card flex flex-col p-3 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b">
          <span className="font-bold text-slate-800 text-sm">Räume</span>
          <div className="flex gap-1">
            <button onClick={loadProfilesList} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-700">
              User
            </button>
            <button onClick={() => setShowNewRoom(true)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
              + Raum
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          <button
            onClick={() => setSelectedChatId(0)}
            className={`w-full text-left p-2 rounded text-xs font-medium transition-colors ${
              selectedChatId === 0 ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            #0 Haupt-Chat
          </button>
          {rooms.filter((r) => r.chatid !== 0).map((r) => (
            <button
              key={r.chatid}
              onClick={() => setSelectedChatId(r.chatid)}
              className={`w-full text-left p-2 rounded text-xs font-medium transition-colors ${
                selectedChatId === r.chatid ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              #{r.chatid} {r.chatname}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 card flex flex-col p-4 justify-between space-y-3">
        {/* Header */}
        <div className="pb-2 border-b flex items-center justify-between">
          <span className="font-bold text-slate-800 text-sm">
            Raum #{selectedChatId}
          </span>
          <span className="text-xs text-slate-500 font-mono">User: {userId}</span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((m) => {
            const isMe = m.userid?.toLowerCase() === userId?.toLowerCase();
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="text-[10px] text-slate-400 mb-0.5">
                  <span className="font-semibold text-slate-600">{m.usernick || m.userid}</span> • {m.time}
                </div>

                <div
                  className={`p-3 rounded-lg text-xs max-w-md space-y-1.5 ${
                    m.important
                      ? 'bg-amber-100 border border-amber-300 text-amber-900 font-medium'
                      : isMe
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 border text-slate-800'
                  }`}
                >
                  {m.important && <div className="text-[10px] font-bold uppercase text-amber-700">★ Wichtig</div>}
                  {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}

                  {m.photoid && (
                    <img src={api.getPhotoUrl(m.photoid)} alt="Foto" className="max-h-40 rounded border border-slate-300" />
                  )}

                  {m.fileid && (
                    <a href={api.getFileUrl(m.fileid)} target="_blank" rel="noreferrer" className="underline font-semibold block text-[11px]">
                      📎 Datei Herunterladen
                    </a>
                  )}

                  {m.position && <div className="text-[10px] opacity-80">📍 {m.position}</div>}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Post Form */}
        <form onSubmit={handleSend} className="space-y-2 pt-2 border-t">
          {/* Options */}
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} />
              <span>Wichtig</span>
            </label>

            <label className="cursor-pointer text-blue-600 font-medium hover:underline">
              <span>+ Foto</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>

            <label className="cursor-pointer text-blue-600 font-medium hover:underline">
              <span>+ Datei</span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => setPosition(position ? null : '{lat: 48.739, lon: 9.307}')}
              className={`font-medium ${position ? 'text-rose-600 font-bold' : 'text-blue-600 hover:underline'}`}
            >
              {position ? '📍 Campus angehängt' : '+ Standort'}
            </button>
          </div>

          {(photoBase64 || fileName) && (
            <div className="text-xs text-slate-500 bg-slate-50 p-1.5 rounded flex gap-3">
              {photoBase64 && <span>Foto bereit</span>}
              {fileName && <span>Datei: {fileName}</span>}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nachricht schreiben..."
              className="input flex-1 text-xs"
            />
            <button type="submit" className="btn-primary text-xs py-2 px-5">
              Senden
            </button>
          </div>
        </form>
      </div>

      {/* New Room Modal */}
      {showNewRoom && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Neuen Raum erstellen</h3>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Raum-Name (z.B. Gruppe 1)"
                required
                minLength={2}
                className="input text-xs"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewRoom(false)} className="btn-secondary text-xs">
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profiles Modal */}
      {showProfiles && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-5 max-w-md w-full space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-800">Registrierte HSE User</h3>
              <button onClick={() => setShowProfiles(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {profiles.map((p) => (
                <div key={p.userid} className="p-2 bg-slate-50 rounded border flex justify-between">
                  <div>
                    <div className="font-bold text-slate-800">{p.nickname}</div>
                    <div className="text-slate-500">{p.fullname}</div>
                  </div>
                  <div className="font-mono text-blue-600">{p.userid}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
