import axios from "axios";

/**
 * Booking Service - Frontend API calls for pet delivery bookings
 */

export const createBooking = async (userId, animalId, bookingDetails) => {
  try {
    const { data } = await axios.post("/api/booking/create", {
      userId,
      animalId,
      ...bookingDetails,
    });
    return data;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

export const getBookingDetails = async (bookingId) => {
  try {
    const { data } = await axios.get(`/api/booking/${bookingId}`);
    return data;
  } catch (error) {
    console.error("Error fetching booking details:", error);
    throw error;
  }
};

export const updateBookingStatus = async (bookingId, status) => {
  try {
    const { data } = await axios.put(`/api/booking/${bookingId}/status`, {
      status,
    });
    return data;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

export const cancelBooking = async (bookingId, reason) => {
  try {
    const { data } = await axios.delete(`/api/booking/${bookingId}`, {
      data: { reason },
    });
    return data;
  } catch (error) {
    console.error("Error cancelling booking:", error);
    throw error;
  }
};

export const calculateDeliveryCost = async (origin, destination, weight) => {
  try {
    const { data } = await axios.post("/api/booking/delivery-cost", {
      origin,
      destination,
      weight,
    });
    return data;
  } catch (error) {
    console.error("Error calculating delivery cost:", error);
    throw error;
  }
};

export default {
  createBooking,
  getBookingDetails,
  updateBookingStatus,
  cancelBooking,
  calculateDeliveryCost,
};
