"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Zap, ArrowLeft } from "lucide-react";
import { useUser } from "@/components/user-context";

type Notification = {
  id: string;
  code: string;
  title?: string;
  message?: string;
  createdAt: string;
  readAt?: string | null;
};

export default function NotificationsPage() {
  const { theme } = useUser();
  const isDark = theme === "dark";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data?.items)) {
          setNotifications(d.data.items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      const d = await res.json();
      if (d.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
        );
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={`p-2 rounded-xl transition ${
              isDark ? "bg-slate-800 text-slate-300 hover:text-white" : "bg-white text-slate-700 hover:text-slate-950 border border-slate-200"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-950"}`}>
            <Bell className="w-5 h-5 text-[#40b020]" /> Notifications
          </h1>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div
        className={`p-6 rounded-3xl border ${
          isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        {loading ? (
          <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                isDark ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"
              }`}
            >
              <Bell className="w-6 h-6" />
            </div>
            <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>
              No notifications yet
            </h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              You will receive real-time alerts when your task rewards, referral commissions, or deposits are processed.
            </p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? "divide-slate-800/80" : "divide-slate-100"}`}>
            {notifications.map((n) => (
              <div key={n.id} className="py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#40b020]/15 text-[#40b020] flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {n.title || n.code}
                  </div>
                  <div className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {n.message || n.code}
                  </div>
                  <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
