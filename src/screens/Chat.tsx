import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react"
import {
  Archive as ArchiveIcon,
  BellOff,
  CircleAlert,
  RotateCw,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  FileText,
  Hash,
  LogOut,
  MessageCircle,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import {
  ChatArea,
  InputBar,
  MainHeader,
  SubHeader,
  TabBar,
  useDialogFocus,
} from "../components/Layout"
import { CATEGORIES, slugifyName, type Channel } from "../data/catalog"
import { useApp } from "../context/AppContext"

import { buildModuleMainRoomName, buildSubgroupRoomName } from "../utils/roomParser"

function TreeGroup({
  id,
  title,
  items,
  addLabel,
  onAdd,
  muted,
  flat = false,
}: {
  id: string
  title: string
  items: Channel[]
  addLabel?: string
  onAdd?: () => void
  muted?: boolean
  flat?: boolean
}) {
  const p = useApp()
  const closed = p.collapsed.includes(id)
  const channelIcon = (channel: Channel, isMain: boolean) => {
    if (channel.archived) return <ArchiveIcon size={18} strokeWidth={2} />
    if (isMain) return <Hash size={19} strokeWidth={2.4} />
    if (channel.name.toLowerCase().includes("übungsblatt")) {
      return <FileText size={17} strokeWidth={2} />
    }
    if (channel.name.toLowerCase().includes("lerngruppe")) {
      return <Users size={18} strokeWidth={2} />
    }
    return <MessageCircle size={18} strokeWidth={2} />
  }

  return (
    <div className={`tree-group${flat ? " flat" : ""}`}>
      <div className="tree-group-header">
        <button
          className="tree-head"
          onClick={() => p.toggleCollapsed(id)}
          aria-expanded={!closed}
          aria-label={`${title} ${closed ? "aufklappen" : "einklappen"}`}
        >
          {closed ? (
            <ChevronRight size={21} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <ChevronDown size={21} strokeWidth={2.5} aria-hidden="true" />
          )}
          <span className="tree-title">{title}</span>
          {closed && items.length > 0 && (
            <span className="count">{items.length}</span>
          )}
        </button>
        {onAdd && (
          <button
            className="tree-add"
            onClick={onAdd}
            aria-label={`${addLabel ?? "Gruppe"} in ${title} erstellen`}
          >
            <Plus size={21} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
      <div
        className={`tree-body${closed ? " collapsed" : ""}${
          flat ? " flat" : " hierarchical"
        }`}
      >
        {items.map((c) => {
          const isMain = !flat && c.name === "Hauptkanal"
          const isExercise = c.name.toLowerCase().includes("übungsblatt")
          return (
            <button
              key={c.id}
              className={`tree-item${isMain ? " main-channel" : ""}${
                !flat && !isMain ? " subgroup" : ""
              }${isExercise ? " exercise" : ""}${
                c.id === p.activeChannelId && !c.archived ? " active" : ""
              }${muted ? " muted" : ""}`}
              onClick={() => p.openChannel(c.id)}
            >
              <span className="tree-icon" aria-hidden="true">
                {channelIcon(c, isMain)}
              </span>
              <span>{c.name}</span>
            </button>
          )
        })}
        {!items.length && !onAdd && (
          <div className="tree-item muted">Keine Kanäle</div>
        )}
      </div>
    </div>
  )
}

const SEMESTER_TABS = [
  { id: "current", label: "aktuell" },
  { id: "ss25", label: "SS 25" },
  { id: "more", label: "mehr" },
] as const

function archiveSemester(channel: Channel) {
  return channel.rawName.match(/^([A-Z]{2}\d{2}):/i)?.[1]?.toUpperCase() ?? "Archiv"
}

export function Chats() {
  const p = useApp()
  const { modules, channels, settings, semesterTab: sem, setSemesterTab: setSem } = p
  const joined = modules.filter((m) => m.joined)
  const custom = channels.filter((c) => !c.moduleId && !c.archived)
  const archived = settings.showArchived ? channels.filter((c) => c.archived) : []
  const older = new Map<string, Channel[]>()
  for (const channel of archived) {
    const semester = archiveSemester(channel)
    if (semester !== "SS25") older.set(semester, [...(older.get(semester) ?? []), channel])
  }
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = e.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null
  }
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const touch = e.changedTouches[0]
    const delta = touch.clientX - start.x
    if (Math.abs(delta) < 40 || Math.abs(delta) <= Math.abs(touch.clientY - start.y)) return
    const idx = SEMESTER_TABS.findIndex((s) => s.id === sem)
    const next = SEMESTER_TABS[idx + (delta < 0 ? 1 : -1)]
    if (next) setSem(next.id)
  }

  return (
    <>
      <MainHeader title="Chats" />
      <nav className="sem-tabs" role="tablist" aria-label="Semester">
        {SEMESTER_TABS.map((s, index) => (
          <button
            key={s.id}
            role="tab"
            id={`semester-${s.id}`}
            aria-controls="semester-chats"
            aria-selected={sem === s.id}
            tabIndex={sem === s.id ? 0 : -1}
            className={`sem-tab${sem === s.id ? " active" : ""}`}
            onClick={() => setSem(s.id)}
            onKeyDown={(e) => {
              const last = SEMESTER_TABS.length - 1
              const next = {
                ArrowLeft: index === 0 ? last : index - 1,
                ArrowRight: index === last ? 0 : index + 1,
                Home: 0,
                End: last,
              }[e.key]
              if (next === undefined) return
              e.preventDefault()
              const tab = SEMESTER_TABS[next]
              setSem(tab.id)
              document.getElementById(`semester-${tab.id}`)?.focus()
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <div
        key={sem}
        id="semester-chats"
        role="tabpanel"
        aria-labelledby={`semester-${sem}`}
        className="tree"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { touchStart.current = null }}
      >
        {sem === "current" && (
          <>
            {joined.map((m) => (
              <TreeGroup
                key={m.id}
                id={m.id}
                title={m.short}
                items={channels.filter((c) => !c.archived && c.moduleId === m.id)}
                addLabel="Untergruppe"
                onAdd={() => p.setSubgroupModal(m.id)}
              />
            ))}
            <TreeGroup
              id="custom"
              title="Eigene Gruppen"
              items={custom}
              addLabel="Neue Gruppe"
              onAdd={() => p.navigate("freegroup")}
              flat
            />
          </>
        )}
        {sem === "ss25" && (
          <TreeGroup
            id="archive"
            title="Archiv SS 25"
            items={archived.filter((c) => archiveSemester(c) === "SS25")}
            muted
            flat
          />
        )}
        {sem === "more" && Array.from(older, ([title, items]) => (
          <TreeGroup key={title} id={`archive-${title}`} title={title} items={items} muted flat />
        ))}
        {sem === "more" && !older.size && (
          <div className="tree-placeholder">
            Ältere Semester werden hier verfügbar.
          </div>
        )}
      </div>
      <TabBar active="chats" />
    </>
  )
}

function ChatHistory({ dateLabel }: { dateLabel?: string }) {
  const { activeChannel, chatLoadState, retryLoadChat } = useApp()
  return (
    <>
      {chatLoadState === "error" && (
        <div className="error-banner" role="alert">
          <CircleAlert size={20} style={{ flexShrink: 0 }} />
          <span>Chat konnte nicht geladen werden</span>
          <button onClick={retryLoadChat}>
            <RotateCw size={14} /> Erneut
          </button>
        </div>
      )}
      <ChatArea
        channel={activeChannel}
        dateLabel={dateLabel}
        loading={chatLoadState === "loading"}
        error={chatLoadState === "error"}
      />
    </>
  )
}

export function ChatView() {
  const p = useApp()
  const ch = p.activeChannel
  const mod = p.moduleOf(ch)
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState<"leave" | "delete" | "course" | null>(null)
  const [busy, setBusy] = useState(false)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const action = confirm === "delete" ? "Raum löschen" : confirm === "course" ? "Kurs verlassen" : "Gruppe verlassen"
  const closeLeaveDialog = () => { if (!busy) setConfirm(null) }
  const leaveDialogRef = useDialogFocus<HTMLDivElement>(
    closeLeaveDialog,
    confirm !== null,
  )
  const closeMenu = () => {
    setMenu(false)
    requestAnimationFrame(() => moreButtonRef.current?.focus())
  }
  useEffect(() => {
    if (!menu) return
    document
      .querySelector<HTMLElement>('#chat-actions-menu [role="menuitem"]')
      ?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeMenu()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [menu])

  const item = (
    icon: ReactNode,
    label: string,
    fn: () => void,
    danger = false,
  ) => (
    <button
      role="menuitem"
      className={danger ? "danger" : undefined}
      onClick={() => {
        setMenu(false)
        moreButtonRef.current?.focus()
        fn()
      }}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <>
      <SubHeader
        title={ch.name}
        sub={`${
          mod
            ? `${mod.short} · WS26`
            : "Eigene Gruppe"
        } · ${ch.members} Mitglieder`}
      >
        <button
          className="icon-btn"
          aria-label="Mitglieder"
          onClick={() => p.navigate("invite")}
        >
          <UserPlus size={22} />
        </button>
        <button
          ref={moreButtonRef}
          className="icon-btn"
          aria-label="Weitere Chat-Aktionen"
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-controls="chat-actions-menu"
          onClick={() => setMenu(true)}
        >
          <EllipsisVertical size={22} />
        </button>
      </SubHeader>
      <ChatHistory />
      <InputBar channel={ch} chatLoadState={p.chatLoadState} />
      {menu && (
        <>
          <div className="menu-backdrop" onClick={closeMenu} />
          <div
            id="chat-actions-menu"
            className="menu"
            role="menu"
            aria-label="Chat-Aktionen"
          >
            {item(<UserPlus size={18} />, "Mitglieder einladen", () =>
              p.navigate("invite"),
            )}
            {mod &&
              item(<Plus size={18} />, "Untergruppe erstellen", () =>
                p.setSubgroupModal(mod.id),
              )}
            {item(<BellOff size={18} />, "Stummschalten", () =>
              p.toast(`${ch.name} stummgeschaltet`),
            )}
            {ch.chatid !== 0 && (
              <>
                <div className="menu-divider" role="separator" />
                {mod
                  ? item(<LogOut size={18} />, "Kurs verlassen", () => setConfirm("course"), true)
                  : item(<LogOut size={18} />, "Gruppe verlassen", () => setConfirm("leave"), true)}
                {mod && ch.name !== "Hauptkanal" && item(<LogOut size={18} />, "Gruppe verlassen", () => setConfirm("leave"), true)}
                {item(<Trash2 size={18} />, "Raum löschen", () => setConfirm("delete"), true)}
              </>
            )}
          </div>
        </>
      )}
      {confirm && (
        <div className="alert-overlay" onClick={closeLeaveDialog}>
          <div
            ref={leaveDialogRef}
            className="alert"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
            aria-describedby="leave-description"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="alert-body">
              <LogOut size={30} color="var(--red)" strokeWidth={2.2} />
              <div id="leave-title" className="alert-title">
                {confirm === "course" ? mod?.short : ch.name} {confirm === "delete" ? "löschen" : "verlassen"}?
              </div>
              <p id="leave-description">
                {confirm === "course"
                  ? "Der Kurs und alle zugehörigen Kanäle werden aus deiner Chat-Liste entfernt."
                  : confirm === "leave"
                    ? "Die Gruppe wird aus deiner Chat-Liste entfernt."
                    : "Der Raum wird dauerhaft gelöscht."}
              </p>
            </div>
            <button
              className="alert-btn danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                if (confirm === "course" && mod) await p.leaveModule(mod.id)
                if (confirm === "leave") await p.leaveChannel(ch.id)
                if (confirm === "delete") await p.deleteChannel(ch.id)
                setBusy(false)
                setConfirm(null)
              }}
            >
              {action}
            </button>
            <button className="alert-btn" onClick={closeLeaveDialog} disabled={busy} data-autofocus>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function Archive() {
  const p = useApp();
  const ch = p.activeChannel;
  const semester = archiveSemester(ch);

  return (
    <>
      <SubHeader title={ch.name} sub={`${semester} · Archiviert`} />
      <div className="archive-banner">
        <ArchiveIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Archivierter Kurs — {semester}</strong>
          Nur-Lese-Modus. Nachrichten und Dateien sind weiterhin abrufbar.
        </div>
      </div>
      <ChatHistory dateLabel={semester === 'SS25' && p.mockMode ? '14. Juli 2025' : 'Archiv'} />
      <InputBar channel={ch} />
    </>
  );
}

export function SubgroupModal() {
  const p = useApp();
  const mod = p.modules.find((m) => m.id === p.subgroupModal);
  const [name, setName] = useState('');
  const [type, setType] = useState('Lerngruppe');
  const [busy, setBusy] = useState(false);
  const close = () => { if (!busy) p.setSubgroupModal(null); };
  const dialogRef = useDialogFocus<HTMLFormElement>(close);

  if (!mod) return null;
  const previewName = buildSubgroupRoomName(mod, name.trim() || 'Name');

  return (
    <div className="modal-overlay" onClick={close}>
      <form
        ref={dialogRef}
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subgroup-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          const createdId = await p.createSubgroup(mod.id, name.trim(), type);
          setBusy(false);
          if (createdId && p.screen !== 'chat') {
            p.navigate('chat');
          }
        }}
      >
        <div className="modal-handle" />
        <div id="subgroup-title" className="modal-title">Untergruppe erstellen</div>
        <div className="modal-sub">in {mod.short} · WS26</div>
        <div className="field">
          <label htmlFor="sg-name">Name der Untergruppe *</label>
          <input
            id="sg-name"
            type="text"
            placeholder="z. B. Lerngruppe B"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-autofocus
            disabled={busy}
          />
          <span className="hint">
            Gespeichert als {previewName} ({previewName.length}/30 Zeichen)
          </span>
        </div>
        <div className="field">
          <label htmlFor="sg-type">Typ</label>
          <select id="sg-type" value={type} onChange={(e) => setType(e.target.value)} disabled={busy}>
            <option>Lerngruppe</option>
            <option>Übungsblatt</option>
            <option>Projekt</option>
          </select>
        </div>
        <button type="submit" className="btn-primary md" disabled={!name.trim() || busy}>
          {busy ? 'Erstelle…' : 'Untergruppe erstellen'}
        </button>
        <button type="button" className="btn-secondary" onClick={close} disabled={busy}>
          Abbrechen
        </button>
      </form>
    </div>
  );
}

export function ModuleModal() {
  const p = useApp();
  const [shortName, setShortName] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [prof, setProf] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0] ?? 'Pflicht — 1. Semester');
  const [busy, setBusy] = useState(false);

  const close = () => { if (!busy) p.setModuleModalOpen(false); };
  const dialogRef = useDialogFocus<HTMLFormElement>(close, p.moduleModalOpen);
  if (!p.moduleModalOpen) return null;

  const previewMod = {
    id: 'preview',
    slug: slugifyName(shortName.trim() || 'Modul'),
    abbr: 'M',
    short: shortName.trim() || 'Modul',
    full: fullName.trim() || 'Modul',
    code: code || 'INFB',
    prof: prof || 'Prof.',
    participants: 1,
    category,
    joined: true,
  };
  const previewServerName = buildModuleMainRoomName(previewMod);

  return (
    <div className="modal-overlay" onClick={close}>
      <form
        ref={dialogRef}
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!shortName.trim() || busy) return;
          setBusy(true);
          const createdId = await p.createModule(
            shortName.trim(),
            fullName.trim() || shortName.trim(),
            code.trim(),
            prof.trim(),
            category,
          );
          setBusy(false);
          if (createdId && p.screen !== 'chat') {
            p.navigate('chat');
          }
        }}
      >
        <div className="modal-handle" />
        <div id="module-title" className="modal-title">Neues Modul (Kurs) anlegen</div>
        <div className="modal-sub">Erstellt das Modul + öffentlichen Hauptkanal auf dem Server</div>
        <div className="field">
          <label htmlFor="mod-short">Kurzname (für Seitenleiste, max. 14 Zeichen) *</label>
          <input
            id="mod-short"
            type="text"
            maxLength={14}
            placeholder="z. B. Mobile UI"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            data-autofocus
            disabled={busy}
          />
          <span className="hint">
            Server-Raumname: {previewServerName} ({previewServerName.length}/30 Zeichen)
          </span>
        </div>
        <div className="field">
          <label htmlFor="mod-full">Vollständiger Modulname</label>
          <input
            id="mod-full"
            type="text"
            placeholder="z. B. Mobile User Interfaces"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={busy}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label htmlFor="mod-code">Modul-Code</label>
            <input
              id="mod-code"
              type="text"
              placeholder="z. B. INFB501"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="mod-prof">Dozent/in</label>
            <input
              id="mod-prof"
              type="text"
              placeholder="z. B. Prof. Kohl"
              value={prof}
              onChange={(e) => setProf(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="mod-cat">Kategorie</label>
          <select
            id="mod-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={busy}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary md" disabled={!shortName.trim() || busy}>
          {busy ? 'Erstelle Modul…' : 'Modul & Hauptkanal erstellen'}
        </button>
        <button type="button" className="btn-secondary" onClick={close} disabled={busy}>
          Abbrechen
        </button>
      </form>
    </div>
  );
}

/** WhatsApp-style alert for a message that could not be sent. */
export function SendFailDialog() {
  const p = useApp()
  const f = p.sendFail
  const close = () => p.setSendFail(null)
  const dialogRef = useDialogFocus<HTMLDivElement>(close)
  if (!f) return null
  return (
    <div className="alert-overlay" onClick={close}>
      <div
        ref={dialogRef}
        className="alert"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sf-title"
        aria-describedby="sf-description"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="alert-body">
          <CircleAlert
            size={30}
            fill="var(--red)"
            color="#fff"
            strokeWidth={2.2}
          />
          <div id="sf-title" className="alert-title">
            Nachricht nicht gesendet
          </div>
          <p id="sf-description">
            Deine Nachricht konnte nicht versendet werden. Prüfe deine
            Verbindung und tippe auf „Erneut senden“.
          </p>
        </div>
        <button
          className="alert-btn primary"
          onClick={p.retryMessage}
          data-autofocus
        >
          Erneut senden
        </button>
        <button
          className="alert-btn danger"
          onClick={p.deleteMessage}
        >
          Löschen
        </button>
        <button className="alert-btn" onClick={close}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}
