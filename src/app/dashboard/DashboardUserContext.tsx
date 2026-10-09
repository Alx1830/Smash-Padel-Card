"use client";

import { createContext, useContext } from "react";

interface DashboardUserContextValue {
  userId: string | null;
  isAdmin: boolean;
  /** Para el saludo del inicio; el layout ya lo tiene desde el servidor. */
  username?: string | null;
}

const DashboardUserContext = createContext<DashboardUserContextValue>({ userId: null, isAdmin: false });

export function DashboardUserProvider({
  userId, isAdmin, username = null, children,
}: DashboardUserContextValue & { children: React.ReactNode }) {
  return (
    <DashboardUserContext.Provider value={{ userId, isAdmin, username }}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useDashboardUser() {
  return useContext(DashboardUserContext);
}
