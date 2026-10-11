import React, { useState } from "react";
import classes from "./Booking.module.css";
import {
  createBooking,
  calculateDeliveryCost,
} from "../../services/bookingService";

export default function Booking({ animal, userId }) {
  const [formData, setFormData] = useState({
    deliveryAddress: "",
    phoneNumber: "",
    deliveryDate: "",
    specialInstructions: "",
  });

  const [deliveryCost, setDeliveryCost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bookingId, setBookingId] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCalculateCost = async () => {
    if (!formData.deliveryAddress) {
      setError("Please enter delivery address");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const cost = await calculateDeliveryCost(
        "Pet Shelter",
        formData.deliveryAddress,
        5, // Average pet weight in kg
      );
      setDeliveryCost(cost.totalCost);
    } catch (err) {
      setError("Failed to calculate delivery cost");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate form
    if (
      !formData.deliveryAddress ||
      !formData.phoneNumber ||
      !formData.deliveryDate
    ) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const booking = await createBooking(userId, animal.id, {
        deliveryAddress: formData.deliveryAddress,
        phoneNumber: formData.phoneNumber,
        deliveryDate: formData.deliveryDate,
        specialInstructions: formData.specialInstructions,
      });

      setBookingId(booking.bookingId);
      setSuccess(`🎉 Booking confirmed! Tracking: ${booking.trackingNumber}`);
      setFormData({
        deliveryAddress: "",
        phoneNumber: "",
        deliveryDate: "",
        specialInstructions: "",
      });
      setDeliveryCost(null);
    } catch (err) {
      setError("Failed to create booking. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTomorrow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className={classes.bookingContainer}>
      <h2>Book {animal?.name}</h2>

      {success && (
        <div className={classes.successMessage}>
          <p>{success}</p>
          {bookingId && (
            <p className={classes.bookingId}>Booking ID: {bookingId}</p>
          )}
        </div>
      )}

      {error && <div className={classes.errorMessage}>{error}</div>}

      <form className={classes.form} onSubmit={handleSubmit}>
        <div className={classes.formGroup}>
          <label htmlFor="deliveryAddress">Delivery Address *</label>
          <input
            type="text"
            id="deliveryAddress"
            name="deliveryAddress"
            value={formData.deliveryAddress}
            onChange={handleInputChange}
            placeholder="Enter your delivery address"
            className={classes.input}
          />
        </div>

        <div className={classes.formGroup}>
          <label htmlFor="phoneNumber">Phone Number *</label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="Your contact number"
            className={classes.input}
          />
        </div>

        <div className={classes.formGroup}>
          <label htmlFor="deliveryDate">Preferred Delivery Date *</label>
          <input
            type="date"
            id="deliveryDate"
            name="deliveryDate"
            value={formData.deliveryDate}
            onChange={handleInputChange}
            min={getTomorrow()}
            className={classes.input}
          />
        </div>

        <div className={classes.formGroup}>
          <label htmlFor="specialInstructions">Special Instructions</label>
          <textarea
            id="specialInstructions"
            name="specialInstructions"
            value={formData.specialInstructions}
            onChange={handleInputChange}
            placeholder="Any special delivery instructions..."
            rows="3"
            className={classes.textarea}
          />
        </div>

        <div className={classes.costSection}>
          <button
            type="button"
            onClick={handleCalculateCost}
            disabled={loading}
            className={classes.costBtn}
          >
            {loading ? "Calculating..." : "Calculate Delivery Cost"}
          </button>

          {deliveryCost && (
            <div className={classes.costDisplay}>
              <span className={classes.label}>Delivery Cost:</span>
              <span className={classes.price}>${deliveryCost.toFixed(2)}</span>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className={classes.submitBtn}>
          {loading ? "Booking..." : "Confirm Booking"}
        </button>
      </form>

      <div className={classes.infoBox}>
        <h3>About {animal?.name}</h3>
        <p>
          <strong>Personality:</strong> {animal?.personality}
        </p>
        <p>
          <strong>Rating:</strong> {"⭐".repeat(Math.floor(animal?.stars || 0))}
        </p>
      </div>
    </div>
  );
}
