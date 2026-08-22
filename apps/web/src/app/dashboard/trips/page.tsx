import Link from "next/link";
import { Compass, Plus } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import TripCard from "@/components/TripCard";
import { createClient } from "@/lib/supabase/server";

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

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("trips")
    .select("id, destination, city, country, start_date, end_date, total_budget, currency")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  const trips = (data ?? []) as Trip[];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
            Trips
          </h1>
          <p className="mt-1 text-gray-500">
            Plan routes, dates, and budgets for each solo adventure.
          </p>
        </div>
        <Link
          href="/dashboard/trips/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          New Trip
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <TripCard
              key={trip.id}
              id={trip.id}
              destination={trip.destination}
              city={trip.city}
              country={trip.country}
              startDate={trip.start_date}
              endDate={trip.end_date}
              totalBudget={trip.total_budget}
              currency={trip.currency}
            />
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState
              icon={Compass}
              title="No trips yet"
              description="Start with a destination, dates, and a budget."
            >
            <Link
              href="/dashboard/trips/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Create trip
            </Link>
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
