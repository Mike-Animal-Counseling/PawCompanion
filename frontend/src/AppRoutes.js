import React from "react";
import { Route, Routes } from "react-router-dom";
import AnimalPage from "./pages/Animals/AnimalPage";
import HomePage from "./pages/Home/HomePage";
import BookingListPage from "./pages/BookingList/BookingListPage";
import ChatPage from "./pages/Chat/ChatPage";
import BookingPage from "./pages/Booking/BookingPage";
import CheckoutPage from "./pages/Checkout/CheckoutPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import OrdersPage from "./pages/Orders/OrdersPage";
import LoginPage from "./pages/Login/LoginPage";
import RequireMerchant from "./components/Auth/RequireMerchant";
import MerchantLoginPage from "./pages/Merchant/MerchantLoginPage";
import MerchantDashboardPage from "./pages/Merchant/MerchantDashboardPage";
import MerchantAnimalsPage from "./pages/Merchant/MerchantAnimalsPage";
import MerchantAnimalFormPage from "./pages/Merchant/MerchantAnimalFormPage";
import MerchantAvailabilityPage from "./pages/Merchant/MerchantAvailabilityPage";
import MerchantBookingsPage from "./pages/Merchant/MerchantBookingsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search/:searchTerm" element={<HomePage />} />
      <Route path="/tag/:tag" element={<HomePage />} />
      <Route path="/animals/:id" element={<AnimalPage />} />
      <Route path="/chat/:id" element={<ChatPage />} />
      <Route path="/booking/:id" element={<BookingPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/booking-list" element={<BookingListPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/merchant/login" element={<MerchantLoginPage />} />
      <Route
        path="/merchant"
        element={
          <RequireMerchant>
            <MerchantDashboardPage />
          </RequireMerchant>
        }
      />
      <Route
        path="/merchant/animals"
        element={
          <RequireMerchant>
            <MerchantAnimalsPage />
          </RequireMerchant>
        }
      />
      <Route
        path="/merchant/animals/new"
        element={
          <RequireMerchant>
            <MerchantAnimalFormPage />
          </RequireMerchant>
        }
      />
      <Route
        path="/merchant/animals/:animalId/edit"
        element={
          <RequireMerchant>
            <MerchantAnimalFormPage />
          </RequireMerchant>
        }
      />
      <Route
        path="/merchant/animals/:animalId/availability"
        element={
          <RequireMerchant>
            <MerchantAvailabilityPage />
          </RequireMerchant>
        }
      />
      <Route
        path="/merchant/bookings"
        element={
          <RequireMerchant>
            <MerchantBookingsPage />
          </RequireMerchant>
        }
      />
    </Routes>
  );
}
