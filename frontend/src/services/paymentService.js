import axios from "axios";

/**
 * Payment Service - Frontend API calls for payment processing
 */

export const createPaymentIntent = async (animalId, userId, amount) => {
  try {
    const { data } = await axios.post("/api/payment/intent", {
      animalId,
      userId,
      amount,
    });
    return data;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
};

export const processPayment = async (paymentIntentId, paymentMethod) => {
  try {
    const { data } = await axios.post("/api/payment/process", {
      paymentIntentId,
      paymentMethod,
    });
    return data;
  } catch (error) {
    console.error("Error processing payment:", error);
    throw error;
  }
};

export const refundPayment = async (paymentIntentId, amount) => {
  try {
    const { data } = await axios.post("/api/payment/refund", {
      paymentIntentId,
      amount,
    });
    return data;
  } catch (error) {
    console.error("Error refunding payment:", error);
    throw error;
  }
};

export default {
  createPaymentIntent,
  processPayment,
  refundPayment,
};
