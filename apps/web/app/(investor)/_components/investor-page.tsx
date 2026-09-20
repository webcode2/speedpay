"use client";

import type { ReactNode } from "react";
import { InvestorNav } from "./investor-nav";

export function InvestorPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <InvestorNav />
      {children}
    </main>
  );
}
