import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage, fieldErrors } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch, useDocumentTitle } from '../hooks/useFetch';
import { formatDate, relativeTime, initials } from '../lib/format';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { PageLoader } from '../components/Feedback';
import classes from './AccountPage.module.css';

const STATUS_COPY = {
  ok: {
    title: 'Nothing elevated right now',
    body: 'No recent conversation has raised a sustained safety signal. Your private risk profile stays quiet unless something changes.',
    badge: 'badge-success',
    label: 'Steady',
  },
  watch: {
    title: 'We noticed a heavier stretch',
    body: 'A few recent messages suggested you were having a hard time. Nothing is wrong with you. This is a private nudge to check the resources below and be gentle with yourself.',
    badge: 'badge-warning',
    label: 'On watch',
  },
  flagged: {
    title: 'We flagged some recent messages for extra care',
    body: 'Repeated or high-risk signals were detected. A human operator may review the derived signals (not your message text). If you need support now, please contact a crisis line or someone you trust.',
    badge: 'badge-danger',
    label: 'Needs care',
  },
};

const TAB_ICONS = { profile: 'user', safety: 'shield', sessions: 'lock', security: 'settings' };

export default function AccountPage() {
  useDocumentTitle('Account');
  const { user, isCustomer, isMerchant, isAdmin, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabs = useMemo(() => (isCustomer ? ['profile', 'safety', 'sessions', 'security'] : ['profile', 'sessions', 'security']), [isCustomer]);
  const tab = tabs.includes(params.get('tab')) ? params.get('tab') : 'profile';

  const [form, setForm] = useState({ name: '', phone: '', city: '', marketingOptIn: false, goals: [], preferredSpecies: '' });
  const [saving, setSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  const { data: sessions, loading: sessionsLoading, refetch: refetchSessions } = useFetch('/api/auth/sessions', { enabled: tab === 'sessions' || tab === 'security' });
  const { data: safety, loading: safetyLoading, refetch: refetchSafety } = useFetch('/api/ai/safety', { enabled: tab === 'safety' && isCustomer });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [dataOpen, setDataOpen] = useState(false);
  const [dataBusy, setDataBusy] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      city: user.city || '',
      marketingOptIn: Boolean(user.marketingOptIn),
      goals: user.goals || [],
      preferredSpecies: user.preferredSpecies || '',
    });
  }, [user]);

  const setTab = (next) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'profile') nextParams.delete('tab');
    else nextParams.set('tab', next);
    setParams(nextParams, { replace: true });
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setProfileErrors({});
    try {
      const body = isCustomer
        ? {
            name: form.name.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            marketingOptIn: form.marketingOptIn,
            goals: form.goals,
            preferredSpecies: form.preferredSpecies,
            onboardingComplete: true,
          }
        : isMerchant
          ? { name: form.name.trim(), city: form.city.trim() }
          : { name: form.name.trim() };
      const response = await api.patch('/api/auth/me', body);
      updateUser(response.data.data.user);
      toast.success('Profile updated.');
    } catch (err) {
      setProfileErrors(fieldErrors(err));
      toast.error(errorMessage(err, 'Could not update your profile.'));
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = async (session) => {
    try {
      await api.delete(`/api/auth/sessions/${session.id}`);
      if (session.current) {
        await logout();
        navigate('/');
        return;
      }
      toast.success('Session signed out.');
      refetchSessions();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not revoke that session.'));
    }
  };

  const revokeAll = async () => {
    try {
      await api.delete('/api/auth/sessions');
      await logout();
      toast.success('All sessions signed out.');
      navigate('/');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not sign out all sessions.'));
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordErrors({});
    if (passwordForm.newPassword.length < 12) {
      setPasswordErrors({ newPassword: 'Use at least 12 characters.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordErrors({ confirm: 'Passwords do not match.' });
      return;
    }
    setPasswordBusy(true);
    try {
      await api.post('/api/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password updated. Other sessions were signed out.');
      refetchSessions();
    } catch (err) {
      setPasswordErrors({ ...fieldErrors(err), form: errorMessage(err, 'Could not change your password.') });
    } finally {
      setPasswordBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await api.delete('/api/auth/me', { data: { password: deletePassword, confirmation: deleteConfirm } });
      await logout();
      toast.success('Your account has been closed.');
      navigate('/');
    } catch (err) {
      setDeleteError(errorMessage(err, 'Could not close your account.'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const deleteCompanionData = async () => {
    setDataBusy(true);
    try {
      await api.delete('/api/ai/data');
      setDataOpen(false);
      await refetchSafety();
      toast.success('Companion data deleted.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete companion data.'));
    } finally {
      setDataBusy(false);
    }
  };

  if (!user) return null;

  const safetyCopy = STATUS_COPY[safety?.profile?.status] || STATUS_COPY.ok;

  return (
    <div className={classes.page}>
      <div className="container">
        <div className={classes.hero}>
          <span className="avatar avatar-lg" style={{ background: user.avatarColor || undefined }}>{initials(user.name)}</span>
          <div className={classes.heroBody}>
            <span className={`badge ${isCustomer ? 'badge-info' : isMerchant ? 'badge-coral' : 'badge-dark'}`}>
              {isCustomer ? 'Guest' : isMerchant ? 'Partner' : 'Operator'}
            </span>
            <h1>{user.name}</h1>
            <p>{user.email}{user.city ? ` · ${user.city}` : ''} · Member since {formatDate(user.createdAt)}</p>
          </div>
          {isMerchant && (
            <Link to="/merchant/profile" className="btn btn-secondary">
              <Icon name="settings" size={16} /> Business profile
            </Link>
          )}
        </div>

        <div className={classes.layout}>
          <nav className={classes.nav} aria-label="Account sections">
            {tabs.map((item) => (
              <button key={item} type="button" className={`${classes.navItem} ${tab === item ? classes.navActive : ''}`} onClick={() => setTab(item)}>
                <Icon name={TAB_ICONS[item]} size={17} />
                {item === 'profile' ? 'Profile' : item === 'safety' ? 'Safety & data' : item === 'sessions' ? 'Where you are signed in' : 'Password & security'}
              </button>
            ))}
            <Link to="/visits" className={classes.navLink}><Icon name="calendar" size={17} /> My visits</Link>
            <Link to="/favorites" className={classes.navLink}><Icon name="heart" size={17} /> Saved companions</Link>
            <Link to="/chats" className={classes.navLink}><Icon name="chat" size={17} /> Messages</Link>
          </nav>

          <div className={classes.content}>
            {tab === 'profile' && (
              <section className={classes.panel}>
                <div className={classes.panelHead}>
                  <div>
                    <h2>Your profile</h2>
                    <p>Only the name and city you choose are shared with a host when you book.</p>
                  </div>
                </div>
                <form onSubmit={saveProfile} className={classes.form}>
                  <div className="form-grid">
                    <div className="field">
                      <label className="label" htmlFor="account-name">Name</label>
                      <input id="account-name" className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" />
                      {profileErrors.name && <span className="error-text">{profileErrors.name}</span>}
                    </div>
                    <div>
                      <label className="label" htmlFor="account-email">Email</label>
                      <input id="account-email" className="input" value={user.email} disabled />
                      <span className="hint">Contact support to change your email.</span>
                    </div>
                    {isCustomer && (
                      <div>
                        <label className="label" htmlFor="account-phone">Phone</label>
                        <input id="account-phone" className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" />
                        {profileErrors.phone && <span className="error-text">{profileErrors.phone}</span>}
                      </div>
                    )}
                    <div>
                      <label className="label" htmlFor="account-city">City</label>
                      <input id="account-city" className="input" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} autoComplete="address-level2" />
                    </div>
                  </div>

                  {isCustomer && (
                    <>
                      <div className={classes.prefBlock}>
                        <span className={classes.prefLabel}>I am here for</span>
                        <div className={classes.prefChips}>
                          {[
                            ['company', 'More company'],
                            ['calm', 'Calm & quiet'],
                            ['active', 'Get outside'],
                            ['support', 'Emotional support'],
                            ['routine', 'A gentle routine'],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              className={`chip ${form.goals.includes(value) ? 'chip-active' : ''}`}
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  goals: current.goals.includes(value)
                                    ? current.goals.filter((goal) => goal !== value)
                                    : current.goals.length >= 3
                                      ? current.goals
                                      : [...current.goals, value],
                                }))
                              }
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="field" style={{ maxWidth: 260 }}>
                        <label className="label" htmlFor="account-species">I am drawn to</label>
                        <select id="account-species" className="select" value={form.preferredSpecies} onChange={(event) => setForm({ ...form, preferredSpecies: event.target.value })}>
                          <option value="">No preference</option>
                          <option value="cat">Cats</option>
                          <option value="dog">Dogs</option>
                          <option value="rabbit">Rabbits</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <label className="checkbox" style={{ marginTop: 6 }}>
                        <input type="checkbox" checked={form.marketingOptIn} onChange={(event) => setForm({ ...form, marketingOptIn: event.target.checked })} />
                        <span>Send me occasional companion stories and new host updates. No more than once a month.</span>
                      </label>
                    </>
                  )}

                  <div className={classes.formActions}>
                    <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                    <Link to="/safety" className="link-arrow" style={{ fontSize: '0.8rem' }}>Read safety model <Icon name="arrow-right" size={14} /></Link>
                  </div>
                </form>
              </section>
            )}

            {tab === 'safety' && isCustomer && (
              <>
                {safetyLoading ? (
                  <PageLoader label="Loading your safety summary…" />
                ) : (
                  <>
                    <section className={classes.panel}>
                      <div className={classes.panelHead}>
                        <div>
                          <h2>Safety summary</h2>
                          <p>This is a private, derived view. It never contains your message text.</p>
                        </div>
                        <span className={`badge ${safetyCopy.badge}`}>{safetyCopy.label}</span>
                      </div>
                      <div className={classes.safetyState}>
                        <span className={classes.safetyIcon}><Icon name="shield" size={22} /></span>
                        <div>
                          <h3>{safetyCopy.title}</h3>
                          <p>{safetyCopy.body}</p>
                        </div>
                      </div>
                      <div className={classes.safetyStats}>
                        <div><span>Support signals · 7 days</span><strong>{safety?.profile?.events7d || 0}</strong></div>
                        <div><span>Support signals · 30 days</span><strong>{safety?.profile?.events30d || 0}</strong></div>
                        <div><span>Highest level · 30 days</span><strong>{safety?.profile?.maxLevel30d || 'none'}</strong></div>
                        <div><span>Last signal</span><strong>{safety?.profile?.lastRiskAt ? relativeTime(safety.profile.lastRiskAt) : 'None'}</strong></div>
                      </div>
                    </section>

                    <section className={classes.panel}>
                      <div className={classes.panelHead}>
                        <div>
                          <h2>Recent support events</h2>
                          <p>Levels and timestamps only. No conversation content is stored in this log.</p>
                        </div>
                      </div>
                      {safety?.events?.length ? (
                        <ul className={classes.events}>
                          {safety.events.map((event, index) => (
                            <li key={`${event.timestamp}-${index}`}>
                              <span className={`badge ${event.level === 'high' ? 'badge-danger' : 'badge-warning'}`}>{event.level}</span>
                              <span>{event.animalName || 'Companion'} conversation</span>
                              <time>{relativeTime(event.timestamp)}</time>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={classes.quiet}><Icon name="check-circle" size={17} /> No support events recorded. That is a good thing.</p>
                      )}
                    </section>

                    <section className={classes.panel}>
                      <div className={classes.panelHead}>
                        <div>
                          <h2>Crisis resources</h2>
                          <p>Keep these somewhere you can find them. You do not need to be in crisis to use them.</p>
                        </div>
                      </div>
                      <div className={classes.resourceGrid}>
                        {(safety?.resources || []).map((resource) => (
                          <a key={resource.href} href={resource.href} target={resource.href.startsWith('tel:') ? undefined : '_blank'} rel="noreferrer">
                            <Icon name={resource.href.startsWith('tel:') ? 'phone' : 'globe'} size={17} />
                            <span>{resource.label}</span>
                            <Icon name="external" size={14} />
                          </a>
                        ))}
                      </div>
                    </section>

                    <section className={`${classes.panel} ${classes.dangerPanel}`}>
                      <div>
                        <h2>Your data</h2>
                        <p>Delete every companion conversation, daily check-in and the derived risk profile. This does not delete your account or bookings.</p>
                      </div>
                      <button type="button" className="btn btn-secondary" onClick={() => setDataOpen(true)}>
                        <Icon name="trash" size={15} /> Delete companion data
                      </button>
                    </section>
                  </>
                )}
              </>
            )}

            {tab === 'sessions' && (
              <section className={classes.panel}>
                <div className={classes.panelHead}>
                  <div>
                    <h2>Where you are signed in</h2>
                    <p>Sessions last up to 30 days. Revoke any device you do not recognise.</p>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={revokeAll}>
                    Sign out everywhere
                  </button>
                </div>
                {sessionsLoading ? (
                  <PageLoader label="Loading sessions…" />
                ) : sessions?.sessions?.length ? (
                  <ul className={classes.sessions}>
                    {sessions.sessions.map((session) => (
                      <li key={session.id}>
                        <span className={classes.sessionIcon}><Icon name="lock" size={17} /></span>
                        <div className={classes.sessionBody}>
                          <strong>
                            {session.current ? 'This device' : session.userAgent?.includes('Mobile') ? 'Mobile browser' : 'Desktop browser'}
                            {session.current && <span className="badge badge-success">Current</span>}
                          </strong>
                          <span>{session.userAgent || 'Unknown device'}</span>
                          <small>Started {relativeTime(session.createdAt)} · last active {relativeTime(session.lastUsedAt)}</small>
                        </div>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => revokeSession(session)}>
                          {session.current ? 'Sign out' : 'Revoke'}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">No active sessions found.</p>
                )}
              </section>
            )}

            {tab === 'security' && (
              <>
                <section className={classes.panel}>
                  <div className={classes.panelHead}>
                    <div>
                      <h2>Change password</h2>
                      <p>Changing your password signs out every other device.</p>
                    </div>
                  </div>
                  <form onSubmit={changePassword} className={classes.form}>
                    <div className="form-grid">
                      <div className="span-2">
                        <label className="label" htmlFor="current-password">Current password</label>
                        <input id="current-password" className="input" type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} />
                        {passwordErrors.currentPassword && <span className="error-text">{passwordErrors.currentPassword}</span>}
                      </div>
                      <div>
                        <label className="label" htmlFor="new-password">New password</label>
                        <input id="new-password" className="input" type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} />
                        {passwordErrors.newPassword && <span className="error-text">{passwordErrors.newPassword}</span>}
                      </div>
                      <div>
                        <label className="label" htmlFor="confirm-password">Confirm new password</label>
                        <input id="confirm-password" className="input" type="password" autoComplete="new-password" value={passwordForm.confirm} onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })} />
                        {passwordErrors.confirm && <span className="error-text">{passwordErrors.confirm}</span>}
                      </div>
                    </div>
                    {passwordErrors.form && <div className="notice notice-danger"><Icon name="alert" size={16} /><span>{passwordErrors.form}</span></div>}
                    <div className={classes.formActions}>
                      <button type="submit" className="btn" disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Update password'}</button>
                    </div>
                  </form>
                </section>

                <section className={`${classes.panel} ${classes.dangerPanel}`}>
                  <div>
                    <h2>Close your account</h2>
                    <p>
                      {isCustomer
                        ? 'This anonymises your profile, deletes companion chats and safety data, and closes your sign-in. Upcoming visits must be cancelled first.'
                        : 'Partner and operator accounts are closed by PawCompanion support after a review. Contact support to proceed.'}
                    </p>
                  </div>
                  <button type="button" className="btn btn-danger" onClick={() => setDeleteOpen(true)} disabled={!isCustomer}>
                    <Icon name="trash" size={15} /> Close account
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Close your account?"
        description="This anonymises your profile, deletes companion data, and signs you out. It cannot be undone."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)}>Keep my account</button>
            <button type="button" className="btn btn-danger" onClick={deleteAccount} disabled={deleteBusy || deleteConfirm !== 'DELETE'}>
              {deleteBusy ? 'Closing…' : 'Close account'}
            </button>
          </>
        }
      >
        <div className="notice notice-danger">
          <Icon name="alert" size={17} />
          <span>Upcoming visits must be cancelled first. Past receipts are retained for financial records but your contact details are removed.</span>
        </div>
        {deleteError && <div className="notice notice-danger" style={{ marginTop: 12 }}><Icon name="alert" size={16} /><span>{deleteError}</span></div>}
        <div className={classes.modalFields}>
          <div className="field">
            <label className="label" htmlFor="delete-password">Password</label>
            <input id="delete-password" className="input" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="delete-confirm">Type DELETE to confirm</label>
            <input id="delete-confirm" className="input" value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
          </div>
        </div>
      </Modal>

      <Modal
        open={dataOpen}
        onClose={() => setDataOpen(false)}
        title="Delete companion data?"
        description="This permanently deletes every AI conversation, daily check-in and the derived risk profile. Your account and visits stay."
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDataOpen(false)}>Keep my data</button>
            <button type="button" className="btn btn-danger" onClick={deleteCompanionData} disabled={dataBusy}>
              {dataBusy ? 'Deleting…' : 'Delete companion data'}
            </button>
          </>
        }
      >
        <div className="notice">
          <Icon name="shield" size={17} />
          <span>The safety log contains no raw messages, but deleting it still resets your support profile.</span>
        </div>
      </Modal>
    </div>
  );
}
