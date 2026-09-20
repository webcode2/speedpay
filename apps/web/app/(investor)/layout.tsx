import { InvestorShell } from "./_components/investor-shell";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InvestorShell>{children}</InvestorShell>;
}
