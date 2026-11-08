import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage, fieldErrors } from '../../lib/api';
import { useDocumentTitle } from '../../hooks/useFetch';
import AuthLayout from '../../components/Auth/AuthLayout';
import Field from '../../components/Field';
import Icon from '../../components/Icon';
import classes from '../AuthForms.module.css';

const BUSINESS_TYPES = ['Pet Cafe & Shelter', 'Shelter', 'Rescue', 'Pet Cafe', 'Training Studio'];

export default function MerchantRegisterPage() {
  useDocumentTitle('List a companion');
  const { user, registerMerchant } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    businessType: 'Shelter',
    city: '',
    email: '',
    password: '',
    description: '',
    website: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.role === 'merchant') return <Navigate to="/merchant" replace />;

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Add your organisation name.';
    if (!form.city.trim()) nextErrors.city = 'Add the city you operate in.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (form.password.length < 12) nextErrors.password = 'Use at least 12 characters.';
    if (form.description.trim().length < 20) nextErrors.description = 'Tell guests a little more (20+ characters).';
    if (form.website && !form.website.startsWith('https://')) nextErrors.website = 'Website must start with https://.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const account = await registerMerchant({
        name: form.name.trim(),
        businessType: form.businessType,
        city: form.city.trim(),
        email: form.email.trim(),
        password: form.password,
        description: form.description.trim(),
        website: form.website.trim(),
      });
      toast.success(`Welcome, ${account.name}. Your partner console is ready.`);
      navigate('/merchant', { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, 'Unable to create the partner account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      image="/animals/dog3.jpg"
      quote="“The guests arrive calmer. The animals set the pace.”"
      attribution="Milo’s handler · Rainy Day Companions"
      eyebrow="Partner application"
      title="List a companion."
      subtitle="A calmer booking flow for shelters, cafés, rescues and trainers. No listing fees in this build."
      wide
      footer={
        <span>
          Already a partner? <Link to="/merchant/login">Open your console</Link>
        </span>
      }
    >
      <form onSubmit={submit} className={classes.form} noValidate>
        {error && (
          <div className="notice notice-danger" role="alert">
            <Icon name="alert" size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className={classes.twoCol}>
          <Field label="Organisation name" htmlFor="name" error={errors.name}>
            <input id="name" className="input" placeholder="Willow & Whiskers" value={form.name} onChange={update('name')} required />
          </Field>
          <Field label="Organisation type" htmlFor="type">
            <select id="type" className="select" value={form.businessType} onChange={update('businessType')}>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className={classes.twoCol}>
          <Field label="City" htmlFor="city" error={errors.city}>
            <input id="city" className="input" placeholder="Portland" value={form.city} onChange={update('city')} required />
          </Field>
          <Field label="Website (optional)" htmlFor="website" error={errors.website}>
            <input id="website" className="input" type="url" placeholder="https://" value={form.website} onChange={update('website')} />
          </Field>
        </div>

        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" className="input" type="email" autoComplete="email" placeholder="hello@your-shelter.org" value={form.email} onChange={update('email')} required />
        </Field>

        <Field label="Password" htmlFor="password" hint="At least 12 characters." error={errors.password}>
          <input id="password" className="input" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} required />
        </Field>

        <Field label="About your organisation" htmlFor="description" error={errors.description} hint="This appears on your public host card.">
          <textarea
            id="description"
            className="textarea"
            rows={4}
            placeholder="Who you are, how you care for your animals, and what a first visit looks like."
            value={form.description}
            onChange={update('description')}
          />
        </Field>

        <button type="submit" className="btn btn-block btn-lg" disabled={loading}>
          {loading ? 'Creating your console…' : 'Apply as a partner'}
        </button>

        <p className={classes.finePrint}>
          <Icon name="shield" size={14} /> New partners can publish immediately in this demo. Production onboarding
          includes document and insurance checks.
        </p>
      </form>
    </AuthLayout>
  );
}
