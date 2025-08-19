'use client';

import React, { createContext, useContext, ReactNode } from 'react';

type User = {
  uid: string;
  name: string;
  email: string | null;
  role: number;
  schoolId: string | null;
};

type UserContextType = {
  user: User | null;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children, user, logout }: { children: ReactNode; user: User | null; logout: () => void; }) => {
  return (
    <UserContext.Provider value={{ user, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
