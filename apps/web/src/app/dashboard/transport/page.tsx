import { Bus, ExternalLink, IndianRupee, MapPin } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type TransportOption = {
  id: string;
  city: string;
  country: string;
  transport_type: string;
  provider_name: string | null;
  avg_cost_inr: number | null;
  avg_cost_usd: number | null;
  unit: string | null;
  booking_method: string | null;
  app_link: string | null;
  notes: string | null;
};

export default async function TransportPage() {
  let transportData: unknown[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("transport_options")
      .select("id, city, country, transport_type, provider_name, avg_cost_inr, avg_cost_usd, unit, booking_method, app_link, notes")
      .order("city", { ascending: true })
      .order("transport_type", { ascending: true });

    transportData = data ?? [];
  } catch {
    // Supabase fallback
  }

  const fallbackTransport: TransportOption[] = [
    {
      id: "tr-1",
      city: "Manali",
      country: "India",
      transport_type: "Local Bus (HRTC)",
      provider_name: "Himachal Road Transport",
      avg_cost_inr: 50,
      avg_cost_usd: 0.6,
      unit: "per ride",
      booking_method: "On-bus conductor",
      app_link: "https://hrtchp.com",
      notes: "Most affordable transit connecting Manali, Solang Valley, and Kullu.",
    },
    {
      id: "tr-2",
      city: "Manali",
      country: "India",
      transport_type: "Shared Jeep / Taxi",
      provider_name: "Himachal Taxi Union",
      avg_cost_inr: 450,
      avg_cost_usd: 5.4,
      unit: "per seat",
      booking_method: "Mall Road Taxi Stand",
      app_link: null,
      notes: "Reliable mountain driving for Atal Tunnel and Rohtang Pass routes.",
    },
  ];

  const options = (transportData.length > 0 ? transportData : fallbackTransport) as TransportOption[];
  const grouped = options.reduce<Record<string, TransportOption[]>>(
    (groups, option) => {
      const key = `${option.city}, ${option.country}`;
      groups[key] = groups[key] ?? [];
      groups[key].push(option);
      return groups;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
          Transport
        </h1>
        <p className="mt-1 text-gray-500">
          Compare local transport costs and booking methods by city.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {Object.entries(grouped).map(([city, cityOptions]) => (
          <section
            key={city}
            className="rounded-lg border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
                {city}
              </h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cityOptions.map((option) => (
                <article
                  key={option.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{option.transport_type}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {option.provider_name || "Local provider"}
                      </p>
                    </div>
                    <Bus className="h-5 w-5 text-[var(--secondary)]" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-[#F5F5F3] p-3">
                      <div className="flex items-center gap-1 text-gray-500">
                        <IndianRupee className="h-4 w-4" />
                        Cost
                      </div>
                      <div className="mt-1 font-bold">
                        {option.avg_cost_inr
                          ? `INR ${option.avg_cost_inr}`
                          : "Check local"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {option.unit || "per ride"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#F5F5F3] p-3">
                      <div className="text-gray-500">Booking</div>
                      <div className="mt-1 font-bold">
                        {option.booking_method || "Local"}
                      </div>
                    </div>
                  </div>

                  {option.notes ? (
                    <p className="mt-4 text-sm text-gray-500">{option.notes}</p>
                  ) : null}

                  {option.app_link ? (
                    <a
                      href={option.app_link}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]"
                    >
                      Open booking app
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}

        {options.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
            <Bus className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-4 text-xl font-bold">No transport data yet</h2>
            <p className="mt-2 text-gray-500">
              Seeded city transport options will appear here.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
