"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Building2,
  ChevronDown,
  CircleDollarSign,
  CircleUser,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { hasAnyPermission } from "@/permissions/visibility";
import { useAdminPermissions, useAdminSession } from "./admin-session";
import { ADMIN_NAV_LINKS } from "./admin-nav";

const GROUPS: { id: "main" | "account"; label: string; icon: LucideIcon }[] =
  [
    { id: "main", label: "Overview", icon: LayoutGrid },
    { id: "account", label: "Account", icon: CircleUser },
  ];

const LINK_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/plans": CircleDollarSign,
  "/admin/investments": UserCheck,
  "/admin/tasks": ClipboardList,
  "/admin/users": Users,
  "/admin/referrals": UserPlus,
  "/admin/kyc": ShieldCheck,
  "/admin/deposits": Banknote,
  "/admin/withdrawals": Banknote,
  "/admin/payouts": Building2,
  "/admin/staff": UserCog,
  "/admin/roles": KeyRound,
  "/admin/audit": ScrollText,
  "/admin/settings": Settings,
};

const COLLAPSE_KEY = "admin-sidebar-collapsed";

function isActivePath(href: string, pathname: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

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
    const hit = links.find((l) => isActivePath(l.href, pathname));
    return hit?.group ?? "main";
  }, [links, pathname]);

  const [open, setOpen] = useState<Record<string, boolean>>({
    main: true,
    account: false,
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setOpen((prev) => ({ ...prev, [activeGroup]: true }));
  }, [activeGroup]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={`flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-[var(--sp-border)] bg-white transition-[width] duration-200 ${
        collapsed ? "w-[72px]" : "w-[280px]"
      }`}
    >
      <div
        className={`flex shrink-0 items-center py-5 ${
          collapsed ? "flex-col gap-3 px-2" : "gap-3 px-4"
        }`}
      >
        <Image
          src="/logo-light.jpeg"
          alt="SPEED PAY"
          width={40}
          height={40}
          className="object-contain"
          priority
        />
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold tracking-wide text-[var(--sp-navy)]">
              SPEED <span className="text-[var(--sp-lime)]">PAY</span>
            </div>
            <div className="text-xs text-[var(--sp-muted)]">Admin console</div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--sp-muted)] outline-none hover:bg-[var(--sp-surface)] hover:text-[var(--sp-navy)] focus-visible:ring-2 focus-visible:ring-[var(--sp-lime)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain pb-4 ${
          collapsed ? "space-y-4 px-2" : "space-y-2 px-3"
        }`}
      >
        {GROUPS.map((group) => {
          const items = links.filter((l) => l.group === group.id);
          if (items.length === 0) return null;
          const isOpen = collapsed || (open[group.id] ?? false);
          const groupBadge = items.reduce(
            (sum, l) => sum + (badges[l.href] ?? 0),
            0,
          );
          const groupActive = items.some((l) => isActivePath(l.href, pathname));
          const GroupIcon = group.icon;
          const groupIndex = GROUPS.findIndex((g) => g.id === group.id);

          return (
            <div
              key={group.id}
              className={collapsed ? "" : "bg-[var(--sp-surface)]/60 p-1"}
            >
              {collapsed ? (
                groupIndex > 0 ? (
                  <div className="mb-1 flex justify-center">
                    <span className="h-px w-6 bg-[var(--sp-border)]" />
                  </div>
                ) : null
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setOpen((prev) => ({ ...prev, [group.id]: !isOpen }))
                  }
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold transition ${
                    groupActive
                      ? "bg-white text-[var(--sp-navy)] shadow-sm"
                      : "text-[var(--sp-muted)] hover:bg-white/80 hover:text-[var(--sp-navy)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon className="h-4 w-4" />
                    {group.label}
                  </span>
                  <span className="flex items-center gap-2">
                    {groupBadge > 0 ? (
                      <span className="rounded-full bg-[var(--sp-danger)] px-2 py-0.5 text-[11px] font-semibold text-white">
                        {groupBadge}
                      </span>
                    ) : null}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
              )}

              {isOpen ? (
                <ul className={collapsed ? "space-y-1" : "mt-1 space-y-0.5 px-1 pb-1"}>
                  {items.map((l) => {
                    const active = isActivePath(l.href, pathname);
                    const badge = badges[l.href];
                    const Icon = LINK_ICONS[l.href] ?? LayoutDashboard;
                    return (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          title={collapsed ? l.label : undefined}
                          aria-label={l.label}
                          className={`relative flex items-center transition ${
                            collapsed
                              ? `justify-center px-0 py-2.5 ${
                                  active
                                    ? "bg-[var(--sp-lime-mint)] font-semibold text-[var(--sp-navy)]"
                                    : "text-[var(--sp-muted)] hover:bg-[var(--sp-surface)] hover:text-[var(--sp-navy)]"
                                }`
                              : `justify-between px-3 py-2 text-sm ${
                                  active
                                    ? "bg-[var(--sp-lime-mint)] font-semibold text-[var(--sp-navy)]"
                                    : "text-[var(--sp-muted)] hover:bg-white hover:text-[var(--sp-navy)]"
                                }`
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                            {!collapsed ? <span>{l.label}</span> : null}
                          </span>
                          {!collapsed && badge && badge > 0 ? (
                            <span className="rounded-full bg-[var(--sp-danger)] px-2 py-0.5 text-[11px] font-semibold text-white">
                              {badge}
                            </span>
                          ) : null}
                          {collapsed && badge && badge > 0 ? (
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--sp-danger)]" />
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

      <div className={`shrink-0 border-t border-[var(--sp-border)] py-4 ${collapsed ? "px-2" : "px-4"}`}>
        <div
          className={`flex items-center bg-[var(--sp-surface)] ${
            collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-3"
          }`}
          title={collapsed ? `${admin.name} · ${admin.email}` : undefined}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--sp-navy)] text-sm font-semibold text-white">
            {admin.name.slice(0, 1).toUpperCase()}
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--sp-navy)]">
                {admin.name}
              </p>
              <p className="truncate text-xs text-[var(--sp-muted)]">
                {admin.email}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
