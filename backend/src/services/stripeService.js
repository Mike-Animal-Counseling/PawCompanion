/**
 * Stripe service stub for local/dev testing.
 * Keep return payloads aligned with expected payment fields until live Stripe wiring lands.
 */

// Stripe client placeholder for production wiring.
// const stripe = require('stripe')(process.env.STRIPE_API_KEY);

/**
 * Create a payment intent (stub).
 */
export const createPaymentIntent = async (animalId, userId, amount) => {
  console.log(
    `[payment:stub] create intent animalId=${animalId} userId=${userId} amount=${amount}`,
  );

  // Replace with stripe.paymentIntents.create when API key and webhook flow are ready.
  // const paymentIntent = await stripe.paymentIntents.create({
  //     amount: Math.round(amount * 100),
  //     currency: 'usd',
  //     metadata: { animalId, userId },
  // });
  // return paymentIntent;

  return {
    id: `pi_mock_${Date.now()}`,
    amount: amount,
    status: "mock_created",
    message: "Mock payment intent created (no real charge)",
  };
};

/**
 * Confirm a payment intent (stub).
 */
export const processPayment = async (paymentIntentId, paymentMethod) => {
  console.log(
    `[payment:stub] confirm intent=${paymentIntentId} method=${paymentMethod}`,
  );

  // Replace with stripe.paymentIntents.confirm once card flow is fully integrated.
  // const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
  //     payment_method: paymentMethod,
  // });
  // return paymentIntent;

  return {
    id: paymentIntentId,
    status: "mock_succeeded",
    message: "Mock payment processed (no real charge)",
  };
};

/**
 * Refund a payment (stub).
 */
export const refundPayment = async (paymentIntentId, amount) => {
  console.log(
    `[payment:stub] refund intent=${paymentIntentId} amount=${amount}`,
  );

  // Replace with stripe.refunds.create when refund policy and webhook handling are in place.
  // const refund = await stripe.refunds.create({
  //     payment_intent: paymentIntentId,
  //     amount: Math.round(amount * 100),
  // });
  // return refund;

  return {
    id: `ref_mock_${Date.now()}`,
    status: "mock_succeeded",
    message: "Mock refund processed (no real transaction)",
  };
};

export default {
  createPaymentIntent,
  processPayment,
  refundPayment,
};
