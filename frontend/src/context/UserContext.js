import React, { createContext, useState, useContext } from "react";
import {
  clearSessionUserId,
  getOrCreateUserId,
} from "../utils/sessionUserId";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(() => getOrCreateUserId());
  const [user, setUser] = useState({
    name: "Mr.Liang",
  });

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    // Start a fresh anonymous session id on logout
    clearSessionUserId();
    setUserId(getOrCreateUserId());
  };

  return (
    <UserContext.Provider value={{ user, userId, login, logout }}>
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
