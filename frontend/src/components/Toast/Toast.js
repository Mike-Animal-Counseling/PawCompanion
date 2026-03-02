import React, { useState, useCallback } from "react";
import classes from "./Toast.module.css";

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <>
      <div className={classes.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${classes.toast} ${classes[toast.type]}`}
          >
            <span>{toast.message}</span>
            <button
              className={classes.closeBtn}
              onClick={() => removeToast(toast.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Export methods for use outside React context */}
      {typeof window !== "undefined" &&
        // Store in window for global access if needed
        (window.__showToast = showToast)}
    </>
  );
}

export { Toast };
