import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../lib/api';
import { DEMO_CREDENTIALS, SHOW_DEMO_CREDENTIALS } from '../lib/constants';
import { useDocumentTitle } from '../hooks/useFetch';
import AuthLayout from '../components/Auth/AuthLayout';
import Field from '../components/Field';
import Icon from '../components/Icon';
import classes from './AuthForms.module.css';

export default function LoginPage() {
  useDocumentTitle('Log in');
  const { user, loginCustomer } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname;
  const next = from?.startsWith('/') && !from.startsWith('//') ? from : params.get('next')?.startsWith('/') ? params.get('next') : '/';

  if (user) {
    const home = user.role === 'merchant' ? '/merchant' : user.role === 'admin' ? '/admin' : next;
    return <Navigate to={home} replace />;
  }

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const account = await loginCustomer(form.email.trim(), form.password);
      toast.success(`Welcome back, ${account.name.split(' ')[0]}.`);
      navigate(user?.role === 'merchant' ? '/merchant' : next, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Unable to sign in. Check your email and password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      image="/animals/cat2.jpg"
      quote="“I came in wound up and left feeling like a person again.”"
      attribution="Maya · Portland guest"
      eyebrow="Guest sign in"
      title="Welcome back."
      subtitle="Your saved companions, conversations and visits are waiting."
      footer={
        <span>
          New here? <Link to="/register">Create a free account</Link>
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

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            required
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <div className={classes.passwordWrap}>
            <input
              id="password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        {SHOW_DEMO_CREDENTIALS && (
          <div className={classes.demo}>
            <div className={classes.demoHead}>
              <span><Icon name="sparkles" size={15} /> Demo access</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ email: DEMO_CREDENTIALS.customer.email, password: DEMO_CREDENTIALS.customer.password })}>
                Fill guest demo
              </button>
            </div>
            <p>{DEMO_CREDENTIALS.customer.email} · {DEMO_CREDENTIALS.customer.password}</p>
          </div>
        )}
      </form>

      <div className={classes.switchRow}>
        <Link to="/merchant/login">Partner log in</Link>
        <Link to="/admin/login">Operator access</Link>
      </div>
    </AuthLayout>
  );
}
