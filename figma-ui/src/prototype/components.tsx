import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { BatteryFull, Bell, ChevronLeft, FileText, Image, LibraryBig, Mail, MessagesCircle, Paperclip, SendHorizontal, Signal, Wifi } from 'lucide-react'
import type { Channel, ScreenId } from './data'
import { useProto } from './store'

export const LOGO_SRC = '/assets/hey-logo.png'

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
  )
}

export function BackBtn({ onClick, icon }: { onClick?: () => void; icon?: ReactNode }) {
  const { back } = useProto()
  return (
    <button className="icon-btn" aria-label="Zurück" onClick={onClick ?? back}>
      {icon ?? <ChevronLeft size={26} strokeWidth={2.2} />}
    </button>
  )
}

/** Large title header used on tab-root screens (matches the "Chats" wireframe). */
export function MainHeader({ title }: { title: string }) {
  const { navigate, displayName, stack } = useProto()
  return (
    <>
      <StatusBar />
      <div className="main-header">
        {stack.length > 1 && <BackBtn />}
        <h1>{title}</h1>
        <button className="avatar" aria-label="Profil" onClick={() => navigate('profile')}>
          {displayName.trim()[0]?.toUpperCase() ?? 'A'}
        </button>
      </div>
    </>
  )
}

export function SubHeader({ title, sub, back = true, backIcon, children }: { title: ReactNode; sub?: ReactNode; back?: boolean; backIcon?: ReactNode; children?: ReactNode }) {
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
  )
}

/** Makes a non-button element keyboard- and click-accessible. */
export function clickable(onClick: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick()
      }
    },
  }
}

const TABS = [
  { id: 'chats', Icon: MessagesCircle, label: 'Chats' },
  { id: 'catalog', Icon: LibraryBig, label: 'Modulkatalog' },
  { id: 'invitations', Icon: Mail, label: 'Einladungen' },
  { id: 'notifications', Icon: Bell, label: 'Benachrichtigungen' },
] as const satisfies readonly { id: ScreenId; Icon: unknown; label: string }[]

/** Footer per Figma component: icon-only tabs, red bar above the active tab. */
export function TabBar({ active }: { active: ScreenId }) {
  const { tab, invitations, notifs } = useProto()
  const open = invitations.filter((i) => i.status === 'open').length
  const unread = notifs.some((n) => n.unread)
  return (
    <nav className="tab-bar">
      {TABS.map(({ id, Icon, label }) => {
        const on = id === active
        return (
          <button key={id} className={`tab${on ? ' active' : ''}`} onClick={() => tab(id)} aria-label={label} aria-current={on ? 'page' : undefined}>
            <Icon size={30} strokeWidth={on ? 2.1 : 1.7} />
            {id === 'invitations' && open > 0 && <span className="tab-badge">{open}</span>}
            {id === 'notifications' && unread && <span className="tab-dot" />}
          </button>
        )
      })}
    </nav>
  )
}

export function ChatArea({ channel, dateLabel = 'Heute' }: { channel: Channel; dateLabel?: string }) {
  const { openFile, typing } = useProto()
  const ref = useRef<HTMLDivElement>(null)
  const isTyping = typing === channel.id
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [channel.messages.length, channel.id, isTyping])

  return (
    <div className="chat-area" ref={ref} style={channel.archived ? { background: '#f9fafb' } : undefined}>
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
        const self = m.from === 'self'
        return (
          <div key={m.id} className={`msg ${self ? 'self' : 'other'}`}>
            <div className="msg-meta">
              {m.dozent && <span className="badge-dozent">Dozent</span>}
              {self ? 'Du' : m.from} · {m.time}
            </div>
            {m.text && <div className="msg-bubble">{m.text}</div>}
            {m.file && (
              <button className="msg-file" onClick={() => openFile(m.file!, self ? 'dir' : m.from, channel.id)}>
                <span className="msg-file-icon">{m.file.kind === 'img' ? <Image size={18} /> : <FileText size={18} />}</span>
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
        )
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
  )
}

export function InputBar({ channel }: { channel: Channel }) {
  const { sendMessage, attachFile } = useProto()
  const [text, setText] = useState('')
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
    )
  }
  const send = () => {
    if (!text.trim()) return
    sendMessage(channel.id, text.trim())
    setText('')
  }
  return (
    <form
      className="input-bar"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <button type="button" className="round-btn ghost" aria-label="Datei anhängen" onClick={() => attachFile(channel.id)}>
        <Paperclip size={20} />
      </button>
      <input type="text" placeholder="Nachricht schreiben…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Nachricht" />
      <button type="submit" className="round-btn solid" aria-label="Senden">
        <SendHorizontal size={18} />
      </button>
    </form>
  )
}
