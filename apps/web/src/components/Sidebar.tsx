import Link from "next/link";
import {
  BedDouble,
  Boxes,
  Bus,
  Compass,
  Building2,
  LayoutDashboard,
  MessageCircle,
  Settings,
  ShieldAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/trips", label: "Trips", icon: Compass },
  { href: "/dashboard/expenses", label: "Expenses", icon: Wallet },
  { href: "/dashboard/hostels", label: "Hostels", icon: BedDouble },
  { href: "/dashboard/transport", label: "Transport", icon: Bus },
  { href: "/dashboard/safety", label: "Safety", icon: ShieldAlert },
  { href: "/dashboard/authority", label: "Command", icon: Building2 },
  { href: "/dashboard/packing", label: "Packing", icon: Boxes },
  { href: "/dashboard/community", label: "Community", icon: MessageCircle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type SidebarProps = {
  preferredCurrency: string;
};

export default function Sidebar({ preferredCurrency }: SidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-white px-5 py-6 lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]">
          <Compass className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-[family-name:var(--font-heading)] text-xl font-bold">
            SoloWander
          </div>
          <div className="text-xs font-medium text-gray-500">
            Traveller console
          </div>
        </div>
      </Link>

      <nav className="mt-8 space-y-1">
        {dashboardNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-orange-50 hover:text-[var(--primary)]"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-gray-200 bg-[#F5F5F3] p-4">
        <div className="text-sm font-bold">Preferred currency</div>
        <div className="mt-1 text-2xl font-bold text-[var(--primary)]">
          {preferredCurrency}
        </div>
      </div>
    </aside>
  );
}
