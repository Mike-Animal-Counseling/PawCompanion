import React, { useState, useEffect } from "react";
import classes from "./ordersPage.module.css";

export default function OrdersPage() {
  const [orders, setOrders] = useState([
    {
      id: "ORD-001",
      date: "2024-02-10",
      animal: "Persian Cat",
      totalPrice: 150,
      status: "Delivered",
      image: "https://via.placeholder.com/80?text=Persian",
    },
    {
      id: "ORD-002",
      date: "2024-02-08",
      animal: "Golden Retriever",
      totalPrice: 200,
      status: "Delivered",
      image: "https://via.placeholder.com/80?text=Golden",
    },
    {
      id: "ORD-003",
      date: "2024-02-05",
      animal: "Siamese Cat",
      totalPrice: 120,
      status: "In Transit",
      image: "https://via.placeholder.com/80?text=Siamese",
    },
  ]);

  const getStatusClass = (status) => {
    switch (status) {
      case "Delivered":
        return classes.statusDelivered;
      case "In Transit":
        return classes.statusTransit;
      case "Cancelled":
        return classes.statusCancelled;
      default:
        return "";
    }
  };

  return (
    <div className={classes.ordersContainer}>
      <h1>My Orders</h1>

      {orders && orders.length > 0 ? (
        <div className={classes.ordersList}>
          {orders.map((order) => (
            <div key={order.id} className={classes.orderCard}>
              <div className={classes.orderHeader}>
                <span className={classes.orderId}>{order.id}</span>
                <span
                  className={`${classes.status} ${getStatusClass(order.status)}`}
                >
                  {order.status}
                </span>
              </div>

              <div className={classes.orderContent}>
                <div className={classes.orderImage}>
                  <img src={order.image} alt={order.animal} />
                </div>

                <div className={classes.orderDetails}>
                  <h3>{order.animal}</h3>
                  <p className={classes.orderDate}>
                    Ordered: {new Date(order.date).toLocaleDateString()}
                  </p>
                </div>

                <div className={classes.orderPrice}>
                  <p className={classes.price}>
                    ${order.totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className={classes.orderActions}>
                <button className={classes.viewBtn}>View Details</button>
                {order.status === "Delivered" && (
                  <button className={classes.reorderBtn}>Reorder</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={classes.emptyState}>
          <p>You haven't placed any orders yet</p>
          <p className={classes.emptySubtext}>
            Start exploring our animal counseling services today!
          </p>
        </div>
      )}
    </div>
  );
}
