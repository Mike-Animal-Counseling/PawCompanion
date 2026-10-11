import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../axiosConfig";
import { useUser } from "../../context/UserContext";
import classes from "./loginPage.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(false);
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

      const { data } = await api.post(`/api/auth/customer/${isRegister ? "register" : "login"}`, { ...formData, name: formData.email.split("@")[0].slice(0, 80) });
      login(data);
      const destination = location.state?.from?.pathname;
      navigate(destination?.startsWith("/") && !destination.startsWith("//") ? destination : "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.loginContainer}>
      <div className={classes.loginCard}>
        <h1>{isRegister ? "Create your account" : "Login to Your Account"}</h1>

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
              minLength={isRegister ? 12 : undefined}
              maxLength={72}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button type="submit" className={classes.loginBtn} disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create account" : "Login"}
          </button>
        </form>

        <div className={classes.loginFooter}>
          <p>
            <button type="button" onClick={() => { setIsRegister(value => !value); setError(""); }}>{isRegister ? "Already registered? Sign in" : "Create an account"}</button>
          </p>
        </div>
      </div>
    </div>
  );
}
