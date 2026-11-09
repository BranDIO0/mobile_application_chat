import { useEffect, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { LOGO_SRC, StatusBar, SubHeader, clickable } from '../components'
import { useProto } from '../store'

export function Splash() {
  const { finishSplash } = useProto()
  useEffect(() => {
    const t = setTimeout(finishSplash, 1800)
    return () => clearTimeout(t)
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
  )
}

function Checkbox({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <button type="button" className="checkbox-row" onClick={() => onChange(!on)} role="checkbox" aria-checked={on}>
      <span className={`checkbox-box${on ? ' on' : ''}`}>{on && <Check size={13} strokeWidth={3} />}</span>
      <span>{children}</span>
    </button>
  )
}

export function Login() {
  const { login, navigate, remember } = useProto()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [keep, setKeep] = useState(remember)
  return (
    <>
      <StatusBar />
      <form
        className="form-body"
        style={{ paddingTop: 44, gap: 16 }}
        onSubmit={(e) => {
          e.preventDefault()
          login(id, keep)
        }}
      >
        <div className="brand" style={{ marginBottom: 10 }}>
          <img src={LOGO_SRC} alt="HEy! Logo" />
          <div className="brand-name">HEy!</div>
          <div className="brand-sub">Anmelden mit Hochschulkürzel</div>
        </div>
        <div className="field">
          <label htmlFor="l-id">Hochschulkürzel (User-ID)</label>
          <input id="l-id" type="text" placeholder="asesit00" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" />
        </div>
        <div className="field" style={{ marginTop: 6 }}>
          <label htmlFor="l-pw">Passwort</label>
          <input id="l-pw" type="password" placeholder="••••••••••••" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        </div>
        <Checkbox on={keep} onChange={setKeep}>
          Angemeldet bleiben (Auto-Login)
        </Checkbox>
        <button type="submit" className="btn-primary" style={{ marginTop: 18 }}>
          Anmelden
        </button>
        <div className="link-row">
          Noch kein Konto? <a {...clickable(() => navigate('register'))}>Jetzt registrieren</a>
        </div>
      </form>
    </>
  )
}

export function Register() {
  const { register, back } = useProto()
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [tried, setTried] = useState(false)
  const errId = tried && !id.trim() ? 'Bitte Hochschulkürzel eingeben' : ''
  const errPw = tried && pw.length < 8 ? 'Mindestens 8 Zeichen' : ''
  const errPw2 = tried && pw2 !== pw ? 'Passwörter stimmen nicht überein' : ''

  return (
    <>
      <SubHeader title="Registrieren" />
      <form
        className="form-body"
        style={{ gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault()
          setTried(true)
          if (id.trim() && pw.length >= 8 && pw === pw2) register(id, name)
        }}
      >
        <div className="field">
          <label htmlFor="r-id">Hochschulkürzel *</label>
          <input id="r-id" className={errId ? 'invalid' : ''} type="text" placeholder="asesit00" value={id} onChange={(e) => setId(e.target.value)} />
          {errId ? <span className="error">{errId}</span> : <span className="hint">Dein offizielles Kürzel — keine E-Mail nötig</span>}
        </div>
        <div className="field">
          <label htmlFor="r-name">Anzeigename (optional)</label>
          <input id="r-name" type="text" placeholder="z. B. Max M." value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="r-pw">Passwort *</label>
          <input id="r-pw" className={errPw ? 'invalid' : ''} type="password" placeholder="Mind. 8 Zeichen" value={pw} onChange={(e) => setPw(e.target.value)} />
          {errPw && <span className="error">{errPw}</span>}
        </div>
        <div className="field">
          <label htmlFor="r-pw2">Passwort bestätigen *</label>
          <input id="r-pw2" className={errPw2 ? 'invalid' : ''} type="password" placeholder="Passwort wiederholen" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {errPw2 && <span className="error">{errPw2}</span>}
        </div>
        <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
          Konto erstellen
        </button>
        <div className="link-row">
          Bereits registriert? <a {...clickable(back)}>Anmelden</a>
        </div>
      </form>
    </>
  )
}

const STEPS = [
  { n: 1, title: 'Kursen beitreten', desc: 'Wähle deine Fächer aus dem Modulkatalog' },
  { n: 2, title: 'Lerngruppe erstellen', desc: 'Erstelle Unterräume für Projekte' },
  { n: 3, title: 'Kommilitonen einladen', desc: 'Per Hochschulkürzel einladen' },
]

export function Onboarding() {
  const { userId, obDone, navigate, tab, setActiveChannelId, setSubgroupModal } = useProto()
  const next = STEPS.find((s) => !obDone.includes(s.n))?.n ?? 4
  const progress = [33, 55, 78, 100][obDone.length] ?? 100

  const go = (n: number) => {
    if (n === 1) navigate('catalog')
    if (n === 2) {
      setActiveChannelId('lg-a')
      navigate('chat')
      setSubgroupModal('mathe1')
    }
    if (n === 3) {
      setActiveChannelId('lg-a')
      navigate('invite')
    }
  }

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
          <div style={{ fontSize: 17, fontWeight: 700 }}>{next > 3 ? 'Alles erledigt!' : 'Schnellstart in 3 Schritten'}</div>
          <div style={{ fontSize: 13, color: 'var(--g500)' }}>So nutzt du HEy! optimal für dein Studium.</div>
        </div>
        {STEPS.map((s) => {
          const done = obDone.includes(s.n)
          const cls = done ? ' done' : s.n === next ? '' : ' dim'
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
          )
        })}
        <button className="btn-primary md" style={{ marginTop: 10 }} onClick={() => (next === 1 ? go(1) : tab('chats'))}>
          {next === 1 ? 'Zum Modulkatalog' : 'Zu den Chats'}
        </button>
        <div className="link-row">
          <a {...clickable(() => tab('chats'))}>Überspringen</a>
        </div>
      </div>
    </>
  )
}
