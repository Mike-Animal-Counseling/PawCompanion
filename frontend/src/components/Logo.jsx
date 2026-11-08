import React from 'react';
import { Link } from 'react-router-dom';
import classes from './Logo.module.css';

export default function Logo({ to = '/', inverted = false, compact = false }) {
  return (
    <Link to={to} className={`${classes.logo} ${inverted ? classes.inverted : ''}`} aria-label="PawCompanion home">
      <span className={classes.mark} aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="9" cy="12.5" r="2.4" fill="currentColor" />
          <circle cx="13.8" cy="8" r="2.4" fill="currentColor" />
          <circle cx="19.6" cy="8" r="2.4" fill="currentColor" />
          <circle cx="24" cy="12.5" r="2.4" fill="currentColor" />
          <path
            d="M16.5 15c-4 0-7.3 2.7-7.3 5.8 0 2.3 1.9 3.6 4.3 3.6 1.2 0 2.1-.45 3-.45s1.8.45 3 .45c2.4 0 4.3-1.3 4.3-3.6 0-3.1-3.3-5.8-7.3-5.8Z"
            fill="currentColor"
          />
        </svg>
      </span>
      {!compact && (
        <span className={classes.word}>
          Paw<span>Companion</span>
        </span>
      )}
    </Link>
  );
}
