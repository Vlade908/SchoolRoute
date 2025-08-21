
'use client';

import React, { createContext, useContext, ReactNode } from 'react';

type User = {
  uid: string;
  name: string;
  email: string | null;
  role: number;
  schoolId: string | null;
  schoolName: string | null;
};

type UserContextType = {
  user: User | null;
  logout: () => void;
  loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children, user, logout, loading }: { children: ReactNode; user: User | null; logout: () => void; loading: boolean }) => {
  return (
    <UserContext.Provider value={{ user, logout, loading }}>
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
