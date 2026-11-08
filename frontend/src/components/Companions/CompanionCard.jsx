import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, speciesLabel } from '../../lib/format';
import Icon from '../Icon';
import Rating from '../Rating';
import classes from './CompanionCard.module.css';

export default function CompanionCard({ animal, priority = false }) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const favorite = isFavorite(animal.id);

  const onFavorite = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      toast.info('Sign in to save companions for later.');
      navigate('/login', { state: { from: location } });
      return;
    }
    if (user.role !== 'customer') return;
    try {
      await toggle(animal.id);
    } catch {
      // The context already reports the failure.
    }
  };

  return (
    <article className={classes.card}>
      <Link to={`/companions/${animal.id}`} className={classes.link} aria-label={`Meet ${animal.name}`}>
        <div className={classes.media}>
          {animal.imageUrl ? (
            <img src={animal.imageUrl} alt={`${animal.name}, a ${animal.breed || speciesLabel(animal.species)}`} loading={priority ? 'eager' : 'lazy'} />
          ) : (
            <div className={classes.placeholder}>
              <Icon name="paw" size={42} />
            </div>
          )}
          <div className={classes.badges}>
            {animal.merchant?.verified && (
              <span className={`badge badge-dark ${classes.verified}`}>
                <Icon name="shield" size={12} /> Verified host
              </span>
            )}
            {animal.featured && <span className="badge badge-coral">Guest favourite</span>}
          </div>
          <button
            type="button"
            className={`${classes.favorite} ${favorite ? classes.favoriteActive : ''}`}
            onClick={onFavorite}
            aria-label={favorite ? `Remove ${animal.name} from saved` : `Save ${animal.name}`}
            aria-pressed={favorite}
          >
            <Icon name={favorite ? 'heart-filled' : 'heart'} size={18} />
          </button>
        </div>

        <div className={classes.body}>
          <div className={classes.headRow}>
            <div>
              <h3 className={classes.name}>{animal.name}</h3>
              <p className={classes.meta}>
                {speciesLabel(animal.species)}
                {animal.breed ? ` · ${animal.breed}` : ''} · {animal.ageLabel}
              </p>
            </div>
            <Rating value={animal.ratingAverage} count={animal.reviewCount} showValue={false} size={13} />
          </div>

          {animal.personality && <p className={classes.personality}>{animal.personality}</p>}

          <div className={classes.tags}>
            {(animal.tags || []).slice(0, 3).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          <div className={classes.footer}>
            <span className={classes.location}>
              <Icon name="map-pin" size={14} /> {animal.city || 'Online'}
            </span>
            <span className={classes.price}>
              <strong>{formatCurrency(animal.price)}</strong>
              <small>/ hour</small>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
