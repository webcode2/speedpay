import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex justify-center items-start sm:items-center bg-[#f0f2f5] text-slate-900 sm:p-4">
      <div className="w-full max-w-[420px] min-h-screen sm:min-h-0 sm:rounded-[36px] overflow-hidden bg-white shadow-2xl shadow-slate-400/25 flex flex-col relative border-x sm:border border-slate-200/80">
        {children}
      </div>
    </div>
  );
}
