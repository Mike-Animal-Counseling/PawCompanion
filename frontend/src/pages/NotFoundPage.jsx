import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useFetch';
import Icon from '../components/Icon';
import classes from './NotFoundPage.module.css';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className={classes.page}>
      <div className="container">
        <div className={classes.card}>
          <span className={classes.paw}><Icon name="paw" size={40} /></span>
          <span className="eyebrow">404 · Off the path</span>
          <h1>This page wandered off.</h1>
          <p>
            The link may be old, or the companion may have moved on. The rest of the pack is still here, and the
            safety resources are always available.
          </p>
          <div className={classes.actions}>
            <Link to="/" className="btn">Back to discover</Link>
            <Link to="/safety" className="btn btn-secondary">Safety &amp; support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
