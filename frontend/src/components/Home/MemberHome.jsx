import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../lib/api';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { bookingStatus, formatCurrency, formatDate, formatTimeRange, relativeTime } from '../../lib/format';
import Icon from '../../components/Icon';
import { Skeleton } from '../../components/Feedback';
import classes from './MemberHome.module.css';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Low' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

const GOALS = [
  { value: 'company', label: 'More company' },
  { value: 'calm', label: 'Calm & quiet' },
  { value: 'active', label: 'Get outside' },
  { value: 'support', label: 'Emotional support' },
  { value: 'routine', label: 'A gentle routine' },
];

const SPECIES = [
  { value: '', label: 'No preference' },
  { value: 'cat', label: 'Cats' },
  { value: 'dog', label: 'Dogs' },
  { value: 'rabbit', label: 'Rabbits' },
  { value: 'other', label: 'Other' },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still awake';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function MemberHome() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch('/api/me/dashboard');
  const [quickBusy, setQuickBusy] = useState(false);
  const [goalDraft, setGoalDraft] = useState(null);
  const [speciesDraft, setSpeciesDraft] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  if (loading) {
    return (
      <section className={classes.loadingWrap}>
        <div className="container">
          <Skeleton height={210} radius={26} />
          <div className={classes.loadingGrid}>
            <Skeleton height={180} radius={20} />
            <Skeleton height={180} radius={20} />
            <Skeleton height={180} radius={20} />
          </div>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className={classes.loadingWrap}>
        <div className="container">
          <div className="notice notice-danger"><Icon name="alert" size={17} /><span>We could not load your home screen. Refresh to try again.</span></div>
        </div>
      </section>
    );
  }

  const today = data.checkin?.today;
  const next = data.nextVisit;
  const showPreferences = !data.user.onboardingComplete || !data.user.goals?.length;
  const goals = goalDraft ?? data.user.goals ?? [];
  const species = speciesDraft ?? data.user.preferredSpecies ?? '';

  const quickCheckin = async (mood) => {
    if (quickBusy) return;
    setQuickBusy(true);
    try {
      await api.post('/api/checkins', { mood, energy: 3, tags: [] });
      toast.success('Checked in. Your companion left a reply.');
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save that check-in.'));
    } finally {
      setQuickBusy(false);
    }
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      const response = await api.patch('/api/auth/me', {
        goals,
        preferredSpecies: species,
        onboardingComplete: true,
      });
      updateUser(response.data.data.user);
      toast.success('Home personalised. Recommendations will adjust.');
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your preferences.'));
    } finally {
      setSavingPrefs(false);
    }
  };

  const moodCard = today ? (
    <div className={classes.checkinDone}>
      <div className={classes.checkinMood}>{MOODS[today.mood - 1]?.emoji}</div>
      <div className={classes.checkinBody}>
        <span className={classes.checkinLabel}>Today · {data.checkin.streak} day streak</span>
        <h3>{MOODS[today.mood - 1]?.label}. You checked in.</h3>
        {today.note && <p className={classes.checkinNote}>“{today.note}”</p>}
        {today.aiReply && (
          <div className={classes.companionReply}>
            <Icon name="sparkles" size={15} />
            <p>{today.aiReply}</p>
          </div>
        )}
      </div>
      <div className={classes.checkinActions}>
        <Link to="/check-in" className="btn btn-secondary btn-sm">Update check-in</Link>
        {today.animalId && <Link to={`/chat/${today.animalId}`} className="btn btn-sm">Continue chat</Link>}
      </div>
    </div>
  ) : (
    <div className={classes.checkinPrompt}>
      <div>
        <span className={classes.checkinLabel}>Daily check-in · {data.checkin?.streak || 0} day streak</span>
        <h3>How are you arriving today?</h3>
        <p>One tap is enough. Add a note if you want your companion to reply with something specific.</p>
      </div>
      <div className={classes.moodRow}>
        {MOODS.map((mood) => (
          <button key={mood.value} type="button" onClick={() => quickCheckin(mood.value)} disabled={quickBusy} aria-label={mood.label}>
            <span>{mood.emoji}</span>
            <small>{mood.label}</small>
          </button>
        ))}
      </div>
      <Link to="/check-in" className={classes.checkinMore}>Add a note <Icon name="arrow-right" size={13} /></Link>
    </div>
  );

  return (
    <div className={classes.page}>
      <div className="container">
        <div className={classes.greeting}>
          <div>
            <span className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <h1>{greeting()}, {user?.name?.split(' ')[0]}.</h1>
            <p>
              {today ? 'You showed up for yourself today. That counts.' : 'No rush. Start with a hello, or just take a breath.'}
            </p>
          </div>
          <div className={classes.greetingActions}>
            <Link to="/check-in" className="btn">
              <Icon name="heart" size={16} /> {today ? 'Update check-in' : 'Check in'}
            </Link>
            <Link to="/#companions" className="btn btn-secondary">Find a companion</Link>
          </div>
        </div>

        <div className={classes.heroGrid}>
          <div className={classes.checkinCard}>{moodCard}</div>
          <div className={classes.nextCard}>
            {next ? (
              <>
                <div className={classes.nextHead}>
                  <span className={`badge badge-${bookingStatus(next.status).variant || 'info'}`}>{bookingStatus(next.status).label}</span>
                  <span className={classes.nextMode}>{next.service?.mode === 'online' ? 'Online' : 'In person'}</span>
                </div>
                <div className={classes.nextAnimal}>
                  {next.animal?.imageUrl ? <img src={next.animal.imageUrl} alt="" /> : <span><Icon name="paw" size={22} /></span>}
                  <div>
                    <span className={classes.nextLabel}>Next visit</span>
                    <h3>{next.animal?.name}</h3>
                    <p>{next.service?.label} · {next.merchant?.name}</p>
                  </div>
                </div>
                <div className={classes.nextWhen}>
                  <Icon name="calendar" size={15} />
                  <span>{formatDate(next.date, { weekday: true })} · {formatTimeRange(next.startTime, next.endTime)}</span>
                </div>
                <div className={classes.nextActions}>
                  <Link to={`/visits/${next.id}`} className="btn btn-sm">View visit</Link>
                  <span className={classes.nextPrice}>{formatCurrency(next.total)}</span>
                </div>
              </>
            ) : (
              <>
                <span className={classes.nextLabel}>Nothing booked</span>
                <h3>Make some time for a visit.</h3>
                <p>Choose a companion, pick a time, and the host confirms. Home visits, walks or cafés.</p>
                <Link to="/#companions" className="btn btn-sm">Browse companions</Link>
              </>
            )}
          </div>
        </div>

        <div className={classes.trackStrip}>
          <Link to="/chats" className={classes.trackCard}>
            <span className={classes.trackIcon}><Icon name="chat" size={21} /></span>
            <div><strong>Online companionship</strong><span>Chat, check in, keep a thread with a companion.</span></div>
            <Icon name="arrow-right" size={16} />
          </Link>
          <Link to="/#companions" className={classes.trackCard}>
            <span className={`${classes.trackIcon} ${classes.trackIconCoral}`}><Icon name="paw" size={21} /></span>
            <div><strong>In-person companionship</strong><span>Home visits, walks and café meetups.</span></div>
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        <div className={classes.stats}>
          <div><strong>{data.stats.streak}</strong><span>day streak</span></div>
          <div><strong>{data.stats.completedVisits}</strong><span>visits completed</span></div>
          <div><strong>{data.stats.messages}</strong><span>messages exchanged</span></div>
          <div><strong>{data.stats.saved}</strong><span>companions saved</span></div>
        </div>

        {showPreferences && (
          <div className={classes.preferences}>
            <div className={classes.prefHead}>
              <div>
                <span className="eyebrow">Make this yours</span>
                <h2>A little about what you need.</h2>
                <p>We use this to choose the companions and prompts you see first. You can change it any time.</p>
              </div>
            </div>
            <div className={classes.prefBody}>
              <div>
                <span className={classes.prefLabel}>I am here for</span>
                <div className={classes.prefChips}>
                  {GOALS.map((goal) => (
                    <button
                      key={goal.value}
                      type="button"
                      className={`chip ${goals.includes(goal.value) ? 'chip-active' : ''}`}
                      onClick={() => setGoalDraft(goals.includes(goal.value) ? goals.filter((item) => item !== goal.value) : goals.length >= 3 ? goals : [...goals, goal.value])}
                    >
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={classes.prefLabel}>I am drawn to</span>
                <select className="select" value={species} onChange={(event) => setSpeciesDraft(event.target.value)}>
                  {SPECIES.map((item) => <option key={item.value || 'none'} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <button type="button" className="btn" onClick={savePreferences} disabled={savingPrefs}>
                {savingPrefs ? 'Saving…' : 'Save preferences'}
              </button>
            </div>
          </div>
        )}

        {data.activeChats?.length > 0 && (
          <section className={classes.section}>
            <div className={classes.sectionHead}>
              <div><span className="eyebrow">Pick up where you left off</span><h2>Your conversations</h2></div>
              <Link to="/chats" className="link-arrow">All messages <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className={classes.chatRail}>
              {data.activeChats.map((chat) => (
                <Link key={chat.animalId} to={`/chat/${chat.animalId}`} className={classes.chatCard}>
                  <span className={classes.chatAvatar}>
                    {chat.imageUrl ? <img src={chat.imageUrl} alt="" /> : <Icon name="paw" size={20} />}
                  </span>
                  <div className={classes.chatBody}>
                    <strong>{chat.animalName} <span className={`badge ${chat.mode === 'support' ? 'badge-danger' : 'badge-info'}`}>{chat.mode === 'support' ? 'Support' : 'Play'}</span></strong>
                    <p>{chat.preview || 'Start the conversation again.'}</p>
                    <span>{relativeTime(chat.lastMessageAt)} · {chat.messageCount} messages</span>
                  </div>
                  <Icon name="chevron-right" size={16} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {data.recommended?.length > 0 && (
          <section className={classes.section}>
            <div className={classes.sectionHead}>
              <div><span className="eyebrow">Chosen for you</span><h2>Companions to meet</h2></div>
              <Link to="/#companions" className="link-arrow">Browse all <Icon name="arrow-right" size={14} /></Link>
            </div>
            <div className={classes.recGrid}>
              {data.recommended.map((animal) => (
                <Link key={animal.id} to={`/companions/${animal.id}`} className={classes.recCard}>
                  <div className={classes.recImage}>{animal.imageUrl ? <img src={animal.imageUrl} alt="" /> : <Icon name="paw" size={28} />}</div>
                  <div className={classes.recBody}>
                    <div className={classes.recHead}><h3>{animal.name}</h3><span>{formatCurrency(animal.price)}<small>/hr</small></span></div>
                    <p>{animal.personality}</p>
                    <span className={classes.recMeta}>{animal.breed || animal.species} · {animal.city}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className={classes.safetyLine}>
          <Icon name="shield" size={16} />
          <span>Your check-ins and chats are private. Support mode is always available, and you can delete companion data from your account.</span>
          <Link to="/safety">How it works</Link>
        </div>
      </div>
    </div>
  );
}
