import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import classes from "./loginPage.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useUser();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        setError("Please fill in all fields");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError("Please enter a valid email");
        return;
      }

      // Temporary local login flow until backend auth endpoint is wired here.
      console.log("Login attempt:", formData.email);

      const userData = {
        name: formData.email.split("@")[0],
        email: formData.email,
      };
      login(userData);

      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.loginContainer}>
      <div className={classes.loginCard}>
        <h1>Login to Your Account</h1>

        <form onSubmit={handleSubmit} className={classes.loginForm}>
          {error && <div className={classes.errorMessage}>{error}</div>}

          <div className={classes.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className={classes.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button type="submit" className={classes.loginBtn} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className={classes.loginFooter}>
          <p>
            Don't have an account? <a href="#signup">Sign up here</a>
          </p>
          <p>
            <a href="#forgot">Forgot your password?</a>
          </p>
        </div>
      </div>
    </div>
  );
}
