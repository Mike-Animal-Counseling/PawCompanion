import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, speciesLabel } from '../../lib/format';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/Feedback';
import classes from './MerchantListingsPage.module.css';

function listingState(animal) {
  if (animal.moderationStatus === 'hidden') return { label: 'Hidden by review', className: 'badge-danger' };
  if (!animal.isActive) return { label: 'Archived', className: '' };
  if (animal.visibility === 'private') return { label: 'Paused', className: 'badge-warning' };
  return { label: 'Live', className: 'badge-success' };
}

export default function MerchantListingsPage() {
  useDocumentTitle('Listings');
  const toast = useToast();
  const { data: animals, loading, error, refetch } = useFetch('/api/merchant/animals');
  const [query, setQuery] = useState('');
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const filtered = useMemo(() => {
    if (!animals) return [];
    const term = query.trim().toLowerCase();
    if (!term) return animals;
    return animals.filter((animal) => `${animal.name} ${animal.breed} ${animal.species}`.toLowerCase().includes(term));
  }, [animals, query]);

  const archive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.delete(`/api/merchant/animals/${archiveTarget.id}`);
      toast.success(`${archiveTarget.name} archived.`);
      setArchiveTarget(null);
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not archive this listing.'));
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className={classes.page}>
      <div className={classes.head}>
        <div>
          <span className="eyebrow">Listings</span>
          <h1>Your companions</h1>
          <p>Publish, pause and update the companions guests can discover.</p>
        </div>
        <div className={classes.headActions}>
          <label className={classes.search}>
            <Icon name="search" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search listings" aria-label="Search listings" />
          </label>
          <Link to="/merchant/listings/new" className="btn"><Icon name="plus" size={16} /> Add companion</Link>
        </div>
      </div>

      {loading ? (
        <PageLoader label="Loading your listings…" />
      ) : error ? (
        <EmptyState icon="alert" title="Could not load listings" action={<button type="button" className="btn" onClick={refetch}>Try again</button>}>
          The partner API did not respond.
        </EmptyState>
      ) : !animals?.length ? (
        <EmptyState icon="paw" title="No companions yet" action={<Link to="/merchant/listings/new" className="btn">Create your first listing</Link>}>
          Add a companion profile with a photo, a short personality note and a two-hour visit price. You can pause it at any time.
        </EmptyState>
      ) : !filtered.length ? (
        <EmptyState icon="search" title="No listings match that search" action={<button type="button" className="btn btn-secondary" onClick={() => setQuery('')}>Clear search</button>}>
          Try a different name or breed.
        </EmptyState>
      ) : (
        <div className={classes.tableWrap}>
          <table className={classes.table}>
            <thead>
              <tr>
                <th>Companion</th>
                <th>Status</th>
                <th>Price</th>
                <th>Upcoming</th>
                <th>Rating</th>
                <th className={classes.actionsHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((animal) => {
                const state = listingState(animal);
                return (
                  <tr key={animal.id}>
                    <td>
                      <div className={classes.companion}>
                        {animal.imageUrl ? <img src={animal.imageUrl} alt="" /> : <span className={classes.thumb}><Icon name="paw" size={18} /></span>}
                        <div>
                          <Link to={`/companions/${animal.id}`} className={classes.name}>{animal.name}</Link>
                          <span>{speciesLabel(animal.species)}{animal.breed ? ` · ${animal.breed}` : ''} · {animal.city}</span>
                          <small>{animal.visibility === 'private' ? 'Private' : 'Public'} · {animal.tags?.slice(0, 2).join(', ')}</small>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${state.className}`}>{state.label}</span></td>
                    <td><strong className={classes.price}>{formatCurrency(animal.price)}</strong><span className={classes.per}>/ hr</span></td>
                    <td>
                      <span className={classes.upcoming}>{animal.stats?.upcoming || 0}</span>
                      <span className={classes.per}>visits</span>
                    </td>
                    <td>
                      <span className={classes.rating}><Icon name="star-filled" size={13} /> {animal.ratingAverage || '—'}</span>
                      <span className={classes.per}>{animal.reviewCount || 0} reviews</span>
                    </td>
                    <td>
                      <div className={classes.actions}>
                        <Link to={`/merchant/listings/${animal.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                        <Link to={`/merchant/availability?animal=${animal.id}`} className="btn btn-ghost btn-sm" title="Availability">
                          <Icon name="calendar" size={15} />
                        </Link>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArchiveTarget(animal)} disabled={!animal.isActive} title="Archive">
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={classes.tip}>
        <Icon name="shield" size={17} />
        <div>
          <strong>Listings are reviewed before they go live.</strong>
          <span>Keep photos genuine, describe temperament honestly, and never list an animal you cannot legally rehome or host.</span>
        </div>
      </div>

      <Modal
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title={`Archive ${archiveTarget?.name}?`}
        description="Archiving removes the listing from discovery. Existing completed visits and reviews are kept. You cannot archive a listing with upcoming visits."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setArchiveTarget(null)}>Keep listing</button>
            <button type="button" className="btn btn-danger" onClick={archive} disabled={archiving}>
              {archiving ? 'Archiving…' : 'Archive listing'}
            </button>
          </>
        }
      >
        <div className="notice notice-warning">
          <Icon name="alert" size={17} />
          <span>This can be reversed by editing the listing and making it public again, unless it was hidden by an operator.</span>
        </div>
      </Modal>
    </div>
  );
}
