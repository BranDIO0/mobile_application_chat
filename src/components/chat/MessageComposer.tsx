import { useState } from 'react';
import type { NewMessage } from '../../types';
import { fileToBase64 } from '../../utils/fileToBase64';

const CAMPUS_POSITION = '{lat: 48.739, lon: 9.307}'; // HS Esslingen

const EMPTY: NewMessage = { text: '', important: false };

interface MessageComposerProps {
  onSend: (message: NewMessage) => Promise<boolean>;
  sending?: boolean;
}

/** Input form for text + optional photo, file, position and "important" flag. */
export function MessageComposer({ onSend, sending = false }: MessageComposerProps) {
  const [message, setMessage] = useState<NewMessage>(EMPTY);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const attach = (key: 'photo' | 'file') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (key === 'photo') setPhotoName(file.name);
    if (key === 'file') setFileName(file.name);
    const encoded = await fileToBase64(file);
    setMessage((prev) => ({ ...prev, [key]: encoded }));
    e.target.value = ''; // allow selecting the same file again
  };

  const removePhoto = () => {
    setPhotoName(null);
    setMessage((prev) => ({ ...prev, photo: undefined }));
  };

  const removeFile = () => {
    setFileName(null);
    setMessage((prev) => ({ ...prev, file: undefined }));
  };

  const toggleLocation = () => {
    setMessage((prev) => ({ ...prev, position: prev.position ? undefined : CAMPUS_POSITION }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!message.text?.trim() && !message.photo && !message.file && !message.position) return;

    const ok = await onSend({ ...message, text: message.text?.trim() });
    if (ok) {
      setMessage(EMPTY);
      setPhotoName(null);
      setFileName(null);
    }
  };

  const hasAttachments = Boolean(message.photo || message.file || message.position);
  const canSend = !sending && Boolean(message.text?.trim() || message.photo || message.file || message.position);

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-slate-200 pt-2.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex cursor-pointer items-center gap-1.5 font-medium text-slate-700 select-none">
          <input
            type="checkbox"
            checked={!!message.important}
            disabled={sending}
            onChange={(e) => setMessage({ ...message, important: e.target.checked })}
            className="rounded border-slate-300"
          />
          <span>★ Wichtig</span>
        </label>

        <label className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100">
          {message.photo ? '✓ Foto (PNG)' : '+ Foto (PNG)'}
          <input type="file" accept="image/png" disabled={sending} onChange={attach('photo')} className="hidden" />
        </label>

        <label className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100">
          {fileName ? '✓ Datei' : '+ Datei'}
          <input type="file" disabled={sending} onChange={attach('file')} className="hidden" />
        </label>

        <button
          type="button"
          disabled={sending}
          onClick={toggleLocation}
          className={`rounded border px-2 py-1 font-medium ${
            message.position
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          {message.position ? '✓ Standort' : '+ Standort'}
        </button>
      </div>

      {/* Active attachment chips */}
      {hasAttachments && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {message.photo && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-800">
              <span>🖼 {photoName || 'Foto.png'}</span>
              <button
                type="button"
                onClick={removePhoto}
                disabled={sending}
                className="font-bold text-blue-600 hover:text-blue-900"
                aria-label="Foto entfernen"
              >
                ✕
              </button>
            </span>
          )}
          {message.file && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-800">
              <span>📎 {fileName || 'Datei'}</span>
              <button
                type="button"
                onClick={removeFile}
                disabled={sending}
                className="font-bold text-blue-600 hover:text-blue-900"
                aria-label="Datei entfernen"
              >
                ✕
              </button>
            </span>
          )}
          {message.position && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-800">
              <span>📍 {message.position}</span>
              <button
                type="button"
                onClick={toggleLocation}
                disabled={sending}
                className="font-bold text-blue-600 hover:text-blue-900"
                aria-label="Standort entfernen"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          value={message.text ?? ''}
          onChange={(e) => setMessage({ ...message, text: e.target.value })}
          placeholder="Nachricht eingeben…"
          disabled={sending}
          className="input flex-1"
        />
        <button type="submit" disabled={!canSend} className="btn-primary flex items-center gap-1.5">
          {sending && (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          <span>{sending ? 'Sende…' : 'Senden'}</span>
        </button>
      </div>
    </form>
  );
}
