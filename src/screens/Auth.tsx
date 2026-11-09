import { useEffect, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { LOGO_SRC, StatusBar, SubHeader, clickable } from '../components/Layout';
import { useApp } from '../context/AppContext';

export function Splash() {
  const { finishSplash, validatingSession } = useApp();

  useEffect(() => {
    if (validatingSession) return;
    const t = setTimeout(finishSplash, 1400);
    return () => clearTimeout(t);
  }, [validatingSession, finishSplash]);

  return (
    <>
      <StatusBar />
      <div className="splash" {...clickable(finishSplash)} aria-label="Weiter">
        <img src={LOGO_SRC} alt="HEy! Logo" />
        <div className="splash-name">HEy!</div>
        <div className="splash-sub">Hochschul-Kommunikation</div>
        <div className="loader" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="splash-hint">Sitzung wird geprüft...</div>
      </div>
    </>
  );
}

function Checkbox({
  on,
  onChange,
  children,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className="checkbox-row"
      onClick={() => onChange(!on)}
      role="checkbox"
      aria-checked={on}
    >
      <span className={`checkbox-box${on ? ' on' : ''}`}>
        {on && <Check size={13} strokeWidth={3} />}
      </span>
      <span>{children}</span>
    </button>
  );
}

function ModePillSelector({ disabled }: { disabled?: boolean }) {
  const { serverMode, setServerMode, toast } = useApp();
  const options: { id: 'live' | 'backup' | 'mock'; label: string; toastText: string }[] = [
    {
      id: 'live',
      label: 'HSE-Live',
      toastText: 'HSE-Server (www2.hs-esslingen.de) aktiv',
    },
    {
      id: 'backup',
      label: 'Backup-Server',
      toastText: 'Backup-Server (api.chat.throin.de) aktiv',
    },
    {
      id: 'mock',
      label: 'Mockup',
      toastText: 'Mockup-Daten (Lokaler Server) aktiv',
    },
  ];

  return (
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
      {options.map((opt) => {
        const active = serverMode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              setServerMode(opt.id);
              toast(opt.toastText);
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
  );
}

export function Login() {
  const { login, navigate, remember, userId, mockMode } = useApp();
  const [id, setId] = useState(userId);
  const [pw, setPw] = useState('');
  const [keep, setKeep] = useState(remember);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <StatusBar />
      <form
        className="form-body"
        style={{ paddingTop: 22, gap: 14 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (loading) return;
          setLoading(true);
          setErr(null);
          const effectivePw = pw || (mockMode ? 'password123' : '');
          const errorMsg = await login(id, effectivePw, keep);
          if (errorMsg) setErr(errorMsg);
          setLoading(false);
        }}
      >
        <div className="brand" style={{ marginBottom: 4 }}>
          <img src={LOGO_SRC} alt="HEy! Logo" />
          <div className="brand-name">HEy!</div>
          <div className="brand-sub">Anmelden mit Hochschulkürzel</div>
        </div>

        <ModePillSelector disabled={loading} />

        <div className="field">
          <label htmlFor="l-id">Hochschulkürzel (User-ID)</label>
          <input
            id="l-id"
            className={err ? 'invalid' : ''}
            type="text"
            placeholder="z. B. jaehit00"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              if (err) setErr(null);
            }}
            autoComplete="username"
            disabled={loading}
          />
          <span className="hint">Format: 4 Buchstaben + &quot;it&quot; + 2 Ziffern (z. B. jaehit00)</span>
        </div>
        <div className="field" style={{ marginTop: 2 }}>
          <label htmlFor="l-pw">Passwort</label>
          <input
            id="l-pw"
            className={err ? 'invalid' : ''}
            type="password"
            placeholder={mockMode ? 'Optional im Mock-Modus' : 'Mind. 6 Zeichen'}
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              if (err) setErr(null);
            }}
            autoComplete="current-password"
            disabled={loading}
          />
          {err && <span className="error">{err}</span>}
        </div>
        <Checkbox on={keep} onChange={setKeep}>
          Angemeldet bleiben (Auto-Login)
        </Checkbox>
        <button type="submit" className="btn-primary" style={{ marginTop: 10 }} disabled={loading}>
          {loading ? 'Anmelden…' : 'Anmelden'}
        </button>
        <div className="link-row">
          Noch kein Konto? <a {...clickable(() => navigate('register'))}>Jetzt registrieren</a>
        </div>
      </form>
    </>
  );
}

const USER_ID_REGEX = /^[a-zA-Z]{4}it\d{2}$/;

export function Register() {
  const { register, back } = useApp();
  const [id, setId] = useState('');
  const [nickname, setNickname] = useState('');
  const [fullname, setFullname] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  const errId =
    tried && !id.trim()
      ? 'Bitte Hochschulkürzel eingeben'
      : tried && !USER_ID_REGEX.test(id.trim())
        ? 'Ungültiges Kürzel (4 Buchstaben + "it" + 2 Ziffern, z. B. jaehit00)'
        : '';
  const errNick =
    tried && nickname.trim().length > 0 && nickname.trim().length < 2
      ? 'Mindestens 2 Zeichen'
      : '';
  const errPw = tried && pw.length < 6 ? 'Mindestens 6 Zeichen' : '';
  const errPw2 = tried && pw2 !== pw ? 'Passwörter stimmen nicht überein' : '';

  return (
    <>
      <SubHeader title="Registrieren" />
      <form
        className="form-body"
        style={{ gap: 11 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTried(true);
          setServerErr(null);
          if (
            !id.trim() ||
            !USER_ID_REGEX.test(id.trim()) ||
            pw.length < 6 ||
            pw !== pw2 ||
            loading
          ) {
            return;
          }
          setLoading(true);
          const nick = nickname.trim() || id.trim().slice(0, 4);
          const full = fullname.trim() || nickname.trim() || `${id.trim()} Student`;
          const errorMsg = await register(id, nick, full, pw);
          if (errorMsg) setServerErr(errorMsg);
          setLoading(false);
        }}
      >
        <ModePillSelector disabled={loading} />

        <div className="field">
          <label htmlFor="r-id">Hochschulkürzel (User-ID) *</label>
          <input
            id="r-id"
            className={errId || serverErr ? 'invalid' : ''}
            type="text"
            placeholder="z. B. jaehit00"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              if (serverErr) setServerErr(null);
            }}
            disabled={loading}
          />
          {errId ? (
            <span className="error">{errId}</span>
          ) : serverErr ? (
            <span className="error">{serverErr}</span>
          ) : (
            <span className="hint">Format: 4 Buchstaben + &quot;it&quot; + 2 Ziffern (z. B. jaehit00)</span>
          )}
        </div>
        <div className="field">
          <label htmlFor="r-nick">Nickname (Anzeigename)</label>
          <input
            id="r-nick"
            className={errNick ? 'invalid' : ''}
            type="text"
            placeholder="z. B. Jan (2–30 Zeichen)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={loading}
          />
          {errNick && <span className="error">{errNick}</span>}
        </div>
        <div className="field">
          <label htmlFor="r-full">Vollständiger Name</label>
          <input
            id="r-full"
            type="text"
            placeholder="z. B. Jan Ehrler (2–30 Zeichen)"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="r-pw">Passwort *</label>
          <input
            id="r-pw"
            className={errPw ? 'invalid' : ''}
            type="password"
            placeholder="Mind. 6 Zeichen"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            disabled={loading}
          />
          {errPw && <span className="error">{errPw}</span>}
        </div>
        <div className="field">
          <label htmlFor="r-pw2">Passwort bestätigen *</label>
          <input
            id="r-pw2"
            className={errPw2 ? 'invalid' : ''}
            type="password"
            placeholder="Passwort wiederholen"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            disabled={loading}
          />
          {errPw2 && <span className="error">{errPw2}</span>}
        </div>
        <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={loading}>
          {loading ? 'Erstelle Konto…' : 'Konto erstellen'}
        </button>
        <div className="link-row">
          Bereits registriert? <a {...clickable(back)}>Anmelden</a>
        </div>
      </form>
    </>
  );
}

const STEPS = [
  { n: 1, title: 'Kursen beitreten / Modul anlegen', desc: 'Wähle oder erstelle deine Fächer im Modulkatalog' },
  { n: 2, title: 'Lerngruppe erstellen', desc: 'Erstelle Unterräume für Projekte & Übungen' },
  { n: 3, title: 'Kommilitonen einladen', desc: 'Per Hochschulkürzel einladen' },
];

export function Onboarding() {
  const { userId, obDone, navigate, tab, setActiveChannelId, setSubgroupModal, channels, modules } =
    useApp();
  const next = STEPS.find((s) => !obDone.includes(s.n))?.n ?? 4;
  const progress = [33, 55, 78, 100][obDone.length] ?? 100;

  const go = (n: number) => {
    const firstActive = channels.find((c) => !c.archived)?.id ?? '0';
    const firstMod = modules.find((m) => m.joined)?.id ?? modules[0]?.id ?? 'mathe1';
    if (n === 1) navigate('catalog');
    if (n === 2) {
      setActiveChannelId(firstActive);
      navigate('chat');
      setSubgroupModal(firstMod);
    }
    if (n === 3) {
      setActiveChannelId(firstActive);
      navigate('invite');
    }
  };

  return (
    <>
      <StatusBar />
      <div className="main-header" style={{ paddingBottom: 12 }}>
        <h1 style={{ fontSize: 24 }}>Willkommen, {userId}!</h1>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="form-body" style={{ gap: 12, paddingTop: 18 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {next > 3 ? 'Alles erledigt!' : 'Schnellstart in 3 Schritten'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--g500)' }}>
            So nutzt du HEy! optimal für dein Studium.
          </div>
        </div>
        {STEPS.map((s) => {
          const done = obDone.includes(s.n);
          const cls = done ? ' done' : s.n === next ? '' : ' dim';
          return (
            <button key={s.n} className={`ob-step${cls}`} onClick={() => go(s.n)}>
              <div className="ob-num">{done ? <Check size={15} strokeWidth={3} /> : s.n}</div>
              <div className="ob-info">
                <div className="ob-title">{s.title}</div>
                <div className="ob-desc">{s.desc}</div>
              </div>
              <div className="ob-arrow">
                <ChevronRight size={20} />
              </div>
            </button>
          );
        })}
        <button
          className="btn-primary md"
          style={{ marginTop: 10 }}
          onClick={() => (next === 1 ? go(1) : tab('chats'))}
        >
          {next === 1 ? 'Zum Modulkatalog' : 'Zu den Chats'}
        </button>
        <div className="link-row">
          <a {...clickable(() => tab('chats'))}>Überspringen</a>
        </div>
      </div>
    </>
  );
}
