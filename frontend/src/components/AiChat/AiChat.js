import React, { useState, useEffect, useRef } from "react";
import classes from "./AiChat.module.css";
import {
  sendMessage,
  getChatMemory,
  clearChatHistory,
} from "../../services/aiService";

export default function AiChat({ animal, userId }) {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  // Load existing chat history on component mount
  useEffect(() => {
    if (animal?.id) {
      loadChatHistory();
    }
  }, [animal?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const data = await getChatMemory(userId, animal.id);
      if (data.memory?.messages) {
        setMessages(data.memory.messages);
      }
    } catch (err) {
      // Silently fail - this is normal for first message
      console.debug("Chat history not found (normal for new conversations)");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMessage = userInput;
    setUserInput("");
    setLoading(true);
    setError("");

    try {
      // Add user message to UI immediately
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: userMessage,
          timestamp: new Date(),
        },
      ]);

      // Send to backend
      const apiRes = await sendMessage(userId, animal.id, userMessage);

      // Add AI response (meta used for crisis card, image for generated images)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: apiRes.response,
          timestamp: new Date(),
          meta: apiRes.meta || null,
          image: apiRes.image || null,
        },
      ]);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(
          "AI service unavailable (429). Please check your HuggingFace API key in .env",
        );
      } else if (err.response?.status === 400) {
        setError("Invalid message. Please try again.");
      } else {
        setError("Failed to send message. Please try again.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear chat history?")) {
      try {
        await clearChatHistory(userId, animal.id);
        setMessages([]);
        setError("");
      } catch (err) {
        setError("Failed to clear history");
      }
    }
  };

  return (
    <div className={classes.chatContainer}>
      <div className={classes.header}>
        <h2>Chat with {animal?.name || "Pet"}</h2>
        <button
          className={classes.clearBtn}
          onClick={handleClearHistory}
          disabled={messages.length === 0}
        >
          Clear History
        </button>
      </div>

      <div className={classes.messagesBox}>
        {messages.length === 0 && (
          <div className={classes.emptyState}>
            <p>Start chatting with {animal?.name}!</p>
            <p className={classes.subtitle}>{animal?.personality}</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${classes.message} ${classes[msg.role]}`}
          >
            <div className={classes.role}>
              {msg.role === "user" ? "You" : animal?.name}
            </div>
            {msg.meta?.type === "crisis" ? (
              <div className={classes.crisisCard}>
                <div className={classes.content}>{msg.content}</div>
                <div className={classes.crisisLinks}>
                  {msg.meta.resources?.map((r, i) => (
                    <a key={i} href={r.href} target="_blank" rel="noreferrer">
                      {r.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className={classes.content}>{msg.content}</div>
                {msg.image && (
                  <div className={classes.imageContainer}>
                    <img
                      src={msg.image.imageUrl}
                      alt="Generated visualization"
                      className={classes.generatedImage}
                    />
                  </div>
                )}
              </>
            )}
            <div className={classes.timestamp}>
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}

        {loading && (
          <div className={`${classes.message} ${classes.assistant}`}>
            <div className={classes.role}>{animal?.name}</div>
            <div className={classes.content}>
              <span className={classes.typing}>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <div className={classes.error}>{error}</div>}

      <form className={classes.inputForm} onSubmit={handleSendMessage}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
          className={classes.input}
        />
        <button type="submit" disabled={loading} className={classes.sendBtn}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
