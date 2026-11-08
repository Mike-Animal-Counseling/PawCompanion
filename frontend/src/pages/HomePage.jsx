import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/format';
import MemberHome from '../components/Home/MemberHome';
import CompanionCard from '../components/Companions/CompanionCard';
import FilterBar from '../components/Companions/FilterBar';
import { Skeleton, Pagination } from '../components/Feedback';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import classes from './HomePage.module.css';

const HERO_QUICK_LINKS = [
  { label: 'Quiet cats', species: 'cat', tag: 'quiet' },
  { label: 'Dogs for walks', species: 'dog', tag: 'walks' },
  { label: 'First visit', tag: 'gentle' },
  { label: 'Under $45', maxPrice: '45' },
];

const STEPS = [
  {
    icon: 'search',
    number: '01',
    title: 'Find a companion',
    body: 'Filter by species, city, energy level and the kind of afternoon you want. Every host is verified before their companions go live.',
  },
  {
    icon: 'chat',
    number: '02',
    title: 'Say hello first',
    body: 'Each companion has an AI personality you can talk to before you book. Playful by default, with a gentle support mode when the day is heavy.',
  },
  {
    icon: 'calendar',
    number: '03',
    title: 'Book a low-pressure visit',
    body: 'Choose a two-hour slot, tell the host what you need, and pay through the sandbox checkout. No subscriptions, no surprises.',
  },
];

const SAFETY_POINTS = [
  { icon: 'shield', title: 'Checked before every reply', body: 'Self-harm signals are detected before the AI responds, with crisis resources surfaced immediately.' },
  { icon: 'lock', title: 'No raw messages in the risk log', body: 'Only a derived risk level and timestamp are stored. You can delete all companion data at any time.' },
  { icon: 'globe', title: 'Humans in the loop', body: 'Watch and flagged profiles appear in a private operations queue for review — never in public profiles.' },
];

export default function HomePage() {
  useDocumentTitle(null, 'Discover verified animal companions, chat with their AI personalities, and book a low-pressure visit with PawCompanion.');
  const { isCustomer } = useAuth();
  const [params, setParams] = useSearchParams();
  const [heroQuery, setHeroQuery] = useState(params.get('q') || '');

  const filters = useMemo(
    () => ({
      q: params.get('q') || '',
      species: params.get('species') || '',
      tag: params.get('tag') || '',
      city: params.get('city') || '',
      sort: params.get('sort') || 'recommended',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      page: Math.max(1, Number(params.get('page')) || 1),
    }),
    [params],
  );

  useEffect(() => {
    setHeroQuery(filters.q);
  }, [filters.q]);

  const listQuery = useMemo(() => {
    const query = new URLSearchParams();
    for (const key of ['q', 'species', 'tag', 'city', 'minPrice', 'maxPrice']) {
      if (filters[key]) query.set(key, filters[key]);
    }
    if (filters.sort && filters.sort !== 'recommended') query.set('sort', filters.sort);
    query.set('page', String(filters.page));
    query.set('pageSize', '9');
    return query.toString();
  }, [filters]);

  const { data: animals, meta, loading, error, refetch } = useFetch(`/api/animals?${listQuery}`);
  const { data: facets } = useFetch('/api/animals/facets');

  const updateFilters = (updates, { resetPage = true } = {}) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const resetFilters = () => setParams(new URLSearchParams(), { replace: true });

  const submitHero = (event) => {
    event.preventDefault();
    updateFilters({ q: heroQuery.trim() });
    document.getElementById('companions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const averagePrice = facets?.priceRange?.min ? formatCurrency(facets.priceRange.min) : '$36';

  return (
    <div className={classes.page}>
      {isCustomer ? (
        <MemberHome />
      ) : (
      <section className={classes.hero}>
        <div className={`container ${classes.heroGrid}`}>
          <div className={classes.heroCopy}>
            <span className="eyebrow">Companionship, on your terms</span>
            <h1 className={classes.heroTitle}>
              Meet someone who makes the day <em>lighter.</em>
            </h1>
            <p className={classes.heroLede}>
              Verified animal companions, warm AI personalities, and low-pressure visits. Whether you need a
              walking buddy or a quiet hour, start with a hello.
            </p>

            <form className="search" onSubmit={submitHero} role="search">
              <Icon name="search" size={19} className={classes.searchIcon} />
              <input
                type="search"
                value={heroQuery}
                onChange={(event) => setHeroQuery(event.target.value)}
                placeholder="Try “quiet cat in Portland” or “golden retriever”"
                aria-label="Search companions"
              />
              <button type="submit" className="btn">
                Find a companion
              </button>
            </form>

            <div className={classes.quickLinks}>
              <span>Popular:</span>
              {HERO_QUICK_LINKS.map((link) => (
                <button key={link.label} type="button" className="chip" onClick={() => updateFilters(link)}>
                  {link.label}
                </button>
              ))}
            </div>

            <div className={classes.heroProof}>
              <div>
                <strong>{facets?.total ?? '14'}</strong>
                <span>verified companions</span>
              </div>
              <div>
                <strong>{facets?.hosts ?? '4'}</strong>
                <span>partner hosts</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>AI company between visits</span>
              </div>
            </div>
          </div>

          <div className={classes.heroVisual} aria-hidden="true">
            <div className={classes.photoMain}>
              <img src="/animals/dog1.jpg" alt="" />
              <span className={`badge badge-success ${classes.photoBadge}`}>
                <Icon name="shield" size={12} /> Verified host
              </span>
            </div>
            <div className={classes.photoSmall}>
              <img src="/animals/cat2.jpg" alt="" />
            </div>
            <div className={classes.chatCard}>
              <div className={classes.chatHead}>
                <span className={classes.chatAvatar}>
                  <img src="/animals/cat1.jpg" alt="" />
                </span>
                <div>
                  <strong>Mochi</strong>
                  <span>AI companion · online</span>
                </div>
                <span className={classes.onlineDot} />
              </div>
              <p>“You found my sunbeam. Stay a while.”</p>
              <span className={classes.chatMeta}>Support mode available</span>
            </div>
            <div className={classes.miniCard}>
              <span className={classes.miniIcon}>
                <Icon name="heart" size={18} />
              </span>
              <div>
                <strong>2,400+ quiet hours</strong>
                <span>booked by guests like you</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {!isCustomer && (
        <div className={classes.trustStrip}>
          <div className={`container ${classes.trustInner}`}>
            <span><Icon name="shield" size={15} /> Every host verified</span>
            <span><Icon name="heart" size={15} /> Companion welfare first</span>
            <span><Icon name="lock" size={15} /> Private by design</span>
            <span><Icon name="globe" size={15} /> Portland · Austin · Seattle</span>
          </div>
        </div>
      )}

      <section className={`section ${classes.discover}`} id="companions">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Find your person</span>
              <h2 className="section-title" style={{ marginTop: 10 }}>Companions near you</h2>
            </div>
            <p>
              From professionally lazy lap cats to golden retrievers who think every stranger is a friend.
              Filter by what your week actually needs.
            </p>
          </div>

          <FilterBar
            filters={filters}
            facets={facets}
            resultCount={meta?.total}
            onChange={updateFilters}
            onReset={resetFilters}
          />

          {error ? (
            <EmptyState
              icon="alert"
              title="We could not load companions"
              action={<button type="button" className="btn" onClick={refetch}>Try again</button>}
            >
              The API is not responding. Check that the backend is running, then try again.
            </EmptyState>
          ) : loading && !animals ? (
            <div className={classes.grid}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className={classes.skeletonCard}>
                  <Skeleton height={230} radius={20} />
                  <Skeleton width="55%" height={24} />
                  <Skeleton width="80%" height={14} />
                  <Skeleton width="45%" height={14} />
                </div>
              ))}
            </div>
          ) : animals?.length ? (
            <>
              <div className={classes.grid}>
                {animals.map((animal, index) => (
                  <CompanionCard key={animal.id} animal={animal} priority={index < 3} />
                ))}
              </div>
              <Pagination
                page={meta?.page || 1}
                totalPages={meta?.totalPages || 1}
                onChange={(page) => {
                  updateFilters({ page }, { resetPage: false });
                  document.getElementById('companions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            </>
          ) : (
            <EmptyState
              icon="search"
              title="No companions match that combination"
              action={<button type="button" className="btn btn-secondary" onClick={resetFilters}>Clear filters</button>}
            >
              Try another city, widen the price range, or search for a breed. New companions join every week.
            </EmptyState>
          )}
        </div>
      </section>

      {!isCustomer && (
      <section className={`section ${classes.how}`} id="how-it-works">
        <div className="container">
          <div className={classes.howHead}>
            <span className="eyebrow">A gentler way in</span>
            <h2 className="section-title">Three steps, no pressure.</h2>
            <p className="lede">
              You do not need to know exactly what you need. Start with a conversation and take it from there.
            </p>
          </div>
          <div className={classes.steps}>
            {STEPS.map((step) => (
              <article key={step.title} className={classes.step}>
                <div className={classes.stepTop}>
                  <span className={classes.stepIcon}><Icon name={step.icon} size={22} /></span>
                  <span className={classes.stepNumber}>{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      <section className={`section ${classes.safetySection}`}>
        <div className="container">
          <div className={classes.safetyGrid}>
            <div className={classes.safetyCopy}>
              <span className="eyebrow">Safety, by design</span>
              <h2 className="section-title">Companionship that knows when to call in a human.</h2>
              <p className="lede">
                Support mode is not a marketing badge. Every message is screened for self-harm risk before a
                reply, and crisis resources interrupt the conversation when someone needs more than a friendly voice.
              </p>
              <div className={classes.safetyActions}>
                <Link to="/safety" className="btn">
                  How our safety model works
                </Link>
                <span className={classes.safetyNote}>No diagnosis. No replacement for care.</span>
              </div>
            </div>
            <div className={classes.safetyCards}>
              {SAFETY_POINTS.map((point) => (
                <div key={point.title} className={classes.safetyCard}>
                  <span className={classes.safetyIcon}><Icon name={point.icon} size={20} /></span>
                  <div>
                    <h3>{point.title}</h3>
                    <p>{point.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {!isCustomer && (
      <section className={`section ${classes.partnerSection}`}>
        <div className="container">
          <div className={classes.partnerCard}>
            <div className={classes.partnerCopy}>
              <span className={classes.partnerEyebrow}>For shelters, cafés and trainers</span>
              <h2>Bring your companions to people who need them.</h2>
              <p>
                Publish listings, manage your calendar and meet guests with a calmer, safety-aware booking flow.
                Partner tools are included — no per-seat pricing in this build.
              </p>
              <div className={classes.partnerActions}>
                <Link to="/merchant/register" className="btn btn-coral">
                  Become a partner
                </Link>
                <Link to="/merchant/login" className={classes.partnerLink}>
                  Partner log in <Icon name="arrow-right" size={15} />
                </Link>
              </div>
            </div>
            <div className={classes.partnerStats}>
              <div>
                <span>Average guest rating</span>
                <strong>4.7 <small>/ 5</small></strong>
              </div>
              <div>
                <span>Starting price</span>
                <strong>{averagePrice} <small>/ hr</small></strong>
              </div>
              <div>
                <span>Repeat guests</span>
                <strong>38<small>%</small></strong>
              </div>
              <p className={classes.partnerFootnote}>Illustrative demo metrics from seeded data.</p>
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
