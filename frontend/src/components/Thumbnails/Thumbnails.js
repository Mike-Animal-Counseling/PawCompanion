import React from "react";
import classes from "./thumbnails.module.css";
import { Link } from "react-router-dom";
import StarRating from "../StarRating/StarRating";
import Price from "../Price/Price";
import { resolveAnimalImageUrl } from "../../utils/imageUrl";
export default function Thumbnails({ animals }) {
  return (
    <ul className={classes.list}>
      {animals.map((animal) => (
        <li key={animal.id}>
          <Link to={`/animals/${animal.id}`}>
            <img
              className={classes.image}
              src={resolveAnimalImageUrl(animal.imageUrl)}
              alt={animal.name}
              width={350}
              height={300}
            />
            <div className={classes.content}>
              <div className={classes.name}>{animal.name}</div>
              {animal.merchant && (
                <div className={classes.providerBadge}>
                  {animal.merchant.businessType}: {animal.merchant.name}
                </div>
              )}
              <span
                className={`${classes.favorite} ${animal.favorite ? "" : classes.not}`}
              >
                ♥
              </span>
              <div className={classes.stars}>
                <StarRating stars={animal.stars} />
              </div>
              <div className={classes.product_item_footer}>
                <div className={classes.origins}>
                  {animal.origins.map((origin) => (
                    <span key={origin}>{origin}</span>
                  ))}
                </div>
                <div className={classes.personality}>
                  <span>☀︎</span>
                  {animal.personality}
                </div>
              </div>
              <div className={classes.price}>
                <Price price={animal.price} />
                /hr
                <span className={classes.priceNote}>(2 hrs min)</span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
