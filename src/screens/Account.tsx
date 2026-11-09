import { MainHeader, TabBar, clickable } from '../components/Layout';
import { useApp } from '../context/AppContext';

export function Notifications() {
  const { notifs, markAllRead, openNotif } = useApp();
  const fresh = notifs.filter((n) => n.unread);
  const old = notifs.filter((n) => !n.unread);
  const item = (n: (typeof notifs)[number]) => (
    <div key={n.id} className="notif-item" {...clickable(() => openNotif(n))}>
      <div className={`notif-dot${n.unread ? ' unread' : ''}`} />
      <div className="notif-body">
        <div className="notif-text">{n.html}</div>
        <div className="notif-time">{n.time}</div>
      </div>
    </div>
  );

  return (
    <>
      <MainHeader title="Benachrichtigungen" />
      <div className="scrollable">
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
          <div className="sec" style={{ flex: 1, paddingTop: 2 }}>
            Neu ({fresh.length})
          </div>
          <button
            className="text-btn"
            disabled={!fresh.length}
            onClick={markAllRead}
            style={{ fontSize: 13 }}
          >
            Alle lesen
          </button>
        </div>
        {fresh.map(item)}
        {!fresh.length && <div className="empty-state">Alles gelesen.</div>}
        <div className="sec">Früher</div>
        {old.map(item)}
      </div>
      <TabBar active="notifications" />
    </>
  );
}
