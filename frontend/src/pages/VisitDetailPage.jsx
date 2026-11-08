import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage, fieldErrors } from '../lib/api';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { bookingStatus, formatCurrency, formatDate, formatTimeRange, relativeTime } from '../lib/format';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { PageLoader } from '../components/Feedback';
import classes from './VisitDetailPage.module.css';

const STATUS_COPY = {
  pending: {
    title: 'Waiting for the host',
    body: 'Your payment is held in the sandbox. The host usually responds within a day. We will notify you as soon as they confirm.',
    icon: 'clock',
  },
  confirmed: {
    title: 'You are confirmed',
    body: 'The host is expecting you. Arrive a few minutes early, and message the companion if you are nervous.',
    icon: 'check-circle',
  },
  completed: {
    title: 'This visit is complete',
    body: 'We hope it helped. A short review makes it easier for the next person to find the right companion.',
    icon: 'star',
  },
  cancelled: {
    title: 'This visit was cancelled',
    body: 'Any sandbox payment has been returned. You can book another time whenever you are ready.',
    icon: 'close',
  },
  declined: {
    title: 'The host could not take this visit',
    body: 'The sandbox payment has been refunded automatically. Try another date or companion.',
    icon: 'alert',
  },
};

function nextDates(days = 14) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    };
  });
}

export default function VisitDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: booking, loading, error, refetch } = useFetch(`/api/bookings/${id}`);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [cancelReason, setCancelReason] = useState('');
  const [dates] = useState(() => nextDates(14));
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewErrors, setReviewErrors] = useState({});

  useDocumentTitle(booking ? `Visit with ${booking.animal.name}` : 'Visit details');

  useEffect(() => {
    if (rescheduleOpen && !rescheduleDate) {
      setRescheduleDate(dates[0].value);
    }
  }, [rescheduleOpen, rescheduleDate, dates]);

  useEffect(() => {
    if (!rescheduleOpen || !rescheduleDate || !booking) return undefined;
    let active = true;
    setSlotsLoading(true);
    setModalError('');
    api
      .get(`/api/bookings/availability/${booking.animal.id}?date=${rescheduleDate}`)
      .then((response) => {
        if (active) setSlots(response.data.data.slots || []);
      })
      .catch((err) => {
        if (active) setModalError(errorMessage(err, 'Could not load availability.'));
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [rescheduleOpen, rescheduleDate, booking]);

  if (loading) return <PageLoader label="Opening your visit…" />;

  if (error || !booking) {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        <EmptyState icon="calendar" title="Visit not found" action={<Link to="/visits" className="btn">Back to my visits</Link>}>
          This visit may belong to another account, or it no longer exists.
        </EmptyState>
      </div>
    );
  }

  const status = bookingStatus(booking.status);
  const copy = STATUS_COPY[booking.status] || STATUS_COPY.pending;
  const canReview = booking.actions?.canReview;

  const cancelVisit = async () => {
    setBusy(true);
    setModalError('');
    try {
      await api.post(`/api/bookings/${id}/cancel`, { reason: cancelReason.trim() });
      toast.success('Visit cancelled. Any sandbox payment was refunded.');
      setCancelOpen(false);
      await refetch();
    } catch (err) {
      setModalError(errorMessage(err, 'Could not cancel this visit.'));
    } finally {
      setBusy(false);
    }
  };

  const rescheduleVisit = async () => {
    if (!rescheduleSlot) {
      setModalError('Choose a new time.');
      return;
    }
    setBusy(true);
    setModalError('');
    try {
      await api.post(`/api/bookings/${id}/reschedule`, { date: rescheduleDate, startTime: rescheduleSlot.startTime });
      toast.success('Visit rescheduled. The host has been notified.');
      setRescheduleOpen(false);
      setRescheduleSlot(null);
      await refetch();
    } catch (err) {
      setModalError(errorMessage(err, 'Could not reschedule this visit.'));
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (rating < 1) {
      setReviewErrors({ rating: 'Choose a star rating.' });
      return;
    }
    setBusy(true);
    setReviewErrors({});
    try {
      await api.post(`/api/bookings/${id}/review`, { rating, title: reviewTitle.trim(), body: reviewBody.trim() });
      toast.success('Thank you — your review is published.');
      setReviewOpen(false);
      await refetch();
    } catch (err) {
      setReviewErrors({ ...fieldErrors(err), form: errorMessage(err, 'Could not publish your review.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={classes.page}>
      <div className="container">
        <nav className={classes.breadcrumbs} aria-label="Breadcrumb">
          <Link to="/visits">My visits</Link>
          <Icon name="chevron-right" size={13} />
          <span>Visit with {booking.animal.name}</span>
        </nav>

        <div className={classes.hero}>
          <div className={classes.heroImage}>
            <img src={booking.animal.imageUrl} alt={booking.animal.name} />
          </div>
          <div className={classes.heroBody}>
            <div className={classes.heroTop}>
              <span className={`badge badge-${status.variant || 'info'}`}>{status.label}</span>
              <span className={classes.reference}>#{booking.id.slice(-8).toUpperCase()}</span>
            </div>
            <h1>{booking.animal.name}</h1>
            <p className={classes.heroMeta}>
              {formatDate(booking.date, { weekday: true })} · {formatTimeRange(booking.startTime, booking.endTime)}
            </p>
            <p className={classes.heroHost}>
              {booking.service?.label || 'Home visit'} · {booking.service?.mode === 'online' ? 'Online video call' : 'In person'} · Hosted by {booking.merchant?.name} · {booking.merchant?.city}
            </p>

            <div className={classes.statusNote}>
              <span className={classes.statusIcon}><Icon name={copy.icon} size={19} /></span>
              <div>
                <strong>{copy.title}</strong>
                <p>{copy.body}</p>
              </div>
            </div>

            <div className={classes.heroActions}>
              {booking.actions?.canReschedule && (
                <button type="button" className="btn btn-secondary" onClick={() => { setRescheduleOpen(true); setModalError(''); }}>
                  <Icon name="calendar" size={16} /> Reschedule
                </button>
              )}
              {booking.actions?.canCancel && (
                <button type="button" className="btn btn-ghost" onClick={() => { setCancelOpen(true); setModalError(''); }}>
                  Cancel visit
                </button>
              )}
              {canReview && (
                <button type="button" className="btn" onClick={() => setReviewOpen(true)}>
                  <Icon name="star" size={16} /> Leave a review
                </button>
              )}
              <Link to={`/chat/${booking.animal.id}`} className="btn btn-ghost">
                <Icon name="chat" size={16} /> Message {booking.animal.name}
              </Link>
            </div>
          </div>
        </div>

        <div className={classes.layout}>
          <div className={classes.mainColumn}>
            <section className={classes.section}>
              <h2>Visit timeline</h2>
              <ol className={classes.timeline}>
                {(booking.statusHistory || []).map((entry, index) => (
                  <li key={`${entry.status}-${index}`}>
                    <span className={classes.timelineDot} />
                    <div>
                      <strong>{entry.status === 'pending' ? 'Requested' : entry.status === 'confirmed' ? 'Confirmed by host' : entry.status === 'completed' ? 'Visit completed' : entry.status === 'cancelled' ? 'Cancelled' : entry.status === 'declined' ? 'Declined' : entry.status}</strong>
                      <p>{entry.note || 'Status updated'}</p>
                      <span>{relativeTime(entry.at)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className={classes.section}>
              <h2>What the host knows</h2>
              <div className={classes.contactCard}>
                <div><span>Guest</span><strong>{booking.contact.name}</strong></div>
                <div><span>Email</span><strong>{booking.contact.email}</strong></div>
                <div><span>Phone</span><strong>{booking.contact.phone}</strong></div>
                <div><span>City</span><strong>{booking.contact.city || 'Not provided'}</strong></div>
                {booking.contact.address && <div><span>Meeting address</span><strong>{booking.contact.address}</strong></div>}
                {booking.contact.notes && <div className="span-full"><span>Notes</span><strong>{booking.contact.notes}</strong></div>}
              </div>
            </section>

            <section className={classes.section}>
              <h2>Before you go</h2>
              <ul className={classes.checklist}>
                <li><Icon name="check" size={16} /> Arrive five minutes early; the host will meet you at the agreed point.</li>
                <li><Icon name="check" size={16} /> Let the companion set the pace. The host will help with cues.</li>
                <li><Icon name="check" size={16} /> Bring water for a dog walk, and wear something you do not mind getting fur on.</li>
                <li><Icon name="check" size={16} /> If you feel unwell, cancel or reschedule rather than pushing through.</li>
              </ul>
            </section>

            {booking.review && (
              <section className={classes.section}>
                <h2>Your review</h2>
                <div className={classes.reviewCard}>
                  <div className={classes.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icon key={star} name={star <= booking.review.rating ? 'star-filled' : 'star'} size={17} />
                    ))}
                    <span>{formatDate(booking.review.createdAt)}</span>
                  </div>
                  {booking.review.title && <h3>{booking.review.title}</h3>}
                  {booking.review.body && <p>{booking.review.body}</p>}
                  {booking.review.merchantReply && (
                    <div className={classes.reviewReply}>
                      <strong>Host reply</strong>
                      <p>{booking.review.merchantReply.body}</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className={classes.sideColumn}>
            <div className={classes.receipt}>
              <div className={classes.receiptHead}>
                <span className="eyebrow">Receipt</span>
                <span className={`badge ${booking.paymentStatus === 'refunded' ? 'badge-warning' : 'badge-success'}`}>
                  {booking.paymentStatus === 'refunded' ? 'Refunded' : 'Paid · sandbox'}
                </span>
              </div>
              <div className={classes.receiptRows}>
                <div><span>{formatCurrency(booking.pricing.hourlyRate)} × {booking.pricing.hours} hours</span><span>{formatCurrency(booking.pricing.subtotal)}</span></div>
                <div><span>Service fee</span><span>{formatCurrency(booking.pricing.serviceFee)}</span></div>
                <div className={classes.receiptTotal}><span>Total</span><strong>{formatCurrency(booking.pricing.total)}</strong></div>
              </div>
              {booking.payment?.receiptNumber && (
                <p className={classes.receiptRef}>Receipt {booking.payment.receiptNumber}</p>
              )}
              <p className={classes.receiptNote}>Sandbox payment. No real card was charged.</p>
            </div>

            <div className={classes.hostCard}>
              <span className="eyebrow">Your host</span>
              <strong>{booking.merchant?.name}</strong>
              <p>{booking.merchant?.businessType} · {booking.merchant?.city}</p>
              {booking.merchant?.verified && <span className="badge badge-success"><Icon name="shield" size={11} /> Verified</span>}
              <Link to={`/companions/${booking.animal.id}`} className="link-arrow" style={{ marginTop: 12, fontSize: '0.76rem' }}>
                View companion profile <Icon name="arrow-right" size={13} />
              </Link>
            </div>

            <div className={classes.policy}>
              <Icon name="shield" size={17} />
              <div>
                <strong>Cancellation policy</strong>
                <p>Free cancellation or reschedule more than 24 hours before the start. Sandbox refunds are automatic.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this visit?"
        description={`${booking.animal.name} · ${formatDate(booking.date)} at ${booking.startTime}`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCancelOpen(false)}>Keep visit</button>
            <button type="button" className="btn btn-danger" onClick={cancelVisit} disabled={busy}>
              {busy ? 'Cancelling…' : 'Cancel visit'}
            </button>
          </>
        }
      >
        <div className="notice notice-warning">
          <Icon name="alert" size={17} />
          <span>Any sandbox payment will be refunded. This cannot be undone, but you can book again.</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="label" htmlFor="cancel-reason">Reason (optional)</label>
          <textarea id="cancel-reason" className="textarea" rows={3} maxLength={500} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="A quick note helps the host plan." />
        </div>
        {modalError && <div className="notice notice-danger" style={{ marginTop: 12 }}><Icon name="alert" size={16} /><span>{modalError}</span></div>}
      </Modal>

      <Modal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Move this visit"
        description="Choose a new date and time. The host will be notified and may need to reconfirm."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setRescheduleOpen(false)}>Keep current time</button>
            <button type="button" className="btn" onClick={rescheduleVisit} disabled={busy || !rescheduleSlot}>
              {busy ? 'Saving…' : 'Confirm new time'}
            </button>
          </>
        }
      >
        <div className={classes.datePicker}>
          {dates.map((date) => (
            <button
              key={date.value}
              type="button"
              className={`${classes.dateChip} ${rescheduleDate === date.value ? classes.dateChipActive : ''}`}
              onClick={() => { setRescheduleDate(date.value); setRescheduleSlot(null); }}
            >
              <span>{date.weekday}</span>
              <strong>{date.day}</strong>
              <small>{date.month}</small>
            </button>
          ))}
        </div>
        {slotsLoading ? (
          <p className="muted small">Loading times…</p>
        ) : (
          <div className={classes.slotGrid}>
            {slots.map((slot) => (
              <button
                key={slot.startTime}
                type="button"
                className={`${classes.slotChip} ${rescheduleSlot?.startTime === slot.startTime ? classes.slotChipActive : ''}`}
                disabled={!slot.available}
                onClick={() => setRescheduleSlot(slot)}
              >
                {slot.startTime}–{slot.endTime}
              </button>
            ))}
          </div>
        )}
        {!slotsLoading && slots.length === 0 && <p className="muted small">No times published for that day.</p>}
        {modalError && <div className="notice notice-danger" style={{ marginTop: 12 }}><Icon name="alert" size={16} /><span>{modalError}</span></div>}
      </Modal>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={`How was ${booking.animal.name}?`}
        description="Reviews are public but your surname is shortened. Please be honest and kind."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setReviewOpen(false)}>Not now</button>
            <button type="button" className="btn" onClick={submitReview} disabled={busy || rating === 0}>
              {busy ? 'Publishing…' : 'Publish review'}
            </button>
          </>
        }
      >
        <div className={classes.starPicker} role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" role="radio" aria-checked={rating === star} onClick={() => setRating(star)} aria-label={`${star} star${star === 1 ? '' : 's'}`}>
              <Icon name={star <= rating ? 'star-filled' : 'star'} size={28} />
            </button>
          ))}
        </div>
        {reviewErrors.rating && <span className="error-text">{reviewErrors.rating}</span>}
        <div className={classes.reviewFields}>
          <div className="field">
            <label className="label" htmlFor="review-title">Title</label>
            <input id="review-title" className="input" maxLength={120} value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} placeholder="A quiet hour that helped" />
          </div>
          <div className="field">
            <label className="label" htmlFor="review-body">Your experience</label>
            <textarea id="review-body" className="textarea" rows={5} maxLength={2000} value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} placeholder="What did the visit feel like? What should the next guest know?" />
          </div>
        </div>
        {reviewErrors.form && <div className="notice notice-danger"><Icon name="alert" size={16} /><span>{reviewErrors.form}</span></div>}
      </Modal>
    </div>
  );
}
