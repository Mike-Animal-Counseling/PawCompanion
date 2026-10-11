import React, { useState, useEffect } from "react";
import classes from "./ordersPage.module.css";
import { useUser } from "../../context/UserContext";
import axiosConfig from "../../axiosConfig";
import { resolveAnimalImageUrl } from "../../utils/imageUrl";

export default function OrdersPage() {
  const { userId } = useUser();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRescheduleId, setActiveRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [rescheduleError, setRescheduleError] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  useEffect(() => {
    if (!userId) {
      setError("Please log in to view your bookings");
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await axiosConfig.get(`/api/booking/my/${userId}`);
        setBookings(response.data || []);
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        setError("Failed to load your bookings. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [userId]);

  const getStatusClass = (status) => {
    switch (status) {
      case "confirmed":
        return classes.statusConfirmed;
      case "pending":
        return classes.statusPending;
      case "cancelled":
        return classes.statusCancelled;
      default:
        return "";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "confirmed":
        return "Confirmed";
      case "pending":
        return "Pending";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const handleContactSupport = () => {
    window.alert(
      "Customer support page is coming soon. For now, please contact us via your account email.",
    );
  };

  const getTomorrow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  };

  const openReschedule = (bookingId) => {
    setActiveRescheduleId(bookingId);
    setRescheduleDate("");
    setAvailableSlots([]);
    setSelectedSlot(null);
    setRescheduleError("");
  };

  const closeReschedule = () => {
    setActiveRescheduleId(null);
    setRescheduleDate("");
    setAvailableSlots([]);
    setSelectedSlot(null);
    setRescheduleError("");
  };

  const handleRescheduleDateChange = async (booking, date) => {
    setRescheduleDate(date);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setRescheduleError("");

    if (!date) return;

    try {
      setLoadingSlots(true);
      const response = await axiosConfig.get(
        `/api/booking/slots/${booking.animalId.id}?date=${date}`,
      );
      setAvailableSlots(response.data || []);
    } catch (err) {
      console.error("Failed to load reschedule slots:", err);
      setRescheduleError("Failed to load available slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  const submitReschedule = async (bookingId) => {
    if (!rescheduleDate || !selectedSlot) {
      setRescheduleError("Please select a date and an available time slot");
      return;
    }

    try {
      setSubmittingReschedule(true);
      setRescheduleError("");

      const response = await axiosConfig.patch(
        `/api/booking/${bookingId}/reschedule`,
        {
          userId,
          date: rescheduleDate,
          startTime: selectedSlot.startTime,
        },
      );

      setBookings((prev) =>
        prev.map((item) => (item._id === bookingId ? response.data : item)),
      );
      closeReschedule();
    } catch (err) {
      console.error("Failed to reschedule booking:", err);
      setRescheduleError(
        err.response?.data?.error || "Failed to reschedule booking",
      );
    } finally {
      setSubmittingReschedule(false);
    }
  };

  if (loading) {
    return (
      <div className={classes.ordersContainer}>
        <h1>My Sessions</h1>
        <div className={classes.loading}>Loading your bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={classes.ordersContainer}>
        <h1>My Sessions</h1>
        <div className={classes.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={classes.ordersContainer}>
      <h1>My Sessions</h1>

      {bookings && bookings.length > 0 ? (
        <div className={classes.ordersList}>
          {bookings.map((booking) => (
            <div key={booking._id} className={classes.orderCard}>
              <div className={classes.orderHeader}>
                <span className={classes.orderId}>{booking._id}</span>
                <span
                  className={`${classes.status} ${getStatusClass(
                    booking.status,
                  )}`}
                >
                  {getStatusLabel(booking.status)}
                </span>
              </div>

              <div className={classes.orderContent}>
                <div className={classes.orderImage}>
                  <img
                    src={resolveAnimalImageUrl(booking.animalId.imageUrl)}
                    alt={booking.animalId.name}
                  />
                </div>

                <div className={classes.orderDetails}>
                  <h3>{booking.animalId.name}</h3>
                  <p className={classes.metaRow}>
                    <span className={classes.metaLabel}>Booking Date:</span>{" "}
                    {new Date(booking.date).toLocaleDateString()}
                  </p>
                  <p className={classes.metaRow}>
                    <span className={classes.metaLabel}>Session Time:</span>{" "}
                    {booking.startTime} - {booking.endTime}
                  </p>
                  <p className={classes.metaRow}>
                    <span className={classes.metaLabel}>Duration:</span> 2 hours
                  </p>
                  {booking.createdAt && (
                    <p className={classes.metaRow}>
                      <span className={classes.metaLabel}>Booked At:</span>{" "}
                      {new Date(booking.createdAt).toLocaleString()}
                    </p>
                  )}
                  {booking.rescheduleNote && (
                    <p className={classes.rescheduleNote}>
                      {booking.rescheduleNote}
                    </p>
                  )}
                </div>

                <div className={classes.orderPrice}>
                  <p className={classes.price}>
                    ${booking.totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              {booking.status === "confirmed" && booking.paymentId && (
                <div className={classes.paymentInfo}>
                  Payment ID: {booking.paymentId}
                </div>
              )}

              <div className={classes.actionRow}>
                {booking.status !== "cancelled" && (
                  <button
                    type="button"
                    className={classes.rescheduleButton}
                    onClick={() => openReschedule(booking._id)}
                  >
                    Reschedule
                  </button>
                )}
                <button
                  type="button"
                  className={classes.supportButton}
                  onClick={handleContactSupport}
                >
                  Contact Support
                </button>
              </div>

              {activeRescheduleId === booking._id && (
                <div className={classes.reschedulePanel}>
                  <p className={classes.rescheduleTitle}>Reschedule Session</p>

                  {rescheduleError && (
                    <div className={classes.rescheduleError}>
                      {rescheduleError}
                    </div>
                  )}

                  <label
                    className={classes.rescheduleLabel}
                    htmlFor={`date-${booking._id}`}
                  >
                    New Date
                  </label>
                  <input
                    id={`date-${booking._id}`}
                    className={classes.rescheduleInput}
                    type="date"
                    min={getTomorrow()}
                    value={rescheduleDate}
                    onChange={(e) =>
                      handleRescheduleDateChange(booking, e.target.value)
                    }
                  />

                  {loadingSlots && (
                    <div className={classes.rescheduleHint}>
                      Loading available slots...
                    </div>
                  )}

                  {!loadingSlots &&
                    rescheduleDate &&
                    availableSlots.length > 0 && (
                      <div className={classes.slotsGrid}>
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={!slot.available}
                            className={`${classes.slotButton} ${
                              !slot.available ? classes.slotUnavailable : ""
                            } ${
                              selectedSlot?.startTime === slot.startTime
                                ? classes.slotSelected
                                : ""
                            }`}
                            onClick={() =>
                              slot.available && setSelectedSlot(slot)
                            }
                          >
                            {slot.startTime} - {slot.endTime}
                          </button>
                        ))}
                      </div>
                    )}

                  {!loadingSlots &&
                    rescheduleDate &&
                    availableSlots.length === 0 && (
                      <div className={classes.rescheduleHint}>
                        No available slots for this date.
                      </div>
                    )}

                  <div className={classes.rescheduleActions}>
                    <button
                      type="button"
                      className={classes.cancelButton}
                      onClick={closeReschedule}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={classes.confirmButton}
                      disabled={submittingReschedule}
                      onClick={() => submitReschedule(booking._id)}
                    >
                      {submittingReschedule
                        ? "Saving..."
                        : "Confirm Reschedule"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={classes.emptyState}>
          <p>No sessions booked yet.</p>
          <p>Browse animals and book a visit to get started!</p>
        </div>
      )}
    </div>
  );
}
