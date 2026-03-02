import React from "react";
import classes from "./header.module.css";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useUser } from "../../context/UserContext";

export default function Header() {
  const navigate = useNavigate();
  const { user, logout: logoutUser } = useUser();

  const { cart } = useCart();

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
                  <Link to="/orders">Orders</Link>
                  <button onClick={logout} className={classes.logoutBtn}>
                    Logout
                  </button>
                </div>
              </li>
            ) : (
              <Link to="/login">Login</Link>
            )}

            <li>
              <Link to="/cart">
                Cart
                {cart.totalCount > 0 && (
                  <span className={classes.cart_count}>{cart.totalCount}</span>
                )}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
