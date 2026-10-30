import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  userId: string;
  token: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasActiveFilter?: boolean;
  onRetry: () => void;
}

export function MessageList({
  messages,
  userId,
  token,
  loading,
  refreshing,
  error,
  hasActiveFilter = false,
  onRetry,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll to the newest message whenever the list grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Initial loading state for getmessages
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12" aria-live="polite">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-xs font-medium text-slate-600">Lade Nachrichten (getmessages)…</p>
        <div className="w-full max-w-md space-y-2 px-4 pt-2">
          <div className="h-12 w-3/4 animate-pulse rounded-xl bg-slate-100" />
          <div className="ml-auto h-12 w-2/3 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-12 w-1/2 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  // Error state when no messages could be loaded yet
  if (error && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6" role="alert">
        <div className="w-full max-w-md space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-xs text-red-900">
          <div className="font-bold text-red-800">Nachrichten konnten nicht geladen werden (getmessages)</div>
          <p className="text-red-700">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={refreshing}
            className="btn-primary bg-red-600 text-xs hover:bg-red-700"
          >
            {refreshing ? 'Lade erneut…' : 'Erneut versuchen'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Non-blocking error banner if polling fails after messages were already loaded */}
      {error && (
        <div
          role="alert"
          className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          <span>
            <b>Fehler beim Aktualisieren (getmessages):</b> {error}
          </span>
          <button
            type="button"
            onClick={onRetry}
            disabled={refreshing}
            className="rounded border border-red-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {refreshing ? 'Lädt…' : 'Erneut versuchen'}
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-500">
            {hasActiveFilter
              ? 'Keine Nachrichten entsprechen dem ausgewählten Filter.'
              : 'Noch keine Nachrichten in diesem Chatraum.'}
          </p>
          {!hasActiveFilter && (
            <p className="text-[11px] text-slate-400">
              Schreibe die erste Nachricht oder klicke auf Aktualisieren.
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2">
          <ul className="space-y-3 py-1">
            {messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                isOwn={m.userid?.toLowerCase() === userId.toLowerCase()}
                token={token}
              />
            ))}
          </ul>
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
