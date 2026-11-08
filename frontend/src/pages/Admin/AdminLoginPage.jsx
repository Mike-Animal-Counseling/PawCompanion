import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../lib/api';
import { DEMO_CREDENTIALS, SHOW_DEMO_CREDENTIALS } from '../../lib/constants';
import { useDocumentTitle } from '../../hooks/useFetch';
import Logo from '../../components/Logo';
import Field from '../../components/Field';
import Icon from '../../components/Icon';
import classes from './AdminLoginPage.module.css';

export default function AdminLoginPage() {
  useDocumentTitle('Operator access');
  const { user, loginAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAdmin(form.email.trim(), form.password);
      toast.success('Operator session started.');
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Operator access denied.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.page}>
      <div className={classes.left}>
        <Link to="/" className={classes.brand}>
          <Logo inverted />
        </Link>
        <div className={classes.copy}>
          <span className={classes.eyebrow}>PawCompanion operations</span>
          <h1>Human oversight, where it matters.</h1>
          <p>
            A private console for partner verification, listing moderation and the safety queue. No conversation
            content is exposed here — only derived risk signals and the context needed to act.
          </p>
          <div className={classes.points}>
            <span><Icon name="shield" size={17} /> Safety queue with severity and timestamps</span>
            <span><Icon name="users" size={17} /> Partner verification and suspension</span>
            <span><Icon name="eye" size={17} /> Listing and review moderation</span>
            <span><Icon name="list" size={17} /> Append-only audit trail</span>
          </div>
        </div>
        <Link to="/" className={classes.back}><Icon name="arrow-left" size={15} /> Back to the public site</Link>
      </div>

      <div className={classes.right}>
        <div className={classes.card}>
          <div className={classes.cardHead}>
            <span className={classes.lock}><Icon name="lock" size={20} /></span>
            <span className={classes.eyebrowDark}>Restricted access</span>
            <h2>Operator sign in</h2>
            <p>Use your PawCompanion operator credentials.</p>
          </div>

          <form onSubmit={submit} className={classes.form}>
            {error && (
              <div className="notice notice-danger" role="alert">
                <Icon name="alert" size={17} />
                <span>{error}</span>
              </div>
            )}
            <Field label="Operator email" htmlFor="admin-email">
              <input id="admin-email" className="input" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </Field>
            <Field label="Password" htmlFor="admin-password">
              <input id="admin-password" className="input" type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            </Field>
            <button type="submit" className="btn btn-block btn-lg" disabled={loading}>
              {loading ? 'Verifying…' : 'Enter operations'}
            </button>
          </form>

          {SHOW_DEMO_CREDENTIALS && (
            <div className={classes.demo}>
              <span>Demo operator</span>
              <p>{DEMO_CREDENTIALS.admin.email}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ email: DEMO_CREDENTIALS.admin.email, password: DEMO_CREDENTIALS.admin.password })}>
                Fill operator demo
              </button>
            </div>
          )}

          <p className={classes.fine}>Operator actions are logged. Access is limited to authorised staff.</p>
        </div>
      </div>
    </div>
  );
}
