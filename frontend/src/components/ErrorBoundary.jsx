import React from 'react';
import classes from './ErrorBoundary.module.css';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the component stack in the console for local debugging without
    // shipping it to a third-party service.
    console.error('PawCompanion UI error', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className={classes.page}>
          <div className={classes.card}>
            <span className={classes.paw} aria-hidden="true">🐾</span>
            <h1>Something went wrong.</h1>
            <p>
              The page hit an unexpected error. Your account and bookings are safe. Reload to try again, or head
              back to discovery.
            </p>
            <div className={classes.actions}>
              <button type="button" className="btn" onClick={() => window.location.reload()}>
                Reload page
              </button>
              <a className="btn btn-secondary" href="/">Back to PawCompanion</a>
            </div>
            <details className={classes.details}>
              <summary>Technical details</summary>
              <code>{String(this.state.error?.message || this.state.error)}</code>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
