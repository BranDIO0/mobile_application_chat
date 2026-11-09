import { useState } from 'react';
import {
  Check,
  Download,
  FileText,
  Image,
  MessageCircle,
  Search,
  Share2,
  X,
} from 'lucide-react';
import { CATEGORIES } from '../data/catalog';
import { MainHeader, SubHeader, TabBar } from '../components/Layout';
import { initials, useApp } from '../context/AppContext';

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

export function Invite() {
  const p = useApp();
  const ch = p.activeChannel;
  const st = p.inviteState(ch.id);
  const [user, setUser] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    const v = user.trim().toLowerCase();
    if (!v) return setErr('Bitte ein Kürzel eingeben');
    if (!/^[a-z]{4,6}\w{0,4}$/i.test(v)) return setErr('Ungültiges Kürzel (z. B. asesit00)');
    if (st.pending.includes(v) || st.members.some((m) => m.id.toLowerCase() === v))
      return setErr(`${v} ist bereits eingeladen oder Mitglied`);
    p.sendInvite(ch.id, v);
    setUser('');
    setErr('');
  };

  return (
    <>
      <SubHeader title="Einladen" sub={ch.name} />
      <form
        className="form-body"
        style={{ gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="field">
          <label htmlFor="inv-user">Hochschulkürzel *</label>
          <input
            id="inv-user"
            className={err ? 'invalid' : ''}
            type="text"
            placeholder="asesit00"
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              setErr('');
            }}
          />
          {err ? (
            <span className="error">{err}</span>
          ) : (
            <span className="hint">Keine private Nummer nötig — nur das offizielle Kürzel</span>
          )}
        </div>
        <button type="submit" className="btn-primary md">
          Einladung senden
        </button>
        <div className="sec" style={{ padding: '10px 0 0' }}>
          Einladungen ausstehend
        </div>
        {st.pending.length === 0 ? (
          <div className="empty-state" style={{ padding: 0, textAlign: 'left' }}>
            Keine offenen Einladungen.
          </div>
        ) : (
          <div className="card-list">
            {st.pending.map((u) => (
              <div key={u} className="list-item">
                <div className="avatar sm navy">{u[0]!.toUpperCase()}</div>
                <div className="list-info">
                  <span className="name">{u}</span>
                  <span className="sub">Einladung ausstehend</span>
                </div>
                <button
                  type="button"
                  className="list-action red"
                  onClick={() => p.withdrawInvite(ch.id, u)}
                >
                  Zurückziehen
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="sec" style={{ padding: '10px 0 0' }}>
          Aktuelle Mitglieder
        </div>
        <div className="card-list">
          {st.members.map((m) => {
            const self = m.id === 'self';
            return (
              <div key={m.id} className="list-item">
                <div className={`avatar sm${self ? '' : ' navy'}`}>
                  {self ? initials(p.displayName)[0] : m.id[0]!.toUpperCase()}
                </div>
                <div className="list-info">
                  <span className="name">{self ? `${p.userId} (Du)` : m.id}</span>
                  <span className="sub">{m.role}</span>
                </div>
                {!self && (
                  <button
                    type="button"
                    className="list-action"
                    onClick={() => p.removeMember(ch.id, m.id)}
                  >
                    Entfernen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </form>
    </>
  );
}

export function Invitations() {
  const { invitations, respondInvitation } = useApp();
  const open = invitations.filter((i) => i.status === 'open');
  const archived = invitations.filter((i) => i.status !== 'open');

  return (
    <>
      <MainHeader title="Einladungen" />
      <div className="scrollable">
        <div className="sec" style={{ paddingTop: 2 }}>
          Offen ({open.length})
        </div>
        {open.length === 0 && <div className="empty-state">Keine offenen Einladungen.</div>}
        {open.map((i) => (
          <div key={i.id} className="invite-card">
            <div className="invite-card-body">
              <div className="room-icon">
                <MessageCircle size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="invite-card-room">{i.room}</div>
                <div className="invite-card-from">
                  Von {i.from} · {i.when}
                </div>
              </div>
            </div>
            <div className="invite-card-actions">
              <button className="btn-accept" onClick={() => respondInvitation(i.id, true)}>
                Annehmen
              </button>
              <button className="btn-reject" onClick={() => respondInvitation(i.id, false)}>
                Ablehnen
              </button>
            </div>
          </div>
        ))}
        <div className="sec">Archiviert</div>
        {archived.map((i) => (
          <div key={i.id} className="list-item">
            <div className={`avatar sm ${i.status === 'accepted' ? 'green' : 'grey'}`}>
              {i.status === 'accepted' ? (
                <Check size={15} strokeWidth={3} />
              ) : (
                <X size={15} strokeWidth={3} />
              )}
            </div>
            <div className="list-info">
              <span className="name">{i.room}</span>
              <span className="sub">
                {i.status === 'accepted' ? 'Angenommen' : 'Abgelehnt'} · {i.when}
              </span>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="invitations" />
    </>
  );
}

export function FileView() {
  const p = useApp();
  const { file, sharedBy, channelId } = p.openFileState;
  const ch = p.channel(channelId);
  const mod = p.moduleOf(ch);
  const isImg = file.kind === 'img';
  const ext = file.name.split('.').pop()?.toUpperCase();

  const download = () => {
    if (file.url && file.url !== '#') {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }
    p.toast(`${file.name} heruntergeladen`);
  };

  return (
    <>
      <SubHeader title={file.name}>
        <button className="icon-btn" aria-label="Herunterladen" onClick={download}>
          <Download size={22} />
        </button>
      </SubHeader>
      <div className="file-preview">
        {isImg && file.url && file.url.startsWith('data:image/') ? (
          <img
            src={file.url}
            alt={file.name}
            style={{
              maxWidth: '85%',
              maxHeight: 220,
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--shadow-md)',
              border: '2px solid var(--line)',
              objectFit: 'contain',
              background: 'var(--surface)',
            }}
          />
        ) : (
          <div className="file-thumb">
            <div
              className="file-thumb-top"
              style={{ background: isImg ? 'var(--navy)' : 'var(--red)' }}
            >
              {isImg ? <Image size={40} strokeWidth={1.6} /> : <FileText size={40} strokeWidth={1.6} />}
            </div>
            <div className="file-thumb-lines">
              <div />
              <div style={{ width: '75%' }} />
              <div style={{ width: '55%' }} />
            </div>
          </div>
        )}
        <div className="file-meta">{file.name}</div>
        <div className="file-size">
          {file.size} · {ext === 'JPG' ? 'JPEG' : ext} · 29.10.2026
        </div>
      </div>
      <div className="file-sharer">
        Geteilt von {sharedBy}
        {ch ? ` · ${ch.name}` : ''}
        {mod ? ` · ${mod.short}` : ''}
      </div>
      <div className="file-actions">
        <button className="btn-primary md" onClick={download}>
          <Download size={18} /> Herunterladen
        </button>
        <button
          className="btn-secondary"
          onClick={() => p.toast('Link in die Zwischenablage kopiert')}
        >
          <Share2 size={18} /> Teilen
        </button>
      </div>
    </>
  );
}
