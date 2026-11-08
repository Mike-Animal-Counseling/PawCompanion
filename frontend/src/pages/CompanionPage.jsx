import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, formatDateShort, formatTime, speciesLabel, ageFromMonths } from '../lib/format';
import Rating from '../components/Rating';
import Icon from '../components/Icon';
import ReviewList from '../components/Companions/ReviewList';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Feedback';
import classes from './CompanionPage.module.css';

const FACT_ICONS = {
  energy: 'sun',
  kids: 'users',
  pets: 'paw',
  vaccinated: 'shield',
  neutered: 'check-circle',
};

function typicalVisit(species) {
  if (species === 'dog') {
    return [
      { title: 'Meet and sniff', body: 'A calm hello at the agreed meeting point. The host will introduce you and explain the dog’s cues.' },
      { title: 'Walk or play', body: 'A gentle walk, a game of fetch, or simply sitting together — whatever the dog is comfortable with that day.' },
      { title: 'Water and wind-down', body: 'A drink, a treat and a quiet finish. The host checks in before you leave.' },
    ];
  }
  if (species === 'cat') {
    return [
      { title: 'Settle in', body: 'The host shows you where to sit and lets the cat decide the pace. No picking up, no chasing.' },
      { title: 'Let them come to you', body: 'Toys, treats and a soft voice help. Some cats want to play immediately; others need ten minutes.' },
      { title: 'Leave on a calm note', body: 'A slow blink goodbye. The host will tell you what the cat enjoyed so your next visit is easier.' },
    ];
  }
  return [
    { title: 'Say hello', body: 'The host introduces you to your companion in a quiet, familiar space.' },
    { title: 'Spend time together', body: 'Follow the companion’s lead. The host is nearby to help with cues and comfort.' },
    { title: 'Wind down', body: 'A calm ending, a note about what worked, and a plan for next time.' },
  ];
}

export default function CompanionPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const toast = useToast();
  const [notesOpen, setNotesOpen] = useState(false);

  const { data: animal, loading, error } = useFetch(`/api/animals/${id}`);
  const { data: services } = useFetch(`/api/bookings/services/${id}`, { enabled: Boolean(animal) });
  const { data: reviewData, meta: reviewMeta } = useFetch(`/api/animals/${id}/reviews?pageSize=20`, { enabled: Boolean(animal) });
  useDocumentTitle(animal ? `Meet ${animal.name}` : 'Companion', animal?.personality || 'Meet a verified animal companion on PawCompanion.');

  useEffect(() => {
    setNotesOpen(false);
  }, [id]);

  if (loading) {
    return (
      <div className={`container ${classes.loading}`}>
        <Skeleton height={420} radius={30} />
        <div className={classes.loadingRow}>
          <Skeleton height={30} width="40%" />
          <Skeleton height={16} width="70%" />
          <Skeleton height={16} width="55%" />
        </div>
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className={`container ${classes.notFound}`}>
        <EmptyState
          icon="paw"
          title="This companion is not available"
          action={<Link to="/" className="btn">Browse other companions</Link>}
        >
          The listing may have been archived by its host. The rest of the pack is still here.
        </EmptyState>
      </div>
    );
  }

  const favorite = isFavorite(animal.id);
  const visit = typicalVisit(animal.species);
  const next = animal.availability?.next;
  const canBook = !user || user.role === 'customer';
  const homeService = services?.find((service) => service.type === 'home_visit');
  const videoService = services?.find((service) => service.type === 'video_call');
  const pricing = homeService?.pricing
    ? { ...homeService.pricing, hourlyRate: animal.price, hours: 2 }
    : {
        hourlyRate: animal.price,
        subtotal: animal.price * 2,
        serviceFee: Math.round(animal.price * 2 * 0.08 * 100) / 100,
        total: Math.round(animal.price * 2 * 1.08 * 100) / 100,
        hours: 2,
      };

  const onFavorite = async () => {
    if (!user) {
      toast.info('Sign in to save companions for later.');
      return;
    }
    if (user.role !== 'customer') return;
    await toggle(animal.id);
  };

  return (
    <div className={classes.page}>
      <div className="container">
        <nav className={classes.breadcrumbs} aria-label="Breadcrumb">
          <Link to="/">Discover</Link>
          <Icon name="chevron-right" size={13} />
          <Link to={`/?species=${animal.species}`}>{speciesLabel(animal.species)}s</Link>
          <Icon name="chevron-right" size={13} />
          <span>{animal.name}</span>
        </nav>

        <div className={classes.hero}>
          <div className={classes.gallery}>
            <div className={classes.mainImage}>
              <img src={animal.imageUrl} alt={`${animal.name}, a ${animal.breed || speciesLabel(animal.species)}`} />
              <div className={classes.imageBadges}>
                {animal.merchant?.verified && (
                  <span className="badge badge-dark">
                    <Icon name="shield" size={12} /> Verified host
                  </span>
                )}
                {animal.featured && <span className="badge badge-coral">Guest favourite</span>}
              </div>
              <button type="button" className={classes.favorite} onClick={onFavorite} aria-pressed={favorite} aria-label={favorite ? 'Remove from saved' : 'Save companion'}>
                <Icon name={favorite ? 'heart-filled' : 'heart'} size={20} />
              </button>
            </div>
            <div className={classes.galleryMeta}>
              <span><Icon name="map-pin" size={15} /> {animal.city || 'Location shared after booking'}</span>
              <span><Icon name="clock" size={15} /> Usually replies within a day</span>
            </div>
          </div>

          <div className={classes.info}>
            <div className={classes.hostLine}>
              {animal.merchant ? (
                <>
                  <span className={`badge ${animal.merchant.verified ? 'badge-success' : 'badge-warning'}`}>
                    {animal.merchant.verified ? 'Verified host' : 'New host'}
                  </span>
                  <span className={classes.hostName}>
                    {animal.merchant.businessType} · {animal.merchant.name}
                  </span>
                </>
              ) : (
                <span className={classes.hostName}>Independent host</span>
              )}
            </div>

            <h1 className={classes.name}>{animal.name}</h1>
            <p className={classes.subline}>
              {animal.breed || speciesLabel(animal.species)} · {ageFromMonths(animal.ageMonths)} · {animal.gender === 'female' ? 'Female' : animal.gender === 'male' ? 'Male' : 'Gender not specified'}
            </p>

            <div className={classes.ratingRow}>
              <Rating value={animal.ratingAverage} count={animal.reviewCount} size={15} />
              <span className={classes.dot}>·</span>
              <span>{animal.bookingCount} visits hosted</span>
            </div>

            <blockquote className={classes.quote}>
              <Icon name="sparkles" size={18} />
              <p>{animal.personality}</p>
            </blockquote>

            <div className={classes.facts}>
              <div>
                <span className={classes.factIcon}><Icon name={FACT_ICONS.energy} size={17} /></span>
                <span>
                  <strong>{['Very calm', 'Calm', 'Balanced', 'Playful', 'Very active'][animal.energyLevel - 1] || 'Balanced'}</strong>
                  <small>Energy level</small>
                </span>
              </div>
              <div>
                <span className={classes.factIcon}><Icon name="users" size={17} /></span>
                <span>
                  <strong>{animal.goodWithKids ? 'Good with kids' : 'Adults preferred'}</strong>
                  <small>Household fit</small>
                </span>
              </div>
              <div>
                <span className={classes.factIcon}><Icon name="paw" size={17} /></span>
                <span>
                  <strong>{animal.goodWithPets ? 'Good with pets' : 'Only pet'}</strong>
                  <small>Animal fit</small>
                </span>
              </div>
              <div>
                <span className={classes.factIcon}><Icon name="shield" size={17} /></span>
                <span>
                  <strong>{animal.vaccinated && animal.neutered ? 'Vet-checked' : animal.vaccinated ? 'Vaccinated' : 'Checks in progress'}</strong>
                  <small>Health</small>
                </span>
              </div>
            </div>

            <div className={classes.tags}>
              {animal.tags?.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>

            <div className={classes.bookingCard}>
              <div className={classes.priceRow}>
                <div>
                  <span className={classes.price}>{formatCurrency(animal.price)}</span>
                  <span className={classes.perHour}>/ hour</span>
                </div>
                <span className={classes.minimum}>2-hour minimum</span>
              </div>
              <div className={classes.serviceOptions}>
                <div>
                  <span className={classes.serviceMode}><Icon name="paw" size={13} /> In person</span>
                  <strong>2-hour visit</strong>
                  <span>{formatCurrency(pricing.total)}</span>
                </div>
                {videoService && (
                  <div>
                    <span className={classes.serviceMode}><Icon name="chat" size={13} /> Online</span>
                    <strong>30-min video call</strong>
                    <span>{formatCurrency(videoService.pricing.total)}</span>
                  </div>
                )}
              </div>
              <div className={classes.priceBreakdown}>
                <span>In-person subtotal</span>
                <span>{formatCurrency(pricing.subtotal)}</span>
                <span>Service fee</span>
                <span>{formatCurrency(pricing.serviceFee)}</span>
                <strong>Home visit total</strong>
                <strong>{formatCurrency(pricing.total)}</strong>
              </div>
              {next ? (
                <div className={classes.nextSlot}>
                  <span className={classes.nextIcon}><Icon name="calendar" size={16} /></span>
                  <span>
                    <strong>Next opening: {formatDateShort(next.date)}</strong>
                    <small>{next.slots.slice(0, 3).map((slot) => formatTime(slot.startTime)).join(' · ')}</small>
                  </span>
                </div>
              ) : (
                <div className={`notice notice-warning ${classes.noSlot}`}>
                  <Icon name="clock" size={17} />
                  <span>Fully booked for the next two weeks. Message the host or check back soon.</span>
                </div>
              )}

              {canBook ? (
                <div className={classes.ctaRow}>
                  <Link to={`/chat/${animal.id}`} className="btn btn-secondary">
                    <Icon name="chat" size={17} /> Chat online
                  </Link>
                  <Link to={`/book/${animal.id}`} className="btn">
                    Book in person <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
              ) : (
                <div className="notice">
                  <Icon name="info" size={17} />
                  <span>Sign in with a guest account to chat or book. You are currently signed in as a {user.role}.</span>
                </div>
              )}
              <p className={classes.safetyNote}>
                <Icon name="shield" size={13} /> Chats are screened for safety. Payments are sandboxed.
              </p>
            </div>
          </div>
        </div>

        <div className={classes.contentGrid}>
          <div className={classes.mainColumn}>
            <section className={classes.section}>
              <span className="eyebrow">About</span>
              <h2>More about {animal.name}</h2>
              <p className={classes.description}>{animal.description}</p>
            </section>

            <section className={classes.section}>
              <span className="eyebrow">What to expect</span>
              <h2>A typical visit</h2>
              <div className={classes.visitSteps}>
                {visit.map((step, index) => (
                  <div key={step.title} className={classes.visitStep}>
                    <span className={classes.visitNumber}>{index + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={classes.section}>
              <span className="eyebrow">Good to know</span>
              <h2>Before you book</h2>
              <div className={classes.goodToKnow}>
                <div><Icon name="check" size={16} /> {animal.vaccinated ? 'Vaccinations up to date' : 'Vaccination records being verified'}</div>
                <div><Icon name="check" size={16} /> {animal.goodWithKids ? 'Comfortable around children' : 'Best for adults or calm households'}</div>
                <div><Icon name="check" size={16} /> {animal.goodWithPets ? 'Can share space with other animals' : 'Prefers to be the only animal present'}</div>
                <div><Icon name="check" size={16} /> Visits are two hours and capped at two per day</div>
                <div><Icon name="check" size={16} /> Free cancellation more than 24 hours ahead</div>
              </div>
            </section>

            <section className={classes.section}>
              <span className="eyebrow">Guest reviews</span>
              <h2>What visitors say</h2>
              <ReviewList
                reviews={reviewData || animal.reviews?.recent || []}
                breakdown={animal.reviews?.breakdown || []}
                average={animal.ratingAverage}
                count={reviewMeta?.total ?? animal.reviewCount}
              />
            </section>
          </div>

          <aside className={classes.sideColumn}>
            {animal.relationship && (
              <div className={classes.bondCard}>
                <div className={classes.bondHead}>
                  <span className="eyebrow">Your companionship</span>
                  <span className="badge badge-coral">Level {animal.relationship.level}</span>
                </div>
                <h3>You and {animal.name}</h3>
                <p>
                  {animal.relationship.messages} messages · {animal.relationship.visits} visit{animal.relationship.visits === 1 ? '' : 's'}
                  {animal.relationship.favorite ? ' · saved' : ''}
                </p>
                <div className={classes.bondTrack}>
                  <span style={{ width: `${Math.min(100, (animal.relationship.points % 60) / 60 * 100)}%` }} />
                </div>
                <div className={classes.bondActions}>
                  <Link to={`/chat/${animal.id}`} className="btn btn-secondary btn-sm">Continue chat</Link>
                  <span>{60 - (animal.relationship.points % 60)} points to level {animal.relationship.level + 1}</span>
                </div>
              </div>
            )}

            <div className={classes.hostCard}>
              <span className="eyebrow">Hosted by</span>
              <h3>{animal.merchant?.name || 'Independent host'}</h3>
              <p className={classes.hostType}>{animal.merchant?.businessType || 'Companion host'}</p>
              <p className={classes.hostDesc}>{animal.merchant?.description || 'A verified PawCompanion host.'}</p>
              <div className={classes.hostMeta}>
                <span><Icon name="map-pin" size={15} /> {animal.merchant?.city || animal.city}</span>
                {animal.merchant?.ratingAverage > 0 && (
                  <span><Icon name="star-filled" size={15} /> {animal.merchant.ratingAverage} host rating</span>
                )}
              </div>
              {animal.merchant?.website && (
                <a href={animal.merchant.website} target="_blank" rel="noreferrer" className="link-arrow">
                  Visit host website <Icon name="external" size={14} />
                </a>
              )}
            </div>

            <div className={classes.safetyCard}>
              <span className={classes.safetyIcon}><Icon name="shield" size={21} /></span>
              <h3>Safety comes first</h3>
              <p>
                Every AI conversation is screened for self-harm risk. If something worrying comes up, PawCompanion
                pauses the conversation and shares crisis resources.
              </p>
              <Link to="/safety" className="link-arrow">
                Read the safety model <Icon name="arrow-right" size={14} />
              </Link>
            </div>

            <div className={classes.notesCard}>
              <button type="button" onClick={() => setNotesOpen((value) => !value)} aria-expanded={notesOpen}>
                <span>Questions to ask the host</span>
                <Icon name={notesOpen ? 'close' : 'plus'} size={16} />
              </button>
              {notesOpen && (
                <ul>
                  <li>What does {animal.name} usually enjoy on a first visit?</li>
                  <li>Is there anything that makes them nervous?</li>
                  <li>Where should we meet, and is it step-free?</li>
                  <li>What should I bring?</li>
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
