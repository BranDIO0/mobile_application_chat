import { useState } from 'react';
import {
  Archive as ArchiveIcon,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Plus,
} from 'lucide-react';
import { MainHeader, SubHeader, TabBar } from '../components/Layout';
import type { Channel } from '../data/catalog';
import { slugifyName } from '../data/catalog';
import { useApp } from '../context/AppContext';

function TreeGroup({
  id,
  title,
  items,
  addLabel,
  onAdd,
  muted,
}: {
  id: string;
  title: string;
  items: Channel[];
  addLabel?: string;
  onAdd?: () => void;
  muted?: boolean;
}) {
  const p = useApp();
  const closed = p.collapsed.includes(id);
  return (
    <div className="tree-group">
      <button className="tree-head" onClick={() => p.toggleCollapsed(id)} aria-expanded={!closed}>
        {closed ? (
          <ChevronRight size={22} strokeWidth={2.6} />
        ) : (
          <ChevronDown size={22} strokeWidth={2.6} />
        )}
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
            {c.archived ? (
              <ArchiveIcon size={19} strokeWidth={2} />
            ) : (
              <MessageCircle size={19} strokeWidth={2} />
            )}
            <span>{c.name}</span>
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
  );
}

export function Chats() {
  const p = useApp();
  const { modules, channels, settings } = p;
  const joined = modules.filter((m) => m.joined);
  const custom = channels.filter((c) => !c.moduleId && !c.archived);
  const archived = channels.filter((c) => c.archived);

  return (
    <>
      <MainHeader title="Chats" />
      <div className="tree">
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
          onAdd={() => p.navigate('freegroup')}
        />
        {settings.showArchived && <TreeGroup id="archive" title="Archiv SS25" items={archived} muted />}
      </div>
      <TabBar active="chats" />
    </>
  );
}

export function ChatView() {
  const p = useApp();
  const ch = p.activeChannel;
  const mod = p.moduleOf(ch);

  return (
    <>
      <SubHeader
        title={ch.name}
        sub={`${mod ? `${mod.short} · WS26` : 'Eigene Gruppe'} · ${ch.members} Mitglieder`}
      />
      <div className="chat-area">
        <div className="empty-chat">
          Chat-Ansicht für <strong>{ch.name}</strong> (Nachrichten werden in Step 4 verbunden)
        </div>
      </div>
    </>
  );
}

export function Archive() {
  const p = useApp();
  const ch = p.channels.find((c) => c.archived) ?? p.activeChannel;
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
      <div className="chat-area" style={{ background: '#f9fafb' }}>
        <div className="empty-chat">Archivierte Nachrichten werden in Step 4 verbunden</div>
      </div>
    </>
  );
}

export function SubgroupModal() {
  const p = useApp();
  const mod = p.modules.find((m) => m.id === p.subgroupModal);
  const [name, setName] = useState('');
  const [type, setType] = useState('Lerngruppe');
  const [busy, setBusy] = useState(false);

  if (!mod) return null;
  const close = () => p.setSubgroupModal(null);

  return (
    <div className="modal-overlay" onClick={close}>
      <form
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          const createdId = await p.createSubgroup(mod.id, name.trim(), type);
          setBusy(false);
          if (createdId && p.screen === 'chats') {
            p.navigate('chat');
          }
        }}
      >
        <div className="modal-handle" />
        <div className="modal-title">Untergruppe erstellen</div>
        <div className="modal-sub">in {mod.short} · WS26</div>
        <div className="field">
          <label htmlFor="sg-name">Name der Untergruppe *</label>
          <input
            id="sg-name"
            type="text"
            placeholder="z. B. Lerngruppe B"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={busy}
          />
          <span className="hint">
            Gespeichert als WS26::MOD::{slugifyName(mod.short)}::SUB::
            {name.trim() ? slugifyName(name) : '<Name>'}
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
