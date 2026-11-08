import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { bookingStatus, formatCurrency, formatDateShort, relativeTime, initials } from '../../lib/format';
import BarChart from '../../components/Dashboard/BarChart';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { PageLoader, Pagination } from '../../components/Feedback';
import classes from './AdminPage.module.css';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'safety', label: 'Safety queue' },
  { key: 'merchants', label: 'Partners' },
  { key: 'listings', label: 'Listings' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'audit', label: 'Audit trail' },
];

export default function AdminPage() {
  useDocumentTitle('Operations');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((item) => item.key === params.get('tab')) ? params.get('tab') : 'overview';
  const [page, setPage] = useState(1);
  const [riskStatus, setRiskStatus] = useState('');
  const [merchantStatus, setMerchantStatus] = useState('');
  const [merchantQuery, setMerchantQuery] = useState('');
  const [merchantApplied, setMerchantApplied] = useState('');
  const [listingQuery, setListingQuery] = useState('');
  const [listingApplied, setListingApplied] = useState('');
  const [listingStatus, setListingStatus] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [detailUser, setDetailUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data: overview, loading: overviewLoading, refetch: refetchOverview } = useFetch('/api/admin/overview?days=30');
  const riskUrl = `/api/admin/risk?page=${page}&pageSize=12${riskStatus ? `&status=${riskStatus}` : ''}`;
  const merchantUrl = `/api/admin/merchants?page=${page}&pageSize=12${merchantStatus ? `&status=${merchantStatus}` : ''}${merchantApplied ? `&q=${encodeURIComponent(merchantApplied)}` : ''}`;
  const listingUrl = `/api/admin/animals?page=${page}&pageSize=12${listingStatus ? `&moderationStatus=${listingStatus}` : ''}${listingApplied ? `&q=${encodeURIComponent(listingApplied)}` : ''}`;
  const reviewUrl = `/api/admin/reviews?page=${page}&pageSize=12${reviewStatus ? `&status=${reviewStatus}` : ''}`;
  const { data: risk, meta: riskMeta, loading: riskLoading, refetch: refetchRisk } = useFetch(riskUrl, { enabled: tab === 'safety' });
  const { data: merchants, meta: merchantMeta, loading: merchantsLoading, refetch: refetchMerchants } = useFetch(merchantUrl, { enabled: tab === 'merchants' });
  const { data: listings, meta: listingMeta, loading: listingsLoading, refetch: refetchListings } = useFetch(listingUrl, { enabled: tab === 'listings' });
  const { data: reviews, meta: reviewMeta, loading: reviewsLoading, refetch: refetchReviews } = useFetch(reviewUrl, { enabled: tab === 'reviews' });
  const { data: audit, loading: auditLoading, refetch: refetchAudit } = useFetch('/api/admin/audit', { enabled: tab === 'audit' });

  useEffect(() => {
    setPage(1);
  }, [tab, riskStatus, merchantStatus, listingStatus, reviewStatus]);

  const changeTab = (key) => {
    const next = new URLSearchParams(params);
    if (key === 'overview') next.delete('tab');
    else next.set('tab', key);
    setParams(next, { replace: true });
  };

  const openRisk = async (profile) => {
    setDetailUser(profile);
    setEvents([]);
    setEventsLoading(true);
    try {
      const response = await api.get(`/api/admin/risk/${profile.userId}/events`);
      setEvents(response.data.data || []);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load risk events.'));
    } finally {
      setEventsLoading(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err, 'That action failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={classes.page}>
      <div className={classes.head}>
        <div>
          <span className="eyebrow">Operations console</span>
          <h1>{TABS.find((item) => item.key === tab)?.label}</h1>
          <p>Private workspace for partner verification, moderation and the safety queue.</p>
        </div>
        <div className={classes.headBadge}>
          <Icon name="lock" size={16} />
          <span>Every action is logged</span>
        </div>
      </div>

      {tab === 'overview' && (
        overviewLoading ? <PageLoader /> : !overview ? <EmptyState icon="alert" title="Could not load operations data" /> : (
          <>
            <div className={classes.stats}>
              <div className={classes.stat}><span>Customers</span><strong>{overview.customers.total}</strong><small>+{overview.customers.new} in 30 days</small></div>
              <div className={classes.stat}><span>Active partners</span><strong>{overview.merchants.active}</strong><small>{overview.merchants.total} total</small></div>
              <div className={classes.stat}><span>Sandbox GMV</span><strong>{formatCurrency(overview.gmv)}</strong><small>lifetime succeeded payments</small></div>
              <div className={classes.stat}><span>Live bookings</span><strong>{overview.bookings.active}</strong><small>{overview.bookings.total} all time</small></div>
              <div className={classes.stat}><span>Risk queue</span><strong>{overview.risk.watch + overview.risk.flagged}</strong><small>{overview.risk.flagged} flagged · {overview.risk.watch} watch</small></div>
              <div className={classes.stat}><span>Hidden listings</span><strong>{overview.animals.hidden}</strong><small>{overview.animals.total} active listings</small></div>
            </div>

            <div className={classes.overviewGrid}>
              <section className={classes.panel}>
                <div className={classes.panelHead}><div><h2>New customers</h2><p>Last 30 days</p></div><strong className={classes.panelTotal}>{overview.customers.new}</strong></div>
                <BarChart data={overview.series} height={190} formatValue={(value) => `${value} customers`} label="New customer signups per day" />
              </section>
              <section className={classes.panel}>
                <div className={classes.panelHead}><div><h2>Safety status</h2><p>Derived profiles only</p></div><button type="button" className="btn btn-secondary btn-sm" onClick={() => changeTab('safety')}>Open queue</button></div>
                <div className={classes.riskBars}>
                  {[['ok', 'Steady'], ['watch', 'Watch'], ['flagged', 'Flagged']].map(([key, label]) => {
                    const total = Math.max(1, overview.risk.ok + overview.risk.watch + overview.risk.flagged);
                    const percent = Math.round(((overview.risk[key] || 0) / total) * 100);
                    return (
                      <div key={key} className={classes.riskBar}>
                        <div><span>{label}</span><strong>{overview.risk[key] || 0}</strong></div>
                        <div className={classes.riskTrack}><span className={classes[`risk_${key}`]} style={{ width: `${percent}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
                <p className={classes.riskNote}><Icon name="shield" size={14} /> No raw conversation text is available in operations.</p>
              </section>
            </div>

            <div className={classes.overviewGrid}>
              <section className={classes.panel}>
                <div className={classes.panelHead}><div><h2>Recent bookings</h2><p>Newest first</p></div><button type="button" className="btn btn-ghost btn-sm" onClick={() => changeTab('audit')}>Audit <Icon name="arrow-right" size={13} /></button></div>
                <ul className={classes.recentList}>
                  {overview.recentBookings.map((booking) => {
                    const state = bookingStatus(booking.status);
                    return (
                      <li key={booking._id}>
                        <span className={classes.recentAvatar}>{initials(booking.customerId?.name || 'Guest')}</span>
                        <div><strong>{booking.animalId?.name || 'Companion'}</strong><span>{booking.customerId?.name || 'Guest'} · {formatDateShort(booking.date)}</span></div>
                        <span className={`badge badge-${state.variant || 'info'}`}>{state.label}</span>
                        <strong className={classes.recentAmount}>{formatCurrency(booking.pricing?.total || 0)}</strong>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <section className={classes.panel}>
                <div className={classes.panelHead}><div><h2>Latest operations</h2><p>Append-only audit trail</p></div><button type="button" className="btn btn-ghost btn-sm" onClick={() => changeTab('audit')}>View all</button></div>
                <ul className={classes.auditList}>
                  {overview.recentAudit.map((event) => (
                    <li key={event._id}>
                      <span className={classes.auditDot} />
                      <div><strong>{event.action}</strong><span>{event.actorRole} · {event.targetType} {event.targetId?.slice(-6)}</span></div>
                      <time>{relativeTime(event.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )
      )}

      {tab === 'safety' && (
        <>
          <div className={classes.toolbar}>
            <div className="tabs">
              {[['', 'All'], ['flagged', 'Flagged'], ['watch', 'Watch'], ['ok', 'Steady']].map(([key, label]) => (
                <button key={key || 'all'} type="button" className={`tab ${riskStatus === key ? 'tab-active' : ''}`} onClick={() => setRiskStatus(key)}>{label}</button>
              ))}
            </div>
            <span className={classes.toolbarMeta}>{riskMeta?.counts ? `flagged ${riskMeta.counts.flagged || 0} · watch ${riskMeta.counts.watch || 0}` : ''}</span>
          </div>
          {riskLoading ? <PageLoader /> : !risk?.length ? <EmptyState icon="shield" title="The safety queue is clear">No elevated profiles match this filter.</EmptyState> : (
            <div className={classes.riskList}>
              {risk.map((profile) => (
                <article key={profile.userId} className={`${classes.riskCard} ${classes[`riskCard_${profile.status}`]}`}>
                  <div className={classes.riskCardHead}>
                    <span className="avatar">{initials(profile.customer?.name || 'Guest')}</span>
                    <div className={classes.riskIdentity}>
                      <strong>{profile.customer?.name || 'Unknown guest'}</strong>
                      <span>{profile.customer?.email || profile.userId}</span>
                    </div>
                    <span className={`badge badge-${profile.status === 'flagged' ? 'danger' : profile.status === 'watch' ? 'warning' : 'success'}`}>{profile.status}</span>
                    {profile.acknowledgedAt && <span className="badge">Acknowledged</span>}
                  </div>
                  <div className={classes.riskMetrics}>
                    <div><span>7-day score</span><strong>{profile.score7d}</strong></div>
                    <div><span>30-day score</span><strong>{profile.score30d}</strong></div>
                    <div><span>Events 7d</span><strong>{profile.events7d}</strong></div>
                    <div><span>Last signal</span><strong>{profile.lastRiskAt ? relativeTime(profile.lastRiskAt) : 'Never'}</strong></div>
                  </div>
                  {profile.adminNote && <p className={classes.adminNote}>{profile.adminNote}</p>}
                  <div className={classes.riskActions}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openRisk(profile)}>View signals</button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={Boolean(profile.acknowledgedAt)}
                      onClick={() => setConfirm({
                        title: 'Acknowledge this profile?',
                        body: 'This records that a human reviewed the derived signals. It does not change the underlying risk score.',
                        run: async () => {
                          await api.patch(`/api/admin/risk/${profile.userId}`, { action: 'acknowledge' });
                          toast.success('Profile acknowledged.');
                          setConfirm(null);
                          refetchRisk();
                        },
                      })}
                    >
                      Acknowledge
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setConfirm({
                        title: 'Resolve this profile?',
                        body: 'This marks the profile steady and clears the current flag. The history remains in the audit log.',
                        run: async () => {
                          await api.patch(`/api/admin/risk/${profile.userId}`, { action: 'resolve' });
                          toast.success('Profile resolved.');
                          setConfirm(null);
                          refetchRisk();
                        },
                      })}
                    >
                      Resolve
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <Pagination page={riskMeta?.page || 1} totalPages={riskMeta?.totalPages || 1} onChange={setPage} />
        </>
      )}

      {tab === 'merchants' && (
        <>
          <div className={classes.toolbar}>
            <form className={classes.searchForm} onSubmit={(event) => { event.preventDefault(); setPage(1); setMerchantApplied(merchantQuery.trim()); }}>
              <Icon name="search" size={15} />
              <input value={merchantQuery} onChange={(event) => setMerchantQuery(event.target.value)} placeholder="Search partners" aria-label="Search partners" />
            </form>
            <select className="select" value={merchantStatus} onChange={(event) => setMerchantStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          {merchantsLoading ? <PageLoader /> : !merchants?.length ? <EmptyState icon="users" title="No partners match" /> : (
            <div className={classes.tableWrap}>
              <table className={classes.table}>
                <thead><tr><th>Partner</th><th>Status</th><th>Listings</th><th>Bookings</th><th>Revenue</th><th>Rating</th><th /></tr></thead>
                <tbody>
                  {merchants.map((merchant) => (
                    <tr key={merchant.id}>
                      <td><div className={classes.identity}><span className="avatar avatar-sm">{initials(merchant.name)}</span><div><strong>{merchant.name}</strong><span>{merchant.email} · {merchant.city}</span></div></div></td>
                      <td><span className={`badge ${merchant.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{merchant.status}</span>{merchant.verified && <span className="badge badge-info" style={{ marginLeft: 4 }}>Verified</span>}</td>
                      <td>{merchant.listings}</td>
                      <td>{merchant.bookings}</td>
                      <td>{formatCurrency(merchant.revenue)}</td>
                      <td>{merchant.ratingAverage || '—'} <span className={classes.muted}>({merchant.reviewCount})</span></td>
                      <td className={classes.right}>
                        <button
                          type="button"
                          className={`btn btn-sm ${merchant.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => setConfirm({
                            title: merchant.status === 'active' ? `Suspend ${merchant.name}?` : `Reactivate ${merchant.name}?`,
                            body: merchant.status === 'active' ? 'Their public listings are hidden immediately. The partner can no longer sign in.' : 'The partner can sign in again. Listings stay private until they republish them.',
                            run: async () => {
                              await api.patch(`/api/admin/merchants/${merchant.id}`, { status: merchant.status === 'active' ? 'suspended' : 'active' });
                              toast.success('Partner status updated.');
                              setConfirm(null);
                              refetchMerchants();
                            },
                          })}
                        >
                          {merchant.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={merchantMeta?.page || 1} totalPages={merchantMeta?.totalPages || 1} onChange={setPage} />
        </>
      )}

      {tab === 'listings' && (
        <>
          <div className={classes.toolbar}>
            <form className={classes.searchForm} onSubmit={(event) => { event.preventDefault(); setPage(1); setListingApplied(listingQuery.trim()); }}>
              <Icon name="search" size={15} />
              <input value={listingQuery} onChange={(event) => setListingQuery(event.target.value)} placeholder="Search listings" aria-label="Search listings" />
            </form>
            <select className="select" value={listingStatus} onChange={(event) => setListingStatus(event.target.value)}>
              <option value="">All visibility</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          {listingsLoading ? <PageLoader /> : !listings?.length ? <EmptyState icon="paw" title="No listings match" /> : (
            <div className={classes.listingGrid}>
              {listings.map((animal) => (
                <article key={animal.id} className={classes.listingCard}>
                  {animal.imageUrl ? <img src={animal.imageUrl} alt="" /> : <span className={classes.listingPlaceholder}><Icon name="paw" size={26} /></span>}
                  <div className={classes.listingBody}>
                    <div className={classes.listingHead}>
                      <strong>{animal.name}</strong>
                      <span className={`badge ${animal.moderationStatus === 'hidden' ? 'badge-danger' : animal.isActive ? 'badge-success' : ''}`}>{animal.moderationStatus === 'hidden' ? 'Hidden' : animal.isActive ? 'Live' : 'Archived'}</span>
                    </div>
                    <span className={classes.listingMeta}>{animal.species} · {animal.city} · {formatCurrency(animal.price)}/hr</span>
                    <span className={classes.listingMeta}>{animal.merchant?.name} · {animal.merchant?.email}</span>
                    {animal.moderationNote && <p className={classes.moderationNote}>{animal.moderationNote}</p>}
                    <div className={classes.listingActions}>
                      <Link to={`/companions/${animal.id}`} className="btn btn-ghost btn-sm">View</Link>
                      <button
                        type="button"
                        className={`btn btn-sm ${animal.moderationStatus === 'hidden' ? 'btn-secondary' : 'btn-danger'}`}
                        onClick={() => setConfirm({
                          title: animal.moderationStatus === 'hidden' ? `Restore ${animal.name}?` : `Hide ${animal.name}?`,
                          body: animal.moderationStatus === 'hidden' ? 'The listing becomes visible again if the partner has it active and public.' : 'The listing disappears from discovery immediately. Existing bookings are not cancelled.',
                          run: async () => {
                            await api.patch(`/api/admin/animals/${animal.id}`, { moderationStatus: animal.moderationStatus === 'hidden' ? 'visible' : 'hidden', reason: 'Operations review' });
                            toast.success('Listing moderation updated.');
                            setConfirm(null);
                            refetchListings();
                          },
                        })}
                      >
                        {animal.moderationStatus === 'hidden' ? 'Restore' : 'Hide'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <Pagination page={listingMeta?.page || 1} totalPages={listingMeta?.totalPages || 1} onChange={setPage} />
        </>
      )}

      {tab === 'reviews' && (
        <>
          <div className={classes.toolbar}>
            <select className="select" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}>
              <option value="">All reviews</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
            </select>
            <span className={classes.toolbarMeta}>{reviewMeta?.total ?? 0} reviews</span>
          </div>
          {reviewsLoading ? <PageLoader /> : !reviews?.length ? <EmptyState icon="star" title="No reviews match" /> : (
            <div className={classes.reviewList}>
              {reviews.map((review) => (
                <article key={review.id} className={classes.reviewCard}>
                  <div className={classes.reviewHead}>
                    <span className="avatar avatar-sm">{initials(review.author?.name || 'Guest')}</span>
                    <div><strong>{review.author?.name}</strong><span>{review.animal?.name} · {review.merchant?.name} · {formatDateShort(review.createdAt)}</span></div>
                    <span className={`badge ${review.status === 'hidden' ? 'badge-danger' : 'badge-success'}`}>{review.status}</span>
                    <span className={classes.reviewRating}><Icon name="star-filled" size={13} /> {review.rating}</span>
                  </div>
                  {review.title && <h3>{review.title}</h3>}
                  {review.body && <p>{review.body}</p>}
                  <div className={classes.reviewActions}>
                    <button
                      type="button"
                      className={`btn btn-sm ${review.status === 'hidden' ? 'btn-secondary' : 'btn-danger'}`}
                      onClick={() => setConfirm({
                        title: review.status === 'hidden' ? 'Publish this review?' : 'Hide this review?',
                        body: 'Hiding a review removes it from public profiles and recalculates the companion’s rating.',
                        run: async () => {
                          await api.patch(`/api/admin/reviews/${review.id}`, { status: review.status === 'hidden' ? 'published' : 'hidden', reason: 'Operations review' });
                          toast.success('Review visibility updated.');
                          setConfirm(null);
                          refetchReviews();
                        },
                      })}
                    >
                      {review.status === 'hidden' ? 'Publish' : 'Hide'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <Pagination page={reviewMeta?.page || 1} totalPages={reviewMeta?.totalPages || 1} onChange={setPage} />
        </>
      )}

      {tab === 'audit' && (
        auditLoading ? <PageLoader /> : !audit?.length ? <EmptyState icon="list" title="No audit events yet" /> : (
          <div className={classes.tableWrap}>
            <table className={classes.table}>
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Metadata</th></tr></thead>
              <tbody>
                {audit.map((event) => (
                  <tr key={event.id}>
                    <td>{relativeTime(event.createdAt)}</td>
                    <td><span className="badge">{event.actorRole}</span></td>
                    <td><strong>{event.action}</strong></td>
                    <td>{event.targetType} <span className={classes.muted}>{event.targetId?.slice(-8)}</span></td>
                    <td className={classes.metadata}>{Object.keys(event.metadata || {}).length ? JSON.stringify(event.metadata) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal open={Boolean(detailUser)} onClose={() => setDetailUser(null)} title="Derived safety signals" description={detailUser ? `${detailUser.customer?.name || detailUser.userId} · no message content is exposed` : ''} size="lg">
        {eventsLoading ? <PageLoader label="Loading signals…" /> : events.length ? (
          <ul className={classes.events}>
            {events.map((event) => (
              <li key={event.id}>
                <span className={`badge ${event.level === 'high' ? 'badge-danger' : 'badge-warning'}`}>{event.level}</span>
                <strong>{event.animalName || 'Companion'}</strong>
                <span>score {event.score ?? '—'} · {event.source || 'signal'}</span>
                <time>{relativeTime(event.timestamp)}</time>
              </li>
            ))}
          </ul>
        ) : <p className="muted small">No individual signal events are available for this profile.</p>}
        <div className="notice" style={{ marginTop: 16 }}>
          <Icon name="lock" size={16} />
          <span>Events contain a level, score, source and timestamp. The raw conversation is never available to operators.</span>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        description={confirm?.body}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={runConfirm} disabled={busy}>{busy ? 'Working…' : 'Confirm'}</button>
          </>
        }
      >
        <div className="notice notice-warning"><Icon name="alert" size={16} /><span>This action is recorded in the audit trail.</span></div>
      </Modal>
    </div>
  );
}
