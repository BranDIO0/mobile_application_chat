import { type KeyboardEvent, type ReactNode } from 'react';
import {
  BatteryFull,
  Bell,
  ChevronLeft,
  LibraryBig,
  Mail,
  MessagesCircle,
  Signal,
  Wifi,
} from 'lucide-react';
import type { ScreenId } from '../data/catalog';
import { useApp } from '../context/AppContext';

export const LOGO_SRC = '/assets/hey-logo.png';

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
  );
}

export function BackBtn({ onClick, icon }: { onClick?: () => void; icon?: ReactNode }) {
  const { back } = useApp();
  return (
    <button className="icon-btn" aria-label="Zurück" onClick={onClick ?? back}>
      {icon ?? <ChevronLeft size={26} strokeWidth={2.2} />}
    </button>
  );
}

/** Large title header used on tab-root screens (matches the "Chats" wireframe). */
export function MainHeader({ title }: { title: string }) {
  const { navigate, displayName, stack } = useApp();
  return (
    <>
      <StatusBar />
      <div className="main-header">
        {stack.length > 1 && <BackBtn />}
        <h1>{title}</h1>
        <button className="avatar" aria-label="Profil" onClick={() => navigate('profile')}>
          {displayName.trim()[0]?.toUpperCase() ?? 'A'}
        </button>
      </div>
    </>
  );
}

export function SubHeader({
  title,
  sub,
  back = true,
  backIcon,
  children,
}: {
  title: ReactNode;
  sub?: ReactNode;
  back?: boolean;
  backIcon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <StatusBar />
      <div className="sub-header" style={back ? undefined : { paddingLeft: 18 }}>
        {back && <BackBtn icon={backIcon} />}
        <div className="titles">
          <div className="title">{title}</div>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {children}
      </div>
    </>
  );
}

/** Makes a non-button element keyboard- and click-accessible. */
export function clickable(onClick: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
  };
}

const TABS = [
  { id: 'chats', Icon: MessagesCircle, label: 'Chats' },
  { id: 'catalog', Icon: LibraryBig, label: 'Modulkatalog' },
  { id: 'invitations', Icon: Mail, label: 'Einladungen' },
  { id: 'notifications', Icon: Bell, label: 'Benachrichtigungen' },
] as const satisfies readonly { id: ScreenId; Icon: unknown; label: string }[];

/** Footer per Figma component: icon-only tabs, red bar above the active tab. */
export function TabBar({ active }: { active: ScreenId }) {
  const { tab, invitations, notifs } = useApp();
  const open = invitations.filter((i) => i.status === 'open').length;
  const unread = notifs.some((n) => n.unread);
  return (
    <nav className="tab-bar">
      {TABS.map(({ id, Icon, label }) => {
        const on = id === active;
        return (
          <button
            key={id}
            className={`tab${on ? ' active' : ''}`}
            onClick={() => tab(id)}
            aria-label={label}
            aria-current={on ? 'page' : undefined}
          >
            <Icon size={30} strokeWidth={on ? 2.1 : 1.7} />
            {id === 'invitations' && open > 0 && <span className="tab-badge">{open}</span>}
            {id === 'notifications' && unread && <span className="tab-dot" />}
          </button>
        );
      })}
    </nav>
  );
}
