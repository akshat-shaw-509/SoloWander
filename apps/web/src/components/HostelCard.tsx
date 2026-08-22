import { BedDouble, IndianRupee, MapPin, Star } from "lucide-react";

type HostelCardProps = {
  name: string;
  city: string;
  country: string;
  pricePerNight: number;
  currency?: string | null;
  rating?: number | null;
  soloRating?: number | null;
  amenities?: string[] | null;
  address?: string | null;
};

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function HostelCard({
  name,
  city,
  country,
  pricePerNight,
  currency,
  rating,
  soloRating,
  amenities,
  address,
}: HostelCardProps) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{name}</h2>
          <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            {city}, {country}
          </div>
        </div>
        <BedDouble className="h-5 w-5 text-[var(--primary)]" />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-[#F5F5F3] p-3">
          <div className="flex items-center gap-1 text-gray-500">
            <IndianRupee className="h-4 w-4" />
            Night
          </div>
          <div className="mt-1 font-bold">
            {formatCurrency(pricePerNight, currency || "INR")}
          </div>
        </div>
        <div className="rounded-lg bg-[#F5F5F3] p-3">
          <div className="flex items-center gap-1 text-gray-500">
            <Star className="h-4 w-4" />
            Rating
          </div>
          <div className="mt-1 font-bold">{rating ?? "NA"}</div>
        </div>
        <div className="rounded-lg bg-[#F5F5F3] p-3">
          <div className="text-gray-500">Solo</div>
          <div className="mt-1 font-bold">{soloRating ?? "NA"}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(amenities ?? []).map((amenity) => (
          <span
            key={amenity}
            className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[var(--primary)]"
          >
            {amenity}
          </span>
        ))}
      </div>

      {address ? <p className="mt-4 text-sm text-gray-500">{address}</p> : null}
    </article>
  );
}
