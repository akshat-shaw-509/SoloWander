import Link from "next/link";
import { LogOut } from "lucide-react";

import { dashboardNavItems } from "@/components/Sidebar";

type TopBarProps = {
  displayName: string;
  email?: string | null;
  profileName?: string | null;
  signOutAction: () => Promise<void>;
};

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "Solo Wanderer";

  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function TopBar({
  displayName,
  email,
  profileName,
  signOutAction,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="flex min-h-16 flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <nav className="flex gap-2 overflow-x-auto lg:hidden">
          {dashboardNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600"
              aria-label={item.label}
              title={item.label}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          ))}
        </nav>

        <div>
          <p className="text-sm font-medium text-gray-500">Welcome back</p>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            {displayName}
          </h1>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--dark)] text-sm font-bold text-white">
              {getInitials(profileName, email)}
            </div>
            <div className="hidden text-sm sm:block">
              <div className="font-semibold">{displayName}</div>
              <div className="max-w-48 truncate text-gray-500">{email}</div>
            </div>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
