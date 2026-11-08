import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../lib/format';
import Icon from '../components/Icon';
import { PageLoader } from '../components/Feedback';
import classes from './CheckinPage.module.css';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Really low', note: 'It is okay to not be okay.' },
  { value: 2, emoji: '😕', label: 'Low', note: 'Something is weighing on you.' },
  { value: 3, emoji: '😐', label: 'Okay', note: 'A middle kind of day.' },
  { value: 4, emoji: '🙂', label: 'Good', note: 'There is some light in it.' },
  { value: 5, emoji: '😄', label: 'Really good', note: 'Worth noticing and keeping.' },
];

const TAGS = [
  { value: 'calm', label: 'Calm' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'lonely', label: 'Lonely' },
  { value: 'tired', label: 'Tired' },
  { value: 'overwhelmed', label: 'Overwhelmed' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'grateful', label: 'Grateful' },
  { value: 'good', label: 'Good' },
];

function todayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function CheckinPage() {
  useDocumentTitle('Daily check-in', 'A short daily check-in for your mood, energy and the companion you want to hear from.');
  const toast = useToast();
  const { data: history, loading, refetch } = useFetch('/api/checkins?days=30');
  const { data: companions } = useFetch('/api/me/companions');
  const [mood, setMood] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState('');
  const [animalId, setAnimalId] = useState('');
  const [reply, setReply] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const today = todayString();
  const todayCheckin = history?.items?.find((item) => item.date === today);
  const weekSeries = history?.series?.slice(-7) || [];
  const weekChecked = weekSeries.filter((day) => day.checkedIn).length;
  const weekMoods = weekSeries.filter((day) => day.mood).map((day) => day.mood);
  const weekAverage = weekMoods.length ? Math.round((weekMoods.reduce((sum, value) => sum + value, 0) / weekMoods.length) * 10) / 10 : null;

  useEffect(() => {
    if (!todayCheckin) return;
    setMood(todayCheckin.mood);
    setEnergy(todayCheckin.energy);
    setTags(todayCheckin.tags || []);
    setNote(todayCheckin.note || '');
    setAnimalId(todayCheckin.animalId || '');
    setReply({ text: todayCheckin.aiReply, mode: todayCheckin.mode, checkin: todayCheckin });
  }, [todayCheckin?.id]);

  const toggleTag = (tag) => {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : current.length >= 4 ? current : [...current, tag]));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!mood) {
      setError('Choose how you feel first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/api/checkins', {
        mood,
        energy,
        tags,
        note: note.trim(),
        ...(animalId ? { animalId } : {}),
      });
      setReply({
        text: response.data.data.checkin.aiReply,
        mode: response.data.data.checkin.mode,
        safety: response.data.data.safety,
        checkin: response.data.data.checkin,
      });
      toast.success(todayCheckin ? 'Today’s check-in updated.' : 'Check-in saved. Your companion replied.');
      await refetch();
    } catch (err) {
      setError(errorMessage(err, 'Could not save your check-in.'));
    } finally {
      setSaving(false);
    }
  };

  const selectedCompanion = useMemo(
    () => companions?.find((companion) => companion.id === (animalId || todayCheckin?.animalId)),
    [companions, animalId, todayCheckin],
  );

  if (loading) return <PageLoader label="Opening your check-in…" />;

  return (
    <div className={classes.page}>
      <div className={`container ${classes.layout}`}>
        <header className={classes.head}>
          <div>
            <span className="eyebrow">Daily check-in</span>
            <h1>How are you, really?</h1>
            <p>No scores, no streaks to chase. Just thirty seconds to notice where you are today.</p>
          </div>
          <div className={classes.streak}>
            <span className={classes.streakNumber}>{history?.streak ?? 0}</span>
            <span>day streak<br /><small>Any check-in counts</small></span>
          </div>
        </header>

        <div className={classes.grid}>
          <form className={classes.formCard} onSubmit={submit}>
            <div className={classes.block}>
              <span className={classes.blockLabel}>Mood</span>
              <div className={classes.moods} role="radiogroup" aria-label="How do you feel today?">
                {MOODS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={mood === item.value}
                    className={`${classes.mood} ${mood === item.value ? classes.moodActive : ''}`}
                    onClick={() => { setMood(item.value); setError(''); }}
                  >
                    <span className={classes.moodEmoji} aria-hidden="true">{item.emoji}</span>
                    <span className={classes.moodLabel}>{item.label}</span>
                  </button>
                ))}
              </div>
              {mood > 0 && <p className={classes.moodNote}>{MOODS[mood - 1].note}</p>}
            </div>

            <div className={classes.block}>
              <div className={classes.blockHead}>
                <span className={classes.blockLabel}>Energy</span>
                <span className={classes.energyValue}>{energy}/5</span>
              </div>
              <div className={classes.energy}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`${classes.energyDot} ${value <= energy ? classes.energyOn : ''}`}
                    onClick={() => setEnergy(value)}
                    aria-label={`${value} out of 5 energy`}
                    aria-pressed={energy === value}
                  />
                ))}
              </div>
            </div>

            <div className={classes.block}>
              <span className={classes.blockLabel}>What is around it?</span>
              <div className={classes.tags}>
                {TAGS.map((tag) => (
                  <button
                    key={tag.value}
                    type="button"
                    className={`chip ${tags.includes(tag.value) ? 'chip-active' : ''}`}
                    onClick={() => toggleTag(tag.value)}
                    aria-pressed={tags.includes(tag.value)}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={classes.block}>
              <label className={classes.blockLabel} htmlFor="checkin-note">Anything you want to put down?</label>
              <textarea
                id="checkin-note"
                className={`textarea ${classes.note}`}
                rows={5}
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="A sentence, a list, a feeling. Your companion will read it with care."
              />
              <span className="hint">{note.length}/2000 · Private to your account</span>
            </div>

            <div className={classes.block}>
              <label className={classes.blockLabel} htmlFor="checkin-companion">Who should reply?</label>
              <select id="checkin-companion" className="select" value={animalId} onChange={(event) => setAnimalId(event.target.value)}>
                <option value="">No companion — just keep this for me</option>
                {companions?.map((companion) => (
                  <option key={companion.id} value={companion.id}>
                    {companion.name} {companion.relationship?.messages ? `· ${companion.relationship.messages} messages` : ''}
                  </option>
                ))}
              </select>
              <span className="hint">If you choose a companion, the check-in is added to your conversation with them.</span>
            </div>

            {error && <div className="notice notice-danger"><Icon name="alert" size={16} /><span>{error}</span></div>}

            <button type="submit" className="btn btn-block btn-lg" disabled={saving}>
              {saving ? 'Saving…' : todayCheckin ? 'Update today’s check-in' : 'Save check-in'}
            </button>
            <p className={classes.privacy}><Icon name="lock" size={13} /> Your note is not shared with hosts or other guests.</p>
          </form>

          <aside className={classes.side}>
            {reply?.text && (
              <div className={`${classes.replyCard} ${reply.mode === 'support' ? classes.replySupport : ''}`}>
                <div className={classes.replyHead}>
                  {selectedCompanion?.imageUrl ? <img src={selectedCompanion.imageUrl} alt="" /> : <span className={classes.replyIcon}><Icon name="sparkles" size={19} /></span>}
                  <div>
                    <strong>{selectedCompanion?.name || 'PawCompanion'}</strong>
                    <span>{reply.mode === 'support' ? 'Support mode' : 'Companion reply'} · just now</span>
                  </div>
                </div>
                <p>{reply.text}</p>
                {reply.safety?.flagged && (
                  <div className="notice notice-danger" style={{ marginTop: 12 }}>
                    <Icon name="shield" size={16} />
                    <span>
                      If you are in danger, call 911. US: call or text 988. Outside the US, findahelpline.com lists
                      local services.
                    </span>
                  </div>
                )}
                <div className={classes.replyActions}>
                  {selectedCompanion && (
                    <>
                      <Link to={`/chat/${selectedCompanion.id}`} className="btn btn-secondary btn-sm">Continue chatting</Link>
                      <Link to={`/book/${selectedCompanion.id}`} className="btn btn-sm">Book an in-person visit</Link>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className={classes.weekCard}>
              <div className={classes.weekHead}>
                <div><h2>This week</h2><p>{weekAverage ? `Average mood ${weekAverage}/5` : 'No check-ins in the last 7 days'}</p></div>
                <span className="badge badge-info">{weekChecked} of 7</span>
              </div>
              <div className={classes.weekChart}>
                {weekSeries.map((day) => (
                  <div key={day.date} className={classes.weekDay}>
                    <div className={classes.weekTrack}>
                      <span style={{ height: day.mood ? `${(day.mood / 5) * 100}%` : '4%' }} className={day.checkedIn ? classes.weekFill : classes.weekEmpty} />
                    </div>
                    <span>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={classes.historyCard}>
              <div className={classes.weekHead}>
                <div><h2>Recent check-ins</h2><p>Notes and replies</p></div>
              </div>
              {history?.items?.length ? (
                <ul className={classes.historyList}>
                  {history.items.slice(0, 6).map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => setExpanded(expanded === item.id ? null : item.id)} aria-expanded={expanded === item.id}>
                        <span className={classes.historyMood}>{MOODS[item.mood - 1]?.emoji}</span>
                        <span className={classes.historyBody}>
                          <strong>{formatDate(item.date, { weekday: true, year: false })}</strong>
                          <span>{item.note || 'No note — just a check-in.'}</span>
                        </span>
                        <span className={classes.historyStreak}>{item.animalName || 'Private'}</span>
                        <Icon name={expanded === item.id ? 'chevron-down' : 'chevron-right'} size={15} />
                      </button>
                      {expanded === item.id && item.aiReply && (
                        <div className={classes.historyReply}>
                          <strong>{item.animalName || 'PawCompanion'} replied</strong>
                          <p>{item.aiReply}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">Your first check-in will appear here.</p>
              )}
            </div>

            <div className={classes.safetyCard}>
              <Icon name="shield" size={18} />
              <div>
                <strong>Check-ins are screened for safety.</strong>
                <span>If a note suggests you are at risk, the companion pauses and shares crisis resources. This is not therapy.</span>
              </div>
              <Link to="/safety">Learn more</Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
