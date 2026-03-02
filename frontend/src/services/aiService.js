import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

export const sendMessage = async (userId, animalId, message) => {
  try {
    // DEBUG: Log what we're sending
    console.log("DEBUG - Sending data:", { userId, animalId, message });
    console.log("DEBUG - userId type:", typeof userId, "Value:", userId);
    console.log("DEBUG - animalId type:", typeof animalId, "Value:", animalId);
    console.log("DEBUG - message type:", typeof message, "Value:", message);

    if (!userId) {
      console.error("ERROR: userId is missing!");
      throw new Error("userId is required");
    }
    if (!animalId) {
      console.error("ERROR: animalId is missing!");
      throw new Error("animalId is required");
    }
    if (!message) {
      console.error("ERROR: message is missing!");
      throw new Error("message is required");
    }

    const payload = {
      userId,
      animalId,
      message,
    };

    const response = await axios.post(`${API_BASE_URL}/api/ai/chat`, payload);
    return response.data;
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const getChatMemory = async (userId, animalId) => {
  try {
    const { data } = await axios.get(`/api/ai/memory/${userId}/${animalId}`);
    return data;
  } catch (error) {
    // 404 is expected when no chat history exists yet (first message)
    if (error.response?.status === 404) {
      return { memory: { messages: [] } };
    }
    console.error("Error fetching chat memory:", error);
    throw error;
  }
};

export const clearChatHistory = async (userId, animalId) => {
  try {
    const { data } = await axios.delete(`/api/ai/memory/${userId}/${animalId}`);
    return data;
  } catch (error) {
    console.error("Error clearing chat history:", error);
    throw error;
  }
};

export default {
  sendMessage,
  getChatMemory,
  clearChatHistory,
};
