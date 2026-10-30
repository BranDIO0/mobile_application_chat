import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Header, type Tab } from './components/Header';
import { ApiTestPage } from './pages/ApiTestPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  const { userId, setUserId, token, setToken, logout, deleteAccount } = useAuth();
  const [tab, setTab] = useState<Tab>('test');

  return (
    <div className="flex min-h-screen flex-col">
      <Header tab={tab} onTabChange={setTab} userId={userId} loggedIn={!!token} onLogout={logout} />

      <main className="flex-1 p-6">
        {tab === 'test' && <ApiTestPage userId={userId} setUserId={setUserId} token={token} setToken={setToken} />}

        {tab === 'chat' &&
          (token ? (
            <ChatPage token={token} userId={userId} />
          ) : (
            <p className="card mx-auto max-w-md text-center text-sm">Please register or log in on the API Test tab first.</p>
          ))}

        {tab === 'profile' && <ProfilePage token={token} userId={userId} onDeleteAccount={deleteAccount} />}
      </main>
    </div>
  );
}
