import Link from "next/link";
import { CalendarDays, Compass, Wallet } from "lucide-react";

type TripCardProps = {
  id: string;
  destination: string;
  city?: string | null;
  country?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalBudget: number;
  currency?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Date pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TripCard({
  id,
  destination,
  city,
  country,
  startDate,
  endDate,
  totalBudget,
  currency,
}: TripCardProps) {
  return (
    <Link
      href={`/dashboard/trips/${id}`}
      className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-orange-200 hover:bg-orange-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{destination}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {[city, country].filter(Boolean).join(", ") ||
              "Location details pending"}
          </p>
        </div>
        <Compass className="h-5 w-5 text-[var(--primary)]" />
      </div>

      <div className="mt-5 space-y-3 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          {formatDate(startDate)} to {formatDate(endDate)}
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-gray-400" />
          {formatCurrency(totalBudget, currency || "INR")}
        </div>
      </div>
    </Link>
  );
}
