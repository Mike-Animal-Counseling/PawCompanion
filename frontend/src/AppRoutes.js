import React from "react";
import { Route, Routes } from "react-router-dom";
import AnimalPage from "./pages/Animals/AnimalPage";
import HomePage from "./pages/Home/HomePage";
import CartPage from "./pages/Cart/CartPage";
import ChatPage from "./pages/Chat/ChatPage";
import BookingPage from "./pages/Booking/BookingPage";
import CheckoutPage from "./pages/Checkout/CheckoutPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import OrdersPage from "./pages/Orders/OrdersPage";
import LoginPage from "./pages/Login/LoginPage";

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
      <Route path="/cart" element={<CartPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}
