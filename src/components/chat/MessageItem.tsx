import { chatApi } from '../../api/chatApi';
import type { ChatMessage } from '../../types';

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
}

export function MessageItem({ message: m, isOwn }: MessageItemProps) {
  const bubbleStyle = m.important
    ? 'border border-amber-300 bg-amber-100 text-amber-900'
    : isOwn
      ? 'bg-blue-600 text-white'
      : 'border bg-slate-100';

  return (
    <li className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <span className="mb-0.5 text-[10px] text-slate-400">
        <b className="text-slate-600">{m.usernick || m.userid}</b> · {m.time}
      </span>

      <div className={`max-w-md space-y-1.5 rounded-lg p-3 text-xs ${bubbleStyle}`}>
        {m.important && <div className="text-[10px] font-bold uppercase">★ Important</div>}
        {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
        {m.photoid && <img src={chatApi.photoUrl(m.photoid)} alt="Attached photo" className="max-h-40 rounded" />}
        {m.fileid && (
          <a href={chatApi.fileUrl(m.fileid)} target="_blank" rel="noreferrer" className="block font-semibold underline">
            📎 Download file
          </a>
        )}
        {m.position && <div className="text-[10px] opacity-80">📍 {m.position}</div>}
      </div>
    </li>
  );
}
