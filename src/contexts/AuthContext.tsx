import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, SEED_USERS } from '../lib/data';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: Role) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('siksha_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const allUsers = JSON.parse(localStorage.getItem('siksha_users') || JSON.stringify(SEED_USERS));
    const found = allUsers.find((u: User) => u.email === email && u.password === password);
    if (found) {
      setUser(found);
      localStorage.setItem('siksha_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const register = async (name: string, email: string, password: string, role: Role) => {
    const allUsers: User[] = JSON.parse(localStorage.getItem('siksha_users') || JSON.stringify(SEED_USERS));
    if (allUsers.find(u => u.email === email)) return false;
    const newUser: User = { id: `user-${Date.now()}`, name, email, password, role };
    allUsers.push(newUser);
    localStorage.setItem('siksha_users', JSON.stringify(allUsers));
    setUser(newUser);
    localStorage.setItem('siksha_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('siksha_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
