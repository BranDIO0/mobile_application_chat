import { useEffect } from 'react';
import { MainHeader, SubHeader, TabBar, LOGO_SRC, StatusBar, clickable } from './components/Layout';
import { AppProvider, useApp } from './context/AppContext';

function SplashPlaceholder() {
  const { finishSplash } = useApp();
  useEffect(() => {
    const t = setTimeout(finishSplash, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

function ScreenRouter() {
  const { screen } = useApp();
  if (screen === 'splash') return <SplashPlaceholder />;
  if (screen === 'chats' || screen === 'catalog' || screen === 'invitations' || screen === 'notifications') {
    return (
      <>
        <MainHeader title={screen === 'chats' ? 'Chats' : screen} />
        <div className="scrollable">
          <div className="empty-state">Screen „{screen}“ (wird in den nächsten Steps verbunden)</div>
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
  const { navKey, dir, toastMsg } = useApp();
  return (
    <main className="app-stage">
      <div className="phone">
        <div className="island" aria-hidden />
        <div key={navKey} className={`screen enter-${dir}`}>
          <ScreenRouter />
        </div>
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
