import { useEffect, useState } from 'react';
import { ChevronRight, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { formatError } from '../api/client';
import { chatApi } from '../api/chatApi';
import { MainHeader, SubHeader, TabBar, clickable } from '../components/Layout';
import { useApp } from '../context/AppContext';

export function Profile() {
  const p = useApp();
  const { modules, channels, displayName, userId, token, mockMode } = p;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    chatApi
      .getProfiles(token)
      .then((res) => {
        if (cancelled) return;
        const me = res.profiles?.find((u) => u.userid.toLowerCase() === userId.toLowerCase());
        if (me?.fullname) {
          p.setDisplayName(me.fullname);
          setDraft(me.fullname);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  const joined = modules.filter((m) => m.joined);
  const subs = channels.filter((c) => !c.archived && (c.moduleId ? c.name !== 'Hauptkanal' : true));
  const realSent = channels.reduce(
    (n, c) => n + c.messages.filter((m) => m.from === 'self').length,
    0,
  );
  const sent = mockMode ? 142 + realSent : realSent;

  const save = () => {
    if (draft.trim()) p.setDisplayName(draft.trim());
    setEditing(false);
    p.toast('Profil gespeichert');
  };

  return (
    <>
      <SubHeader title="Profil">
        <button
          className="text-btn"
          onClick={() => (editing ? save() : (setDraft(displayName), setEditing(true)))}
        >
          {editing ? 'Fertig' : 'Bearbeiten'}
        </button>
      </SubHeader>
      <div className="scrollable">
        <div className="profile-hero">
          <div className="profile-av">{displayName.trim()[0]?.toUpperCase() ?? 'A'}</div>
          {editing ? (
            <input
              className="profile-name-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              autoFocus
              aria-label="Anzeigename"
            />
          ) : (
            <div className="profile-name">{displayName}</div>
          )}
          <div className="profile-uid">{userId} · Studierender</div>
          <div className="profile-chips">
            <span className="profile-chip">Informatik B.Sc.</span>
            <span className="profile-chip">WS 26/27</span>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-item">
            <div className="stat-num">{joined.length}</div>
            <div className="stat-label">Kurse</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{subs.length}</div>
            <div className="stat-label">Lerngruppen</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{sent}</div>
            <div className="stat-label">Nachrichten</div>
          </div>
        </div>
        <div className="sec">Aktive Kurse</div>
        {joined.length === 0 && (
          <div className="empty-state" style={{ padding: '12px 18px' }}>
            Noch keinem Kurs beigetreten.
          </div>
        )}
        {joined.map((m) => {
          const chs = channels.filter((c) => !c.archived && c.moduleId === m.id);
          const subCount = chs.filter((c) => c.name !== 'Hauptkanal').length;
          const main = chs.find((c) => c.name === 'Hauptkanal') ?? chs[0];
          return (
            <div
              key={m.id}
              className="list-item"
              {...clickable(() => main && p.openChannel(main.id))}
            >
              <div className="avatar sm navy" style={{ fontSize: 11, fontWeight: 700 }}>
                {m.abbr}
              </div>
              <div className="list-info">
                <span className="name">{m.full}</span>
                <span className="sub">
                  WS26 · Hauptkanal
                  {subCount ? ` + ${subCount} Untergruppe${subCount > 1 ? 'n' : ''}` : ''}
                </span>
              </div>
              <span className="chev">
                <ChevronRight size={18} />
              </span>
            </div>
          );
        })}
        <div className="sec">Konto</div>
        <div className="list-item" {...clickable(() => p.navigate('settings'))}>
          <SettingsIcon size={20} color="var(--g600)" />
          <div className="list-info">
            <span className="name">Einstellungen</span>
          </div>
          <span className="chev">
            <ChevronRight size={18} />
          </span>
        </div>
        <div style={{ padding: 18 }}>
          <button className="btn-danger" onClick={p.logout}>
            <LogOut size={18} /> Abmelden
          </button>
        </div>
      </div>
    </>
  );
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      className={`toggle-pill${on ? '' : ' off'}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    />
  );
}

const Chev = () => <ChevronRight size={16} />;

export function Settings() {
  const p = useApp();
  const { settings: s, setSettings, serverMode, setServerMode } = p;
  const [deleting, setDeleting] = useState(false);

  const set = (k: keyof typeof s) => (v: boolean) => setSettings({ ...s, [k]: v });
  const demo = (what: string) => () => p.toast(`${what} — nicht verfügbar`);
  const shortName = p.displayName
    .split(' ')
    .map((w, i) => (i === 0 ? w : `${w[0]}.`))
    .join(' ');

  const cycleServerMode = () => {
    const order: ('live' | 'backup' | 'mock')[] = ['live', 'backup', 'mock'];
    const next = order[(order.indexOf(serverMode) + 1) % order.length]!;
    setServerMode(next);
    const labels = {
      live: 'Server: HSE-Live (www2.hs-esslingen.de)',
      backup: 'Server: Backup (api.chat.throin.de)',
      mock: 'Server: Mockup-Daten (Lokal)',
    };
    p.toast(labels[next]);
  };

  const serverModeLabel =
    serverMode === 'live'
      ? 'HSE-Server (Live)'
      : serverMode === 'backup'
        ? 'Backup (throin.de)'
        : 'Lokaler Mock-Server';

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await p.deleteAccount();
      p.reset('login', 'pop');
      p.toast(`Konto ${p.userId} gelöscht`);
    } catch (e) {
      p.toast(formatError(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <SubHeader title="Einstellungen" />
      <div className="scrollable">
        <div className="sec">Datenquelle & Server</div>
        <div style={{ padding: '10px 18px', background: '#fff', borderBottom: '1px solid var(--line)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 4,
              background: 'var(--input)',
              padding: 4,
              borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--line)',
            }}
          >
            {(
              [
                { id: 'live', label: 'HSE-Live', msg: 'HSE-Server (www2.hs-esslingen.de) aktiv' },
                { id: 'backup', label: 'Backup-Server', msg: 'Backup-Server (api.chat.throin.de) aktiv' },
                { id: 'mock', label: 'Mockup', msg: 'Mockup-Daten (Lokaler Server) aktiv' },
              ] as const
            ).map((opt) => {
              const active = serverMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setServerMode(opt.id);
                    p.toast(opt.msg);
                  }}
                  style={{
                    padding: '6px 6px',
                    borderRadius: 9,
                    border: 'none',
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: active ? 'var(--navy)' : 'transparent',
                    color: active ? '#fff' : 'var(--g600)',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="setting-row" {...clickable(cycleServerMode)}>
          <span className="s-label">Aktiver Endpunkt</span>
          <span className="s-val">
            {serverModeLabel} <Chev />
          </span>
        </div>

        <div className="sec">Konto</div>
        <div className="setting-row">
          <span className="s-label">Hochschulkürzel</span>
          <span className="s-val">{p.userId}</span>
        </div>
        <div className="setting-row" {...clickable(() => p.navigate('profile'))}>
          <span className="s-label">Anzeigename</span>
          <span className="s-val">
            {shortName} <Chev />
          </span>
        </div>
        <div className="setting-row" {...clickable(demo('Passwort ändern'))}>
          <span className="s-label">Passwort ändern</span>
          <span className="s-val">
            <Chev />
          </span>
        </div>

        <div className="sec">Benachrichtigungen</div>
        <div className="setting-row">
          <span className="s-label">Push-Benachrichtigungen</span>
          <Toggle on={s.push} onChange={set('push')} label="Push-Benachrichtigungen" />
        </div>
        <div className="setting-row">
          <span className="s-label">Nur bei Erwähnungen</span>
          <Toggle on={s.mentionsOnly} onChange={set('mentionsOnly')} label="Nur bei Erwähnungen" />
        </div>
        <div className="setting-row" {...clickable(demo('Ton'))}>
          <span className="s-label">Ton</span>
          <span className="s-val">
            Standard <Chev />
          </span>
        </div>

        <div className="sec">App</div>
        <div className="setting-row" {...clickable(demo('Semester wechseln'))}>
          <span className="s-label">Aktuelles Semester</span>
          <span className="s-val">
            WS 26/27 <Chev />
          </span>
        </div>
        <div className="setting-row">
          <span className="s-label">Archivierte Kurse anzeigen</span>
          <Toggle
            on={s.showArchived}
            onChange={set('showArchived')}
            label="Archivierte Kurse anzeigen"
          />
        </div>
        <div className="setting-row" {...clickable(demo('Sprache'))}>
          <span className="s-label">Sprache</span>
          <span className="s-val">
            Deutsch <Chev />
          </span>
        </div>

        <div className="sec">Über</div>
        <div className="setting-row">
          <span className="s-label">Version</span>
          <span className="s-val">HEy! 1.0.0</span>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-secondary" onClick={p.logout}>
            Abmelden
          </button>
          <button className="btn-danger" onClick={handleDeleteAccount} disabled={deleting}>
            {deleting ? 'Lösche Konto…' : 'Konto löschen'}
          </button>
        </div>
      </div>
    </>
  );
}

export function Notifications() {
  const { notifs, markAllRead, openNotif } = useApp();
  const fresh = notifs.filter((n) => n.unread);
  const old = notifs.filter((n) => !n.unread);
  const item = (n: (typeof notifs)[number]) => (
    <div key={n.id} className="notif-item" {...clickable(() => openNotif(n))}>
      <div className={`notif-dot${n.unread ? ' unread' : ''}`} />
      <div className="notif-body">
        <div className="notif-text">{n.html}</div>
        <div className="notif-time">{n.time}</div>
      </div>
    </div>
  );

  return (
    <>
      <MainHeader title="Benachrichtigungen" />
      <div className="scrollable">
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
          <div className="sec" style={{ flex: 1, paddingTop: 2 }}>
            Neu ({fresh.length})
          </div>
          <button
            className="text-btn"
            disabled={!fresh.length}
            onClick={markAllRead}
            style={{ fontSize: 13 }}
          >
            Alle lesen
          </button>
        </div>
        {fresh.map(item)}
        {!fresh.length && <div className="empty-state">Alles gelesen.</div>}
        {old.length > 0 && (
          <>
            <div className="sec">Früher</div>
            {old.map(item)}
          </>
        )}
      </div>
      <TabBar active="notifications" />
    </>
  );
}
