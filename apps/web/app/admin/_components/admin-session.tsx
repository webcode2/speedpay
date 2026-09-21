"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AdminMe = {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
  permissions: string[];
};

const AdminSessionContext = createContext<AdminMe | null>(null);

export function AdminSessionProvider({
  admin,
  children,
}: {
  admin: AdminMe;
  children: ReactNode;
}) {
  return (
    <AdminSessionContext.Provider value={admin}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminMe {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession requires AdminSessionProvider");
  }
  return ctx;
}

export function useAdminPermissions(): string[] {
  const ctx = useContext(AdminSessionContext);
  return ctx?.permissions ?? [];
}
