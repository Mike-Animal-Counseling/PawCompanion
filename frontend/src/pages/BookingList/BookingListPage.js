import React from "react";
import { useNavigate } from "react-router-dom";
import { useBookingList } from "../../hooks/useBookingList";
import { useUser } from "../../context/UserContext";
import classes from "./BookingListPage.module.css";
import axiosConfig from "../../axiosConfig";
import { resolveAnimalImageUrl } from "../../utils/imageUrl";

export default function BookingListPage() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const { bookingList, removeFromBookingList, totalPrice } = useBookingList();
  const [error, setError] = React.useState("");
  const [serverPendingBookings, setServerPendingBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPendingBookings = async () => {
      try {
        setLoading(true);
        const response = await axiosConfig.get(`/api/booking/my/${userId}`);
        const pendingBookings = (response.data || [])
          .filter((booking) => booking.status === "pending")
          .map((booking) => ({
            bookingId: booking._id,
            animal: {
              id: booking.animalId?.id || booking.animalId,
              name: booking.animalId?.name || "Unknown Animal",
              imageUrl: booking.animalId?.imageUrl || "",
              price: booking.animalId?.price || booking.totalPrice,
            },
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            totalPrice: booking.totalPrice,
          }));
        setServerPendingBookings(pendingBookings);
      } catch (err) {
        console.error("Failed to fetch pending bookings:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPendingBookings();
    }
  }, [userId]);

  const displayedBookings =
    bookingList.length > 0 ? bookingList : serverPendingBookings;

  const displayedTotal =
    bookingList.length > 0
      ? totalPrice
      : displayedBookings.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleRemoveBooking = async (bookingId) => {
    try {
      setError("");
      await axiosConfig.delete(`/api/booking/${bookingId}?userId=${userId}`);
      removeFromBookingList(bookingId);
      setServerPendingBookings((prev) =>
        prev.filter((item) => item.bookingId !== bookingId),
      );
    } catch (err) {
      console.error("Failed to remove booking:", err);
      setError("Failed to remove booking. Please try again.");
    }
  };

  if (loading && displayedBookings.length === 0) {
    return (
      <div className={classes.emptyState}>
        <h1>Loading your bookings...</h1>
      </div>
    );
  }

  if (displayedBookings.length === 0) {
    return (
      <div className={classes.emptyState}>
        <h1>No Sessions Booked Yet</h1>
        <p>Browse our friendly animals and book a visit today!</p>
        <button className={classes.browseButton} onClick={() => navigate("/")}>
          Browse Animals
        </button>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <h1 className={classes.title}>Your Booked Sessions</h1>

      {error && <div className={classes.error}>{error}</div>}

      <div className={classes.bookingsList}>
        {displayedBookings.map((booking) => (
          <div key={booking.bookingId} className={classes.bookingCard}>
            <div className={classes.imageSection}>
              <img
                src={resolveAnimalImageUrl(booking.animal.imageUrl)}
                alt={booking.animal.name}
                className={classes.image}
              />
            </div>

            <div className={classes.detailsSection}>
              <h2 className={classes.animalName}>{booking.animal.name}</h2>

              <div className={classes.bookingDetails}>
                <div className={classes.detailRow}>
                  <span className={classes.label}>Date:</span>
                  <span className={classes.value}>
                    {new Date(booking.date).toLocaleDateString()}
                  </span>
                </div>

                <div className={classes.detailRow}>
                  <span className={classes.label}>Time:</span>
                  <span className={classes.value}>
                    {booking.startTime} - {booking.endTime}
                  </span>
                </div>

                <div className={classes.detailRow}>
                  <span className={classes.label}>Duration:</span>
                  <span className={classes.value}>2 hours</span>
                </div>

                <div className={classes.detailRow}>
                  <span className={classes.label}>Price:</span>
                  <span className={classes.price}>
                    ${booking.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className={classes.actions}>
                <button
                  className={classes.removeButton}
                  onClick={() => handleRemoveBooking(booking.bookingId)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={classes.summary}>
        <div className={classes.summaryContent}>
          <div className={classes.summaryRow}>
            <span className={classes.summaryLabel}>Sessions:</span>
            <span className={classes.summaryValue}>
              {displayedBookings.length}
            </span>
          </div>

          <div className={classes.summaryRow}>
            <span className={classes.summaryLabel}>Total Price:</span>
            <span className={classes.summaryTotal}>
              ${displayedTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          className={classes.checkoutButton}
          onClick={() => navigate("/checkout")}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
