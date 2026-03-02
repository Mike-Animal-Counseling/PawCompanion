import axios from "axios";

/**
 * Notification Service - Frontend API calls for notifications
 */

export const sendSMS = async (phoneNumber, message) => {
  try {
    const { data } = await axios.post("/api/notification/sms", {
      phoneNumber,
      message,
    });
    return data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export const sendEmail = async (email, subject, html) => {
  try {
    const { data } = await axios.post("/api/notification/email", {
      email,
      subject,
      html,
    });
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const response = await axios.post("/api/notification/push", {
      userId,
      title,
      body,
      data,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
};

export const sendOrderConfirmation = async (
  userId,
  email,
  orderId,
  animalName,
) => {
  try {
    const { data } = await axios.post("/api/notification/order-confirmation", {
      userId,
      email,
      orderId,
      animalName,
    });
    return data;
  } catch (error) {
    console.error("Error sending order confirmation:", error);
    throw error;
  }
};

export default {
  sendSMS,
  sendEmail,
  sendPushNotification,
  sendOrderConfirmation,
};
