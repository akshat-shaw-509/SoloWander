import Link from "next/link";
import { ChartPie, Filter, Wallet } from "lucide-react";

import AddExpenseModal from "@/components/AddExpenseModal";
import { createClient } from "@/lib/supabase/server";

type ExpensesPageProps = {
  searchParams: Promise<{ tripId?: string }>;
};

type TripOption = {
  id: string;
  destination: string;
  currency: string | null;
};

type Expense = {
  id: string;
  trip_id: string | null;
  name: string;
  amount: number;
  category: string;
  expense_date: string | null;
  notes: string | null;
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

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
  const { tripId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tripsData } = await supabase
    .from("trips")
    .select("id, destination, currency")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  const trips = (tripsData ?? []) as TripOption[];
  const selectedTrip = trips.find((trip) => trip.id === tripId);
  const currency = selectedTrip?.currency || trips[0]?.currency || "INR";

  let query = supabase
    .from("expenses")
    .select("id, trip_id, name, amount, category, expense_date, notes")
    .eq("user_id", user?.id)
    .order("expense_date", { ascending: false });

  if (tripId) {
    query = query.eq("trip_id", tripId);
  }

  const { data: expensesData } = await query;
  const expenses = (expensesData ?? []) as Expense[];
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = expenses.reduce<Record<string, number>>(
    (totals, expense) => {
      totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
      return totals;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
            Expenses
          </h1>
          <p className="mt-1 text-gray-500">
            Track spending across trips and categories.
          </p>
        </div>
        <AddExpenseModal trips={trips} defaultTripId={tripId} />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Total spend
            </span>
            <Wallet className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div className="mt-4 text-3xl font-bold">
            {formatCurrency(total / 100, currency)}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Categories
            </span>
            <ChartPie className="h-5 w-5 text-[var(--secondary)]" />
          </div>
          <div className="mt-4 text-3xl font-bold">
            {Object.keys(categoryTotals).length}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Filter</span>
            <Filter className="h-5 w-5 text-[var(--info)]" />
          </div>
          <div className="mt-4 text-lg font-bold">
            {selectedTrip?.destination || "All trips"}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/expenses"
            className={`rounded-lg border px-3 py-2 text-sm font-bold ${
              !tripId
                ? "border-[var(--primary)] bg-orange-50 text-[var(--primary)]"
                : "border-gray-200 text-gray-600"
            }`}
          >
            All trips
          </Link>
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/dashboard/expenses?tripId=${trip.id}`}
              className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                tripId === trip.id
                  ? "border-[var(--primary)] bg-orange-50 text-[var(--primary)]"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {trip.destination}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            Expense log
          </h2>

          <div className="mt-5 space-y-3">
            {expenses.length > 0 ? (
              expenses.map((expense) => {
                const trip = trips.find((item) => item.id === expense.trip_id);

                return (
                  <div
                    key={expense.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold">{expense.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {expense.category} - {formatDate(expense.expense_date)}
                          {trip ? ` - ${trip.destination}` : ""}
                        </p>
                        {expense.notes ? (
                          <p className="mt-2 text-sm text-gray-600">
                            {expense.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="font-bold">
                        {formatCurrency(
                          expense.amount / 100,
                          trip?.currency || currency,
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3] p-10 text-center">
                <Wallet className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-xl font-bold">No expenses yet</h3>
                <p className="mt-2 text-gray-500">
                  Add a cost to start seeing your travel spend.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            Category breakdown
          </h2>
          <div className="mt-5 space-y-3">
            {Object.entries(categoryTotals).length > 0 ? (
              Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{category}</span>
                      <span className="font-bold">
                        {formatCurrency(amount / 100, currency)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-[var(--primary)]"
                        style={{
                          width: `${Math.max(8, Math.round((amount / total) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-gray-500">No category data yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
