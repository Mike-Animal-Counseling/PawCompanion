import React, { useEffect, useMemo, useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { bookingStatus, formatCurrency, formatDate, formatTime, formatTimeRange, relativeTime } from '../../lib/format';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { PageLoader, Pagination } from '../../components/Feedback';
import classes from './MerchantBookingsPage.module.css';

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Requests' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function todayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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

export default function MerchantBookingsPage() {
  useDocumentTitle('Bookings');
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '12' });
    if (status) params.set('status', status);
    return params.toString();
  }, [status, page]);
  const { data: bookings, meta, loading, error, refetch } = useFetch(`/api/merchant/bookings?${query}`);

  const [detail, setDetail] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [dates] = useState(() => nextDates(14));
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    if (!rescheduleTarget) return;
    if (!rescheduleDate) {
      setRescheduleDate(dates[0].value);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    setModalError('');
    api
      .get(`/api/bookings/availability/${rescheduleTarget.animal.id}?date=${rescheduleDate}`)
      .then((response) => {
        if (active) setSlots((response.data.data.slots || []).filter((item) => item.available));
      })
      .catch((err) => active && setModalError(errorMessage(err, 'Could not load availability.')))
      .finally(() => active && setSlotsLoading(false));
    return () => {
      active = false;
    };
  }, [rescheduleTarget, rescheduleDate, dates]);

  const act = async (booking, action, body = {}) => {
    setBusy(true);
    setModalError('');
    try {
      await api.post(`/api/merchant/bookings/${booking.id}/${action}`, body);
      toast.success(
        action === 'accept' ? 'Visit confirmed. The guest has been notified.'
          : action === 'decline' ? 'Request declined and refunded.'
            : action === 'complete' ? 'Visit marked complete.'
              : 'Visit rescheduled. The guest has been notified.',
      );
      setDeclineTarget(null);
      setCompleteTarget(null);
      setRescheduleTarget(null);
      setDetail(null);
      setNote('');
      setSlot(null);
      await refetch();
    } catch (err) {
      setModalError(errorMessage(err, 'That action could not be completed.'));
    } finally {
      setBusy(false);
    }
  };

  const openReschedule = (booking) => {
    setRescheduleTarget(booking);
    setRescheduleDate(dates[0].value);
    setSlot(null);
    setNote('');
    setModalError('');
  };

  return (
    <div className={classes.page}>
      <div className={classes.head}>
        <div>
          <span className="eyebrow">Bookings</span>
          <h1>Visit requests</h1>
          <p>Confirm guests, move times and close out completed visits. Declining refunds the sandbox payment.</p>
        </div>
      </div>

      <div className={classes.filters}>
        <div className="tabs" role="tablist" aria-label="Booking status">
          {TABS.map((tab) => (
            <button key={tab.key || 'all'} type="button" role="tab" aria-selected={status === tab.key} className={`tab ${status === tab.key ? 'tab-active' : ''}`} onClick={() => setStatus(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
        <span className={classes.count}>{meta?.total ?? 0} booking{meta?.total === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <PageLoader label="Loading bookings…" />
      ) : error ? (
        <EmptyState icon="alert" title="Could not load bookings" action={<button type="button" className="btn" onClick={refetch}>Try again</button>}>
          The partner API did not respond.
        </EmptyState>
      ) : !bookings?.length ? (
        <EmptyState icon="calendar" title={status ? 'Nothing in this status' : 'No bookings yet'} action={<button type="button" className="btn btn-secondary" onClick={() => setStatus('')}>Show all bookings</button>}>
          New requests will appear here. Guests can book directly from your public listing pages.
        </EmptyState>
      ) : (
        <div className={classes.list}>
          {bookings.map((booking) => {
            const state = bookingStatus(booking.status);
            const isPast = booking.date <= todayString();
            return (
              <article key={booking.id} className={classes.card}>
                <div className={classes.dateBlock}>
                  <span>{formatDate(booking.date, { short: true }).split(' ')[0]}</span>
                  <strong>{formatDate(booking.date, { short: true }).split(' ')[1]?.replace(',', '')}</strong>
                  <small>{formatTime(booking.startTime)}</small>
                </div>
                <div className={classes.animal}>
                  {booking.animal.imageUrl ? <img src={booking.animal.imageUrl} alt="" /> : <span><Icon name="paw" size={18} /></span>}
                  <div>
                    <strong>{booking.animal.name}</strong>
                    <span>{booking.customer?.name || 'Guest'}</span>
                  </div>
                </div>
                <div className={classes.meta}>
                  <span><Icon name="clock" size={13} /> {formatTimeRange(booking.startTime, booking.endTime)}</span>
                  <span><Icon name={booking.service?.mode === 'online' ? 'chat' : 'paw'} size={13} /> {booking.service?.label || 'Home visit'}</span>
                  <span><Icon name="wallet" size={13} /> {formatCurrency(booking.pricing.total)}</span>
                  <span><Icon name="users" size={13} /> {booking.contact?.phone || 'No phone'}</span>
                </div>
                <div className={classes.statusCol}>
                  <span className={`badge badge-${state.variant || 'info'}`}>{state.label}</span>
                  <span className={classes.created}>Requested {relativeTime(booking.createdAt)}</span>
                </div>
                <div className={classes.actions}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetail(booking)}>Details</button>
                  {booking.status === 'pending' && (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => act(booking, 'accept')} disabled={busy}>Accept</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDeclineTarget(booking); setNote(''); setModalError(''); }}>Decline</button>
                    </>
                  )}
                  {booking.status === 'confirmed' && (
                    <>
                      {isPast ? (
                        <button type="button" className="btn btn-sm" onClick={() => { setCompleteTarget(booking); setModalError(''); }}>Complete</button>
                      ) : (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openReschedule(booking)}>Reschedule</button>
                      )}
                    </>
                  )}
                  {booking.reviewId && <span className="badge badge-success"><Icon name="star-filled" size={11} /> Reviewed</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination page={meta?.page || 1} totalPages={meta?.totalPages || 1} onChange={setPage} />

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Booking details" description={detail ? `${detail.animal.name} · ${formatDate(detail.date)}` : ''} size="lg">
        {detail && (
          <div className={classes.detailBody}>
            <div className={classes.detailGrid}>
              <div><span>Guest</span><strong>{detail.customer?.name || detail.contact.name}</strong></div>
              <div><span>Email</span><strong>{detail.customer?.email || detail.contact.email}</strong></div>
              <div><span>Phone</span><strong>{detail.contact.phone}</strong></div>
              <div><span>City</span><strong>{detail.contact.city || '—'}</strong></div>
              <div><span>Time</span><strong>{formatTimeRange(detail.startTime, detail.endTime)}</strong></div>
              <div><span>Total</span><strong>{formatCurrency(detail.pricing.total)}</strong></div>
            </div>
            {detail.contact.notes && (
              <div className={classes.detailNotes}>
                <span>Guest notes</span>
                <p>{detail.contact.notes}</p>
              </div>
            )}
            <div className={classes.detailTimeline}>
              <span>History</span>
              <ol>
                {(detail.statusHistory || []).map((entry, index) => (
                  <li key={`${entry.status}-${index}`}>
                    <strong>{entry.status}</strong>
                    <span>{entry.note || 'Status updated'} · {relativeTime(entry.at)}</span>
                  </li>
                ))}
              </ol>
            </div>
            {detail.payment?.receiptNumber && <p className={classes.receipt}>Receipt {detail.payment.receiptNumber} · sandbox</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(declineTarget)}
        onClose={() => setDeclineTarget(null)}
        title="Decline this request?"
        description="The guest is notified and the sandbox payment is refunded immediately."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDeclineTarget(null)}>Keep request</button>
            <button type="button" className="btn btn-danger" onClick={() => act(declineTarget, 'decline', { note })} disabled={busy}>{busy ? 'Declining…' : 'Decline & refund'}</button>
          </>
        }
      >
        <div className="field">
          <label className="label" htmlFor="decline-note">Reason (shared with the guest)</label>
          <textarea id="decline-note" className="textarea" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="A short, kind explanation helps." />
        </div>
        {modalError && <div className="notice notice-danger" style={{ marginTop: 12 }}><Icon name="alert" size={16} /><span>{modalError}</span></div>}
      </Modal>

      <Modal
        open={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        title="Mark this visit complete?"
        description="This closes the booking and invites the guest to leave a review."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCompleteTarget(null)}>Not yet</button>
            <button type="button" className="btn" onClick={() => act(completeTarget, 'complete')} disabled={busy}>{busy ? 'Saving…' : 'Mark complete'}</button>
          </>
        }
      >
        <div className="notice"><Icon name="check-circle" size={17} /><span>The guest will get a review prompt. You can reply to the review from the Reviews page.</span></div>
        {modalError && <div className="notice notice-danger" style={{ marginTop: 12 }}><Icon name="alert" size={16} /><span>{modalError}</span></div>}
      </Modal>

      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title="Move this visit"
        description="The guest is notified and the new time is confirmed on your behalf."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setRescheduleTarget(null)}>Keep current time</button>
            <button type="button" className="btn" onClick={() => act(rescheduleTarget, 'reschedule', { date: rescheduleDate, startTime: slot?.startTime, note })} disabled={busy || !slot}>{busy ? 'Saving…' : 'Confirm new time'}</button>
          </>
        }
      >
        <div className={classes.datePicker}>
          {dates.map((item) => (
            <button key={item.value} type="button" className={`${classes.dateChip} ${rescheduleDate === item.value ? classes.dateChipActive : ''}`} onClick={() => { setRescheduleDate(item.value); setSlot(null); }}>
              <span>{item.weekday}</span><strong>{item.day}</strong><small>{item.month}</small>
            </button>
          ))}
        </div>
        {slotsLoading ? (
          <p className="muted small">Loading times…</p>
        ) : slots.length ? (
          <div className={classes.slotGrid}>
            {slots.map((item) => (
              <button key={item.startTime} type="button" className={`${classes.slotChip} ${slot?.startTime === item.startTime ? classes.slotChipActive : ''}`} onClick={() => setSlot(item)}>
                {item.startTime}–{item.endTime}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted small">No open times on that day.</p>
        )}
        <div className="field" style={{ marginTop: 14 }}>
          <label className="label" htmlFor="reschedule-note">Note to guest (optional)</label>
          <textarea id="reschedule-note" className="textarea" rows={2} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
        </div>
        {modalError && <div className="notice notice-danger" style={{ marginTop: 12 }}><Icon name="alert" size={16} /><span>{modalError}</span></div>}
      </Modal>
    </div>
  );
}
