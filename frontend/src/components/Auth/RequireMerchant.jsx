import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../../context/UserContext";

export default function RequireMerchant({ children }) {
  const location = useLocation();
  const { isMerchant, merchantToken } = useUser();

  if (!isMerchant || !merchantToken) {
    return (
      <Navigate
        to="/merchant/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}
