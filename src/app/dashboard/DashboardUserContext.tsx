"use client";

import { createContext, useContext } from "react";

interface DashboardUserContextValue {
  userId: string | null;
  isAdmin: boolean;
}

const DashboardUserContext = createContext<DashboardUserContextValue>({ userId: null, isAdmin: false });

export function DashboardUserProvider({
  userId, isAdmin, children,
}: DashboardUserContextValue & { children: React.ReactNode }) {
  return (
    <DashboardUserContext.Provider value={{ userId, isAdmin }}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useDashboardUser() {
  return useContext(DashboardUserContext);
}
