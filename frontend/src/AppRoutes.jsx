import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import SiteLayout from './components/Layout/SiteLayout';
import ConsoleLayout from './components/Layout/ConsoleLayout';
import RequireAuth from './components/Auth/RequireAuth';
import { PageLoader } from './components/Feedback';
import HomePage from './pages/HomePage';

const CompanionPage = lazy(() => import('./pages/CompanionPage'));
const SafetyPage = lazy(() => import('./pages/SafetyPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ChatsPage = lazy(() => import('./pages/ChatsPage'));
const CheckinPage = lazy(() => import('./pages/CheckinPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const VisitsPage = lazy(() => import('./pages/VisitsPage'));
const VisitDetailPage = lazy(() => import('./pages/VisitDetailPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const MerchantLoginPage = lazy(() => import('./pages/Merchant/MerchantLoginPage'));
const MerchantRegisterPage = lazy(() => import('./pages/Merchant/MerchantRegisterPage'));
const MerchantOverviewPage = lazy(() => import('./pages/Merchant/MerchantOverviewPage'));
const MerchantListingsPage = lazy(() => import('./pages/Merchant/MerchantListingsPage'));
const MerchantListingFormPage = lazy(() => import('./pages/Merchant/MerchantListingFormPage'));
const MerchantAvailabilityPage = lazy(() => import('./pages/Merchant/MerchantAvailabilityPage'));
const MerchantBookingsPage = lazy(() => import('./pages/Merchant/MerchantBookingsPage'));
const MerchantReviewsPage = lazy(() => import('./pages/Merchant/MerchantReviewsPage'));
const MerchantProfilePage = lazy(() => import('./pages/Merchant/MerchantProfilePage'));
const AdminLoginPage = lazy(() => import('./pages/Admin/AdminLoginPage'));
const AdminPage = lazy(() => import('./pages/Admin/AdminPage'));

const merchantNav = [
  { to: '/merchant', path: '/merchant', end: true, label: 'Overview', icon: 'dashboard' },
  { to: '/merchant/listings', path: '/merchant/listings', label: 'Listings', icon: 'paw' },
  { to: '/merchant/bookings', path: '/merchant/bookings', label: 'Bookings', icon: 'calendar' },
  { to: '/merchant/availability', path: '/merchant/availability', label: 'Availability', icon: 'clock' },
  { to: '/merchant/reviews', path: '/merchant/reviews', label: 'Reviews', icon: 'star' },
  { to: '/merchant/profile', path: '/merchant/profile', label: 'Business profile', icon: 'settings' },
];

const adminNav = [
  { to: '/admin', path: '/admin', tab: 'overview', label: 'Overview', icon: 'dashboard' },
  { to: '/admin?tab=safety', path: '/admin', tab: 'safety', label: 'Safety queue', icon: 'shield' },
  { to: '/admin?tab=merchants', path: '/admin', tab: 'merchants', label: 'Partners', icon: 'users' },
  { to: '/admin?tab=listings', path: '/admin', tab: 'listings', label: 'Listings', icon: 'paw' },
  { to: '/admin?tab=reviews', path: '/admin', tab: 'reviews', label: 'Reviews', icon: 'star' },
  { to: '/admin?tab=audit', path: '/admin', tab: 'audit', label: 'Audit trail', icon: 'list' },
];

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader label="Opening…" />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="companions/:id" element={<CompanionPage />} />
          <Route path="safety" element={<SafetyPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="merchant/login" element={<MerchantLoginPage />} />
          <Route path="merchant/register" element={<MerchantRegisterPage />} />

          <Route path="check-in" element={<RequireAuth role="customer"><CheckinPage /></RequireAuth>} />
          <Route path="chats" element={<RequireAuth role="customer"><ChatsPage /></RequireAuth>} />
          <Route path="chat/:id" element={<RequireAuth role="customer"><ChatPage /></RequireAuth>} />
          <Route path="book/:id" element={<RequireAuth role="customer"><BookingPage /></RequireAuth>} />
          <Route path="visits" element={<RequireAuth role="customer"><VisitsPage /></RequireAuth>} />
          <Route path="visits/:id" element={<RequireAuth role="customer"><VisitDetailPage /></RequireAuth>} />
          <Route path="favorites" element={<RequireAuth role="customer"><FavoritesPage /></RequireAuth>} />
          <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/merchant"
          element={
            <RequireAuth role="merchant">
              <ConsoleLayout area="Partner console" nav={merchantNav} homeLink="/merchant" />
            </RequireAuth>
          }
        >
          <Route index element={<MerchantOverviewPage />} />
          <Route path="listings" element={<MerchantListingsPage />} />
          <Route path="listings/new" element={<MerchantListingFormPage />} />
          <Route path="listings/:animalId/edit" element={<MerchantListingFormPage />} />
          <Route path="availability" element={<MerchantAvailabilityPage />} />
          <Route path="bookings" element={<MerchantBookingsPage />} />
          <Route path="reviews" element={<MerchantReviewsPage />} />
          <Route path="profile" element={<MerchantProfilePage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <ConsoleLayout area="Operations" nav={adminNav} homeLink="/admin" />
            </RequireAuth>
          }
        >
          <Route index element={<AdminPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
