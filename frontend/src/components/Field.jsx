import React from 'react';

export default function Field({ label, htmlFor, hint, error, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
}
