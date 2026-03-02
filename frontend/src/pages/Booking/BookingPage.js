import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Booking from "../../components/Booking/Booking";
import { getById } from "../../services/animalService";
import { useUser } from "../../context/UserContext";
import classes from "./BookingPage.module.css";

export default function BookingPage() {
  const { id } = useParams();
  const { userId } = useUser();
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getById(id)
        .then(setAnimal)
        .catch((err) => console.error("Failed to load animal:", err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className={classes.loading}>Loading...</div>;
  }

  if (!animal) {
    return <div className={classes.error}>Animal not found</div>;
  }

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <div className={classes.headerContent}>
          <h1>Book Your Pet Companion</h1>
          <p>Choose {animal.name} and arrange a convenient delivery date</p>
        </div>
      </div>

      <div className={classes.content}>
        <div className={classes.animalCard}>
          <img
            src={`/animals/${animal.imageUrl}`}
            alt={animal.name}
            className={classes.image}
          />
          <div className={classes.details}>
            <h2>{animal.name}</h2>
            <p>
              <strong>Price:</strong> ${animal.price}
            </p>
            <p>
              <strong>Rating:</strong>{" "}
              {"⭐".repeat(Math.floor(animal.stars || 0))}
            </p>
            <p>
              <strong>Origins:</strong> {animal.origins?.join(", ")}
            </p>
          </div>
        </div>

        <Booking animal={animal} userId={userId} />
      </div>
    </div>
  );
}
