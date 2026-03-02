/**
 * Booking Service (Mock)
 * TODO: Add real external booking system credentials if needed
 * This service handles pet delivery bookings and logistics
 */

/**
 * Create a new booking
 */
export const createBooking = async (userId, animalId, bookingDetails) => {
  console.log(
    `[MOCK] Creating booking: userId=${userId}, animalId=${animalId}, details=${JSON.stringify(bookingDetails)}`,
  );

  // TODO: Real implementation with delivery system
  // - Call real logistics API (e.g., Shippo, Stripe-Shipments)
  // - Create tracking number
  // - Register with fulfillment partner

  return {
    bookingId: `bk_mock_${Date.now()}`,
    status: "confirmed",
    trackingNumber: `TR-${Date.now()}`,
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    message: "Mock booking created (no real booking)",
  };
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (bookingId, status) => {
  console.log(`[MOCK] Updating booking ${bookingId} status to: ${status}`);

  // TODO: Real implementation
  // - Update delivery tracking
  // - Notify fulfillment partner
  // - Send customer updates

  return {
    bookingId,
    status,
    message: "Mock booking status updated",
  };
};

/**
 * Get booking details
 */
export const getBookingDetails = async (bookingId) => {
  console.log(`[MOCK] Fetching booking details for ${bookingId}`);

  // TODO: Real implementation
  // - Fetch from booking database
  // - Get real tracking info
  // - Return delivery status

  return {
    bookingId,
    status: "in_transit",
    trackingNumber: `TR-${bookingId}`,
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    lastUpdate: "Out for delivery",
    message: "Mock booking details",
  };
};

/**
 * Cancel booking
 */
export const cancelBooking = async (bookingId, reason) => {
  console.log(`[MOCK] Cancelling booking ${bookingId}, reason: ${reason}`);

  // TODO: Real implementation
  // - Cancel with fulfillment partner
  // - Process refund
  // - Update inventory

  return {
    bookingId,
    status: "cancelled",
    refundInitiated: true,
    message: "Mock booking cancelled (no real cancellation)",
  };
};

/**
 * Calculate delivery cost
 */
export const calculateDeliveryCost = async (origin, destination, weight) => {
  console.log(
    `[MOCK] Calculating delivery cost: origin=${origin}, destination=${destination}, weight=${weight}`,
  );

  // TODO: Real implementation
  // - Call real shipping API (Shippo, FedEx, UPS, etc.)
  // - Calculate based on real rates

  const baseCost = 10;
  const distanceFactor = 1.5;
  const weightFactor = weight * 0.5;

  return {
    baseCost,
    distanceFactor,
    weightFactor,
    totalCost: baseCost + distanceFactor + weightFactor,
    currency: "USD",
    message: "Mock delivery cost calculated",
  };
};

export default {
  createBooking,
  updateBookingStatus,
  getBookingDetails,
  cancelBooking,
  calculateDeliveryCost,
};
