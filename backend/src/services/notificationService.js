/**
 * Notification Service (Mock)
 * TODO: Add real API credentials:
 * - Twilio: process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN
 * - SendGrid: process.env.SENDGRID_API_KEY
 * Never call real APIs without valid credentials
 */

// TODO: Initialize real Twilio client when credentials are available
// import twilio from 'twilio';
// const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// TODO: Initialize real SendGrid when API key is available
// import sgMail from '@sendgrid/mail';
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send SMS notification
 * TODO: Integrate with real Twilio API when credentials are available
 */
export const sendSMS = async (phoneNumber, message) => {
  console.log(`[MOCK] Sending SMS to ${phoneNumber}: "${message}"`);

  // TODO: Real implementation
  // const result = await twilioClient.messages.create({
  //     body: message,
  //     from: process.env.TWILIO_PHONE_NUMBER,
  //     to: phoneNumber,
  // });
  // return result;

  return {
    sid: `SM_mock_${Date.now()}`,
    status: "mock_queued",
    message: "Mock SMS sent (no real message)",
  };
};

/**
 * Send email notification
 * TODO: Integrate with real SendGrid API when credentials are available
 */
export const sendEmail = async (to, subject, html) => {
  console.log(`[MOCK] Sending email to ${to}: "${subject}"`);

  // TODO: Real implementation
  // const msg = {
  //     to,
  //     from: process.env.SENDGRID_FROM_EMAIL,
  //     subject,
  //     html,
  // };
  // const result = await sgMail.send(msg);
  // return result;

  return {
    id: `email_mock_${Date.now()}`,
    status: "mock_delivered",
    message: "Mock email sent (no real message)",
  };
};

/**
 * Send push notification
 * TODO: Integrate with Firebase Cloud Messaging or similar when configured
 */
export const sendPushNotification = async (userId, title, body, data = {}) => {
  console.log(
    `[MOCK] Sending push notification to user ${userId}: "${title}" - "${body}"`,
  );

  // TODO: Real implementation with FCM
  // const message = {
  //     notification: { title, body },
  //     data,
  //     token: userDeviceToken,
  // };
  // const result = await admin.messaging().send(message);
  // return result;

  return {
    messageId: `push_mock_${Date.now()}`,
    status: "mock_sent",
    message: "Mock push notification sent (no real notification)",
  };
};

/**
 * Send order confirmation notification
 */
export const sendOrderConfirmation = async (
  userId,
  email,
  orderId,
  animalName,
) => {
  console.log(
    `[MOCK] Sending order confirmation for ${orderId} (${animalName}) to ${email}`,
  );

  return {
    sms: await sendSMS("+1234567890", `Order ${orderId} confirmed!`),
    email: await sendEmail(
      email,
      `Order Confirmed: ${animalName}`,
      `<p>Your order ${orderId} has been confirmed!</p>`,
    ),
    push: await sendPushNotification(
      userId,
      "Order Confirmed",
      `Your ${animalName} order is confirmed!`,
    ),
  };
};

export default {
  sendSMS,
  sendEmail,
  sendPushNotification,
  sendOrderConfirmation,
};
