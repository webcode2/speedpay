"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { hasAnyPermission } from "@/permissions/visibility";
import { useAdminPermissions, useAdminSession } from "./admin-session";
import { ADMIN_NAV_LINKS } from "./admin-nav";

const GROUPS = [
  {
    id: "main",
    label: "Overview",
    icon: "▦",
  },
  {
    id: "ops",
    label: "Operations",
    icon: "◎",
  },
  {
    id: "account",
    label: "Account",
    icon: "👤",
  },
] as const;

export function AdminSidebar({
  badges = {},
}: {
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const permissions = useAdminPermissions();
  const admin = useAdminSession();
  const links = ADMIN_NAV_LINKS.filter((l) =>
    hasAnyPermission(permissions, l.permissions),
  );

  const activeGroup = useMemo(() => {
    const hit = links.find((l) =>
      l.href === "/admin"
        ? pathname === "/admin"
        : pathname === l.href || pathname.startsWith(`${l.href}/`),
    );
    return hit?.group ?? "main";
  }, [links, pathname]);

  const [open, setOpen] = useState<Record<string, boolean>>({
    main: true,
    ops: true,
    account: false,
  });

  useEffect(() => {
    setOpen((prev) => ({ ...prev, [activeGroup]: true }));
  }, [activeGroup]);

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-[var(--sp-border)] bg-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image
          src="/logo-light.jpeg"
          alt="SPEED PAY"
          width={44}
          height={44}
          className="rounded-xl object-contain"
          priority
        />
        <div>
          <div className="text-sm font-extrabold tracking-wide text-[var(--sp-navy)]">
            SPEED <span className="text-[var(--sp-lime)]">PAY</span>
          </div>
          <div className="text-xs text-[var(--sp-muted)]">Admin console</div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group) => {
          const items = links.filter((l) => l.group === group.id);
          if (items.length === 0) return null;
          const isOpen = open[group.id] ?? false;
          const groupBadge = items.reduce(
            (sum, l) => sum + (badges[l.href] ?? 0),
            0,
          );
          const groupActive = items.some((l) =>
            l.href === "/admin"
              ? pathname === "/admin"
              : pathname === l.href || pathname.startsWith(`${l.href}/`),
          );

          return (
            <div key={group.id} className="rounded-2xl bg-[var(--sp-surface)]/60 p-1">
              <button
                type="button"
                onClick={() =>
                  setOpen((prev) => ({ ...prev, [group.id]: !isOpen }))
                }
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  groupActive
                    ? "bg-white text-[var(--sp-navy)] shadow-sm"
                    : "text-[var(--sp-muted)] hover:bg-white/80 hover:text-[var(--sp-navy)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{group.icon}</span>
                  {group.label}
                </span>
                <span className="flex items-center gap-2">
                  {groupBadge > 0 ? (
                    <span className="rounded-full bg-[var(--sp-danger)] px-2 py-0.5 text-[11px] font-semibold text-white">
                      {groupBadge}
                    </span>
                  ) : null}
                  <span
                    className={`text-xs transition ${isOpen ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </span>
              </button>

              {isOpen ? (
                <ul className="mt-1 space-y-0.5 px-1 pb-1">
                  {items.map((l) => {
                    const active =
                      l.href === "/admin"
                        ? pathname === "/admin"
                        : pathname === l.href ||
                          pathname.startsWith(`${l.href}/`);
                    const badge = badges[l.href];
                    return (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                            active
                              ? "bg-[var(--sp-lime-mint)] font-semibold text-[var(--sp-navy)]"
                              : "text-[var(--sp-muted)] hover:bg-white hover:text-[var(--sp-navy)]"
                          }`}
                        >
                          <span>{l.label}</span>
                          {badge && badge > 0 ? (
                            <span className="rounded-full bg-[var(--sp-danger)] px-2 py-0.5 text-[11px] font-semibold text-white">
                              {badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--sp-border)] px-4 py-4">
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--sp-surface)] px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sp-navy)] text-sm font-semibold text-white">
            {admin.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--sp-navy)]">
              {admin.name}
            </p>
            <p className="truncate text-xs text-[var(--sp-muted)]">{admin.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
