import Link from "next/link";

import HostelCard from "@/components/HostelCard";
import { createClient } from "@/lib/supabase/server";

type HostelsPageProps = {
  searchParams: Promise<{ city?: string; sort?: string }>;
};

type Hostel = {
  id: string;
  name: string;
  city: string;
  country: string;
  price_per_night: number;
  currency: string | null;
  rating: number | null;
  solo_rating: number | null;
  amenities: string[] | null;
  address: string | null;
};

const sortOptions = [
  { value: "solo_rating", label: "Solo rating" },
  { value: "rating", label: "Rating" },
  { value: "price_per_night", label: "Price" },
];

export default async function HostelsPage({ searchParams }: HostelsPageProps) {
  const { city, sort = "solo_rating" } = await searchParams;
  const supabase = await createClient();

  const orderColumn = sortOptions.some((option) => option.value === sort)
    ? sort
    : "solo_rating";

  let query = supabase
    .from("hostels")
    .select("id, name, city, country, price_per_night, currency, rating, solo_rating, amenities, address")
    .order(orderColumn, { ascending: orderColumn === "price_per_night" });

  if (city) {
    query = query.eq("city", city);
  }

  const [{ data: hostelsData }, { data: cityRows }] = await Promise.all([
    query,
    supabase.from("hostels").select("city").order("city", { ascending: true }),
  ]);

  const hostels = (hostelsData ?? []) as Hostel[];
  const cities = Array.from(
    new Set(((cityRows ?? []) as { city: string }[]).map((row) => row.city)),
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
          Hostels
        </h1>
        <p className="mt-1 text-gray-500">
          Browse solo-friendly stays from the seeded hostel database.
        </p>
      </div>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/hostels?sort=${orderColumn}`}
              className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                !city
                  ? "border-[var(--primary)] bg-orange-50 text-[var(--primary)]"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              All cities
            </Link>
            {cities.map((item) => (
              <Link
                key={item}
                href={`/dashboard/hostels?city=${encodeURIComponent(item)}&sort=${orderColumn}`}
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                  city === item
                    ? "border-[var(--primary)] bg-orange-50 text-[var(--primary)]"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {item}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <Link
                key={option.value}
                href={`/dashboard/hostels?${city ? `city=${encodeURIComponent(city)}&` : ""}sort=${option.value}`}
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                  orderColumn === option.value
                    ? "border-[var(--secondary)] bg-green-50 text-[var(--secondary)]"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hostels.map((hostel) => (
          <HostelCard
            key={hostel.id}
            name={hostel.name}
            city={hostel.city}
            country={hostel.country}
            pricePerNight={hostel.price_per_night}
            currency={hostel.currency}
            rating={hostel.rating}
            soloRating={hostel.solo_rating}
            amenities={hostel.amenities}
            address={hostel.address}
          />
        ))}
      </div>
    </div>
  );
}
