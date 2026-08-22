import Link from "next/link";
import { ArrowLeft, CalendarDays, Trash2, Wallet } from "lucide-react";
import { notFound } from "next/navigation";

import { deleteTrip } from "@/app/dashboard/actions";
import AddExpenseModal from "@/components/AddExpenseModal";
import { createClient } from "@/lib/supabase/server";

type TripDetailPageProps = {
  params: Promise<{ id: string }>;
};

type Trip = {
  id: string;
  destination: string;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  currency: string | null;
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  category: string;
  expense_date: string | null;
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

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: trip }, { data: expenses }] = await Promise.all([
    supabase
      .from("trips")
      .select("id, destination, city, country, start_date, end_date, total_budget, currency")
      .eq("id", id)
      .eq("user_id", user?.id)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("id, name, amount, category, expense_date")
      .eq("trip_id", id)
      .eq("user_id", user?.id)
      .order("expense_date", { ascending: false }),
  ]);

  if (!trip) {
    notFound();
  }

  const tripDetail = trip as Trip;
  const expenseRows = (expenses ?? []) as Expense[];
  const currency = tripDetail.currency || "INR";
  const spent = expenseRows.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard/trips"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[var(--primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to trips
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold">
              {tripDetail.destination}
            </h1>
            <p className="mt-2 text-gray-500">
              {[tripDetail.city, tripDetail.country].filter(Boolean).join(", ") ||
                "Location details pending"}
            </p>
          </div>
          <form action={deleteTrip}>
            <input type="hidden" name="trip_id" value={tripDetail.id} />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              <CalendarDays className="h-4 w-4" />
              Dates
            </div>
            <div className="mt-2 font-bold">
              {formatDate(tripDetail.start_date)} to{" "}
              {formatDate(tripDetail.end_date)}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Wallet className="h-4 w-4" />
              Budget
            </div>
            <div className="mt-2 font-bold">
              {formatCurrency(tripDetail.total_budget, currency)}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-500">Spent</div>
            <div className="mt-2 font-bold">
              {formatCurrency(spent / 100, currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
                Trip expenses
              </h2>
              <p className="text-sm text-gray-500">
                Costs logged against this itinerary.
              </p>
            </div>
            <AddExpenseModal
              trips={[{ id: tripDetail.id, destination: tripDetail.destination }]}
              defaultTripId={tripDetail.id}
            />
          </div>

          <div className="mt-5 space-y-3">
            {expenseRows.length > 0 ? (
              expenseRows.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div>
                    <div className="font-bold">{expense.name}</div>
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
              <div className="rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3] p-8 text-center text-gray-500">
                No expenses logged for this trip.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            Itinerary
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Daily planning arrives in the next phase.
          </p>
          <div className="mt-5 h-56 rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3]" />
        </section>
      </div>
    </div>
  );
}
