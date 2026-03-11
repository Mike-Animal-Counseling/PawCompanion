import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import {
  archiveMerchantAnimal,
  getMerchantAnimals,
} from "../../services/merchantService";
import classes from "./merchant.module.css";

export default function MerchantAnimalsPage() {
  const { merchantToken } = useUser();
  const [animals, setAnimals] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadAnimals = async () => {
      try {
        const data = await getMerchantAnimals(merchantToken);
        setAnimals(data || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load your animals");
      }
    };

    loadAnimals();
  }, [merchantToken]);

  const handleArchive = async (animalId) => {
    try {
      setError("");
      await archiveMerchantAnimal(merchantToken, animalId);
      setSuccess("Animal archived successfully.");
      const refreshedAnimals = await getMerchantAnimals(merchantToken);
      setAnimals(refreshedAnimals || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to archive animal");
    }
  };

  return (
    <div className={classes.page}>
      <div className={classes.hero}>
        <h1 className={classes.heroTitle}>Manage Animals</h1>
        <p className={classes.heroText}>
          Upload companion profiles, update their details, and configure booking
          availability date by date.
        </p>
        <div className={classes.actionsRow}>
          <Link to="/merchant/animals/new" className={classes.primaryButton}>
            Add New Animal
          </Link>
        </div>
      </div>

      {error && <div className={classes.errorBox}>{error}</div>}
      {success && <div className={classes.successBox}>{success}</div>}

      {animals.length === 0 ? (
        <div className={classes.emptyState}>
          No animals yet. Create your first profile to publish it on the
          platform.
        </div>
      ) : (
        <div className={classes.list}>
          {animals.map((animal) => (
            <div key={animal.id} className={classes.card}>
              <div className={classes.cardHeader}>
                <div>
                  <h2 className={classes.cardTitle}>{animal.name}</h2>
                  <p className={classes.meta}>
                    ${animal.price}/hr ·{" "}
                    {animal.tags?.join(", ") || "No tags yet"}
                  </p>
                </div>
                <div className={classes.badgeRow}>
                  <span className={classes.badge}>{animal.visibility}</span>
                  <span
                    className={`${classes.badge} ${animal.isActive ? "" : classes.badgeDanger}`}
                  >
                    {animal.isActive ? "active" : "archived"}
                  </span>
                </div>
              </div>
              <p className={classes.meta}>
                {animal.personality || "No personality set yet."}
              </p>
              <div className={classes.actionsRow}>
                <Link
                  to={`/merchant/animals/${animal.id}/edit`}
                  className={classes.subtleButton}
                >
                  Edit Details
                </Link>
                <Link
                  to={`/merchant/animals/${animal.id}/availability`}
                  className={classes.secondaryButton}
                >
                  Manage Availability
                </Link>
                <button
                  type="button"
                  className={classes.dangerButton}
                  onClick={() => handleArchive(animal.id)}
                >
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
