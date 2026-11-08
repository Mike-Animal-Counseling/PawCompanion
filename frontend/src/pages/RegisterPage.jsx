import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage, fieldErrors } from '../lib/api';
import { useDocumentTitle } from '../hooks/useFetch';
import AuthLayout from '../components/Auth/AuthLayout';
import Field from '../components/Field';
import Icon from '../components/Icon';
import classes from './AuthForms.module.css';

export default function RegisterPage() {
  useDocumentTitle('Create your account');
  const { user, registerCustomer } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={user.role === 'merchant' ? '/merchant' : user.role === 'admin' ? '/admin' : '/'} replace />;

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Tell us what to call you.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (form.password.length < 12) nextErrors.password = 'Use at least 12 characters.';
    if (form.password !== form.confirm) nextErrors.confirm = 'Passwords do not match.';
    if (!accepted) nextErrors.accepted = 'Please acknowledge how PawCompanion works.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const account = await registerCustomer({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.success(`Welcome to PawCompanion, ${account.name.split(' ')[0]}.`);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, 'Unable to create your account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      image="/animals/dog1.jpg"
      quote="“A quiet hour can change the shape of a week.”"
      attribution="The PawCompanion principle"
      eyebrow="Join PawCompanion"
      title="A softer kind of account."
      subtitle="Save companions, talk any time, and book visits without a subscription."
      footer={
        <span>
          Already have an account? <Link to="/login">Sign in</Link>
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

        <Field label="Your name" htmlFor="name" error={errors.name}>
          <input id="name" className="input" autoComplete="name" placeholder="Maya Chen" value={form.name} onChange={update('name')} required />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" className="input" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update('email')} required />
        </Field>

        <Field label="Password" htmlFor="password" hint="At least 12 characters. A short phrase works well." error={errors.password}>
          <div className={classes.passwordWrap}>
            <input
              id="password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              required
            />
            <button type="button" className={classes.passwordToggle} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <Icon name={showPassword ? 'eye' : 'lock'} size={17} />
            </button>
          </div>
        </Field>

        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
          <input id="confirm" className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={update('confirm')} required />
        </Field>

        <label className="checkbox">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>
            I understand PawCompanion offers companionship, not therapy or medical care, and that support mode may
            share crisis resources. I have read the <Link to="/safety" target="_blank">safety model</Link>.
          </span>
        </label>
        {errors.accepted && <span className="error-text">{errors.accepted}</span>}

        <button type="submit" className="btn btn-block btn-lg" disabled={loading}>
          {loading ? 'Creating your account…' : 'Create account'}
        </button>
      </form>

      <div className={classes.switchRow}>
        <span>Are you a shelter or café?</span>
        <Link to="/merchant/register">Become a partner</Link>
      </div>
    </AuthLayout>
  );
}
