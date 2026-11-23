import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  BatteryFull,
  Bell,
  ChevronLeft,
  FileText,
  Image,
  LibraryBig,
  Mail,
  MessagesCircle,
  Paperclip,
  SendHorizontal,
  Signal,
  Wifi,
} from 'lucide-react';
import type { Channel, ScreenId } from '../data/catalog';
import { useApp } from '../context/AppContext';
import { detectImportantMessage } from '../utils/importantDetector';

export const LOGO_SRC = '/assets/hey-logo.png';

export function StatusBar() {
  return (
    <div className="sbar">
      <span>9:41</span>
      <span className="sbar-icons" aria-hidden>
        <Signal size={16} strokeWidth={2.6} />
        <Wifi size={16} strokeWidth={2.6} />
        <BatteryFull size={22} strokeWidth={2} />
      </span>
    </div>
  );
}

export function BackBtn({ onClick, icon }: { onClick?: () => void; icon?: ReactNode }) {
  const { back } = useApp();
  return (
    <button
      className="icon-btn"
      aria-label="Zurück zum vorherigen Bildschirm"
      onClick={onClick ?? back}
    >
      {icon ?? <ChevronLeft size={26} strokeWidth={2.2} />}
    </button>
  );
}

/** Large title header used on tab-root screens (matches the "Chats" wireframe). */
export function MainHeader({ title }: { title: string }) {
  const { navigate, displayName, stack } = useApp();
  return (
    <>
      <StatusBar />
      <div className="main-header">
        {stack.length > 1 && <BackBtn />}
        <h1>{title}</h1>
        <button
          className="avatar"
          aria-label={`Profil von ${displayName.trim()}`}
          onClick={() => navigate('profile')}
        >
          {displayName.trim()[0]?.toUpperCase() ?? 'A'}
        </button>
      </div>
    </>
  );
}

export function SubHeader({
  title,
  sub,
  back = true,
  backIcon,
  children,
}: {
  title: ReactNode;
  sub?: ReactNode;
  back?: boolean;
  backIcon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <StatusBar />
      <div className="sub-header" style={back ? undefined : { paddingLeft: 18 }}>
        {back && <BackBtn icon={backIcon} />}
        <div className="titles">
          <div className="title">{title}</div>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {children}
      </div>
    </>
  );
}

/** Makes a non-button element keyboard- and click-accessible. */
export function clickable(onClick: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
  };
}

const TABS = [
  { id: 'chats', Icon: MessagesCircle, label: 'Chats', shortLabel: 'Chats' },
  { id: 'catalog', Icon: LibraryBig, label: 'Modulkatalog', shortLabel: 'Katalog' },
  { id: 'invitations', Icon: Mail, label: 'Einladungen', shortLabel: 'Einladungen' },
  { id: 'notifications', Icon: Bell, label: 'Benachrichtigungen', shortLabel: 'Infos' },
] as const satisfies readonly { id: ScreenId; Icon: unknown; label: string; shortLabel: string }[];

/** Footer with optional visible text labels based on accessibility setting */
export function TabBar({ active }: { active: ScreenId }) {
  const { tab, invitations, notifs, settings } = useApp();
  const open = invitations.filter((i) => i.status === 'open').length;
  const unread = notifs.some((n) => n.unread);
  const showLabels = settings.showTabLabels;

  return (
    <nav className={`tab-bar${showLabels ? ' with-labels' : ''}`} aria-label="Hauptnavigation">
      {TABS.map(({ id, Icon, label, shortLabel }) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            className={`tab${on ? ' active' : ''}`}
            onClick={() => tab(id)}
            aria-label={label}
            aria-current={on ? 'page' : undefined}
          >
            <Icon size={showLabels ? 22 : 28} strokeWidth={on ? 2.3 : 1.8} />
            {showLabels && <span className="tab-label">{shortLabel}</span>}
            {id === 'invitations' && open > 0 && <span className="tab-badge">{open}</span>}
            {id === 'notifications' && unread && <span className="tab-dot" />}
          </button>
        );
      })}
    </nav>
  );
}

export function ChatArea({
  channel,
  dateLabel = 'Heute',
  highlightedMsgId,
}: {
  channel: Channel;
  dateLabel?: string;
  highlightedMsgId?: string | null;
}) {
  const { openFile, typing } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const isTyping = typing === channel.id;

  useEffect(() => {
    if (highlightedMsgId) {
      const targetEl = ref.current?.querySelector<HTMLElement>(`#msg-${CSS.escape(highlightedMsgId)}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [channel.messages.length, channel.id, isTyping, highlightedMsgId]);

  return (
    <div
      className="chat-area"
      ref={ref}
      role="log"
      aria-live="polite"
      aria-label={`Nachrichten in ${channel.name}`}
      style={channel.archived ? { background: '#f9fafb' } : undefined}
    >
      {channel.messages.length === 0 ? (
        <div className="empty-chat">
          <MessagesCircle size={34} strokeWidth={1.6} />
          <div>
            Noch keine Nachrichten in <strong>{channel.name}</strong>.<br />
            Schreib die erste!
          </div>
        </div>
      ) : (
        <div className="date-divider">{dateLabel}</div>
      )}
      {channel.messages.map((m) => {
        const self = m.from === 'self';
        const imp = detectImportantMessage(m);
        const isHighlighted = highlightedMsgId === m.id;
        return (
          <div
            key={m.id}
            id={`msg-${m.id}`}
            className={`msg ${self ? 'self' : 'other'}${imp ? ' is-important' : ''}${isHighlighted ? ' jump-highlight' : ''}`}
          >
            <div className="msg-meta">
              {m.dozent && <span className="badge-dozent">Dozent</span>}
              {imp && imp.category !== 'lecturer' && (
                <span className={`badge-important cat-${imp.category}`} title={imp.label}>
                  {imp.icon} {imp.label}
                </span>
              )}
              {self ? 'Du' : m.from} · {m.time}
            </div>
            {m.text && <div className="msg-bubble">{m.text}</div>}
            {m.file && (
              <button
                className="msg-file"
                onClick={() => openFile(m.file!, self ? 'dir' : m.from, channel.id)}
              >
                <span className="msg-file-icon">
                  {m.file.kind === 'img' ? <Image size={18} /> : <FileText size={18} />}
                </span>
                <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span className="fname">{m.file.name}</span>
                  <span className="fsize">
                    {m.file.size}
                    {m.file.kind === 'img' && !self ? ' · Tippen zum Öffnen' : ''}
                  </span>
                </span>
              </button>
            )}
          </div>
        );
      })}
      {isTyping && (
        <div className="msg other">
          <div className="msg-bubble typing" aria-label="schreibt…">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </div>
  );
}

export function InputBar({ channel }: { channel: Channel }) {
  const { sendMessage, attachFile } = useApp();
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (channel.archived) {
    return (
      <div className="input-bar disabled">
        <button className="round-btn ghost" disabled aria-label="Datei anhängen">
          <Paperclip size={20} />
        </button>
        <input type="text" placeholder="Schreiben nicht möglich (archiviert)" disabled />
        <button className="round-btn solid" disabled aria-label="Senden">
          <SendHorizontal size={18} />
        </button>
      </div>
    );
  }

  const send = () => {
    if (!text.trim()) return;
    sendMessage(channel.id, text.trim());
    setText('');
  };

  return (
    <form
      className="input-bar"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            attachFile(channel.id, f);
          }
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="round-btn ghost"
        aria-label="Datei anhängen"
        onClick={() => fileInputRef.current?.click()}
      >
        <Paperclip size={20} />
      </button>
      <input
        type="text"
        placeholder="Nachricht schreiben…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Nachricht"
      />
      <button type="submit" className="round-btn solid" aria-label="Senden">
        <SendHorizontal size={18} />
      </button>
    </form>
  );
}
