import type { InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {subtitle ? (
          <p className="text-sm font-medium text-[var(--sp-lime-deep)]">
            {subtitle}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-[var(--sp-navy)]">
          {title}
        </h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-[var(--sp-border)] bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  let cls = "bg-[var(--sp-surface)] text-[var(--sp-muted)]";
  if (
    [
      "SUCCESS",
      "COMPLETED",
      "VERIFIED",
      "APPROVED",
      "ACTIVE",
      "OPEN",
      "PROCESSED",
      "KYC_APPROVED",
      "ELIGIBLE",
      "PUBLISHED",
    ].includes(s)
  ) {
    cls = "bg-[var(--sp-lime-mint)] text-[var(--sp-lime-deep)]";
  } else if (["PENDING", "PROCESSING", "UNDER_REVIEW", "PAUSED", "DRAFT"].includes(s)) {
    cls = "bg-amber-50 text-amber-700";
  } else if (
    ["FAILED", "REJECTED", "CANCELLED", "SUSPENDED", "CLOSED", "ARCHIVED", "FULL"].includes(
      s,
    )
  ) {
    cls = "bg-red-50 text-[var(--sp-danger)]";
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {status}
    </span>
  );
}

export function AdminTable({
  columns,
  children,
  empty,
}: {
  columns: string[];
  children: ReactNode;
  empty?: string;
}) {
  return (
    <AdminCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--sp-border)] bg-[var(--sp-surface)] text-xs uppercase tracking-wide text-[var(--sp-muted)]">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--sp-border)]">{children}</tbody>
        </table>
      </div>
      {empty ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--sp-muted)]">
          {empty}
        </p>
      ) : null}
    </AdminCard>
  );
}

export function AdminSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      className="rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] outline-none ring-[var(--sp-lime)] focus:ring-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] outline-none ring-[var(--sp-lime)] placeholder:text-[var(--sp-muted)] focus:ring-2 ${props.className ?? ""}`}
    />
  );
}

export function AdminPrimaryButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--sp-navy-soft)]"
    >
      {children}
    </Link>
  );
}

export function RowLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-[var(--sp-navy)] hover:text-[var(--sp-lime-deep)]">
      {children}
    </Link>
  );
}
