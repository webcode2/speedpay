"use client";

import { useEffect, useState } from "react";
import { InvestorPage } from "../_components/investor-page";

type Notification = {
  id: string;
  title: string;
  body?: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setItems(json.data.items);
    setUnreadCount(json.data.unreadCount ?? 0);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    await load();
  }

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    await load();
  }

  return (
    <InvestorPage title="Notifications">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{unreadCount} unread</p>
        <button
          type="button"
          className="text-sm text-emerald-400"
          onClick={() => void markAll()}
        >
          Mark all read
        </button>
      </div>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((n) => (
          <li key={n.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`font-medium ${n.readAt ? "text-slate-400" : ""}`}>
                  {n.title}
                </p>
                {n.body ? (
                  <p className="text-sm text-slate-500">{n.body}</p>
                ) : null}
                <p className="text-xs text-slate-600">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.readAt ? (
                <button
                  type="button"
                  className="text-sm text-emerald-400"
                  onClick={() => void markRead(n.id)}
                >
                  Read
                </button>
              ) : null}
            </div>
          </li>
        ))}
        {items.length === 0 && !error ? (
          <li className="px-4 py-3 text-slate-500">No notifications.</li>
        ) : null}
      </ul>
    </InvestorPage>
  );
}
