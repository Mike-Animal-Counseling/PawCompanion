import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';
import Icon from '../Icon';
import NotificationBell from './NotificationBell';
import { initials } from '../../lib/format';
import classes from './ConsoleLayout.module.css';

export default function ConsoleLayout({ area, nav, homeLink }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (item) => {
    if (item.tab) {
      const params = new URLSearchParams(location.search);
      return location.pathname === item.path && (params.get('tab') || 'overview') === item.tab;
    }
    return item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={classes.shell}>
      <a href="#console-main" className="skip-link">
        Skip to content
      </a>

      {open && <button type="button" className={classes.overlay} onClick={() => setOpen(false)} aria-label="Close navigation" />}

      <aside className={`${classes.sidebar} ${open ? classes.sidebarOpen : ''}`}>
        <div className={classes.brandRow}>
          <Logo to={homeLink} inverted />
          <button type="button" className={classes.close} onClick={() => setOpen(false)} aria-label="Close navigation">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className={classes.areaLabel}>{area}</div>

        <nav className={classes.nav} aria-label={`${area} navigation`}>
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className={`${classes.navItem} ${isActive(item) ? classes.navItemActive : ''}`}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={classes.sidebarBottom}>
          <Link to="/" className={classes.siteLink}>
            <Icon name="external" size={15} /> View public site
          </Link>
          <div className={classes.userCard}>
            <span className="avatar" style={{ background: 'rgba(255,255,255,.14)' }}>
              {initials(user?.name)}
            </span>
            <div className={classes.userMeta}>
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
            <button type="button" onClick={handleLogout} aria-label="Sign out">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className={classes.main}>
        <div className={classes.topbar}>
          <div className={classes.topbarLeft}>
            <button type="button" className={`icon-btn ${classes.menu}`} onClick={() => setOpen(true)} aria-label="Open navigation">
              <Icon name="menu" size={21} />
            </button>
            <span className={classes.crumb}>{area}</span>
          </div>
          <div className={classes.topbarRight}>
            <NotificationBell />
            <Link to="/account" className={classes.topAvatar} aria-label="Account">
              <span className="avatar avatar-sm">{initials(user?.name)}</span>
            </Link>
          </div>
        </div>
        <main id="console-main" className={classes.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
