import React, { useState } from "react";
import classes from "./Checkout.module.css";
import axiosConfig from "../../axiosConfig";
import { resolveAnimalImageUrl } from "../../utils/imageUrl";

export default function Checkout({ bookingList = [], userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipts, setReceipts] = useState(null);
  const [formData, setFormData] = useState({
    address: "",
    phoneNumber: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  const totalPrice = bookingList.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatCardNumber = (value) => {
    return value
      .replace(/\s/g, "")
      .replace(/(\d{4})/g, "$1 ")
      .trim();
  };

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setError("");

    // Validate form
    if (
      !formData.address ||
      !formData.phoneNumber ||
      !formData.cardNumber ||
      !formData.expiryDate ||
      !formData.cvv
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (bookingList.length === 0) {
      setError("No bookings to process");
      return;
    }

    try {
      setLoading(true);
      const bookingIds = bookingList.map((item) => item.bookingId);

      const response = await axiosConfig.post("/api/booking/checkout", {
        userId,
        bookingIds,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
        paymentDetails: {
          cardNumber: formData.cardNumber,
          expiryDate: formData.expiryDate,
          cvv: formData.cvv,
        },
      });

      setReceipts(response.data);
    } catch (err) {
      console.error("Payment error:", err);
      setError(
        err.response?.data?.error ||
          "Payment processing failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Display receipts after successful payment
  if (receipts) {
    const animalNames = [
      ...new Set(
        (receipts.bookingReceipts || []).map((item) => item.animalName),
      ),
    ];

    return (
      <div className={classes.receiptsContainer}>
        <div className={classes.paymentReceipt}>
          <div className={classes.receiptHeader}>Payment Received</div>
          <p className={classes.receiptSubtext}>
            You are all set. Take a breath, your booking is confirmed and safely
            saved.
          </p>
          <div className={classes.receiptContent}>
            <div className={classes.receiptRow}>
              <span className={classes.label}>Sessions:</span>
              <span className={classes.value}>
                {receipts.paymentReceipt.sessionsCount}
              </span>
            </div>
            <div className={classes.receiptRow}>
              <span className={classes.label}>Date:</span>
              <span className={classes.value}>
                {receipts.paymentReceipt.date}
              </span>
            </div>
            <div className={classes.receiptRow}>
              <span className={classes.label}>Total Paid:</span>
              <span className={classes.valueBold}>
                ${receipts.paymentReceipt.totalPaid.toFixed(2)}
              </span>
            </div>
          </div>
          <p className={classes.receiptHint}>
            Full session details and references are available in My Orders.
          </p>
        </div>

        <div className={classes.bookingReceipt}>
          <div className={classes.receiptHeader}>Visit Scheduled</div>
          <p className={classes.receiptSubtext}>
            Our team will be ready for your companion session. You are in good
            hands.
          </p>
          <div className={classes.receiptContent}>
            <div className={classes.receiptRowStack}>
              <span className={classes.label}>Pets in this booking:</span>
              <div className={classes.nameChips}>
                {animalNames.map((name) => (
                  <span key={name} className={classes.nameChip}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={classes.successMessage}>
          Thank you for booking! Check your orders page to manage your visits.
        </div>
      </div>
    );
  }

  return (
    <div className={classes.checkoutContainer}>
      <div className={classes.orderSummary}>
        <h2>Booking Summary</h2>
        <div className={classes.itemsList}>
          {bookingList.map((item, index) => (
            <div key={index} className={classes.item}>
              <div className={classes.itemInfo}>
                <span className={classes.itemName}>{item.animal.name}</span>
                <span className={classes.itemDate}>
                  {item.date} {item.startTime}-{item.endTime}
                </span>
                <span className={classes.itemPrice}>
                  ${item.totalPrice.toFixed(2)}
                </span>
              </div>
              {item.animal.imageUrl && (
                <img
                  src={resolveAnimalImageUrl(item.animal.imageUrl)}
                  alt={item.animal.name}
                  className={classes.itemImage}
                />
              )}
            </div>
          ))}
        </div>
        <div className={classes.totalBox}>
          <span className={classes.totalLabel}>Total Amount:</span>
          <span className={classes.totalPrice}>${totalPrice.toFixed(2)}</span>
        </div>
      </div>

      <div className={classes.paymentForm}>
        <h2>Delivery & Payment Details</h2>

        {error && <div className={classes.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmitPayment}>
          <div className={classes.sectionTitle}>Delivery Information</div>

          <div className={classes.formGroup}>
            <label htmlFor="address">Delivery Address</label>
            <input
              type="text"
              id="address"
              name="address"
              placeholder="Your delivery address"
              value={formData.address}
              onChange={handleInputChange}
              className={classes.input}
              required
            />
          </div>

          <div className={classes.formGroup}>
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              placeholder="Your phone number"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className={classes.input}
              required
            />
          </div>

          <div className={classes.sectionTitle}>Payment Information</div>

          <div className={classes.formGroup}>
            <label htmlFor="cardNumber">Card Number</label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              placeholder="1234 5678 9012 3456"
              maxLength="19"
              value={formData.cardNumber}
              onChange={(e) => {
                const formatted = formatCardNumber(e.target.value);
                handleInputChange({
                  target: { name: "cardNumber", value: formatted },
                });
              }}
              className={classes.input}
              required
            />
          </div>

          <div className={classes.formRow}>
            <div className={classes.formGroup}>
              <label htmlFor="expiryDate">Expiry Date</label>
              <input
                type="text"
                id="expiryDate"
                name="expiryDate"
                placeholder="MM/YY"
                maxLength="5"
                value={formData.expiryDate}
                onChange={(e) => {
                  const formatted = formatExpiryDate(e.target.value);
                  handleInputChange({
                    target: { name: "expiryDate", value: formatted },
                  });
                }}
                className={classes.input}
                required
              />
            </div>

            <div className={classes.formGroup}>
              <label htmlFor="cvv">CVV</label>
              <input
                type="text"
                id="cvv"
                name="cvv"
                placeholder="123"
                maxLength="4"
                value={formData.cvv}
                onChange={(e) => {
                  handleInputChange({
                    target: {
                      name: "cvv",
                      value: e.target.value.replace(/\D/g, ""),
                    },
                  });
                }}
                className={classes.input}
                required
              />
            </div>
          </div>

          <div className={classes.disclaimer}>
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">I agree to the terms and conditions</label>
          </div>

          <button
            type="submit"
            disabled={loading || bookingList.length === 0}
            className={classes.submitBtn}
          >
            {loading ? "Processing..." : `Pay $${totalPrice.toFixed(2)}`}
          </button>
        </form>

        <div className={classes.securityNote}>
          🔒 Your payment information is secure and encrypted
        </div>
      </div>
    </div>
  );
}
