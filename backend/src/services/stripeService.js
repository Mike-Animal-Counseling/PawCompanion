/**
 * Stripe Payment Service (Mock)
 * TODO: Add real Stripe API key from process.env.STRIPE_API_KEY
 * Never call real Stripe API without valid credentials
 */

// TODO: Initialize real Stripe client when API key is available
// const stripe = require('stripe')(process.env.STRIPE_API_KEY);

/**
 * Create a payment intent
 * TODO: Integrate with real Stripe API when credentials are available
 */
export const createPaymentIntent = async (animalId, userId, amount) => {
  console.log(
    `[MOCK] Creating payment intent: animalId=${animalId}, userId=${userId}, amount=${amount}`,
  );

  // TODO: Real implementation
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
 * Process a payment
 * TODO: Integrate with real Stripe API when credentials are available
 */
export const processPayment = async (paymentIntentId, paymentMethod) => {
  console.log(
    `[MOCK] Processing payment: paymentIntentId=${paymentIntentId}, paymentMethod=${paymentMethod}`,
  );

  // TODO: Real implementation
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
 * Refund a payment
 * TODO: Integrate with real Stripe API when credentials are available
 */
export const refundPayment = async (paymentIntentId, amount) => {
  console.log(
    `[MOCK] Refunding payment: paymentIntentId=${paymentIntentId}, amount=${amount}`,
  );

  // TODO: Real implementation
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
