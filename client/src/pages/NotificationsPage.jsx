import { useState, useEffect } from 'react';
import { api } from '../api';
import { BellIcon } from '../components/Icons';

const TYPE_LABELS = {
  new_request: 'New borrow request',
  request_accepted: 'Request accepted',
  request_declined: 'Request declined',
  new_message: 'New message',
  review_prompt: 'Leave a review',
};

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.get('/notifications');
      setNotifications(data.notifications);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markRead(id) {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_read: 1 } : n)
      );
    } catch {}
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => api.put(`/notifications/${n.id}/read`, {}).catch(() => {})));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          {unreadCount > 0 && (
            <p className="page-subtitle">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading && <div className="loading"><div className="spinner" />Loading…</div>}

      {!loading && notifications.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><BellIcon size={44} /></div>
          <h3>No notifications yet</h3>
          <p>Activity on your listings and requests will appear here.</p>
        </div>
      )}

      {!loading && (
        <div className="notif-list">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item${!n.is_read ? ' unread' : ''}`}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className={`notif-dot${n.is_read ? ' read' : ''}`} />
              <div className="notif-content">
                <div className="notif-text">
                  <strong style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {TYPE_LABELS[n.type] || n.type}
                  </strong>
                  <div style={{ marginTop: 2 }}>{n.content}</div>
                </div>
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
