import { useState } from 'react';
import type { NewMessage } from '../../types';
import { fileToBase64 } from '../../utils/fileToBase64';

const CAMPUS_POSITION = '{lat: 48.739, lon: 9.307}'; // HS Esslingen

const EMPTY: NewMessage = { text: '', important: false };

/** Input form for text + optional photo, file, position and "important" flag. */
export function MessageComposer({ onSend }: { onSend: (message: NewMessage) => Promise<void> }) {
  const [message, setMessage] = useState<NewMessage>(EMPTY);
  const [fileName, setFileName] = useState<string | null>(null);

  const attach = (key: 'photo' | 'file') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (key === 'file') setFileName(file.name);
    setMessage({ ...message, [key]: await fileToBase64(file) });
    e.target.value = ''; // allow selecting the same file again
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.text?.trim() && !message.photo && !message.file) return;
    await onSend({ ...message, text: message.text?.trim() });
    setMessage(EMPTY);
    setFileName(null);
  };

  return (
    <form onSubmit={submit} className="space-y-2 border-t pt-2">
      <div className="flex flex-wrap gap-3 text-xs text-blue-600">
        <label className="flex items-center gap-1 text-slate-600">
          <input
            type="checkbox"
            checked={!!message.important}
            onChange={(e) => setMessage({ ...message, important: e.target.checked })}
          />
          Important
        </label>
        <label className="cursor-pointer hover:underline">
          {message.photo ? '✓ Photo' : '+ Photo (PNG)'}
          <input type="file" accept="image/png" onChange={attach('photo')} className="hidden" />
        </label>
        <label className="cursor-pointer hover:underline">
          {fileName ? `✓ ${fileName}` : '+ File'}
          <input type="file" onChange={attach('file')} className="hidden" />
        </label>
        <button
          type="button"
          onClick={() => setMessage({ ...message, position: message.position ? undefined : CAMPUS_POSITION })}
          className="hover:underline"
        >
          {message.position ? '✓ Campus location' : '+ Location'}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={message.text}
          onChange={(e) => setMessage({ ...message, text: e.target.value })}
          placeholder="Write a message…"
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">
          Send
        </button>
      </div>
    </form>
  );
}
