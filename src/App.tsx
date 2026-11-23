import { type ComponentType } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import type { ScreenId } from './data/catalog';
import { Notifications, Profile, Settings } from './screens/Account';
import { Login, Onboarding, Register, Splash } from './screens/Auth';
import { Archive, ChatView, Chats, ModuleModal, SubgroupModal } from './screens/Chat';
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
  const { screen, navKey, dir, subgroupModal, moduleModalOpen, toastMsg, settings } = useApp();
  const Screen = SCREENS[screen];

  const fontScaleValue =
    settings.fontSizeScale === '130' ? '1.3' : settings.fontSizeScale === '115' ? '1.15' : '1';

  return (
    <main className="app-stage">
      <div
        className="phone"
        data-high-contrast={settings.highContrast ? 'true' : 'false'}
        data-font-scale={settings.fontSizeScale}
        data-reduced-motion={settings.reducedMotion ? 'true' : 'false'}
        style={{ '--font-scale': fontScaleValue } as React.CSSProperties}
      >
        <div className="island" aria-hidden />
        <div key={navKey} className={`screen enter-${dir}`}>
          <Screen />
        </div>
        {subgroupModal && <SubgroupModal />}
        {moduleModalOpen && <ModuleModal />}
        {toastMsg && (
          <div key={toastMsg.id} className="toast" role="status" aria-live="polite">
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
