import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Header, type Tab } from './components/Header';
import { AuthPanel } from './components/auth/AuthPanel';
import { ApiTestPage } from './pages/ApiTestPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  const {
    userId,
    setUserId,
    token,
    setToken,
    validatingSession,
    loggingOut,
    sessionError,
    logout,
    deleteAccount,
  } = useAuth();
  const [tab, setTab] = useState<Tab>('chat');
  const [deletedUser, setDeletedUser] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    const idToDelete = userId;
    await deleteAccount();
    setDeletedUser(idToDelete);
  };

  const handleToken = (newToken: string) => {
    setDeletedUser(null);
    setToken(newToken);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        tab={tab}
        onTabChange={setTab}
        userId={userId}
        loggedIn={!!token}
        validatingSession={validatingSession}
        loggingOut={loggingOut}
        onLogout={logout}
      />

      <main className="flex-1 p-4 sm:p-6">
        {deletedUser && !token && (
          <div className="mx-auto mb-4 max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs text-emerald-800">
            Account <b className="font-mono">{deletedUser}</b> wurde dauerhaft gelöscht.
          </div>
        )}

        {tab === 'test' && (
          <ApiTestPage
            userId={userId}
            setUserId={setUserId}
            token={token}
            setToken={handleToken}
          />
        )}

        {tab === 'chat' &&
          (token ? (
            <ChatPage token={token} userId={userId} />
          ) : (
            <AuthPanel
              userId={userId}
              setUserId={setUserId}
              onToken={handleToken}
              sessionError={sessionError}
              onOpenApiTest={() => setTab('test')}
            />
          ))}

        {tab === 'profile' &&
          (token ? (
            <ProfilePage
              token={token}
              userId={userId}
              onDeleteAccount={handleDeleteAccount}
            />
          ) : (
            <AuthPanel
              userId={userId}
              setUserId={setUserId}
              onToken={handleToken}
              sessionError={sessionError}
              onOpenApiTest={() => setTab('test')}
            />
          ))}
      </main>
    </div>
  );
}
