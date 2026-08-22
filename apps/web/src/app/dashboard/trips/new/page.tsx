import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { createTrip } from "@/app/dashboard/actions";

type NewTripPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewTripPage({ searchParams }: NewTripPageProps) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/trips"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[var(--primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to trips
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-5">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
            New Trip
          </h1>
          <p className="mt-1 text-gray-500">
            Set the core details for your next destination.
          </p>
        </div>

        <form action={createTrip} className="space-y-5 p-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error === "destination"
                ? "Destination is required."
                : decodeURIComponent(error)}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="destination"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Destination
            </label>
            <input
              id="destination"
              name="destination"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
              placeholder="Goa winter escape"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="city"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                City
              </label>
              <input
                id="city"
                name="city"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                placeholder="Goa"
              />
            </div>
            <div>
              <label
                htmlFor="country"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Country
              </label>
              <input
                id="country"
                name="country"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                placeholder="India"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="start_date"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Start date
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label
                htmlFor="end_date"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                End date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div>
              <label
                htmlFor="total_budget"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Total budget
              </label>
              <input
                id="total_budget"
                name="total_budget"
                type="number"
                min="0"
                step="1"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                placeholder="25000"
              />
            </div>
            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                defaultValue="INR"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-5">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white"
            >
              <Save className="h-4 w-4" />
              Save trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
