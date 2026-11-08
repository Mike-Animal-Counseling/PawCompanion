import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage, fieldErrors } from '../lib/api';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, formatTime, formatTimeRange, speciesLabel } from '../lib/format';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { PageLoader } from '../components/Feedback';
import classes from './BookingPage.module.css';

function localIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function nextDates(days = 14) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    return {
      value: localIso(date),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    };
  });
}

const STEPS = ['Choose a time', 'Your details', 'Review & pay'];

const SERVICE_ICONS = { home_visit: 'paw', walk: 'sun', cafe_meet: 'map-pin' };

function endTimeFor(start, minutes) {
  const [hour, minute] = String(start).split(':').map(Number);
  const total = hour * 60 + (minute || 0) + Number(minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function BookingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: animal, loading, error: animalError } = useFetch(`/api/animals/${id}`);
  const { data: services } = useFetch(`/api/bookings/services/${id}`, { enabled: Boolean(animal) });
  const dates = useMemo(() => nextDates(14), []);

  const [serviceType, setServiceType] = useState('home_visit');
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const availabilityUrl = date ? `/api/bookings/availability/${id}?date=${date}` : null;
  const { data: day, loading: slotsLoading, refetch: refetchSlots } = useFetch(availabilityUrl, { enabled: Boolean(date) });

  useDocumentTitle(animal ? `Book a visit with ${animal.name}` : 'Book a visit', 'Choose a time, tell the host what you need, and confirm a low-pressure companion visit.');

  useEffect(() => {
    if (!animal) return;
    setDate((current) => current || animal.availability?.next?.date || dates[0].value);
    setForm((current) => ({
      ...current,
      name: current.name || user?.name || '',
      email: current.email || user?.email || '',
      phone: current.phone || user?.phone || '',
      city: current.city || user?.city || animal.city || '',
    }));
  }, [animal, user, dates]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validateDetails = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Add the name the host should expect.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Add a valid email.';
    if (!/^[\d+()\-.\s]{7,32}$/.test(form.phone.trim())) next.phone = 'Add a phone number the host can reach.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const chooseDate = (value) => {
    setDate(value);
    setSlot(null);
    setError('');
  };

  const goToDetails = () => {
    if (!slot) {
      setError('Choose a start time to continue.');
      return;
    }
    setError('');
    setStep(2);
  };

  const goToReview = () => {
    if (!validateDetails()) return;
    setError('');
    setStep(3);
  };

  const submit = async () => {
    if (!accept) {
      setError('Please accept the booking terms.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await api.post('/api/bookings', {
        animalId: id,
        serviceType,
        date,
        startTime: slot.startTime,
        contact: form,
        paymentMethod: 'sandbox_card',
        acceptTerms: true,
      });
      setCreated(response.data.data);
      toast.success('Visit requested. We will let you know when the host confirms.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const details = fieldErrors(err);
      if (Object.keys(details).length) setErrors(details);
      setError(errorMessage(err, 'The booking could not be created.'));
      if (err.response?.status === 409) {
        await refetchSlots();
        setStep(1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading the booking calendar…" />;

  if (animalError || !animal) {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        <EmptyState icon="paw" title="This companion is not available" action={<Link to="/" className="btn">Browse companions</Link>}>
          The listing may have been archived. Try another companion.
        </EmptyState>
      </div>
    );
  }

  if (created) {
    return (
      <div className={`container ${classes.successPage}`}>
        <div className={classes.successCard}>
          <div className={classes.successIcon}><Icon name="check" size={30} /></div>
          <span className="eyebrow">Request sent</span>
          <h1>Your visit is on its way.</h1>
          <p className={classes.successLede}>
            {animal.name}’s host has your request. You will get a notification as soon as it is confirmed. Nothing
            is charged outside the sandbox.
          </p>

          <div className={classes.successDetails}>
            <div className={classes.successAnimal}>
              <img src={animal.imageUrl} alt="" />
              <div>
                <strong>{animal.name}</strong>
                <span>{created.service?.label || 'Home visit'} · {speciesLabel(animal.species)} · {animal.merchant?.name}</span>
              </div>
            </div>
            <div className={classes.successGrid}>
              <div><span>Date</span><strong>{formatDate(created.date)}</strong></div>
              <div><span>Time</span><strong>{formatTimeRange(created.startTime, created.endTime)}</strong></div>
              <div><span>Total</span><strong>{formatCurrency(created.pricing.total)}</strong></div>
              <div><span>Status</span><strong><span className="badge badge-warning">Awaiting host</span></strong></div>
            </div>
            <p className={classes.reference}>Reference · {created.id}</p>
          </div>

          <div className={classes.successActions}>
            <Link to={`/visits/${created.id}`} className="btn">View this visit</Link>
            <Link to="/visits" className="btn btn-secondary">All my visits</Link>
            <Link to={`/chat/${animal.id}`} className="btn btn-ghost">Message {animal.name}</Link>
          </div>

          <div className="notice" style={{ marginTop: 24, textAlign: 'left' }}>
            <Icon name="shield" size={17} />
            <span>
              Free cancellation until 24 hours before the visit. If the host declines, the sandbox payment is
              refunded automatically.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const selectedService = services?.find((service) => service.type === serviceType) || services?.[0];
  const pricing = selectedService?.pricing || {
    hourlyRate: animal.price,
    hours: 2,
    subtotal: animal.price * 2,
    serviceFee: Math.round(animal.price * 2 * 0.08 * 100) / 100,
    total: Math.round(animal.price * 2 * 1.08 * 100) / 100,
  };
  const selectedEndTime = slot ? endTimeFor(slot.startTime, selectedService?.durationMinutes || 120) : '';
  const noAvailability = animal.availability?.next === null;

  return (
    <div className={classes.page}>
      <div className="container">
        <nav className={classes.breadcrumbs} aria-label="Breadcrumb">
          <Link to={`/companions/${animal.id}`}>{animal.name}</Link>
          <Icon name="chevron-right" size={13} />
          <span>Book a visit</span>
        </nav>

        <div className={classes.head}>
          <div>
            <span className="eyebrow">In-person companionship</span>
            <h1>Book time with {animal.name}.</h1>
            <p>Choose a home visit, a walk or a café meetup. The host confirms every request.</p>
          </div>
          <ol className={classes.steps}>
            {STEPS.map((label, index) => {
              const number = index + 1;
              return (
                <li key={label} className={`${classes.step} ${step === number ? classes.stepActive : ''} ${step > number ? classes.stepDone : ''}`}>
                  <span>{step > number ? <Icon name="check" size={13} /> : number}</span>
                  {label}
                </li>
              );
            })}
          </ol>
        </div>

        <div className={classes.layout}>
          <div className={classes.main}>
            {step === 1 && (
              <section className={classes.panel}>
                <div className={classes.panelHead}>
                  <div>
                    <h2>What kind of time together?</h2>
                    <p>In-person visits last two hours. The host confirms every request; the digital companion is available separately from chat.</p>
                  </div>
                </div>

                <div className={classes.services} role="radiogroup" aria-label="Choose a service">
                  {services?.map((service) => (
                    <button
                      key={service.type}
                      type="button"
                      role="radio"
                      aria-checked={service.type === serviceType}
                      className={`${classes.serviceCard} ${service.type === serviceType ? classes.serviceActive : ''}`}
                      onClick={() => setServiceType(service.type)}
                    >
                      <span className={classes.serviceIcon}><Icon name={SERVICE_ICONS[service.type] || 'paw'} size={18} /></span>
                      <span className={classes.serviceBody}>
                        <span className={classes.serviceMode}>In person{service.badge ? ` · ${service.badge}` : ''}</span>
                        <strong>{service.label}</strong>
                        <small>{service.durationMinutes} min · {formatCurrency(service.pricing.total)}</small>
                      </span>
                    </button>
                  ))}
                </div>

                <div className={classes.slotsSection}>
                  <div className={classes.slotsHead}><h3>Choose a date</h3><span className={classes.serviceChosen}>{selectedService?.label}</span></div>
                  <div className={classes.dateGrid} role="group" aria-label="Choose a date">
                    {dates.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`${classes.dateButton} ${date === item.value ? classes.dateActive : ''}`}
                        onClick={() => chooseDate(item.value)}
                        aria-pressed={date === item.value}
                      >
                        <span>{item.weekday}</span>
                        <strong>{item.day}</strong>
                        <small>{item.month}</small>
                      </button>
                    ))}
                  </div>
                </div>

                {noAvailability ? (
                  <div className="notice notice-warning">
                    <Icon name="clock" size={17} />
                    <span>{animal.name} has no openings in the next two weeks. Message the host or check back soon.</span>
                  </div>
                ) : (
                  <>
                    <div className={classes.slotsSection}>
                      <div className={classes.slotsHead}>
                        <h3>Available times on {formatDate(date, { weekday: true, year: false })}</h3>
                        {day?.remaining === 0 && <span className="badge badge-warning">Fully booked</span>}
                      </div>

                      {slotsLoading ? (
                        <div className={classes.slotSkeletonRow}>
                          {[1, 2, 3, 4, 5].map((item) => <span key={item} className="skeleton" style={{ height: 48, flex: 1 }} />)}
                        </div>
                      ) : day?.slots?.length ? (
                        <div className={classes.slotGrid}>
                          {day.slots.map((item) => (
                            <button
                              key={item.startTime}
                              type="button"
                              className={`${classes.slot} ${slot?.startTime === item.startTime ? classes.slotActive : ''}`}
                              disabled={!item.available}
                              onClick={() => setSlot(item)}
                            >
                              <strong>{formatTime(item.startTime)}</strong>
                              <small>{item.available ? `${selectedService?.durationMinutes || 120} min` : item.reason === 'booked' ? 'Booked' : item.reason === 'closed' ? 'Closed' : 'Unavailable'}</small>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className={classes.noSlots}>No slots are published for this date. Try another day.</p>
                      )}
                    </div>
                  </>
                )}

                {error && (
                  <div className="notice notice-danger" style={{ marginTop: 16 }}>
                    <Icon name="alert" size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className={classes.panelActions}>
                  <Link to={`/companions/${animal.id}`} className="btn btn-ghost">
                    <Icon name="arrow-left" size={15} /> Back to profile
                  </Link>
                  <button type="button" className="btn" onClick={goToDetails} disabled={!slot}>
                    Continue to details <Icon name="arrow-right" size={16} />
                  </button>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className={classes.panel}>
                <div className={classes.panelHead}>
                  <div>
                    <h2>Who should the host expect?</h2>
                    <p>We share these details with the host only. You can add context in the notes.</p>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
                    <Icon name="edit" size={14} /> Change time
                  </button>
                </div>

                <div className="form-grid">
                  <div className="span-2">
                    <label className="label" htmlFor="booking-name">Full name</label>
                    <input id="booking-name" className="input" value={form.name} onChange={update('name')} aria-invalid={Boolean(errors.name)} autoComplete="name" />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                  </div>
                  <div>
                    <label className="label" htmlFor="booking-email">Email</label>
                    <input id="booking-email" className="input" type="email" value={form.email} onChange={update('email')} aria-invalid={Boolean(errors.email)} autoComplete="email" />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                  </div>
                  <div>
                    <label className="label" htmlFor="booking-phone">Phone</label>
                    <input id="booking-phone" className="input" type="tel" value={form.phone} onChange={update('phone')} aria-invalid={Boolean(errors.phone)} autoComplete="tel" />
                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                  </div>
                  <div>
                    <label className="label" htmlFor="booking-city">City</label>
                    <input id="booking-city" className="input" value={form.city} onChange={update('city')} autoComplete="address-level2" />
                  </div>
                  <div>
                    <label className="label" htmlFor="booking-address">Meeting address <span className="muted">(optional)</span></label>
                    <input id="booking-address" className="input" value={form.address} onChange={update('address')} autoComplete="street-address" placeholder="Only if the host is coming to you" />
                  </div>
                  <div className="span-2">
                    <label className="label" htmlFor="booking-notes">Anything the host should know?</label>
                    <textarea
                      id="booking-notes"
                      className="textarea"
                      rows={4}
                      maxLength={1000}
                      value={form.notes}
                      onChange={update('notes')}
                      placeholder="First visit, mobility needs, nerves, what would make this easier…"
                    />
                    <span className="hint">{form.notes.length}/1000 · Optional</span>
                  </div>
                </div>

                <div className={classes.panelActions}>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                    <Icon name="arrow-left" size={15} /> Back
                  </button>
                  <button type="button" className="btn" onClick={goToReview}>
                    Review booking <Icon name="arrow-right" size={16} />
                  </button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className={classes.panel}>
                <div className={classes.panelHead}>
                  <div>
                    <h2>One last look.</h2>
                    <p>This build uses a sandbox payment. No real card is charged.</p>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>
                    <Icon name="edit" size={14} /> Edit details
                  </button>
                </div>

                <div className={classes.reviewRows}>
                  <div className={classes.reviewRow}>
                    <span>Companion</span>
                    <strong>{animal.name} · {animal.breed || speciesLabel(animal.species)}</strong>
                  </div>
                  <div className={classes.reviewRow}>
                    <span>Service</span>
                    <strong>{selectedService?.label} · In person · {selectedService?.durationMinutes} min</strong>
                  </div>
                  <div className={classes.reviewRow}>
                    <span>Host</span>
                    <strong>{animal.merchant?.name}</strong>
                  </div>
                  <div className={classes.reviewRow}>
                    <span>Date &amp; time</span>
                    <strong>{formatDate(date, { weekday: true })} · {formatTimeRange(slot?.startTime, selectedEndTime)}</strong>
                  </div>
                  <div className={classes.reviewRow}>
                    <span>Guest</span>
                    <strong>{form.name} · {form.email} · {form.phone}</strong>
                  </div>
                  {form.notes && (
                    <div className={classes.reviewRow}>
                      <span>Notes</span>
                      <strong className={classes.reviewNote}>{form.notes}</strong>
                    </div>
                  )}
                </div>

                <div className={classes.paymentBox}>
                  <div className={classes.paymentHead}>
                    <span className={classes.cardIcon}><Icon name="credit-card" size={20} /></span>
                    <div>
                      <strong>Sandbox card</strong>
                      <span>Visa •••• 4242 · demo only</span>
                    </div>
                    <span className="badge badge-info">Sandbox</span>
                  </div>
                  <p>No real charge will be made. In production this step is replaced by a live payment provider.</p>
                </div>

                <label className="checkbox" style={{ marginTop: 20 }}>
                  <input type="checkbox" checked={accept} onChange={(event) => setAccept(event.target.checked)} />
                  <span>
                    I agree to the visit terms and cancellation policy. I understand PawCompanion offers
                    companionship, not therapy, and that the host may decline a request.
                  </span>
                </label>

                {error && (
                  <div className="notice notice-danger" style={{ marginTop: 16 }}>
                    <Icon name="alert" size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className={classes.panelActions}>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                    <Icon name="arrow-left" size={15} /> Back
                  </button>
                  <button type="button" className="btn btn-lg" onClick={submit} disabled={submitting || !accept}>
                    {submitting ? 'Confirming…' : `Confirm · ${formatCurrency(pricing.total)}`}
                  </button>
                </div>
              </section>
            )}
          </div>

          <aside className={classes.summary}>
            <div className={classes.summaryCard}>
              <div className={classes.summaryAnimal}>
                <img src={animal.imageUrl} alt="" />
                <div>
                  <strong>{animal.name}</strong>
                  <span>{animal.merchant?.verified ? 'Verified host' : 'Host'} · {animal.city}</span>
                </div>
              </div>

              <div className={classes.summaryRows}>
                <div><span>Service</span><strong>{selectedService?.label || 'Home visit'} · In person</strong></div>
                <div><span>Date</span><strong>{date ? formatDate(date, { weekday: true, year: false }) : 'Choose a date'}</strong></div>
                <div><span>Time</span><strong>{slot ? formatTimeRange(slot.startTime, selectedEndTime) : 'Choose a time'}</strong></div>
                <div><span>Duration</span><strong>{selectedService?.durationMinutes || 120} minutes</strong></div>
              </div>

              <div className={classes.summaryPrice}>
                <div><span>{selectedService?.label || 'Visit'}</span><span>{formatCurrency(pricing.subtotal)}</span></div>
                <div><span>Service fee</span><span>{formatCurrency(pricing.serviceFee)}</span></div>
                <div className={classes.total}><span>Total</span><strong>{formatCurrency(pricing.total)}</strong></div>
              </div>

              <div className={classes.summaryPolicy}>
                <Icon name="check-circle" size={15} /> Free cancellation until 24 hours before
              </div>
              <div className={classes.summaryPolicy}>
                <Icon name="shield" size={15} /> Payment held in sandbox until you confirm
              </div>
            </div>

            <div className={classes.summaryHost}>
              <span className="eyebrow">Hosted by</span>
              <strong>{animal.merchant?.name}</strong>
              <p>{animal.merchant?.description}</p>
              <div className={classes.hostMeta}>
                <span><Icon name="map-pin" size={14} /> {animal.merchant?.city}</span>
                {animal.merchant?.ratingAverage > 0 && <span><Icon name="star-filled" size={14} /> {animal.merchant.ratingAverage}</span>}
              </div>
            </div>

            <div className={classes.help}>
              <Icon name="help" size={17} />
              <div>
                <strong>Not sure this is the right fit?</strong>
                <span><Link to={`/chat/${animal.id}`}>Talk to {animal.name} first</Link> — no booking needed.</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
