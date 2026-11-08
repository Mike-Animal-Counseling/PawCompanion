import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../../lib/api';
import { useFetch, useDocumentTitle } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatDateShort, formatTime } from '../../lib/format';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import { PageLoader } from '../../components/Feedback';
import classes from './MerchantAvailabilityPage.module.css';

export default function MerchantAvailabilityPage() {
  useDocumentTitle('Availability');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data: listings, loading: listingsLoading } = useFetch('/api/merchant/animals');
  const [selectedId, setSelectedId] = useState(params.get('animal') || '');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!selectedId && listings?.length) setSelectedId(listings[0].id);
  }, [listings, selectedId]);

  const calendarUrl = selectedId ? `/api/merchant/animals/${selectedId}/calendar` : null;
  const { data: calendar, loading: calendarLoading, refetch: refetchCalendar } = useFetch(calendarUrl, { enabled: Boolean(selectedId) });
  const availabilityUrl = selectedId && date ? `/api/merchant/animals/${selectedId}/availability?date=${date}` : null;
  const { data: availability, loading: availabilityLoading, refetch: refetchAvailability } = useFetch(availabilityUrl, { enabled: Boolean(selectedId && date) });

  useEffect(() => {
    if (!date && calendar?.days?.length) setDate(calendar.days[0].date);
  }, [calendar, date]);

  useEffect(() => {
    if (availability?.slots) {
      setSlots(availability.slots.map((slot) => ({ ...slot })));
      setDirty(false);
    }
  }, [availability]);

  const selectedListing = useMemo(() => listings?.find((listing) => listing.id === selectedId), [listings, selectedId]);

  const chooseListing = (id) => {
    setSelectedId(id);
    setDate('');
    setSlots([]);
    setDirty(false);
    const next = new URLSearchParams(params);
    next.set('animal', id);
    setParams(next, { replace: true });
  };

  const toggleSlot = (startTime) => {
    setSlots((current) => current.map((slot) => (slot.startTime === startTime && !slot.booked ? { ...slot, enabled: !slot.enabled } : slot)));
    setDirty(true);
  };

  const save = async () => {
    if (!selectedId || !date) return;
    setSaving(true);
    try {
      await api.put(`/api/merchant/animals/${selectedId}/availability`, {
        date,
        slots: slots.map((slot) => ({ startTime: slot.startTime, enabled: slot.enabled })),
      });
      toast.success(`Availability saved for ${formatDate(date, { year: false })}.`);
      setDirty(false);
      await Promise.all([refetchAvailability(), refetchCalendar()]);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save availability.'));
    } finally {
      setSaving(false);
    }
  };

  if (listingsLoading) return <PageLoader label="Loading your listings…" />;

  if (!listings?.length) {
    return (
      <EmptyState icon="calendar" title="Add a companion first" action={<Link to="/merchant/listings/new" className="btn">Create a listing</Link>}>
        Availability lives on a listing. Once you add a companion you can open and close its time slots here.
      </EmptyState>
    );
  }

  const openCount = slots.filter((slot) => slot.enabled && !slot.booked).length;
  const bookedCount = slots.filter((slot) => slot.booked).length;

  return (
    <div className={classes.page}>
      <div className={classes.head}>
        <div>
          <span className="eyebrow">Availability</span>
          <h1>When can guests visit?</h1>
          <p>Each visit is two hours. You can offer up to five start times a day and close any slot without cancelling an existing booking.</p>
        </div>
        <Link to={`/companions/${selectedId}`} className="btn btn-secondary">View public page</Link>
      </div>

      <div className={classes.selectorRow}>
        <label className={classes.selector}>
          <span>Companion</span>
          <select className="select" value={selectedId} onChange={(event) => chooseListing(event.target.value)}>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>{listing.name} · {listing.isActive ? 'Live' : 'Archived'}</option>
            ))}
          </select>
        </label>
        {selectedListing && (
          <div className={classes.miniCompanion}>
            {selectedListing.imageUrl ? <img src={selectedListing.imageUrl} alt="" /> : <span><Icon name="paw" size={17} /></span>}
            <div>
              <strong>{selectedListing.name}</strong>
              <span>{selectedListing.tags?.slice(0, 3).join(' · ')}</span>
            </div>
          </div>
        )}
      </div>

      <div className={classes.layout}>
        <section className={classes.calendarPanel}>
          <div className={classes.panelHead}>
            <div><h2>Next 21 days</h2><p>Open slots per day</p></div>
            {calendarLoading && <span className="spinner" style={{ width: 18, height: 18 }} />}
          </div>
          <div className={classes.days}>
            {calendar?.days?.map((day) => (
              <button
                key={day.date}
                type="button"
                className={`${classes.day} ${date === day.date ? classes.dayActive : ''}`}
                onClick={() => setDate(day.date)}
              >
                <span>{formatDateShort(day.date).split(' ')[0]}</span>
                <strong>{formatDateShort(day.date).split(' ')[1]?.replace(',', '')}</strong>
                <small>{day.enabledCount > 0 ? `${day.enabledCount} open` : 'Closed'}</small>
              </button>
            ))}
          </div>
          <p className={classes.calendarNote}><Icon name="info" size={14} /> Closing a slot does not cancel a booking that is already confirmed.</p>
        </section>

        <section className={classes.slotsPanel}>
          <div className={classes.panelHead}>
            <div>
              <h2>{date ? formatDate(date, { weekday: true }) : 'Choose a date'}</h2>
              <p>{openCount} open · {bookedCount} booked</p>
            </div>
            <button type="button" className="btn btn-sm" onClick={save} disabled={!dirty || saving || availabilityLoading}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          {availabilityLoading ? (
            <div className={classes.slotSkeletons}>{[1, 2, 3, 4, 5].map((item) => <span key={item} className="skeleton" style={{ height: 74 }} />)}</div>
          ) : (
            <div className={classes.slotList}>
              {slots.map((slot) => (
                <button
                  key={slot.startTime}
                  type="button"
                  className={`${classes.slot} ${slot.enabled ? classes.slotOpen : ''} ${slot.booked ? classes.slotBooked : ''}`}
                  onClick={() => toggleSlot(slot.startTime)}
                  disabled={slot.booked}
                  aria-pressed={slot.enabled}
                >
                  <span className={classes.slotTime}>{formatTime(slot.startTime)}<small>– {formatTime(slot.endTime)}</small></span>
                  <span className={classes.slotState}>
                    {slot.booked ? <><Icon name="calendar" size={14} /> Booked</> : slot.enabled ? <><Icon name="check-circle" size={14} /> Open</> : <><Icon name="close" size={14} /> Closed</>}
                  </span>
                  <span className={classes.switch} aria-hidden="true"><span /></span>
                </button>
              ))}
            </div>
          )}

          {dirty && <div className={classes.unsaved}><Icon name="alert" size={15} /> You have unsaved changes for this day.</div>}
        </section>
      </div>

      <div className={classes.tip}>
        <Icon name="clock" size={18} />
        <div>
          <strong>Bookings are limited to two per companion per day.</strong>
          <span>The booking engine also prevents double-booking a start time. You do not need to manually block slots after a request.</span>
        </div>
      </div>
    </div>
  );
}
