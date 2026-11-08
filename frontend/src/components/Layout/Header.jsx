import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';
import Icon from '../Icon';
import NotificationBell from './NotificationBell';
import { initials } from '../../lib/format';
import classes from './Header.module.css';

const PUBLIC_LINKS = [
  { to: '/', label: 'Discover', end: true },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/safety', label: 'Safety' },
];

export default function Header() {
  const { user, isCustomer, isMerchant, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const links = isCustomer
    ? [
        { to: '/', label: 'Home', end: true },
        { to: '/#companions', label: 'Discover' },
        { to: '/check-in', label: 'Check-in' },
        { to: '/chats', label: 'Messages' },
        { to: '/visits', label: 'My visits' },
        { to: '/safety', label: 'Safety' },
      ]
    : PUBLIC_LINKS;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const consoleLink = isMerchant ? '/merchant' : isAdmin ? '/admin' : null;

  return (
    <header className={classes.header}>
      <div className={`container ${classes.inner}`}>
        <Logo />

        <nav className={classes.nav} aria-label="Main navigation">
          {links.map((link) =>
            link.to.includes('#') ? (
              <Link key={link.to} to={link.to} className={classes.navLink}>
                {link.label}
              </Link>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `${classes.navLink} ${isActive ? classes.navLinkActive : ''}`}
              >
                {link.label}
              </NavLink>
            ),
          )}
          {consoleLink && (
            <Link to={consoleLink} className={classes.navLink}>
              {isMerchant ? 'Partner console' : 'Operations'}
            </Link>
          )}
        </nav>

        <div className={classes.actions}>
          {user ? (
            <>
              <NotificationBell />
              <div className={classes.user} ref={menuRef}>
                <button
                  type="button"
                  className={classes.userButton}
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <span className="avatar" style={{ background: user.avatarColor || undefined }}>
                    {initials(user.name)}
                  </span>
                  <span className={classes.userName}>{user.name?.split(' ')[0]}</span>
                  <Icon name="chevron-down" size={14} />
                </button>
                {menuOpen && (
                  <div className={classes.dropdown} role="menu">
                    <div className={classes.dropdownHead}>
                      <strong>{user.name}</strong>
                      <span className="muted small">{user.email}</span>
                    </div>
                    <Link to="/account" role="menuitem">
                      <Icon name="user" size={16} /> Account
                    </Link>
                    {isCustomer && (
                      <>
                        <Link to="/visits" role="menuitem">
                          <Icon name="calendar" size={16} /> My visits
                        </Link>
                        <Link to="/favorites" role="menuitem">
                          <Icon name="heart" size={16} /> Saved companions
                        </Link>
                        <Link to="/chats" role="menuitem">
                          <Icon name="chat" size={16} /> Messages
                        </Link>
                      </>
                    )}
                    {isMerchant && (
                      <Link to="/merchant" role="menuitem">
                        <Icon name="dashboard" size={16} /> Partner console
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin" role="menuitem">
                        <Icon name="shield" size={16} /> Operations
                      </Link>
                    )}
                    <button type="button" onClick={handleLogout} role="menuitem" className={classes.logout}>
                      <Icon name="logout" size={16} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost hide-mobile">
                Log in
              </Link>
              <Link to="/register" className="btn btn-sm hide-mobile">
                Join free
              </Link>
              <Link to="/register" className={`btn btn-sm ${classes.mobileJoin}`}>
                Join
              </Link>
            </>
          )}

          <button
            type="button"
            className={`icon-btn ${classes.burger}`}
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <Icon name={mobileOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={classes.mobilePanel}>
          <nav className={classes.mobileNav} aria-label="Mobile navigation">
            {links.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
                {link.label}
                <Icon name="chevron-right" size={16} />
              </Link>
            ))}
            {consoleLink && (
              <Link to={consoleLink} onClick={() => setMobileOpen(false)}>
                {isMerchant ? 'Partner console' : 'Operations'}
                <Icon name="chevron-right" size={16} />
              </Link>
            )}
          </nav>
          <div className={classes.mobileActions}>
            {user ? (
              <>
                <Link to="/account" className="btn btn-secondary btn-block" onClick={() => setMobileOpen(false)}>
                  Account
                </Link>
                <button type="button" className="btn btn-block" onClick={handleLogout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary btn-block" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
                <Link to="/register" className="btn btn-block" onClick={() => setMobileOpen(false)}>
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
