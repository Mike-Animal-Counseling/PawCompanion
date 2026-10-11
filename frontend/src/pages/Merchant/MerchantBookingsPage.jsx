import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "../../context/UserContext";
import {
  acceptMerchantBooking,
  getMerchantBookings,
  rejectMerchantBooking,
  rescheduleMerchantBooking,
} from "../../services/merchantService";
import classes from "./merchant.module.css";

const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

export default function MerchantBookingsPage() {
  const { merchantToken } = useUser();
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reschedule, setReschedule] = useState({});

  const visibleStatuses = useMemo(
    () => [
      "",
      "pending",
      "confirmed",
      "merchant_accepted",
      "rescheduled",
      "merchant_rejected",
    ],
    [],
  );

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const data = await getMerchantBookings(merchantToken, statusFilter);
        setBookings(data || []);
      } catch (err) {
        setError(
          err.response?.data?.error || "Failed to load merchant bookings",
        );
      }
    };

    loadBookings();
  }, [merchantToken, statusFilter]);

  const updateBooking = (updatedBooking) => {
    setBookings((prev) =>
      prev.map((item) =>
        item._id === updatedBooking._id ? updatedBooking : item,
      ),
    );
  };

  const handleAccept = async (bookingId) => {
    try {
      setError("");
      const updated = await acceptMerchantBooking(
        merchantToken,
        bookingId,
        "Accepted by merchant",
      );
      updateBooking(updated);
      setSuccess("Booking accepted.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to accept booking");
    }
  };

  const handleReject = async (bookingId) => {
    try {
      setError("");
      const updated = await rejectMerchantBooking(
        merchantToken,
        bookingId,
        "Rejected by merchant",
      );
      updateBooking(updated);
      setSuccess("Booking rejected.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject booking");
    }
  };

  const handleReschedule = async (bookingId) => {
    const form = reschedule[bookingId] || {};
    if (!form.date || !form.startTime) {
      setError("Please set a new date and start time for rescheduling.");
      return;
    }

    try {
      setError("");
      const updated = await rescheduleMerchantBooking(
        merchantToken,
        bookingId,
        {
          date: form.date,
          startTime: form.startTime,
          note: form.note,
        },
      );
      updateBooking(updated);
      setSuccess("Booking rescheduled.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reschedule booking");
    }
  };

  const setRescheduleField = (bookingId, field, value) => {
    setReschedule((prev) => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || {
          date: getTomorrow(),
          startTime: "09:00",
          note: "",
        }),
        [field]: value,
      },
    }));
  };

  return (
    <div className={classes.page}>
      <div className={classes.hero}>
        <h1 className={classes.heroTitle}>Merchant Orders</h1>
        <p className={classes.heroText}>
          Accept, reject, or reschedule bookings tied to your uploaded animals.
          Customer-facing pages still hide your merchant identity.
        </p>
      </div>

      {error && <div className={classes.errorBox}>{error}</div>}
      {success && <div className={classes.successBox}>{success}</div>}

      <div className={classes.toolbar}>
        <div className={classes.formGroup}>
          <label className={classes.label} htmlFor="merchant-status-filter">
            Filter by status
          </label>
          <select
            id="merchant-status-filter"
            className={classes.select}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {visibleStatuses.map((status) => (
              <option key={status || "all"} value={status}>
                {status || "All statuses"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className={classes.emptyState}>
          No bookings match this filter yet.
        </div>
      ) : (
        <div className={classes.list}>
          {bookings.map((booking) => (
            <div key={booking._id} className={classes.card}>
              <div className={classes.bookingCardTop}>
                <div>
                  <h2 className={classes.cardTitle}>
                    {booking.animalId?.name || "Unknown Animal"}
                  </h2>
                  <p className={classes.meta}>Booking #{booking._id}</p>
                  <p className={classes.meta}>
                    Date: {booking.date} · {booking.startTime} -{" "}
                    {booking.endTime}
                  </p>
                  <p className={classes.meta}>
                    Customer session: {booking.userId}
                  </p>
                </div>
                <div className={classes.badgeRow}>
                  <span className={classes.badge}>{booking.status}</span>
                  <span className={classes.badge}>
                    ${Number(booking.totalPrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {booking.rescheduleNote && (
                <p className={classes.meta}>{booking.rescheduleNote}</p>
              )}
              {booking.decisionNote && (
                <p className={classes.meta}>{booking.decisionNote}</p>
              )}

              <div className={classes.actionsRow}>
                <button
                  type="button"
                  className={classes.secondaryButton}
                  onClick={() => handleAccept(booking._id)}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className={classes.dangerButton}
                  onClick={() => handleReject(booking._id)}
                >
                  Reject
                </button>
              </div>

              <div className={classes.inlineForm}>
                <input
                  type="date"
                  min={getTomorrow()}
                  className={classes.input}
                  value={reschedule[booking._id]?.date || getTomorrow()}
                  onChange={(event) =>
                    setRescheduleField(booking._id, "date", event.target.value)
                  }
                />
                <select
                  className={classes.select}
                  value={reschedule[booking._id]?.startTime || "09:00"}
                  onChange={(event) =>
                    setRescheduleField(
                      booking._id,
                      "startTime",
                      event.target.value,
                    )
                  }
                >
                  {["09:00", "11:00", "13:00", "15:00", "17:00"].map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className={classes.input}
                  placeholder="Optional note"
                  value={reschedule[booking._id]?.note || ""}
                  onChange={(event) =>
                    setRescheduleField(booking._id, "note", event.target.value)
                  }
                />
                <button
                  type="button"
                  className={classes.primaryButton}
                  onClick={() => handleReschedule(booking._id)}
                >
                  Reschedule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
