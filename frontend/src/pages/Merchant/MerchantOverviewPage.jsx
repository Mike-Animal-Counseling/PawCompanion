import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { bookingStatus, formatCurrency, formatDateShort, relativeTime, formatTime } from '../../lib/format';
import BarChart from '../../components/Dashboard/BarChart';
import Icon from '../../components/Icon';
import Rating from '../../components/Rating';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/Feedback';
import classes from './MerchantOverviewPage.module.css';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function MerchantOverviewPage() {
  useDocumentTitle('Partner overview');
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch('/api/merchant/overview?days=30');

  if (loading) return <PageLoader label="Loading your partner overview…" />;

  if (error || !data) {
    return (
      <EmptyState icon="alert" title="Could not load your overview" action={<button type="button" className="btn" onClick={refetch}>Try again</button>}>
        The partner API did not respond. Check the backend and try again.
      </EmptyState>
    );
  }

  const pending = data.bookings.pending;
  const busiest = data.series.reduce((best, item) => (item.value > (best?.value || 0) ? item : best), null);

  return (
    <div className={classes.page}>
      <div className={classes.head}>
        <div>
          <span className="eyebrow">Partner overview</span>
          <h1>{greeting()}, {user?.name}.</h1>
          <p>Here is how the last 30 days have looked, and what is coming up this week.</p>
        </div>
        <div className={classes.headActions}>
          <Link to="/merchant/listings/new" className="btn">
            <Icon name="plus" size={16} /> Add a companion
          </Link>
          <Link to="/" className="btn btn-secondary">
            <Icon name="external" size={16} /> Public site
          </Link>
        </div>
      </div>

      {pending > 0 && (
        <Link to="/merchant/bookings" className={classes.alert}>
          <span className={classes.alertIcon}><Icon name="calendar" size={19} /></span>
          <div>
            <strong>{pending} visit request{pending === 1 ? '' : 's'} waiting for you</strong>
            <span>Guests are waiting for a confirmation. Responding quickly improves conversion.</span>
          </div>
          <Icon name="arrow-right" size={18} />
        </Link>
      )}

      <div className={classes.stats}>
        <div className={classes.statCard}>
          <div className={classes.statTop}>
            <span className={classes.statLabel}>Booking value</span>
            <span className={classes.statIcon}><Icon name="wallet" size={17} /></span>
          </div>
          <strong>{formatCurrency(data.revenue)}</strong>
          <span className={classes.statNote}>
            {formatCurrency(data.netRevenue)} net · {data.channels?.online?.bookings || 0} online / {data.channels?.in_person?.bookings || 0} in person
          </span>
        </div>
        <div className={classes.statCard}>
          <div className={classes.statTop}>
            <span className={classes.statLabel}>Visits booked</span>
            <span className={classes.statIcon}><Icon name="calendar" size={17} /></span>
          </div>
          <strong>{data.bookings.total}</strong>
          <span className={classes.statNote}>{data.bookings.completed} completed · {data.bookings.confirmed} confirmed</span>
        </div>
        <div className={classes.statCard}>
          <div className={classes.statTop}>
            <span className={classes.statLabel}>Guest rating</span>
            <span className={classes.statIcon}><Icon name="star" size={17} /></span>
          </div>
          <strong className={classes.ratingValue}>{data.rating.average || '—'}<small>/ 5</small></strong>
          <span className={classes.statNote}>{data.rating.count} published review{data.rating.count === 1 ? '' : 's'}</span>
        </div>
        <div className={classes.statCard}>
          <div className={classes.statTop}>
            <span className={classes.statLabel}>Repeat guests</span>
            <span className={classes.statIcon}><Icon name="users" size={17} /></span>
          </div>
          <strong>{data.customers.repeat}</strong>
          <span className={classes.statNote}>of {data.customers.total} guests have come back</span>
        </div>
      </div>

      <div className={classes.chartGrid}>
        <section className={classes.panel}>
          <div className={classes.panelHead}>
            <div>
              <h2>Booking value</h2>
              <p>Last 30 days · {busiest ? `busiest day ${formatDateShort(busiest.date)}` : 'no bookings yet'}</p>
            </div>
            <div className={classes.chartTotal}>
              <strong>{formatCurrency(data.revenue)}</strong>
              <span>booked value</span>
            </div>
          </div>
          <BarChart
            data={data.series}
            height={210}
            formatValue={(value) => formatCurrency(value)}
            label="Booking value per day for the last 30 days"
          />
        </section>

        <section className={classes.panel}>
          <div className={classes.panelHead}>
            <div>
              <h2>Top companions</h2>
              <p>By visits booked, all time</p>
            </div>
            <Link to="/merchant/listings" className={classes.panelLink}>All listings <Icon name="arrow-right" size={14} /></Link>
          </div>
          {data.topAnimals?.length ? (
            <ul className={classes.topList}>
              {data.topAnimals.map((animal, index) => (
                <li key={animal.animalId}>
                  <span className={classes.rank}>{String(index + 1).padStart(2, '0')}</span>
                  {animal.imageUrl ? <img src={animal.imageUrl} alt="" /> : <span className={classes.thumbPlaceholder}><Icon name="paw" size={17} /></span>}
                  <div className={classes.topBody}>
                    <strong>{animal.name || 'Archived listing'}</strong>
                    <span>{animal.bookings} visits · {formatCurrency(animal.revenue)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={classes.emptyText}>No visits booked yet. Listings show up here after the first confirmed stay.</p>
          )}
        </section>
      </div>

      <div className={classes.lowerGrid}>
        <section className={classes.panel}>
          <div className={classes.panelHead}>
            <div>
              <h2>Coming up</h2>
              <p>Pending and confirmed visits</p>
            </div>
            <Link to="/merchant/bookings" className={classes.panelLink}>All visits <Icon name="arrow-right" size={14} /></Link>
          </div>
          {data.upcoming?.length ? (
            <ul className={classes.upcomingList}>
              {data.upcoming.map((booking) => {
                const status = bookingStatus(booking.status);
                return (
                  <li key={booking.id}>
                    <div className={classes.upcomingDate}>
                      <span>{formatDateShort(booking.date).split(' ')[0]}</span>
                      <strong>{formatDateShort(booking.date).split(' ')[1]?.replace(',', '')}</strong>
                    </div>
                    <div className={classes.upcomingBody}>
                      <strong>{booking.animal?.name || 'Companion'} <span className={`badge badge-${status.variant || 'info'}`}>{status.label}</span></strong>
                      <span>{booking.customer?.name} · {formatTime(booking.startTime)} · {formatCurrency(booking.total)}</span>
                    </div>
                    <Link to="/merchant/bookings" className={classes.rowArrow} aria-label="Open bookings">
                      <Icon name="chevron-right" size={16} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={classes.emptyText}>Nothing on the calendar yet. Share your listing or add another companion.</p>
          )}
        </section>

        <section className={classes.panel}>
          <div className={classes.panelHead}>
            <div>
              <h2>Recent reviews</h2>
              <p>What guests are saying</p>
            </div>
            <Link to="/merchant/reviews" className={classes.panelLink}>All reviews <Icon name="arrow-right" size={14} /></Link>
          </div>
          {data.recentReviews?.length ? (
            <ul className={classes.reviewList}>
              {data.recentReviews.map((review) => (
                <li key={review._id}>
                  <div className={classes.reviewTop}>
                    <Rating value={review.rating} showValue={false} size={13} />
                    <span>{relativeTime(review.createdAt)}</span>
                  </div>
                  <p>{review.title || review.body || 'A guest left a rating.'}</p>
                  <span className={classes.reviewMeta}>{review.customerId?.name || 'Guest'} · {review.animalId?.name || 'Companion'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={classes.emptyText}>No reviews yet. A gentle nudge after a completed visit helps guests share.</p>
          )}
        </section>
      </div>

      <div className={classes.quickActions}>
        <Link to="/merchant/availability">
          <Icon name="calendar" size={19} />
          <span><strong>Update availability</strong><small>Open or close time slots</small></span>
          <Icon name="chevron-right" size={16} />
        </Link>
        <Link to="/merchant/listings/new">
          <Icon name="plus" size={19} />
          <span><strong>Add a companion</strong><small>Publish a new listing</small></span>
          <Icon name="chevron-right" size={16} />
        </Link>
        <Link to="/merchant/reviews">
          <Icon name="star" size={19} />
          <span><strong>Reply to reviews</strong><small>Build trust with future guests</small></span>
          <Icon name="chevron-right" size={16} />
        </Link>
      </div>
    </div>
  );
}
