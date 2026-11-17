import { useState, type ReactNode } from 'react'
import { Archive as ArchiveIcon, BellOff, ChevronDown, ChevronRight, EllipsisVertical, MessageCircle, Plus, UserPlus, Users } from 'lucide-react'
import { ChatArea, InputBar, MainHeader, SubHeader, TabBar } from '../components'
import type { Channel } from '../data'
import { useProto } from '../store'

function TreeGroup({ id, title, items, addLabel, onAdd, muted }: { id: string; title: string; items: Channel[]; addLabel?: string; onAdd?: () => void; muted?: boolean }) {
  const p = useProto()
  const closed = p.collapsed.includes(id)
  return (
    <div className="tree-group">
      <button className="tree-head" onClick={() => p.toggleCollapsed(id)} aria-expanded={!closed}>
        {closed ? <ChevronRight size={22} strokeWidth={2.6} /> : <ChevronDown size={22} strokeWidth={2.6} />}
        {title}
        {closed && items.length > 0 && <span className="count">{items.length}</span>}
      </button>
      <div className={`tree-body${closed ? ' collapsed' : ''}`}>
        {items.map((c) => (
          <button
            key={c.id}
            className={`tree-item${c.id === p.activeChannelId && !c.archived ? ' active' : ''}${muted ? ' muted' : ''}`}
            onClick={() => p.openChannel(c.id)}
          >
            {c.archived ? <ArchiveIcon size={19} strokeWidth={2} /> : <MessageCircle size={19} strokeWidth={2} />}
            <span>{c.archived ? 'Mathe 1 — Hauptkanal' : c.name}</span>
          </button>
        ))}
        {!items.length && !onAdd && <div className="tree-item muted">Keine Kanäle</div>}
      </div>
      {onAdd && (
        <button className="tree-add" onClick={onAdd}>
          <Plus size={20} strokeWidth={1.8} />
          {addLabel}
        </button>
      )}
    </div>
  )
}

export function Chats() {
  const p = useProto()
  const { modules, channels, settings } = p
  const joined = modules.filter((m) => m.joined)
  const custom = channels.filter((c) => !c.moduleId && !c.archived)
  const archived = channels.filter((c) => c.archived)

  return (
    <>
      <MainHeader title="Chats" />
      <div className="tree">
        {joined.map((m) => (
          <TreeGroup
            key={m.id}
            id={m.id}
            title={m.short}
            items={channels.filter((c) => c.moduleId === m.id)}
            addLabel="Untergruppe"
            onAdd={() => p.setSubgroupModal(m.id)}
          />
        ))}
        <TreeGroup id="custom" title="Eigene Gruppen" items={custom} addLabel="Neue Gruppe" onAdd={() => p.navigate('freegroup')} />
        {settings.showArchived && <TreeGroup id="archive" title="Archiv SS25" items={archived} muted />}
      </div>
      <TabBar active="chats" />
    </>
  )
}

export function ChatView() {
  const p = useProto()
  const ch = p.activeChannel
  const mod = p.moduleOf(ch)
  const [menu, setMenu] = useState(false)
  const item = (icon: ReactNode, label: string, fn: () => void) => (
    <button
      role="menuitem"
      onClick={() => {
        setMenu(false)
        fn()
      }}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <>
      <SubHeader title={ch.name} sub={`${mod ? `${mod.short} · WS26` : 'Eigene Gruppe'} · ${ch.members} Mitglieder`}>
        <button className="icon-btn" aria-label="Mitglieder" onClick={() => p.navigate('invite')}>
          <Users size={22} />
        </button>
        <button className="icon-btn" aria-label="Mehr" onClick={() => setMenu(true)}>
          <EllipsisVertical size={22} />
        </button>
      </SubHeader>
      <ChatArea channel={ch} />
      <InputBar channel={ch} />
      {menu && (
        <>
          <div className="menu-backdrop" onClick={() => setMenu(false)} />
          <div className="menu" role="menu">
            {item(<UserPlus size={18} />, 'Mitglieder einladen', () => p.navigate('invite'))}
            {mod && item(<Plus size={18} />, 'Untergruppe erstellen', () => p.setSubgroupModal(mod.id))}
            {item(<BellOff size={18} />, 'Stummschalten', () => p.toast(`${ch.name} stummgeschaltet`))}
          </div>
        </>
      )}
    </>
  )
}

export function Archive() {
  const p = useProto()
  const ch = p.channel('archiv-mathe1')!
  return (
    <>
      <SubHeader title={ch.name} sub="SS25 · Archiviert" />
      <div className="archive-banner">
        <ArchiveIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Archivierter Kurs — SS25</strong>
          Nur-Lese-Modus. Nachrichten und Dateien sind weiterhin abrufbar.
        </div>
      </div>
      <ChatArea channel={ch} dateLabel="14. Juli 2025" />
      <InputBar channel={ch} />
    </>
  )
}

export function SubgroupModal() {
  const p = useProto()
  const mod = p.modules.find((m) => m.id === p.subgroupModal)
  const [name, setName] = useState('')
  const [type, setType] = useState('Lerngruppe')
  if (!mod) return null
  const close = () => p.setSubgroupModal(null)
  const slug = (s: string) => s.trim().replace(/[.\s]+/g, '_').replace(/_+$/, '')

  return (
    <div className="modal-overlay" onClick={close}>
      <form
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) p.createSubgroup(mod.id, name.trim(), type)
        }}
      >
        <div className="modal-handle" />
        <div className="modal-title">Untergruppe erstellen</div>
        <div className="modal-sub">in {mod.short} · WS26</div>
        <div className="field">
          <label htmlFor="sg-name">Name der Untergruppe *</label>
          <input id="sg-name" type="text" placeholder="z. B. Lerngruppe B" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <span className="hint">
            Gespeichert als WS26::MOD::{slug(mod.short)}::SUB::{name.trim() ? slug(name) : '<Name>'}
          </span>
        </div>
        <div className="field">
          <label htmlFor="sg-type">Typ</label>
          <select id="sg-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option>Lerngruppe</option>
            <option>Übungsblatt</option>
            <option>Projekt</option>
          </select>
        </div>
        <button type="submit" className="btn-primary md" disabled={!name.trim()}>
          Untergruppe erstellen
        </button>
        <button type="button" className="btn-secondary" onClick={close}>
          Abbrechen
        </button>
      </form>
    </div>
  )
}
