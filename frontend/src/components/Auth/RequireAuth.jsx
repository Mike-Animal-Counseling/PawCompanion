import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../Feedback';

export default function RequireAuth({ role, children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader label="Opening your PawCompanion account…" />;

  if (!user) {
    const loginPath = role === 'merchant' ? '/merchant/login' : role === 'admin' ? '/admin/login' : '/login';
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    const fallback = user.role === 'merchant' ? '/merchant' : user.role === 'admin' ? '/admin' : '/';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
