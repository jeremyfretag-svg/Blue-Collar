"use client";

import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "user" | "curator" | "admin";
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("bc_user");
    const storedToken = localStorage.getItem("bc_token");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setToken(storedToken);
  }, []);

  const login = (user: User, token: string) => {
    localStorage.setItem("bc_user", JSON.stringify(user));
    localStorage.setItem("bc_token", token);
    setUser(user);
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem("bc_user");
    localStorage.removeItem("bc_token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
