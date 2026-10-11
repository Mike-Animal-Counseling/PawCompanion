import React from "react";
import Checkout from "../../components/Checkout/Checkout";
import { useBookingList } from "../../hooks/useBookingList";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import axiosConfig from "../../axiosConfig";
import classes from "./CheckoutPage.module.css";

export default function CheckoutPage() {
  const { bookingList } = useBookingList();
  const navigate = useNavigate();
  const { userId } = useUser();
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
        console.error("Failed to fetch pending bookings for checkout:", err);
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

  if (loading && displayedBookings.length === 0) {
    return (
      <div className={classes.emptyCart}>
        <h1>Loading bookings...</h1>
      </div>
    );
  }

  if (displayedBookings.length === 0) {
    return (
      <div className={classes.emptyCart}>
        <h1>No Bookings</h1>
        <p>Add some sessions to your booking list before checking out</p>
        <button onClick={() => navigate("/")}>Browse Animals</button>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <h1>Checkout</h1>
        <p>Complete your booking and payment</p>
      </div>
      <Checkout bookingList={displayedBookings} userId={userId} />
    </div>
  );
}
