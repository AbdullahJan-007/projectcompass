"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@prisma/client";

export interface PortalSessionInfo {
  userRole: UserRole;
  userName: string;
  identifier: string;
  departmentCode: string;
  batchLabel: string;
}

const DEFAULT_SESSION: PortalSessionInfo = {
  userRole: "STUDENT",
  userName: "Academic User",
  identifier: "",
  departmentCode: "BSIT",
  batchLabel: "Department of IT & Computing",
};

const PortalSessionContext = createContext<PortalSessionInfo>(DEFAULT_SESSION);

export function PortalSessionProvider({
  value,
  children,
}: {
  value: PortalSessionInfo;
  children: React.ReactNode;
}) {
  return (
    <PortalSessionContext.Provider value={value}>
      {children}
    </PortalSessionContext.Provider>
  );
}

export function usePortalSession(): PortalSessionInfo {
  return useContext(PortalSessionContext);
}
