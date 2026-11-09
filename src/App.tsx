import { MainHeader, SubHeader, TabBar } from './components/Layout';
import { AppProvider, useApp } from './context/AppContext';
import { Login, Onboarding, Register, Splash } from './screens/Auth';
import { Archive, ChatView, Chats, SubgroupModal } from './screens/Chat';
import { Catalog, FileView, FreeGroup } from './screens/Groups';

function ScreenRouter() {
  const { screen } = useApp();
  if (screen === 'splash') return <Splash />;
  if (screen === 'login') return <Login />;
  if (screen === 'register') return <Register />;
  if (screen === 'onboarding') return <Onboarding />;
  if (screen === 'chats') return <Chats />;
  if (screen === 'chat') return <ChatView />;
  if (screen === 'archive') return <Archive />;
  if (screen === 'catalog') return <Catalog />;
  if (screen === 'freegroup') return <FreeGroup />;
  if (screen === 'file') return <FileView />;

  if (screen === 'invitations' || screen === 'notifications') {
    return (
      <>
        <MainHeader title={screen === 'invitations' ? 'Einladungen' : 'Benachrichtigungen'} />
        <div className="scrollable">
          <div className="empty-state">Screen „{screen}“ (wird in Step 5 verbunden)</div>
        </div>
        <TabBar active={screen} />
      </>
    );
  }
  return (
    <>
      <SubHeader title={screen} />
      <div className="form-body">
        <div className="empty-state">Screen „{screen}“ bereit für Migration.</div>
      </div>
    </>
  );
}

function PhoneShell() {
  const { navKey, dir, subgroupModal, toastMsg } = useApp();
  return (
    <main className="app-stage">
      <div className="phone">
        <div className="island" aria-hidden />
        <div key={navKey} className={`screen enter-${dir}`}>
          <ScreenRouter />
        </div>
        {subgroupModal && <SubgroupModal />}
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
