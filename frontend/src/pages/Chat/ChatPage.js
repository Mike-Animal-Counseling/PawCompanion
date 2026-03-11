import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AiChat from "../../components/AiChat/AiChat";
import { getById } from "../../services/animalService";
import { useUser } from "../../context/UserContext";
import classes from "./ChatPage.module.css";
import { resolveAnimalImageUrl } from "../../utils/imageUrl";

export default function ChatPage() {
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
        <img
          src={resolveAnimalImageUrl(animal.imageUrl)}
          alt={animal.name}
          className={classes.image}
        />
        <div className={classes.info}>
          <h1>{animal.name}</h1>
          {animal.merchant && (
            <p className={classes.personality}>
              Hosted by {animal.merchant.name} · {animal.merchant.businessType}
            </p>
          )}
          <p className={classes.personality}>{animal.personality}</p>
          <div className={classes.tags}>
            {animal.tags?.map((tag, idx) => (
              <span key={idx} className={classes.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={classes.chatSection}>
        <AiChat animal={animal} userId={userId} />
      </div>
    </div>
  );
}
