import React, { useState } from "react";
import classes from "./Checkout.module.css";
import {
  createPaymentIntent,
  processPayment,
} from "../../services/paymentService";
import { sendOrderConfirmation } from "../../services/notificationService";

export default function Checkout({
  cartItems,
  userId,
  userEmail = "user@example.com",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    billingAddress: "",
  });

  const calculateTotal = () => {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (cartItems.length === 0) {
      setError("Your cart is empty");
      return;
    }

    if (
      !paymentData.cardNumber ||
      !paymentData.expiryDate ||
      !paymentData.cvv
    ) {
      setError("Please fill in all payment details");
      return;
    }

    try {
      setLoading(true);
      const total = calculateTotal();

      // Create payment intent
      const intentResponse = await createPaymentIntent(
        cartItems[0].animal.id,
        userId,
        total,
      );

      // Process payment
      const paymentResponse = await processPayment(intentResponse.id, {
        cardNumber: paymentData.cardNumber,
        expiryDate: paymentData.expiryDate,
        cvv: paymentData.cvv,
      });

      if (
        paymentResponse.status === "mock_succeeded" ||
        paymentResponse.status === "succeeded"
      ) {
        // Send order confirmation
        await sendOrderConfirmation(
          userId,
          userEmail,
          intentResponse.id,
          cartItems.map((item) => item.animal.name).join(", "),
        );

        setPaymentData({
          cardNumber: "",
          expiryDate: "",
          cvv: "",
          billingAddress: "",
        });
      } else {
        setError("Payment processing failed");
      }
    } catch (err) {
      setError("Payment failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  const total = calculateTotal();

  return (
    <div className={classes.checkoutContainer}>
      <div className={classes.orderSummary}>
        <h2>Order Summary</h2>
        <div className={classes.itemsList}>
          {cartItems.map((item, index) => (
            <div key={index} className={classes.item}>
              <div className={classes.itemInfo}>
                <span className={classes.itemName}>{item.animal.name}</span>
                <span className={classes.itemPrice}>
                  ${item.price?.toFixed(2)}
                </span>
              </div>
              {item.animal.imageUrl && (
                <img
                  src={`/animals/${item.animal.imageUrl}`}
                  alt={item.animal.name}
                  className={classes.itemImage}
                />
              )}
            </div>
          ))}
        </div>
        <div className={classes.totalBox}>
          <span className={classes.totalLabel}>Total Amount:</span>
          <span className={classes.totalPrice}>${total.toFixed(2)}</span>
        </div>
      </div>

      <div className={classes.paymentForm}>
        <h2>Payment Details</h2>

        {success && <div className={classes.successMessage}>{success}</div>}
        {error && <div className={classes.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmitPayment}>
          <div className={classes.formGroup}>
            <label htmlFor="cardNumber">Card Number</label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              placeholder="1234 5678 9012 3456"
              maxLength="19"
              value={paymentData.cardNumber}
              onChange={(e) => {
                const formatted = formatCardNumber(e.target.value);
                handlePaymentInputChange({
                  target: { name: "cardNumber", value: formatted },
                });
              }}
              className={classes.input}
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
                value={paymentData.expiryDate}
                onChange={(e) => {
                  const formatted = formatExpiryDate(e.target.value);
                  handlePaymentInputChange({
                    target: { name: "expiryDate", value: formatted },
                  });
                }}
                className={classes.input}
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
                value={paymentData.cvv}
                onChange={(e) => {
                  handlePaymentInputChange({
                    target: {
                      name: "cvv",
                      value: e.target.value.replace(/\D/g, ""),
                    },
                  });
                }}
                className={classes.input}
              />
            </div>
          </div>

          <div className={classes.formGroup}>
            <label htmlFor="billingAddress">Billing Address</label>
            <input
              type="text"
              id="billingAddress"
              name="billingAddress"
              placeholder="Your billing address"
              value={paymentData.billingAddress}
              onChange={handlePaymentInputChange}
              className={classes.input}
            />
          </div>

          <div className={classes.disclaimer}>
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">I agree to the terms and conditions</label>
          </div>

          <button
            type="submit"
            disabled={loading || cartItems.length === 0}
            className={classes.submitBtn}
          >
            {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
          </button>
        </form>

        <div className={classes.securityNote}>
          🔒 Your payment information is secure and encrypted
        </div>
      </div>
    </div>
  );
}
