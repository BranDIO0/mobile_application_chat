import { useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { CATEGORIES } from '../data/catalog';
import { MainHeader, SubHeader, TabBar } from '../components/Layout';
import { useApp } from '../context/AppContext';

export function Catalog() {
  const { modules, joinModule } = useApp();
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const list = modules.filter(
    (m) => !needle || `${m.full} ${m.code} ${m.prof}`.toLowerCase().includes(needle),
  );

  return (
    <>
      <MainHeader title="Modulkatalog" />
      <div className="search-bar">
        <div className="search-wrap">
          <Search size={18} />
          <input
            type="search"
            placeholder="Fach suchen… (WS 26/27)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Fach suchen"
          />
        </div>
      </div>
      <div className="scrollable">
        {CATEGORIES.map((cat) => {
          const items = list.filter((m) => m.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat}>
              <div className="module-category">{cat}</div>
              {items.map((m) => (
                <div key={m.id} className="module-item">
                  <div className="mod-info">
                    <div className="mod-name">{m.full}</div>
                    <div className="mod-sub">
                      {m.code} · {m.prof} · {m.participants} Teiln.
                    </div>
                  </div>
                  {m.joined ? (
                    <div className="joined-badge">
                      <Check size={14} strokeWidth={2.6} /> Beigetreten
                    </div>
                  ) : (
                    <button className="join-btn" onClick={() => joinModule(m.id)}>
                      Beitreten
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {!list.length && <div className="empty-state">Kein Fach gefunden für „{q}“.</div>}
      </div>
      <TabBar active="catalog" />
    </>
  );
}

export function FreeGroup() {
  const { createCustomGroup } = useApp();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('Freies Projekt');
  const [invitee, setInvitee] = useState('');
  const [chips, setChips] = useState(['abcdit44', 'abcdit09']);
  const [busy, setBusy] = useState(false);

  const canCreate = !!name.trim() && !busy;
  const create = async () => {
    if (!canCreate) return;
    setBusy(true);
    await createCustomGroup(name.trim(), type, chips);
    setBusy(false);
  };
  const addChip = () => {
    const v = invitee.trim();
    if (v && !chips.includes(v)) setChips([...chips, v]);
    setInvitee('');
  };

  return (
    <>
      <SubHeader title="Neue Gruppe" backIcon={<X size={24} />}>
        <button className="text-btn" disabled={!canCreate} onClick={create}>
          {busy ? '…' : 'Erstellen'}
        </button>
      </SubHeader>
      <form
        className="form-body"
        style={{ gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="field">
          <label htmlFor="fg-name">Gruppenname *</label>
          <input
            id="fg-name"
            type="text"
            placeholder="z. B. Webtech-Hackathon-Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor="fg-desc">Beschreibung</label>
          <textarea
            id="fg-desc"
            placeholder="Worum geht es in dieser Gruppe?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor="fg-type">Typ</label>
          <select id="fg-type" value={type} onChange={(e) => setType(e.target.value)} disabled={busy}>
            <option>Freies Projekt</option>
            <option>Studiengruppe</option>
            <option>AStA / Hochschulgruppe</option>
          </select>
        </div>
        <div className="panel">
          <div className="panel-title">Mitglieder einladen</div>
          <div className="field">
            <input
              type="text"
              placeholder="Kürzel eingeben + Enter"
              value={invitee}
              onChange={(e) => setInvitee(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChip();
                }
              }}
              aria-label="Hochschulkürzel einladen"
              disabled={busy}
            />
          </div>
          {chips.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {chips.map((c) => (
                <span key={c} className="chip">
                  {c}
                  <button
                    type="button"
                    aria-label={`${c} entfernen`}
                    onClick={() => setChips(chips.filter((x) => x !== c))}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="btn-primary md" disabled={!canCreate}>
          {busy ? 'Erstelle Gruppe…' : 'Gruppe erstellen'}
        </button>
      </form>
    </>
  );
}
