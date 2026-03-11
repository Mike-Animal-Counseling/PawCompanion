import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import {
  merchantLogin,
  merchantRegister,
} from "../../services/merchantService";
import classes from "./merchant.module.css";

export default function MerchantLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginMerchant } = useUser();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    businessType: "Pet Cafe & Shelter",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from || "/merchant";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const action = mode === "login" ? merchantLogin : merchantRegister;
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const session = await action(payload);
      loginMerchant(session);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to continue merchant login",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.page}>
      <div className={classes.hero}>
        <h1 className={classes.heroTitle}>Merchant Portal</h1>
        <p className={classes.heroText}>
          Upload your animals, manage availability, and let customers discover
          which pet cafe or shelter each companion comes from.
        </p>
      </div>

      <div className={classes.formCard}>
        <div className={classes.toolbar}>
          <div>
            <h2 className={classes.cardTitle}>
              {mode === "login" ? "Merchant Login" : "Create Merchant Account"}
            </h2>
            <p className={classes.smallText}>
              {mode === "login"
                ? "Use your merchant credentials to access the portal."
                : "Create your merchant account and start uploading animals."}
            </p>
          </div>
          <button
            type="button"
            className={classes.subtleButton}
            onClick={() =>
              setMode((prev) => (prev === "login" ? "register" : "login"))
            }
          >
            {mode === "login" ? "Need an account?" : "Already registered?"}
          </button>
        </div>

        {error && <div className={classes.errorBox}>{error}</div>}

        <form className={classes.formGrid} onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className={classes.formGroup}>
              <label className={classes.label} htmlFor="name">
                Merchant Name
              </label>
              <input
                id="name"
                name="name"
                className={classes.input}
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {mode === "register" && (
            <div className={classes.formGroup}>
              <label className={classes.label} htmlFor="businessType">
                Business Type
              </label>
              <select
                id="businessType"
                name="businessType"
                className={classes.select}
                value={form.businessType}
                onChange={handleChange}
              >
                <option value="Pet Cafe">Pet Cafe</option>
                <option value="Shelter">Shelter</option>
                <option value="Rescue">Rescue</option>
                <option value="Pet Cafe & Shelter">Pet Cafe & Shelter</option>
              </select>
            </div>
          )}

          <div className={classes.formGroup}>
            <label className={classes.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={classes.input}
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className={classes.formGroup}>
            <label className={classes.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={classes.input}
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          <div className={`${classes.formGroup} ${classes.fullWidth}`}>
            <button
              type="submit"
              className={classes.primaryButton}
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Enter Merchant Portal"
                  : "Create Merchant Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
