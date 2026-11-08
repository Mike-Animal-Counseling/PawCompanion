import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../Icon';
import classes from './MobileTabBar.module.css';

export default function MobileTabBar() {
  const { user, isCustomer, isMerchant, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const goCheckin = () => {
    if (user?.role !== 'customer') {
      toast.info('Sign in to save a daily check-in.');
      navigate('/login', { state: { from: { pathname: '/check-in' } } });
      return;
    }
    navigate('/check-in');
  };

  const items = [
    { key: 'home', to: '/', label: 'Home', icon: 'home' },
    { key: 'discover', to: '/#companions', label: 'Discover', icon: 'search' },
    { key: 'checkin', label: 'Check-in', action: goCheckin, center: true },
    { key: 'chats', to: isCustomer || !user ? '/chats' : isMerchant ? '/merchant' : '/admin', label: isMerchant ? 'Console' : isAdmin ? 'Console' : 'Chats', icon: isMerchant || isAdmin ? 'dashboard' : 'chat' },
    { key: 'me', to: user ? '/account' : '/login', label: 'Me', icon: 'user' },
  ];

  const isActive = (item) => {
    if (item.key === 'home') return location.pathname === '/';
    if (item.key === 'checkin') return location.pathname === '/check-in';
    if (item.key === 'chats') return location.pathname.startsWith('/chat') || location.pathname.startsWith('/merchant') || location.pathname.startsWith('/admin');
    if (item.key === 'me') return location.pathname === '/account';
    return false;
  };

  return (
    <nav className={classes.bar} aria-label="App navigation">
      {items.map((item) =>
        item.center ? (
          <button key={item.key} type="button" className={`${classes.item} ${classes.center} ${isActive(item) ? classes.active : ''}`} onClick={item.action}>
            <span className={classes.centerIcon}><Icon name="heart" size={22} /></span>
            <span>{item.label}</span>
          </button>
        ) : (
          <Link key={item.key} to={item.to} className={`${classes.item} ${isActive(item) ? classes.active : ''}`}>
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}
