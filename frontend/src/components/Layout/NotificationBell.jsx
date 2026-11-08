import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { errorMessage } from '../../lib/api';
import { relativeTime } from '../../lib/format';
import Icon from '../Icon';
import classes from './NotificationBell.module.css';

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const wrapperRef = useRef(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await api.get('/api/notifications?pageSize=6');
      setItems(response.data.data || []);
      setUnread(response.data.meta?.unread || 0);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load notifications'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      return undefined;
    }
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [user, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const openItem = async (item) => {
    setOpen(false);
    if (!item.read) {
      try {
        await api.post(`/api/notifications/${item.id}/read`);
        setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
        setUnread((value) => Math.max(0, value - 1));
      } catch {
        // Navigating is more important than the read receipt.
      }
    }
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    try {
      await api.post('/api/notifications/read-all');
      setItems((current) => current.map((entry) => ({ ...entry, read: true })));
      setUnread(0);
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  return (
    <div className={classes.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`icon-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Icon name="bell" size={19} />
        {unread > 0 && <span className={classes.dot} aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className={classes.panel} role="dialog" aria-label="Notifications">
          <div className={classes.head}>
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          {loading && items.length === 0 ? (
            <p className={classes.empty}>Loading…</p>
          ) : error ? (
            <p className={classes.empty}>{error}</p>
          ) : items.length === 0 ? (
            <p className={classes.empty}>You are all caught up.</p>
          ) : (
            <ul className={classes.list}>
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" className={`${classes.item} ${item.read ? '' : classes.unread}`} onClick={() => openItem(item)}>
                    <span className={classes.itemIcon}>
                      <Icon name={item.type.includes('safety') ? 'shield' : item.type.includes('review') ? 'star' : item.type.includes('booking') ? 'calendar' : 'sparkles'} size={16} />
                    </span>
                    <span className={classes.itemBody}>
                      <span className={classes.itemTitle}>{item.title}</span>
                      {item.body && <span className={classes.itemText}>{item.body}</span>}
                      <span className={classes.time}>{relativeTime(item.createdAt)}</span>
                    </span>
                    {!item.read && <span className={classes.unreadDot} aria-label="Unread" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to="/account" className={classes.footer} onClick={() => setOpen(false)}>
            Notification settings <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
