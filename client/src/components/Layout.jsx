import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  SearchIcon, ListIcon, InboxIcon, BellIcon, UserIcon, LogOutIcon
} from './Icons';

const NAV_LINKS = [
  { to: '/search', label: 'Search', Icon: SearchIcon, exact: true },
  { to: '/my-listings', label: 'My Listings', Icon: ListIcon },
  { to: '/requests', label: 'Requests', Icon: InboxIcon },
];

function useUnreadCount() {
  const [count, setCount] = useState(0);
  const { user } = useAuth();
  const location = useLocation();

  function refresh() {
    api.get('/notifications')
      .then((d) => setCount(d.notifications.filter((n) => !n.is_read).length))
      .catch(() => {});
  }

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, location.pathname]); // re-fetch on every navigation

  useEffect(() => {
    window.addEventListener('notif-refresh', refresh);
    return () => window.removeEventListener('notif-refresh', refresh);
  }, []);

  return count;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);
  const unread = useUnreadCount();

  const initials = user?.display_name
    ? user.display_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function isActive(to, exact) {
    return exact ? location.pathname === to : location.pathname.startsWith(to);
  }

  return (
    <>
      <nav className="layout-nav">
        <Link to="/" className="layout-logo">
          Neighborly
        </Link>

        <div className="layout-nav-links">
          {NAV_LINKS.map(({ to, label, Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link${isActive(to, exact) ? ' active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <button
            className={`nav-icon-btn${location.pathname === '/notifications' ? ' active' : ''}`}
            onClick={() => navigate('/notifications')}
            title="Notifications"
          >
            <BellIcon size={20} />
            {unread > 0 && <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>

          <div className="nav-dropdown-wrap" ref={dropRef}>
            <button
              className="nav-avatar"
              onClick={() => setDropdownOpen((o) => !o)}
              title="Account"
            >
              {initials}
            </button>
            {dropdownOpen && (
              <div className="nav-dropdown">
                <div className="nav-dropdown-header">
                  <div className="nav-dropdown-name">{user?.display_name}</div>
                  <div className="nav-dropdown-email">{user?.email}</div>
                </div>
                <button className="nav-dropdown-item" onClick={() => { navigate('/profile'); setDropdownOpen(false); }}>
                  <UserIcon size={15} /> Profile
                </button>
                <button className="nav-dropdown-item danger" onClick={logout}>
                  <LogOutIcon size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="layout-content">{children}</div>

      <nav className="bottom-tabs">
        {NAV_LINKS.map(({ to, label, Icon, exact }) => (
          <button
            key={to}
            className={`bottom-tab${isActive(to, exact) ? ' active' : ''}`}
            onClick={() => navigate(to)}
          >
            <Icon size={22} />
            <span className="bottom-tab-label">{label}</span>
          </button>
        ))}
        <button
          className={`bottom-tab${location.pathname === '/notifications' ? ' active' : ''}`}
          onClick={() => navigate('/notifications')}
        >
          <BellIcon size={22} />
          {unread > 0 && <span className="bottom-tab-badge">{unread > 9 ? '9+' : unread}</span>}
          <span className="bottom-tab-label">Alerts</span>
        </button>
        <button
          className={`bottom-tab${location.pathname === '/profile' ? ' active' : ''}`}
          onClick={() => navigate('/profile')}
        >
          <UserIcon size={22} />
          <span className="bottom-tab-label">Me</span>
        </button>
      </nav>
    </>
  );
}
