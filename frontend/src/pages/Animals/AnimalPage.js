import React, { useEffect, useState } from "react";
import classes from "./animalPage.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { getById } from "../../services/animalService";
import StarRating from "../../components/StarRating/StarRating";
import Tags from "../../components/Tags/Tags";
import Price from "../../components/Price/Price";
import { useCart } from "../../hooks/useCart";
import NotFound from "../../components/NotFound/NotFound";

export default function AnimalPage() {
  const [animal, setAnimal] = useState({});
  const { id } = useParams();
  const { addToCart } = useCart();

  const navigate = useNavigate();

  const handleAddToCart = () => {
    addToCart(animal);
    navigate("/cart");
  };

  useEffect(() => {
    getById(id).then(setAnimal);
  }, [id]);
  return (
    <>
      {!animal ? (
        <NotFound message="Animal Not Found!" linkText="Go Back To HomePage" />
      ) : (
        <div className={classes.container}>
          <img
            className={classes.image}
            src={`/animals/${animal.imageUrl}`}
            alt={animal.name}
            width={350}
            height={300}
          />
          <div className={classes.details}>
            <div className={classes.header}>
              <span className={classes.name}>{animal.name}</span>
              <span
                className={`${classes.favorite} ${animal.favorite ? "" : classes.not}`}
              >
                ♥
              </span>
            </div>
            <div className={classes.rating}>
              <StarRating stars={animal.stars} size={55} />
            </div>

            <div className={classes.origins}>
              {animal.origins?.map((origin) => (
                <span key={origin}>{origin}</span>
              ))}
            </div>

            <div className={classes.tags}>
              {animal.tags && (
                <Tags
                  tags={animal.tags.map((tag) => ({ name: tag }))}
                  forAnimalPage={true}
                />
              )}
            </div>

            <div className={classes.personality}>
              <span>
                Personality: <strong>{animal.personality}</strong>
              </span>
            </div>

            <div className={classes.price}>
              <Price price={animal.price} />
              /hr
            </div>

            <div className={classes.actions}>
              <button
                className={classes.chatBtn}
                onClick={() => navigate(`/chat/${id}`)}
              >
                💬 Chat with {animal.name}
              </button>
              <button
                className={classes.bookingBtn}
                onClick={() => navigate(`/booking/${id}`)}
              >
                🚚 Book Delivery
              </button>
              <button className={classes.cartBtn} onClick={handleAddToCart}>
                🛒 Add To Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
