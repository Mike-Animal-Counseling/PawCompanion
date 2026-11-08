import React, { useEffect, useState } from 'react';
import api, { errorMessage, fieldErrors } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks/useFetch';
import { initials } from '../../lib/format';
import Icon from '../../components/Icon';
import Rating from '../../components/Rating';
import classes from './MerchantProfilePage.module.css';

const BUSINESS_TYPES = ['Pet Cafe & Shelter', 'Shelter', 'Rescue', 'Pet Cafe', 'Training Studio'];

export default function MerchantProfilePage() {
  useDocumentTitle('Business profile');
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    businessType: 'Shelter',
    city: '',
    description: '',
    website: '',
    logoUrl: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      businessType: user.businessType || 'Shelter',
      city: user.city || '',
      description: user.description || '',
      website: user.website || '',
      logoUrl: user.logoUrl || '',
    });
  }, [user]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const response = await api.patch('/api/merchant/profile', {
        name: form.name.trim(),
        businessType: form.businessType,
        city: form.city.trim(),
        description: form.description.trim(),
        website: form.website.trim(),
        logoUrl: form.logoUrl.trim(),
      });
      updateUser(response.data.data.user);
      toast.success('Business profile updated.');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, 'Could not update your business profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={classes.page}>
      <div className={classes.head}>
        <div>
          <span className="eyebrow">Business profile</span>
          <h1>How guests see you</h1>
          <p>This information appears on every companion listing and in review replies.</p>
        </div>
        <span className={`badge ${user?.verified ? 'badge-success' : 'badge-warning'}`}>
          <Icon name={user?.verified ? 'shield' : 'clock'} size={12} />
          {user?.verified ? 'Verified partner' : 'Verification pending'}
        </span>
      </div>

      <form onSubmit={submit} className={classes.layout}>
        <section className={classes.panel}>
          <div className={classes.panelHead}>
            <h2>Public details</h2>
            <p>Honest, specific copy helps the right guests find you.</p>
          </div>
          <div className="form-grid">
            <div className="field span-2">
              <label className="label" htmlFor="partner-name">Organisation name</label>
              <input id="partner-name" className="input" value={form.name} onChange={update('name')} maxLength={100} />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="partner-type">Organisation type</label>
              <select id="partner-type" className="select" value={form.businessType} onChange={update('businessType')}>
                {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="partner-city">City</label>
              <input id="partner-city" className="input" value={form.city} onChange={update('city')} maxLength={80} />
            </div>
            <div className="field span-2">
              <label className="label" htmlFor="partner-description">About your organisation</label>
              <textarea id="partner-description" className="textarea" rows={6} value={form.description} onChange={update('description')} maxLength={1200} placeholder="Who you are, how you care for your animals, and what a first visit looks like." />
              <span className="hint">{form.description.length}/1200</span>
            </div>
            <div className="field">
              <label className="label" htmlFor="partner-website">Website</label>
              <input id="partner-website" className="input" type="url" value={form.website} onChange={update('website')} placeholder="https://" />
              {errors.website && <span className="error-text">{errors.website}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="partner-logo">Logo URL (optional)</label>
              <input id="partner-logo" className="input" value={form.logoUrl} onChange={update('logoUrl')} placeholder="https://… or /uploads/…" />
              {errors.logoUrl && <span className="error-text">{errors.logoUrl}</span>}
            </div>
          </div>
          <div className={classes.actions}>
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
            <span className={classes.note}><Icon name="lock" size={13} /> Partner email and verification are managed by operations.</span>
          </div>
        </section>

        <aside className={classes.preview}>
          <span className={classes.previewLabel}>Host card preview</span>
          <div className={classes.card}>
            <span className="avatar avatar-lg" style={{ background: 'var(--forest)' }}>{initials(form.name)}</span>
            <h2>{form.name || 'Your organisation'}</h2>
            <span className={classes.type}>{form.businessType} · {form.city || 'City'}</span>
            {user?.ratingAverage > 0 ? (
              <Rating value={user.ratingAverage} count={user.reviewCount} size={14} />
            ) : (
              <span className={classes.newHost}>New partner</span>
            )}
            <p>{form.description || 'A short description of your organisation will appear here.'}</p>
            {form.website && <a href={form.website} target="_blank" rel="noreferrer" className="link-arrow">Website <Icon name="external" size={13} /></a>}
          </div>
          <div className="notice" style={{ fontSize: '0.72rem' }}>
            <Icon name="shield" size={16} />
            <span>Verified partners complete document and insurance checks before their listings go live in production.</span>
          </div>
        </aside>
      </form>
    </div>
  );
}
