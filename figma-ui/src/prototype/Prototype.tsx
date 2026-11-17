import { useRef, useState, type ComponentType, type MouseEvent } from 'react'
import type { ScreenId } from './data'
import { SCREEN_META } from './meta'
import { JUMPS, useProto } from './store'
import { Login, Onboarding, Register, Splash } from './screens/Auth'
import { Archive, ChatView, Chats, SubgroupModal } from './screens/Chat'
import { Catalog, FileView, FreeGroup, Invitations, Invite } from './screens/Groups'
import { Notifications, Profile, Settings } from './screens/Account'

const SCREENS: Record<ScreenId, ComponentType> = {
  splash: Splash,
  login: Login,
  register: Register,
  onboarding: Onboarding,
  chats: Chats,
  chat: ChatView,
  archive: Archive,
  catalog: Catalog,
  freegroup: FreeGroup,
  invite: Invite,
  invitations: Invitations,
  file: FileView,
  profile: Profile,
  settings: Settings,
  notifications: Notifications,
}

const INTERACTIVE = 'button, a, [role="button"], input, select, textarea, label, form .field'

export function Prototype({ onRestart }: { onRestart: () => void }) {
  const p = useProto()
  const [hint, setHint] = useState(false)
  const [pinHint, setPinHint] = useState(false)
  const hintTimer = useRef<number>(0)
  const Screen = SCREENS[p.screen]
  const current = JUMPS.find((j) => j.id === p.currentJump)
  const meta = SCREEN_META[p.subgroupModal ? 'chat' : p.screen]

  const flashHotspots = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return
    clearTimeout(hintTimer.current)
    setHint(true)
    hintTimer.current = window.setTimeout(() => setHint(false), 700)
  }

  let lastSection = ''

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="proto-chrome sticky top-0 z-50 flex flex-wrap items-center gap-x-4 gap-y-2 bg-[var(--navy)] px-6 py-3.5 shadow-[var(--shadow-md)]">
        <h1 className="flex items-center gap-2.5 text-lg font-bold text-white">
          <img src="/assets/hey-appicon.png" alt="" className="h-8 w-8 rounded-lg" />
          HEy! — Klick-Prototyp
        </h1>
        <p className="text-xs text-white/60">Final prototype · WS 26/27</p>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setPinHint((v) => !v)}
            aria-pressed={pinHint}
            className={`rounded-md border px-3 py-1.5 text-xs text-white transition-colors ${pinHint ? 'border-[var(--red)] bg-[var(--red)]' : 'border-white/20 bg-white/10 hover:bg-white/20'}`}
          >
            Hotspots {pinHint ? 'an' : 'aus'}
          </button>
          <button onClick={onRestart} className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/20">
            ↺ Neustart
          </button>
        </div>
      </header>

      <div className="proto-chrome mx-auto w-full max-w-[1500px] px-4">
        <nav className="flex gap-1.5 overflow-x-auto pt-3 pb-1 [scrollbar-width:none]" aria-label="Screens">
          {JUMPS.map((j) => {
            const sep = j.section !== lastSection && lastSection !== ''
            lastSection = j.section
            const active = j.id === p.currentJump
            return (
              <span key={j.id} className="flex shrink-0 items-center gap-1.5">
                {sep && <span className="mx-1 h-4 w-px bg-[var(--g300)]" aria-hidden />}
                <button
                  onClick={() => p.jump(j.id)}
                  title={j.section}
                  className={`whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-1.5 text-[11px] font-medium transition-colors ${
                    active ? 'border-[var(--navy)] bg-[var(--navy)] text-white' : 'border-[var(--line)] bg-white text-[var(--g600)] hover:border-[var(--navy)] hover:text-[var(--navy)]'
                  }`}
                >
                  {j.num} {j.label}
                </button>
              </span>
            )
          })}
        </nav>
      </div>

      <main className="proto-stage flex flex-1 items-center justify-center gap-12 px-4 py-6">
        <div className={`phone${hint || pinHint ? ' hint' : ''}`} onClick={flashHotspots}>
          <div className="island" aria-hidden />
          <div key={p.navKey} className={`screen enter-${p.dir}`}>
            <Screen />
          </div>
          {p.subgroupModal && <SubgroupModal />}
          {p.toastMsg && (
            <div key={p.toastMsg.id} className="toast" role="status">
              {p.toastMsg.text}
            </div>
          )}
          <div className="home-indicator" aria-hidden />
        </div>

        <aside className="proto-chrome hidden w-[280px] shrink-0 flex-col gap-4 lg:flex">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--navy)] px-2 py-0.5 text-[10px] font-bold text-white">{current?.num}</span>
            <span className="text-[10px] font-bold uppercase tracking-[.8px] text-[var(--g500)]">{current?.section}</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--g900)]">{current?.label}</h2>
            <p className="mt-1 text-sm text-[var(--g600)]">{meta.desc}</p>
          </div>
          <div className="rounded-[var(--r-lg)] border-[1.5px] border-[var(--line)] bg-white p-4 shadow-[var(--shadow-sm)]">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[.6px] text-[var(--g500)]">Interaktionen</div>
            <ul className="flex flex-col gap-2">
              {meta.hints.map((h) => (
                <li key={h} className="flex gap-2 text-[13px] leading-snug text-[var(--g600)]">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--red)]" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs leading-relaxed text-[var(--g500)]">
            Tipp: Klicke auf eine leere Stelle im Screen, um alle klickbaren Bereiche kurz hervorzuheben. Über die Leiste oben springst du direkt zu jedem Screen.
          </p>
        </aside>
      </main>
    </div>
  )
}
