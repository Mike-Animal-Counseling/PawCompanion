import React, { createContext, useState, useContext } from "react";
import { clearSessionUserId, getOrCreateUserId } from "../utils/sessionUserId";

const UserContext = createContext();
const MERCHANT_SESSION_KEY = "merchantSession";
const defaultCustomerUser = {
  name: "Mr.Liang",
  role: "customer",
};

const getStoredMerchantSession = () => {
  try {
    const raw = localStorage.getItem(MERCHANT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

export const UserProvider = ({ children }) => {
  const storedMerchantSession = getStoredMerchantSession();
  const [userId, setUserId] = useState(() => getOrCreateUserId());
  const [user, setUser] = useState(
    storedMerchantSession?.user || defaultCustomerUser,
  );
  const [merchantToken, setMerchantToken] = useState(
    storedMerchantSession?.token || "",
  );

  const login = (userData) => {
    setUser({ ...userData, role: userData.role || "customer" });
  };

  const loginMerchant = (session) => {
    setUser(session.user);
    setMerchantToken(session.token);
    localStorage.setItem(MERCHANT_SESSION_KEY, JSON.stringify(session));
  };

  const logout = () => {
    setMerchantToken("");
    localStorage.removeItem(MERCHANT_SESSION_KEY);
    setUser(defaultCustomerUser);
    clearSessionUserId();
    setUserId(getOrCreateUserId());
  };

  const isMerchant = user?.role === "merchant";

  return (
    <UserContext.Provider
      value={{
        user,
        userId,
        login,
        loginMerchant,
        logout,
        merchantToken,
        isMerchant,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
