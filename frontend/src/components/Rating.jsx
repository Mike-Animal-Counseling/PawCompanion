import React from 'react';
import Icon from './Icon';

export default function Rating({ value = 0, count, size = 14, showValue = true, className = '' }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className={`rating ${className}`} aria-label={`${Number(value).toFixed(1)} out of 5${count ? ` from ${count} reviews` : ''}`}>
      {showValue && <span className="rating-value">{Number(value || 0).toFixed(1)}</span>}
      <span className="rating-stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((index) => (
          <Icon key={index} name={index <= rounded ? 'star-filled' : 'star'} size={size} />
        ))}
      </span>
      {typeof count === 'number' && <span className="rating-count">({count})</span>}
    </span>
  );
}
