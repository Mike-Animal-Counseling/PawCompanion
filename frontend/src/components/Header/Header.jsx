import React from "react";
import classes from "./header.module.css";
import { Link, useNavigate } from "react-router-dom";
import { useBookingList } from "../../hooks/useBookingList";
import { useUser } from "../../context/UserContext";

export default function Header() {
  const navigate = useNavigate();
  const { user, logout: logoutUser, isMerchant } = useUser();

  const { bookingList } = useBookingList();

  const logout = () => {
    logoutUser();
    navigate("/");
  };

  return (
    <header className={classes.header}>
      <div className={classes.container}>
        <Link to="/" className={classes.logo}>
          Animal Counseling
        </Link>
        <nav>
          <ul>
            {user ? (
              <li className={classes.menu_container}>
                <Link to="/profile">{user.name}</Link>
                <div className={classes.menu}>
                  <Link to="/profile">Profile</Link>
                  {!isMerchant && <Link to="/orders">Orders</Link>}
                  <button onClick={logout} className={classes.logoutBtn}>
                    Logout
                  </button>
                </div>
              </li>
            ) : (
              <Link to="/login">Login</Link>
            )}

            {isMerchant ? (
              <li>
                <Link to="/merchant">Merchant Portal</Link>
              </li>
            ) : (
              <li>
                <Link to="/booking-list">
                  Bookings
                  {bookingList.length > 0 && (
                    <span className={classes.cart_count}>
                      {bookingList.length}
                    </span>
                  )}
                </Link>
              </li>
            )}

            {!isMerchant && (
              <li>
                <Link to="/merchant/login">For Merchants</Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
