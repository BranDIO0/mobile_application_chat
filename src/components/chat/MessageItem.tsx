import { useState } from 'react';
import { chatApi } from '../../api/chatApi';
import type { ChatMessage } from '../../types';

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  token: string;
}

export function MessageItem({ message: m, isOwn, token }: MessageItemProps) {
  const [photoError, setPhotoError] = useState(false);

  const bubbleStyle = m.important
    ? 'border border-amber-300 bg-amber-50 text-amber-950'
    : isOwn
      ? 'bg-blue-600 text-white'
      : 'border border-slate-200 bg-slate-50 text-slate-800';

  const displayName = m.usernick || m.userfullname || m.userid;

  return (
    <li className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5 px-0.5 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">{displayName}</span>
        {m.usernick && m.userid && (
          <span className="rounded bg-slate-100 px-1 py-0.2 font-mono text-[10px] text-slate-500">
            {m.userid}
          </span>
        )}
        <span>·</span>
        <span>{m.time}</span>
        <span className="font-mono text-[10px] text-slate-400">#{m.id}</span>
      </div>

      <div className={`max-w-lg space-y-1.5 rounded-xl px-3.5 py-2.5 text-xs shadow-2xs ${bubbleStyle}`}>
        {m.important && (
          <div className="inline-flex items-center gap-1 rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-900 uppercase">
            ★ Wichtig
          </div>
        )}

        {m.text && <p className="leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>}

        {m.photoid && (
          <div className="pt-1">
            {photoError ? (
              <div className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
                Bild ({m.photoid}) konnte nicht geladen werden.
              </div>
            ) : (
              <a href={chatApi.photoUrl(m.photoid, token)} target="_blank" rel="noreferrer">
                <img
                  src={chatApi.photoUrl(m.photoid, token)}
                  alt="Angehängtes Foto"
                  onError={() => setPhotoError(true)}
                  className="max-h-52 rounded-lg border border-black/10 object-contain"
                />
              </a>
            )}
          </div>
        )}

        {m.fileid && (
          <a
            href={chatApi.fileUrl(m.fileid, token)}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold underline ${
              isOwn && !m.important
                ? 'border-blue-400 bg-blue-700/60 text-white hover:bg-blue-700'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
            }`}
          >
            <span>📎 Datei herunterladen</span>
          </a>
        )}

        {m.position && (
          <div className={`text-[11px] ${isOwn && !m.important ? 'text-blue-100' : 'text-slate-500'}`}>
            📍 Standort: <span className="font-mono">{m.position}</span>
          </div>
        )}
      </div>
    </li>
  );
}
