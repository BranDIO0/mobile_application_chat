import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import {
  BatteryFull,
  Bell,
  ChevronLeft,
  CircleAlert,
  Clock3,
  FileText,
  Image,
  LibraryBig,
  Mail,
  MessagesCircle,
  Paperclip,
  SendHorizontal,
  Signal,
  Wifi,
} from "lucide-react"
import type { Channel, ScreenId } from "../data/catalog"
import { useApp } from "../context/AppContext"

export const LOGO_SRC = "/assets/hey-logo.png"

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

export function BackBtn({
  onClick,
  icon,
}: {
  onClick?: () => void
  icon?: ReactNode
}) {
  const { back } = useApp()
  return (
    <button className="icon-btn" aria-label="Zurück" onClick={onClick ?? back}>
      {icon ?? <ChevronLeft size={26} strokeWidth={2.2} />}
    </button>
  )
}

/** Large title header used on tab-root screens (matches the "Chats" wireframe). */
export function MainHeader({ title }: { title: string }) {
  const { navigate, displayName, stack } = useApp()
  return (
    <>
      <StatusBar />
      <div className="main-header">
        {stack.length > 1 && <BackBtn />}
        <h1>{title}</h1>
        <button
          className="avatar"
          aria-label="Profil"
          onClick={() => navigate("profile")}
        >
          {displayName.trim()[0]?.toUpperCase() ?? "A"}
        </button>
      </div>
    </>
  )
}

export function SubHeader({
  title,
  sub,
  back = true,
  backIcon,
  children,
}: {
  title: ReactNode
  sub?: ReactNode
  back?: boolean
  backIcon?: ReactNode
  children?: ReactNode
}) {
  return (
    <>
      <StatusBar />
      <div
        className="sub-header"
        style={back ? undefined : { paddingLeft: 18 }}
      >
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
    role: "button" as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onClick()
      }
    },
  }
}

/** Keeps keyboard focus inside a modal and restores it when the modal closes. */
export function useDialogFocus<T extends HTMLElement>(
  onClose: () => void,
  active = true,
) {
  const ref = useRef<T>(null)
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (!active) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = ref.current
    if (!dialog) return
    const selector =
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(selector))
    const firstFocus =
      dialog.querySelector<HTMLElement>("[data-autofocus]") ??
      focusable()[0] ??
      dialog
    firstFocus.focus()

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== "Tab") return
      const items = focusable()
      if (!items.length) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      previous?.focus()
    }
  }, [active])

  return ref
}

const TABS = [
  { id: "chats", Icon: MessagesCircle, label: "Chats" },
  { id: "catalog", Icon: LibraryBig, label: "Katalog" },
  { id: "invitations", Icon: Mail, label: "Einladungen" },
  { id: "notifications", Icon: Bell, label: "Infos" },
] as const satisfies readonly { id: ScreenId; Icon: unknown; label: string }[]

/** Footer per Figma component: icon-only tabs, red bar above the active tab. */
export function TabBar({ active }: { active: ScreenId }) {
  const { tab, invitations, notifs, settings } = useApp()
  const open = invitations.filter((i) => i.status === "open").length
  const unread = notifs.some((n) => n.unread)
  return (
    <nav className="tab-bar" aria-label="Hauptnavigation">
      {TABS.map(({ id, Icon, label }) => {
        const on = id === active
        return (
          <button
            key={id}
            className={`tab${on ? " active" : ""}`}
            onClick={() => tab(id)}
            aria-label={label}
            aria-current={on ? "page" : undefined}
          >
            <Icon size={30} strokeWidth={on ? 2.1 : 1.7} aria-hidden="true" />
            {settings.showTabLabels && (
              <span className="tab-label" aria-hidden="true">
                {label}
              </span>
            )}
            {id === "invitations" && open > 0 && (
              <span
                className="tab-badge"
                aria-label={`${open} offene Einladungen`}
              >
                {open}
              </span>
            )}
            {id === "notifications" && unread && (
              <span className="tab-dot">
                <span className="sr-only">Ungelesene Infos</span>
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

/** The three loading dots from the splash screen. */
export function Loader() {
  return (
    <div className="loader" role="status" aria-label="Wird geladen">
      <span />
      <span />
      <span />
    </div>
  )
}

export function ChatArea({
  channel,
  dateLabel = "Heute",
  loading,
  error,
}: {
  channel: Channel
  dateLabel?: string
  loading?: boolean
  error?: boolean
}) {
  const { openFile, typing, pendingMessages, setSendFail } = useApp()
  const ref = useRef<HTMLDivElement>(null)
  const lastMessageId = useRef(channel.messages.at(-1)?.id)
  const newest = channel.messages.at(-1)
  const messages = channel.archived ? channel.messages : [...channel.messages, ...pendingMessages]
  const [announcement, setAnnouncement] = useState<{
    id: string
    text: string
  } | null>(null)
  const isTyping = typing === channel.id
  useEffect(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    })
    if (
      newest &&
      newest.id !== lastMessageId.current &&
      newest.from !== "self"
    ) {
      setAnnouncement({
        id: newest.id,
        text: `Neue Nachricht von ${newest.from}: ${newest.text ?? `Datei ${newest.file?.name ?? ""}`}`,
      })
    }
    lastMessageId.current = newest?.id
  }, [newest, messages.length, channel.id, isTyping, loading, error])

  if (loading) {
    return (
      <div className="chat-area chat-state">
        <Loader />
      </div>
    )
  }
  if (error) return <div className="chat-area chat-state" />

  return (
    <div
      className="chat-area"
      ref={ref}
      style={channel.archived ? { background: "#f9fafb" } : undefined}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement && <span key={announcement.id}>{announcement.text}</span>}
      </div>
      {messages.length === 0 ? (
        <div className="empty-chat">
          <MessagesCircle size={34} strokeWidth={1.6} />
          <div>
            Noch keine Nachrichten in <strong>{channel.name}</strong>.<br />
            {!channel.archived && "Schreib die erste!"}
          </div>
        </div>
      ) : (
        <div className="date-divider">{dateLabel}</div>
      )}
      {messages.map((m) => {
        const self = m.from === "self"
        const failed = m.status === "failed"
        const openFail = () => setSendFail({ msgId: m.id })
        return (
          <div
            key={m.id}
            className={`msg ${self ? "self" : "other"}${
              m.status ? ` ${m.status}` : ""
            }`}
          >
            <div className="msg-meta">
              {m.dozent && <span className="badge-dozent">Dozent</span>}
              {self ? "Du" : m.from} · {m.time}
              {m.status === "sending" && (
                <Clock3 size={12} aria-label="Wird gesendet" />
              )}
            </div>
            <div className="msg-row">
              {failed && (
                <button
                  className="fail-icon"
                  aria-label="Nachricht nicht gesendet – Optionen"
                  onClick={openFail}
                >
                  <CircleAlert
                    size={22}
                    fill="var(--red)"
                    color="#fff"
                    strokeWidth={2.2}
                  />
                </button>
              )}
              {m.text && (
                <div
                  className="msg-bubble"
                  {...(failed ? clickable(openFail) : {})}
                >
                  {m.text}
                </div>
              )}
              {m.file && (
                <button
                  className="msg-file"
                  disabled={m.status === "sending" || m.status === "sent"}
                  onClick={() =>
                    failed
                      ? openFail()
                      : m.status
                        ? undefined
                        : openFile(m.file!, self ? "dir" : m.from, channel.id)
                  }
                >
                  <span className="msg-file-icon">
                    {m.file.kind === "img" ? (
                      <Image size={18} />
                    ) : (
                      <FileText size={18} />
                    )}
                  </span>
                  <span
                    style={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span className="fname">{m.file.name}</span>
                    <span className="fsize">
                      {m.file.size}
                      {m.file.kind === "img" && !self
                        ? " · Tippen zum Öffnen"
                        : ""}
                    </span>
                  </span>
                </button>
              )}
            </div>
            {failed && (
              <button className="msg-fail-note" onClick={openFail}>
                Nicht gesendet · Tippen zum Wiederholen
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

export function InputBar({
  channel,
  chatLoadState = 'ready',
}: {
  channel: Channel;
  chatLoadState?: 'loading' | 'ready' | 'error';
}) {
  const { sendMessage, attachFile } = useApp();
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const disabledText = channel.archived
    ? 'Schreiben nicht möglich (archiviert)'
    : chatLoadState === 'loading'
      ? 'Chat wird geladen…'
      : chatLoadState === 'error'
        ? 'Chat nicht verfügbar'
        : null;

  if (disabledText) {
    return (
      <div className="input-bar disabled">
        <button className="round-btn ghost" disabled aria-label="Datei anhängen">
          <Paperclip size={20} />
        </button>
        <input type="text" placeholder={disabledText} disabled />
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
