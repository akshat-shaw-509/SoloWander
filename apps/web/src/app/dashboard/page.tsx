import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Compass,
  Plus,
  Radar,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type TripSummary = {
  id: string;
  destination: string;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  currency: string | null;
};

type ExpenseSummary = {
  id: string;
  name: string;
  amount: number;
  category: string;
  expense_date: string | null;
};

type ActiveSafetySession = {
  id: string;
  risk_level: string | null;
};

type OpenIncident = {
  id: string;
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

export default async function DashboardPage() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [
    { data: trips },
    { data: expenses },
    { data: safetySession },
    { data: openIncidents },
  ] = await Promise.all([
    supabase
      .from("trips")
      .select("id, destination, city, country, start_date, end_date, total_budget, currency")
      .eq("user_id", user.id)
      .order("start_date", { ascending: true })
      .limit(3),
    supabase
      .from("expenses")
      .select("id, name, amount, category, expense_date")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false })
      .limit(5),
    supabase
      .from("safety_sessions")
      .select("id, risk_level")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("safety_incidents")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["reported", "acknowledged", "dispatched"]),
  ]);

  const tripSummaries = (trips ?? []) as TripSummary[];
  const expenseSummaries = (expenses ?? []) as ExpenseSummary[];
  const totalBudget = tripSummaries.reduce(
    (sum, trip) => sum + trip.total_budget,
    0,
  );
  const recentSpend = expenseSummaries.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const currency = tripSummaries[0]?.currency || "INR";
  const activeSafetySession = safetySession as ActiveSafetySession | null;
  const openIncidentCount = ((openIncidents ?? []) as OpenIncident[]).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Active trips
            </span>
            <Compass className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div className="mt-4 text-3xl font-bold">{tripSummaries.length}</div>
          <p className="mt-1 text-sm text-gray-500">Ready to plan and track</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Planned budget
            </span>
            <Wallet className="h-5 w-5 text-[var(--secondary)]" />
          </div>
          <div className="mt-4 text-3xl font-bold">
            {formatCurrency(totalBudget, currency)}
          </div>
          <p className="mt-1 text-sm text-gray-500">Across visible trips</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Recent expenses
            </span>
            <CalendarDays className="h-5 w-5 text-[var(--info)]" />
          </div>
          <div className="mt-4 text-3xl font-bold">
            {formatCurrency(recentSpend / 100, currency)}
          </div>
          <p className="mt-1 text-sm text-gray-500">Latest logged spending</p>
        </div>

        <Link
          href="/dashboard/safety"
          className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-orange-200 hover:bg-orange-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Safety status
            </span>
            <Radar className="h-5 w-5 text-red-600" />
          </div>
          <div className="mt-4 text-3xl font-bold">
            {activeSafetySession ? activeSafetySession.risk_level || "green" : "Off"}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {openIncidentCount} open incident{openIncidentCount === 1 ? "" : "s"}
          </p>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold">
                Active trips
              </h2>
              <p className="text-sm text-gray-500">
                Your next destinations and budgets.
              </p>
            </div>
            <Link
              href="/dashboard/trips/new"
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              New Trip
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {tripSummaries.length > 0 ? (
              tripSummaries.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/dashboard/trips/${trip.id}`}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-orange-200 hover:bg-orange-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-bold">{trip.destination}</div>
                    <div className="mt-1 text-sm text-gray-500">
                      {[trip.city, trip.country].filter(Boolean).join(", ") ||
                        "Location details pending"}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {formatDate(trip.start_date)} to {formatDate(trip.end_date)}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="font-bold">
                      {formatCurrency(trip.total_budget, trip.currency || "INR")}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-[var(--primary)] sm:justify-end">
                      View trip <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3] p-8 text-center">
                <Compass className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-3 font-bold">No trips yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create your first itinerary to unlock budget and packing tools.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold">
            Recent expenses
          </h2>
          <p className="text-sm text-gray-500">A quick look at spending.</p>

          <div className="mt-5 space-y-3">
            {expenseSummaries.length > 0 ? (
              expenseSummaries.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <div className="font-semibold">{expense.name}</div>
                    <div className="text-sm text-gray-500">
                      {expense.category} - {formatDate(expense.expense_date)}
                    </div>
                  </div>
                  <div className="font-bold">
                    {formatCurrency(expense.amount / 100, currency)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3] p-6 text-center">
                <Wallet className="mx-auto h-9 w-9 text-gray-400" />
                <h3 className="mt-3 font-bold">No expenses logged</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Track meals, rides, stays, and tiny impulse buys here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/dashboard/trips/new",
            label: "Plan a trip",
            icon: Compass,
          },
          {
            href: "/dashboard/hostels",
            label: "Browse hostels",
            icon: BedDouble,
          },
          {
            href: "/dashboard/safety",
            label: "Open safety app",
            icon: ShieldAlert,
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 font-bold transition-colors hover:border-orange-200 hover:bg-orange-50"
          >
            <span className="flex items-center gap-3">
              <action.icon className="h-5 w-5 text-[var(--primary)]" />
              {action.label}
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </Link>
        ))}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold">
              Budget overview
            </h2>
            <p className="text-sm text-gray-500">
              Charts will light up as trip and expense data grows.
            </p>
          </div>
          <Link
            href="/dashboard/expenses"
            className="text-sm font-bold text-[var(--primary)]"
          >
            View all expenses
          </Link>
        </div>
        <div className="mt-5 h-44 rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3]" />
      </section>
    </div>
  );
}
