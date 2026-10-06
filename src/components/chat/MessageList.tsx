import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  userId: string;
}

export function MessageList({ messages, userId }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll to the newest message whenever the list grows.
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages.length]);

  if (messages.length === 0) {
    return <p className="flex-1 py-16 text-center text-xs text-slate-400">No messages yet.</p>;
  }

  return (
    <div className="flex-1 overflow-y-auto pr-2">
      <ul className="space-y-3">
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} isOwn={m.userid?.toLowerCase() === userId.toLowerCase()} />
        ))}
      </ul>
      <div ref={endRef} />
    </div>
  );
}
