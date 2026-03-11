/**
 * Booking service used in local/dev flows.
 * Keep response shape stable so frontend work can continue while provider integration is pending.
 */

/**
 * Create a new booking
 */
export const createBooking = async (userId, animalId, bookingDetails) => {
  console.log(
    `[booking:stub] create booking userId=${userId} animalId=${animalId} details=${JSON.stringify(bookingDetails)}`,
  );

  // Replace with provider call once shipping integration is finalized.

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
  console.log(`[booking:stub] update booking=${bookingId} status=${status}`);

  // Replace with persisted status transition + outbound notification hooks.

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
  console.log(`[booking:stub] fetch booking details booking=${bookingId}`);

  // Replace with provider tracking lookup and DB-backed status history.

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
  console.log(`[booking:stub] cancel booking=${bookingId} reason=${reason}`);

  // Replace with cancellation workflow (provider cancel + refund orchestration).

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
    `[booking:stub] calculate cost origin=${origin} destination=${destination} weight=${weight}`,
  );

  // Replace with live carrier quote calculation when rate API is wired.

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
