import React, { useState } from 'react';
import Icon from '../Icon';
import { SPECIES_OPTIONS, SORT_OPTIONS } from '../../lib/constants';
import classes from './FilterBar.module.css';

export default function FilterBar({ filters, onChange, facets, resultCount, onReset }) {
  const [query, setQuery] = useState(filters.q || '');
  const species = facets?.species || [];
  const hasFilters = Boolean(filters.q || filters.species || filters.city || filters.sort !== 'recommended');

  const submit = (event) => {
    event.preventDefault();
    onChange({ ...filters, q: query.trim(), page: 1 });
  };

  const countFor = (value) => species.find((item) => item.species === value)?.count || 0;

  return (
    <div className={classes.wrapper}>
      <div className={classes.top}>
        <form className="search" onSubmit={submit} role="search">
          <Icon name="search" size={19} className={classes.searchIcon} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, breed or personality…"
            aria-label="Search companions"
          />
          <button type="submit" className="btn btn-sm">
            Search
          </button>
        </form>

        <label className={classes.sort}>
          <span>Sort</span>
          <select
            className="select"
            value={filters.sort}
            onChange={(event) => onChange({ ...filters, sort: event.target.value, page: 1 })}
            aria-label="Sort companions"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={classes.filterRow}>
        <div className={classes.chips}>
          {SPECIES_OPTIONS.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              className={`chip ${(filters.species || '') === option.value ? 'chip-active' : ''}`}
              onClick={() => onChange({ ...filters, species: option.value, page: 1 })}
            >
              {option.value === '' ? 'All companions' : option.label}
              {option.value && <span className={classes.count}>{countFor(option.value)}</span>}
            </button>
          ))}
        </div>

        <div className={classes.right}>
          {facets?.cities?.length > 0 && (
            <select
              className="select"
              value={filters.city || ''}
              onChange={(event) => onChange({ ...filters, city: event.target.value, page: 1 })}
              aria-label="Filter by city"
            >
              <option value="">All cities</option>
              {facets.cities.map((city) => (
                <option key={city.city} value={city.city}>
                  {city.city} ({city.count})
                </option>
              ))}
            </select>
          )}
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
              <Icon name="refresh" size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className={classes.summary}>
        <span>
          <strong>{resultCount ?? 0}</strong> companion{resultCount === 1 ? '' : 's'}
          {filters.q ? ` matching “${filters.q}”` : ''}
        </span>
        {facets?.priceRange && facets.priceRange.max > 0 && (
          <span className={classes.range}>
            ${facets.priceRange.min}–${facets.priceRange.max} / hour
          </span>
        )}
      </div>
    </div>
  );
}
