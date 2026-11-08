import React from 'react';
import Icon from './Icon';

export function Skeleton({ width = '100%', height = 16, radius = 8, className = '' }) {
  return <div className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="spinner" />
      <span className="muted small">{label}</span>
    </div>
  );
}

export function ButtonSpinner() {
  return <span className="spinner spinner-sm" aria-hidden="true" />;
}

export function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let index = start; index <= end; index += 1) pages.push(index);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        <Icon name="chevron-left" size={15} /> Previous
      </button>
      <div className="pagination-pages">
        {pages.map((value) => (
          <button
            key={value}
            type="button"
            className={`pagination-page ${value === page ? 'pagination-page-active' : ''}`}
            onClick={() => onChange(value)}
            aria-current={value === page ? 'page' : undefined}
          >
            {value}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Next <Icon name="chevron-right" size={15} />
      </button>
    </nav>
  );
}
