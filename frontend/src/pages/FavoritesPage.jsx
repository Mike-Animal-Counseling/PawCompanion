import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import CompanionCard from '../components/Companions/CompanionCard';
import EmptyState from '../components/EmptyState';
import { PageLoader } from '../components/Feedback';
import Icon from '../components/Icon';
import classes from './FavoritesPage.module.css';

export default function FavoritesPage() {
  useDocumentTitle('Saved companions');
  const { data: animals, loading, error } = useFetch('/api/favorites');

  return (
    <div className={classes.page}>
      <div className="container">
        <div className="page-head">
          <div>
            <span className="eyebrow">Your shortlist</span>
            <h1 className="page-title" style={{ marginTop: 10 }}>Saved companions</h1>
            <p className="page-sub">The ones you want to come back to. Nothing is booked until you choose a time.</p>
          </div>
          <Link to="/" className="btn btn-secondary">
            <Icon name="search" size={16} /> Find more
          </Link>
        </div>

        {loading ? (
          <PageLoader label="Loading your saved companions…" />
        ) : error ? (
          <EmptyState icon="alert" title="Could not load your saved companions" action={<button type="button" className="btn" onClick={() => window.location.reload()}>Reload</button>}>
            The API did not respond. Check the backend and try again.
          </EmptyState>
        ) : !animals?.length ? (
          <EmptyState
            icon="heart"
            title="Nothing saved yet"
            action={<Link to="/" className="btn">Browse companions</Link>}
          >
            Tap the heart on a companion card to keep them here for later. A shortlist is a low-pressure way to decide.
          </EmptyState>
        ) : (
          <div className={classes.grid}>
            {animals.map((animal) => (
              <CompanionCard key={animal.id} animal={animal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
