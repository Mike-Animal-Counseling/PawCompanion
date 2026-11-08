import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../lib/api';
import { DEMO_CREDENTIALS, SHOW_DEMO_CREDENTIALS } from '../../lib/constants';
import { useDocumentTitle } from '../../hooks/useFetch';
import AuthLayout from '../../components/Auth/AuthLayout';
import Field from '../../components/Field';
import Icon from '../../components/Icon';
import classes from '../AuthForms.module.css';

export default function MerchantLoginPage() {
  useDocumentTitle('Partner log in');
  const { user, loginMerchant } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.role === 'merchant') return <Navigate to="/merchant" replace />;

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const account = await loginMerchant(form.email.trim(), form.password);
      toast.success(`Welcome back, ${account.name}.`);
      navigate('/merchant', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Unable to sign in with those partner details.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      image="/animals/cat6.jpg"
      quote="“We can focus on the animals instead of the admin.”"
      attribution="Willow & Whiskers · Portland partner"
      eyebrow="Partner console"
      title="Good to see you."
      subtitle="Manage listings, availability and the guests who are coming this week."
      footer={
        <span>
          New partner? <Link to="/merchant/register">Apply to list a companion</Link>
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

        <Field label="Partner email" htmlFor="email">
          <input id="email" className="input" type="email" autoComplete="email" placeholder="hello@your-shelter.org" value={form.email} onChange={update('email')} required />
        </Field>

        <Field label="Password" htmlFor="password">
          <div className={classes.passwordWrap}>
            <input
              id="password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={update('password')}
              required
            />
            <button type="button" className={classes.passwordToggle} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <Icon name={showPassword ? 'eye' : 'lock'} size={17} />
            </button>
          </div>
        </Field>

        <button type="submit" className="btn btn-block btn-lg" disabled={loading}>
          {loading ? 'Signing in…' : 'Open partner console'}
        </button>

        {SHOW_DEMO_CREDENTIALS && (
          <div className={classes.demo}>
            <div className={classes.demoHead}>
              <span><Icon name="sparkles" size={15} /> Demo access</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ email: DEMO_CREDENTIALS.merchant.email, password: DEMO_CREDENTIALS.merchant.password })}>
                Fill partner demo
              </button>
            </div>
            <p>{DEMO_CREDENTIALS.merchant.email} · {DEMO_CREDENTIALS.merchant.password}</p>
          </div>
        )}
      </form>

      <div className={classes.switchRow}>
        <Link to="/login">I am a guest</Link>
        <Link to="/admin/login">Operator access</Link>
      </div>
    </AuthLayout>
  );
}
