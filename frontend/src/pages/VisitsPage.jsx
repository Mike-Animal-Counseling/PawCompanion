import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { bookingStatus, formatCurrency, formatDate, formatTimeRange, timeUntil } from '../lib/format';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { PageLoader } from '../components/Feedback';
import classes from './VisitsPage.module.css';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All visits' },
];

function todayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function VisitsPage() {
  useDocumentTitle('My visits');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((item) => item.key === params.get('tab')) ? params.get('tab') : 'upcoming';
  const { data: bookings, loading, error } = useFetch('/api/bookings?pageSize=48');

  const { upcoming, past, next } = useMemo(() => {
    const today = todayString();
    const all = bookings || [];
    const isUpcoming = (booking) => ['pending', 'confirmed'].includes(booking.status) && booking.date >= today;
    const upcomingList = all
      .filter(isUpcoming)
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    const pastList = all.filter((booking) => !isUpcoming(booking));
    return { upcoming: upcomingList, past: pastList, next: upcomingList[0] };
  }, [bookings]);

  const visible = tab === 'upcoming' ? upcoming : tab === 'past' ? past : bookings || [];

  return (
    <div className={classes.page}>
      <div className="container">
        <div className="page-head">
          <div>
            <span className="eyebrow">Your time with companions</span>
            <h1 className="page-title" style={{ marginTop: 10 }}>My visits</h1>
            <p className="page-sub">
              Everything you have planned and everything you have already experienced. Cancel or reschedule up to
              24 hours before a visit.
            </p>
          </div>
          <Link to="/" className="btn btn-secondary">
            <Icon name="search" size={16} /> Find a companion
          </Link>
        </div>

        {next && (
          <div className={classes.nextCard}>
            <div className={classes.nextImage}>
              <img src={next.animal.imageUrl} alt="" />
            </div>
            <div className={classes.nextBody}>
              <span className={classes.nextLabel}>
                <span className={classes.pulse} /> Next visit · {timeUntil(`${next.date}T${next.startTime}:00`)}
              </span>
              <h2>{next.animal.name}</h2>
              <p>
                {formatDate(next.date, { weekday: true })} · {formatTimeRange(next.startTime, next.endTime)} · {next.service?.label || 'Visit'} · {next.merchant?.name}
              </p>
              <div className={classes.nextActions}>
                <Link to={`/visits/${next.id}`} className="btn btn-sm">View details</Link>
                <span className={`badge ${bookingStatus(next.status).variant ? `badge-${bookingStatus(next.status).variant}` : ''}`}>
                  {bookingStatus(next.status).label}
                </span>
                <span className={classes.nextPrice}>{formatCurrency(next.pricing.total)}</span>
              </div>
            </div>
            <div className={classes.nextHost}>
              <span className="eyebrow">Host</span>
              <strong>{next.merchant?.name}</strong>
              <span>{next.merchant?.city}</span>
            </div>
          </div>
        )}

        <div className={classes.tabsRow}>
          <div className="tabs" role="tablist" aria-label="Visit filters">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                className={`tab ${tab === item.key ? 'tab-active' : ''}`}
                onClick={() => {
                  const nextParams = new URLSearchParams(params);
                  if (item.key === 'upcoming') nextParams.delete('tab');
                  else nextParams.set('tab', item.key);
                  setParams(nextParams, { replace: true });
                }}
              >
                {item.label}
                <span className={classes.tabCount}>
                  {item.key === 'upcoming' ? upcoming.length : item.key === 'past' ? past.length : bookings?.length || 0}
                </span>
              </button>
            ))}
          </div>
          <span className={classes.hint}><Icon name="shield" size={14} /> Free cancellation 24h before</span>
        </div>

        {loading ? (
          <PageLoader label="Loading your visits…" />
        ) : error ? (
          <EmptyState icon="alert" title="Could not load visits" action={<button type="button" className="btn" onClick={() => window.location.reload()}>Reload</button>}>
            The API did not respond. Check that the backend is running.
          </EmptyState>
        ) : !visible.length ? (
          <EmptyState
            icon="calendar"
            title={tab === 'upcoming' ? 'No visits planned yet' : tab === 'past' ? 'No past visits yet' : 'No visits yet'}
            action={<Link to="/" className="btn">Browse companions</Link>}
          >
            {tab === 'upcoming'
              ? 'Find a companion, say hello, and book a two-hour visit when you are ready.'
              : 'Your completed and cancelled visits will appear here.'}
          </EmptyState>
        ) : (
          <div className={classes.grid}>
            {visible.map((booking) => {
              const status = bookingStatus(booking.status);
              return (
                <article key={booking.id} className={classes.card}>
                  <Link to={`/visits/${booking.id}`} className={classes.cardLink}>
                    <div className={classes.imageWrap}>
                      <img src={booking.animal.imageUrl} alt={booking.animal.name} />
                      <span className={`badge badge-${status.variant || 'info'} ${classes.status}`}>{status.label}</span>
                    </div>
                    <div className={classes.body}>
                      <div className={classes.cardHead}>
                        <div>
                          <h3>{booking.animal.name}</h3>
                          <p>{booking.merchant?.name} · {booking.merchant?.city}</p>
                        </div>
                        <span className={classes.price}>{formatCurrency(booking.pricing.total)}</span>
                      </div>
                      <div className={classes.metaRows}>
                        <span><Icon name="calendar" size={14} /> {formatDate(booking.date, { weekday: true, year: false })}</span>
                        <span><Icon name="clock" size={14} /> {formatTimeRange(booking.startTime, booking.endTime)}</span>
                        <span><Icon name={booking.service?.mode === 'online' ? 'chat' : 'paw'} size={14} /> {booking.service?.label || 'Visit'}</span>
                      </div>
                      <div className={classes.cardFooter}>
                        <span className={classes.reference}>#{booking.id.slice(-6).toUpperCase()}</span>
                        {booking.reviewId && <span className="badge badge-success"><Icon name="star-filled" size={11} /> Reviewed</span>}
                        {booking.paymentStatus === 'refunded' && <span className="badge">Refunded</span>}
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <div className={classes.footerNote}>
          <Icon name="help" size={17} />
          <div>
            <strong>Need to change something?</strong>
            <span>Open a visit to reschedule or cancel. For urgent issues, contact the host through your booking details. Payments in this build are sandboxed.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
