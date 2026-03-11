/**
 * Notification service used by local/dev flows.
 * Swap these stubs with real providers when credentials are configured.
 */

// Twilio wiring placeholder for production rollout.
// import twilio from 'twilio';
// const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// SendGrid wiring placeholder for production rollout.
// import sgMail from '@sendgrid/mail';
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send SMS notification (stub).
 */
export const sendSMS = async (phoneNumber, message) => {
  console.log(`[notify:stub] sms to=${phoneNumber} message="${message}"`);

  // Replace with Twilio send call once credentials are available.
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
 * Send email notification (stub).
 */
export const sendEmail = async (to, subject, html) => {
  console.log(`[notify:stub] email to=${to} subject="${subject}"`);

  // Replace with SendGrid send call once credentials are available.
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
 * Send push notification (stub).
 */
export const sendPushNotification = async (userId, title, body, data = {}) => {
  console.log(
    `[notify:stub] push user=${userId} title="${title}" body="${body}"`,
  );

  // Replace with FCM provider call when push tokens are stored.
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
    `[notify:stub] order confirmation order=${orderId} animal=${animalName} email=${email}`,
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
