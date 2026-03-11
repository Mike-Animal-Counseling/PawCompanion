import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { getMerchantDashboard } from "../../services/merchantService";
import classes from "./merchant.module.css";

export default function MerchantDashboardPage() {
  const { user, merchantToken } = useUser();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await getMerchantDashboard(merchantToken);
        setStats(data);
      } catch (err) {
        setError(
          err.response?.data?.error || "Failed to load merchant dashboard",
        );
      }
    };

    loadDashboard();
  }, [merchantToken]);

  return (
    <div className={classes.page}>
      <div className={classes.hero}>
        <h1 className={classes.heroTitle}>Welcome back, {user?.name}</h1>
        <p className={classes.heroText}>
          Manage your uploaded animals, define availability by date, and keep
          bookings moving without exposing merchant identity on the public side.
        </p>
        <div className={classes.actionsRow}>
          <Link to="/merchant/animals" className={classes.primaryButton}>
            Manage Animals
          </Link>
          <Link to="/merchant/bookings" className={classes.secondaryButton}>
            View Merchant Orders
          </Link>
        </div>
      </div>

      {error && <div className={classes.errorBox}>{error}</div>}

      {stats && (
        <div className={classes.grid}>
          <div className={classes.statCard}>
            <div className={classes.statLabel}>Animals Uploaded</div>
            <div className={classes.statValue}>{stats.animalsCount}</div>
          </div>
          <div className={classes.statCard}>
            <div className={classes.statLabel}>Active Animals</div>
            <div className={classes.statValue}>{stats.activeAnimalsCount}</div>
          </div>
          <div className={classes.statCard}>
            <div className={classes.statLabel}>Pending Orders</div>
            <div className={classes.statValue}>{stats.pendingBookings}</div>
          </div>
          <div className={classes.statCard}>
            <div className={classes.statLabel}>Confirmed / Accepted</div>
            <div className={classes.statValue}>{stats.confirmedBookings}</div>
          </div>
        </div>
      )}
    </div>
  );
}
