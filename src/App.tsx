import { type ComponentType, type CSSProperties } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import type { ScreenId } from './data/catalog';
import { Notifications, Profile, Settings } from './screens/Account';
import { Login, Onboarding, Register, Splash } from './screens/Auth';
import { Archive, ChatView, Chats, ModuleModal, SendFailDialog, SubgroupModal } from './screens/Chat';
import { Catalog, FileView, FreeGroup, Invitations, Invite } from './screens/Groups';

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
};

function PhoneShell() {
  const { screen, navKey, dir, subgroupModal, moduleModalOpen, sendFail, settings, toastMsg } = useApp();
  const Screen = SCREENS[screen];
  const fontScale = { standard: 1, large: 1.15, xlarge: 1.3 }[settings.fontScale];

  return (
    <main className="app-stage">
      <div
        className={`phone${settings.highContrast ? ' high-contrast' : ''}${settings.showTabLabels ? ' tab-labels-visible' : ''}`}
        style={{ '--font-scale': fontScale } as CSSProperties}
      >
        <div className="island" aria-hidden />
        <div key={navKey} className={`screen enter-${dir}`}>
          <Screen />
        </div>
        {subgroupModal && <SubgroupModal />}
        {moduleModalOpen && <ModuleModal />}
        {screen === 'chat' && sendFail && <SendFailDialog />}
        {toastMsg && (
          <div key={toastMsg.id} className="toast" role="status">
            {toastMsg.text}
          </div>
        )}
        <div className="home-indicator" aria-hidden />
      </div>
    </main>
  );
}

export default function App() {
  return (
    <AppProvider>
      <PhoneShell />
    </AppProvider>
  );
}
