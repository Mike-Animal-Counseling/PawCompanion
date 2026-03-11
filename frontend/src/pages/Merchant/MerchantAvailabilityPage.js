import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import {
  getMerchantAnimal,
  getMerchantAvailability,
  saveMerchantAvailability,
} from "../../services/merchantService";
import classes from "./merchant.module.css";

const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

export default function MerchantAvailabilityPage() {
  const { animalId } = useParams();
  const { merchantToken } = useUser();
  const [animal, setAnimal] = useState(null);
  const [date, setDate] = useState(getTomorrow());
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const title = useMemo(() => animal?.name || "Animal", [animal]);

  useEffect(() => {
    const loadAnimal = async () => {
      try {
        const data = await getMerchantAnimal(merchantToken, animalId);
        setAnimal(data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load animal");
      }
    };

    loadAnimal();
  }, [animalId, merchantToken]);

  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const data = await getMerchantAvailability(
          merchantToken,
          animalId,
          date,
        );
        setSlots(data.slots || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load availability");
      }
    };

    loadAvailability();
  }, [animalId, date, merchantToken]);

  const toggleSlot = (startTime) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.startTime === startTime
          ? { ...slot, enabled: !slot.enabled }
          : slot,
      ),
    );
  };

  const saveAvailability = async () => {
    try {
      setError("");
      setSuccess("");
      await saveMerchantAvailability(merchantToken, animalId, { date, slots });
      setSuccess("Availability saved successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save availability");
    }
  };

  return (
    <div className={classes.page}>
      <div className={classes.hero}>
        <h1 className={classes.heroTitle}>Availability for {title}</h1>
        <p className={classes.heroText}>
          Enable only the time windows this animal can actually take. Slots are
          stored in MongoDB and survive restarts.
        </p>
      </div>

      {error && <div className={classes.errorBox}>{error}</div>}
      {success && <div className={classes.successBox}>{success}</div>}

      <div className={classes.formCard}>
        <div className={classes.toolbar}>
          <div className={classes.formGroup}>
            <label className={classes.label} htmlFor="availability-date">
              Date
            </label>
            <input
              id="availability-date"
              type="date"
              min={getTomorrow()}
              className={classes.input}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className={classes.actionsRow}>
            <button
              type="button"
              className={classes.primaryButton}
              onClick={saveAvailability}
            >
              Save Availability
            </button>
            <Link to="/merchant/animals" className={classes.subtleButton}>
              Back to Animals
            </Link>
          </div>
        </div>

        <div className={classes.slotGrid}>
          {slots.map((slot) => (
            <div key={slot.startTime} className={classes.slotCard}>
              <div>
                <strong>{slot.startTime}</strong>
                <div className={classes.smallText}>{slot.endTime}</div>
              </div>
              <button
                type="button"
                className={`${classes.toggle} ${slot.enabled ? classes.toggleEnabled : ""}`}
                onClick={() => toggleSlot(slot.startTime)}
                aria-label={`Toggle ${slot.startTime}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
