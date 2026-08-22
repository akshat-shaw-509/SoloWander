import Link from "next/link";
import { CheckCircle2, Circle, PackageCheck, Plus, Trash2 } from "lucide-react";

import {
  addPackingItem,
  deletePackingItem,
  togglePackingItem,
} from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";

type PackingPageProps = {
  searchParams: Promise<{ tripId?: string }>;
};

type TripOption = {
  id: string;
  destination: string;
  city: string | null;
  country: string | null;
};

type PackingList = {
  id: string;
  trip_id: string;
  items: unknown;
};

type PackingItem = {
  id: string;
  label: string;
  isPacked: boolean;
};

function normalizeItems(value: unknown): PackingItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("id" in item) ||
        !("label" in item) ||
        typeof item.id !== "string" ||
        typeof item.label !== "string"
      ) {
        return null;
      }

      return {
        id: item.id,
        label: item.label,
        isPacked:
          "isPacked" in item && typeof item.isPacked === "boolean"
            ? item.isPacked
            : false,
      };
    })
    .filter((item): item is PackingItem => Boolean(item));
}

export default async function PackingPage({ searchParams }: PackingPageProps) {
  const { tripId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tripsData } = await supabase
    .from("trips")
    .select("id, destination, city, country")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  const trips = (tripsData ?? []) as TripOption[];
  const selectedTrip =
    trips.find((trip) => trip.id === tripId) ?? trips[0] ?? null;

  const { data: packingListData } = selectedTrip
    ? await supabase
        .from("packing_lists")
        .select("id, trip_id, items")
        .eq("user_id", user?.id)
        .eq("trip_id", selectedTrip.id)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const packingList = packingListData as PackingList | null;
  const items = normalizeItems(packingList?.items);
  const packedCount = items.filter((item) => item.isPacked).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
          Packing
        </h1>
        <p className="mt-1 text-gray-500">
          Build trip-specific checklists and mark items as packed.
        </p>
      </div>

      {trips.length > 0 && selectedTrip ? (
        <>
          <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {trips.map((trip) => (
                  <Link
                    key={trip.id}
                    href={`/dashboard/packing?tripId=${trip.id}`}
                    className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                      selectedTrip.id === trip.id
                        ? "border-[var(--primary)] bg-orange-50 text-[var(--primary)]"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {trip.destination}
                  </Link>
                ))}
              </div>

              <div className="text-sm font-semibold text-gray-500">
                {packedCount} of {items.length} packed
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
                    {selectedTrip.destination}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {[selectedTrip.city, selectedTrip.country]
                      .filter(Boolean)
                      .join(", ") || "Location details pending"}
                  </p>
                </div>
                <PackageCheck className="h-5 w-5 text-[var(--secondary)]" />
              </div>

              <div className="mt-5 space-y-3">
                {items.length > 0 ? (
                  items.map((item) => {
                    const ToggleIcon = item.isPacked ? CheckCircle2 : Circle;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
                      >
                        <form action={togglePackingItem} className="min-w-0 flex-1">
                          <input
                            type="hidden"
                            name="list_id"
                            value={packingList?.id}
                          />
                          <input type="hidden" name="item_id" value={item.id} />
                          <button
                            type="submit"
                            className="flex min-w-0 items-center gap-3 text-left"
                          >
                            <ToggleIcon
                              className={`h-5 w-5 shrink-0 ${
                                item.isPacked
                                  ? "text-[var(--secondary)]"
                                  : "text-gray-400"
                              }`}
                            />
                            <span
                              className={`truncate font-semibold ${
                                item.isPacked
                                  ? "text-gray-400 line-through"
                                  : "text-[var(--dark)]"
                              }`}
                            >
                              {item.label}
                            </span>
                          </button>
                        </form>

                        <form action={deletePackingItem}>
                          <input
                            type="hidden"
                            name="list_id"
                            value={packingList?.id}
                          />
                          <input type="hidden" name="item_id" value={item.id} />
                          <button
                            type="submit"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${item.label}`}
                            title={`Remove ${item.label}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3] p-8 text-center">
                    <PackageCheck className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-3 font-bold">No items yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Add essentials, documents, chargers, and city-specific gear.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
                Add item
              </h2>
              <form action={addPackingItem} className="mt-5 space-y-4">
                <input type="hidden" name="trip_id" value={selectedTrip.id} />
                <div>
                  <label
                    htmlFor="label"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Item
                  </label>
                  <input
                    id="label"
                    name="label"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                    placeholder="Passport, padlock, power bank"
                  />
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add to checklist
                </button>
              </form>
            </section>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <PackageCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-xl font-bold">No trips to pack for</h2>
          <p className="mt-2 text-gray-500">
            Create a trip first, then build a checklist for it.
          </p>
          <Link
            href="/dashboard/trips/new"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Create trip
          </Link>
        </div>
      )}
    </div>
  );
}
