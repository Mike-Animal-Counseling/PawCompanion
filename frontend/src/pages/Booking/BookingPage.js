import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getById } from "../../services/animalService";
import { useUser } from "../../context/UserContext";
import { useBookingList } from "../../hooks/useBookingList";
import classes from "./BookingPage.module.css";
import axiosConfig from "../../axiosConfig";
import { resolveAnimalImageUrl } from "../../utils/imageUrl";

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId } = useUser();
  const { addToBookingList } = useBookingList();

  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get tomorrow's date as minimum
  const getTomorrow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (id) {
      getById(id)
        .then(setAnimal)
        .catch((err) => {
          console.error("Failed to load animal:", err);
          setError("Failed to load animal details");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSelectedSlot(null);
    setAvailableSlots([]);

    if (!date) return;

    try {
      setLoadingSlots(true);
      const response = await axiosConfig.get(
        `/api/booking/slots/${id}?date=${date}`,
      );
      setAvailableSlots(response.data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch available slots:", err);
      setError("Failed to load available time slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const handleAddToBookingList = async () => {
    if (!selectedSlot || !animal || !selectedDate) {
      setError("Please select a date and time slot");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // Create booking on backend
      const bookingResponse = await axiosConfig.post("/api/booking/create", {
        userId,
        animalId: animal.id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
      });

      // Add to local booking list
      addToBookingList(bookingResponse.data);

      // Navigate to booking list
      navigate("/booking-list");
    } catch (err) {
      console.error("Failed to create booking:", err);
      setError(
        err.response?.data?.error || "Failed to create booking. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={classes.loading}>Loading...</div>;
  }

  if (!animal) {
    return <div className={classes.error}>Animal not found</div>;
  }

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <div className={classes.headerContent}>
          <h1>Book Your Pet Companion</h1>
          <p>Schedule a 2-hour visit with {animal.name}</p>
        </div>
      </div>

      <div className={classes.content}>
        <div className={classes.animalCard}>
          <img
            src={resolveAnimalImageUrl(animal.imageUrl)}
            alt={animal.name}
            className={classes.image}
          />
          <div className={classes.details}>
            <h2>{animal.name}</h2>
            {animal.merchant && (
              <p>
                <strong>Source:</strong> {animal.merchant.businessType} ·{" "}
                {animal.merchant.name}
              </p>
            )}
            <p>
              <strong>Price:</strong> ${animal.price}/hr
              <span className={classes.priceNote}>(2 hrs min)</span>
            </p>
            <p>
              <strong>Session duration:</strong> 2 hours
            </p>
            <p>
              <strong>Rating:</strong>{" "}
              {"⭐".repeat(Math.floor(animal.stars || 0))}
            </p>
            <p>
              <strong>Origins:</strong> {animal.origins?.join(", ")}
            </p>
          </div>
        </div>

        <div className={classes.bookingForm}>
          <h2>Select Date and Time</h2>

          {error && <div className={classes.error}>{error}</div>}

          <div className={classes.formGroup}>
            <label htmlFor="date">Choose a Date:</label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              min={getTomorrow()}
              className={classes.input}
            />
          </div>

          {selectedDate && (
            <div className={classes.formGroup}>
              <label>Available Time Slots:</label>
              {loadingSlots ? (
                <div className={classes.loading}>Loading slots...</div>
              ) : availableSlots.length === 0 ? (
                <div className={classes.noSlots}>
                  No available slots for this date. Please select another date.
                </div>
              ) : (
                <div className={classes.slotsGrid}>
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.startTime}
                      className={`${classes.slotButton} ${
                        !slot.available ? classes.unavailable : ""
                      } ${
                        selectedSlot?.startTime === slot.startTime
                          ? classes.selected
                          : ""
                      }`}
                      onClick={() => slot.available && handleSlotSelect(slot)}
                      disabled={!slot.available}
                    >
                      {slot.startTime} - {slot.endTime}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <div className={classes.summary}>
              <h3>Booking Summary</h3>
              <p>
                <strong>Animal:</strong> {animal.name}
              </p>
              <p>
                <strong>Date:</strong> {selectedDate}
              </p>
              <p>
                <strong>Time:</strong> {selectedSlot.startTime} -{" "}
                {selectedSlot.endTime}
              </p>
              <p>
                <strong>Price:</strong> ${animal.price}/hr × 2 hrs = $
                {(animal.price * 2).toFixed(2)}
              </p>

              <button
                className={classes.submitButton}
                onClick={handleAddToBookingList}
                disabled={submitting}
              >
                {submitting ? "Adding..." : "Add to Booking List"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
