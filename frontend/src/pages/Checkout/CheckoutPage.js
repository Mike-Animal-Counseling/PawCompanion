import React from "react";
import Checkout from "../../components/Checkout/Checkout";
import { useCart } from "../../hooks/useCart";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import classes from "./CheckoutPage.module.css";

export default function CheckoutPage() {
  const { cart } = useCart();
  const navigate = useNavigate();
  const { userId } = useUser();

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className={classes.emptyCart}>
        <h1>Your Cart is Empty</h1>
        <p>Add some pets to your cart before checking out</p>
        <button onClick={() => navigate("/")}>Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <h1>Checkout</h1>
        <p>Complete your purchase</p>
      </div>
      <Checkout
        cartItems={cart.items}
        userId={userId}
        userEmail="user@example.com"
      />
    </div>
  );
}
