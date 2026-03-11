import { useState, useEffect } from "react";

const BOOKING_LIST_KEY = "bookingList";

const persistBookingList = (items) => {
  const newTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  localStorage.setItem(
    BOOKING_LIST_KEY,
    JSON.stringify({
      items,
      totalPrice: newTotal,
    }),
  );
  return newTotal;
};

export function useBookingList() {
  const [bookingList, setBookingList] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // Initialize from localStorage
  useEffect(() => {
    const storedList = localStorage.getItem(BOOKING_LIST_KEY);
    if (storedList) {
      try {
        const parsed = JSON.parse(storedList);
        setBookingList(parsed.items || []);
        setTotalPrice(parsed.totalPrice || 0);
      } catch (e) {
        console.error("Failed to parse booking list from localStorage:", e);
      }
    }
  }, []);

  const addToBookingList = (booking) => {
    // Each booking is a unique slot, so we add it directly
    const newBooking = {
      bookingId: booking._id || booking.bookingId,
      animal: {
        id: booking.animalId?.id || booking.animalId?._id || booking.animalId,
        name: booking.animalId?.name || "Unknown Animal",
        imageUrl: booking.animalId?.imageUrl || "",
        price: booking.animalId?.price || booking.totalPrice,
      },
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice: booking.totalPrice,
    };
    setBookingList((prev) => {
      const updated = [...prev, newBooking];
      const newTotal = persistBookingList(updated);
      setTotalPrice(newTotal);
      return updated;
    });
  };

  const removeFromBookingList = (bookingId) => {
    setBookingList((prev) => {
      const filtered = prev.filter((item) => item.bookingId !== bookingId);
      const newTotal = persistBookingList(filtered);
      setTotalPrice(newTotal);
      return filtered;
    });
  };

  const clearBookingList = () => {
    setBookingList([]);
    setTotalPrice(0);
    localStorage.removeItem(BOOKING_LIST_KEY);
  };

  return {
    bookingList,
    addToBookingList,
    removeFromBookingList,
    clearBookingList,
    totalPrice,
  };
}
