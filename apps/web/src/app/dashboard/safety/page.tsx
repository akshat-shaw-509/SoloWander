import Link from "next/link";
import {
  Ambulance,
  BadgeCheck,
  CircleDot,
  Flame,
  MapPin,
  Phone,
  QrCode,
  Radar,
  Shield,
  ShieldAlert,
  Siren,
} from "lucide-react";

import {
  endSafetySession,
  saveSafetyProfile,
  startSafetySession,
} from "@/app/dashboard/actions";
import SafetyRealtime from "@/components/SafetyRealtime";
import TouristSafetyControls from "@/components/TouristSafetyControls";
import { createClient } from "@/lib/supabase/server";

type SafetyPageProps = {
  searchParams: Promise<{ country?: string; error?: string; updated?: string }>;
};

type EmergencyContact = {
  id: string;
  country: string;
  country_code: string;
  police: string | null;
  ambulance: string | null;
  fire: string | null;
  tourist_helpline: string | null;
  women_helpline: string | null;
};

type TouristSafetyProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_group: string | null;
  medical_notes: string | null;
  home_country: string | null;
  digital_id_code: string;
  is_location_sharing_enabled: boolean | null;
};

type TripOption = {
  id: string;
  destination: string;
};

type SafetySession = {
  id: string;
  trip_id: string | null;
  risk_level: string | null;
  started_at: string | null;
  last_lat: number | string | null;
  last_lng: number | string | null;
  last_check_in_at: string | null;
  last_geofence_zone_id: string | null;
};

type SafetyIncident = {
  id: string;
  incident_type: string;
  severity: string;
  status: string;
  description: string | null;
  ai_summary: string | null;
  created_at: string | null;
  location_source: string | null;
  location_timestamp: string | null;
  location_confidence: number | string | null;
  sync_status: string | null;
};

type GeofenceZone = {
  id: string;
  name: string;
  zone_type: string;
  severity: string;
  city: string | null;
  state: string | null;
  radius_meters: number;
  safety_message: string;
};

type LocationPing = {
  id: string;
  lat: number | string;
  lng: number | string;
  accuracy_meters: number | string | null;
  created_at: string | null;
};

const contactFields = [
  { key: "police", label: "Police", icon: Shield },
  { key: "ambulance", label: "Ambulance", icon: Ambulance },
  { key: "fire", label: "Fire", icon: Flame },
  { key: "tourist_helpline", label: "Tourist helpline", icon: Phone },
  { key: "women_helpline", label: "Women helpline", icon: ShieldAlert },
] as const;

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function riskClasses(risk?: string | null) {
  if (risk === "red") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (risk === "orange") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (risk === "yellow") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
}

function locationLabel(source?: string | null) {
  if (source === "CURRENT_GPS") {
    return "LIVE LOCATION";
  }

  if (source === "LAST_KNOWN") {
    return "LAST KNOWN LOCATION";
  }

  return "LOCATION UNAVAILABLE";
}

function DigitalIdPattern({ code }: { code: string }) {
  const cells = Array.from({ length: 49 }, (_, index) => {
    const charCode = code.charCodeAt(index % code.length);
    return (charCode + index * 7) % 3 !== 0;
  });

  return (
    <div
      className="grid h-28 w-28 grid-cols-7 gap-1 rounded-lg border border-gray-200 bg-white p-2"
      aria-label={`Digital ID code ${code}`}
    >
      {cells.map((filled, index) => (
        <div
          key={index}
          className={`rounded-sm ${filled ? "bg-[var(--dark)]" : "bg-gray-100"}`}
        />
      ))}
    </div>
  );
}

export default async function SafetyPage({ searchParams }: SafetyPageProps) {
  const { country, error, updated } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profileData },
    { data: tripsData },
    { data: sessionData },
    { data: incidentsData },
    { data: pingsData },
    { data: zonesData },
    { data: contactsData },
  ] = await Promise.all([
    supabase
      .from("tourist_safety_profiles")
      .select("id, full_name, phone, emergency_contact_name, emergency_contact_phone, blood_group, medical_notes, home_country, digital_id_code, is_location_sharing_enabled")
      .eq("user_id", user?.id)
      .maybeSingle(),
    supabase
      .from("trips")
      .select("id, destination")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("safety_sessions")
      .select("id, trip_id, risk_level, started_at, last_lat, last_lng, last_check_in_at, last_geofence_zone_id")
      .eq("user_id", user?.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("safety_incidents")
      .select("id, incident_type, severity, status, description, ai_summary, created_at, location_source, location_timestamp, location_confidence, sync_status")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("location_pings")
      .select("id, lat, lng, accuracy_meters, created_at")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("geofence_zones")
      .select("id, name, zone_type, severity, city, state, radius_meters, safety_message")
      .eq("is_active", true)
      .order("severity", { ascending: true }),
    supabase
      .from("emergency_contacts")
      .select("id, country, country_code, police, ambulance, fire, tourist_helpline, women_helpline")
      .order("country", { ascending: true }),
  ]);

  const profile = profileData as TouristSafetyProfile | null;
  const trips = (tripsData ?? []) as TripOption[];
  const activeSession = sessionData as SafetySession | null;
  const incidents = (incidentsData ?? []) as SafetyIncident[];
  const pings = (pingsData ?? []) as LocationPing[];
  const zones = (zonesData ?? []) as GeofenceZone[];
  const contacts = (contactsData ?? []) as EmergencyContact[];
  const activeTrip = trips.find((trip) => trip.id === activeSession?.trip_id);
  const activeZone = zones.find(
    (zone) => zone.id === activeSession?.last_geofence_zone_id,
  );
  const countries = contacts.map((contact) => contact.country);
  const selectedCountry = country || countries[0];
  const selectedContacts = selectedCountry
    ? contacts.filter((contact) => contact.country === selectedCountry)
    : contacts;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
            Tourist Safety App
          </h1>
          <p className="mt-1 max-w-3xl text-gray-500">
            Digital ID, consented monitoring, geofence alerts, SOS reporting, and
            emergency contacts for safer regional travel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SafetyRealtime
            channelName={`tourist-safety-${user?.id || "guest"}`}
            tables={[
              "safety_sessions",
              "location_pings",
              "geofence_events",
              "safety_incidents",
              "safety_incident_updates",
            ]}
          />
          <div
            className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${riskClasses(activeSession?.risk_level)}`}
          >
            <CircleDot className="h-4 w-4" />
            {activeSession ? `${activeSession.risk_level || "green"} risk` : "offline"}
          </div>
        </div>
      </div>

      {updated ? (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Safety system updated: {updated}.
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error === "location"
            ? "Location is required for check-in. Allow browser location access and try again."
            : "Complete the required safety details before continuing."}
        </div>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
              Digital Tourist ID
            </h2>
          </div>

          {profile ? (
            <div className="mt-5 grid gap-5 md:grid-cols-[140px_1fr]">
              <DigitalIdPattern code={profile.digital_id_code} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[var(--dark)] px-3 py-1 text-sm font-bold text-white">
                    {profile.digital_id_code}
                  </span>
                  <span className="rounded-lg bg-green-50 px-3 py-1 text-sm font-bold text-green-700">
                    Verified tourist profile
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-bold">{profile.full_name}</h3>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-[#F5F5F3] p-3">
                    <div className="font-semibold text-gray-500">Phone</div>
                    <div className="mt-1 font-bold">
                      {profile.phone || "Not added"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#F5F5F3] p-3">
                    <div className="font-semibold text-gray-500">
                      Emergency contact
                    </div>
                    <div className="mt-1 font-bold">
                      {profile.emergency_contact_name || "Not added"}
                    </div>
                    <div className="text-gray-500">
                      {profile.emergency_contact_phone || ""}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#F5F5F3] p-3">
                    <div className="font-semibold text-gray-500">Blood group</div>
                    <div className="mt-1 font-bold">
                      {profile.blood_group || "Not added"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#F5F5F3] p-3">
                    <div className="font-semibold text-gray-500">Consent</div>
                    <div className="mt-1 font-bold">
                      {profile.is_location_sharing_enabled
                        ? "Location sharing on"
                        : "Location sharing off"}
                    </div>
                  </div>
                </div>
                {profile.medical_notes ? (
                  <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                    {profile.medical_notes}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3] p-6 text-sm text-gray-600">
              Create your tourist safety profile to generate a Digital ID.
            </div>
          )}

          <form
            action={saveSafetyProfile}
            className="mt-6 space-y-4 border-t border-gray-100 pt-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="full_name"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Full name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  required
                  defaultValue={profile?.full_name || ""}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="Traveller name"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  defaultValue={profile?.phone || ""}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="+91..."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="emergency_contact_name"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Emergency contact name
                </label>
                <input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  defaultValue={profile?.emergency_contact_name || ""}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="Parent, friend, local guide"
                />
              </div>
              <div>
                <label
                  htmlFor="emergency_contact_phone"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Emergency contact phone
                </label>
                <input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  defaultValue={profile?.emergency_contact_phone || ""}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="+91..."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_160px]">
              <div>
                <label
                  htmlFor="blood_group"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Blood group
                </label>
                <input
                  id="blood_group"
                  name="blood_group"
                  defaultValue={profile?.blood_group || ""}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="O+"
                />
              </div>
              <div>
                <label
                  htmlFor="home_country"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Home country
                </label>
                <input
                  id="home_country"
                  name="home_country"
                  defaultValue={profile?.home_country || "IN"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="IN"
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-gray-700">
                <input
                  name="is_location_sharing_enabled"
                  type="checkbox"
                  defaultChecked={profile?.is_location_sharing_enabled ?? true}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Share location
              </label>
            </div>

            <div>
              <label
                htmlFor="medical_notes"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Medical notes
              </label>
              <textarea
                id="medical_notes"
                name="medical_notes"
                rows={3}
                defaultValue={profile?.medical_notes || ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                placeholder="Allergies, medication, accessibility needs..."
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white"
            >
              <QrCode className="h-4 w-4" />
              Save Digital ID
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
                  Safety Monitoring
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Active session for consented telemetry and alerts.
                </p>
              </div>
              <Radar className="h-5 w-5 text-[var(--secondary)]" />
            </div>

            {activeSession ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-lg bg-[#F5F5F3] p-4">
                  <div className="text-sm font-semibold text-gray-500">
                    Session active
                  </div>
                  <div className="mt-1 font-bold">
                    {activeTrip?.destination || "No trip linked"}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Started {formatDateTime(activeSession.started_at)}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm font-semibold text-gray-500">
                    Last check-in
                  </div>
                  <div className="mt-1 font-bold">
                    {formatDateTime(activeSession.last_check_in_at)}
                  </div>
                  {activeSession.last_lat && activeSession.last_lng ? (
                    <div className="mt-1 text-sm text-gray-500">
                      {Number(activeSession.last_lat).toFixed(4)},{" "}
                      {Number(activeSession.last_lng).toFixed(4)}
                    </div>
                  ) : null}
                </div>
                {activeZone ? (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800">
                    <div className="font-bold">{activeZone.name}</div>
                    <p className="mt-1 text-sm">{activeZone.safety_message}</p>
                  </div>
                ) : null}
                <form action={endSafetySession}>
                  <input
                    type="hidden"
                    name="session_id"
                    value={activeSession.id}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    End monitoring
                  </button>
                </form>
              </div>
            ) : (
              <form action={startSafetySession} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="trip_id"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Link trip
                  </label>
                  <select
                    id="trip_id"
                    name="trip_id"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="">No trip</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.destination}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={!profile}
                  className="w-full rounded-lg bg-[var(--secondary)] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Start monitoring
                </button>
              </form>
            )}
          </div>

          <TouristSafetyControls
            sessionId={activeSession?.id}
            tripId={activeSession?.trip_id}
            emergencyContactName={profile?.emergency_contact_name}
            emergencyContactPhone={profile?.emergency_contact_phone}
            emergencyCallNumber={
              selectedContacts[0]?.police ||
              selectedContacts[0]?.tourist_helpline ||
              selectedContacts[0]?.ambulance
            }
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            Incident Response Feed
          </h2>
          <div className="mt-5 space-y-3">
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <article
                  key={incident.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase text-gray-500">
                        <span>{incident.incident_type}</span>
                        <span>{formatDateTime(incident.created_at)}</span>
                      </div>
                      <h3 className="mt-2 font-bold">
                        {incident.ai_summary || "Incident reported"}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                        {incident.severity}
                      </span>
                      <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {incident.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-lg bg-gray-100 px-3 py-1 text-gray-700">
                      {locationLabel(incident.location_source)}
                    </span>
                    <span className="rounded-lg bg-blue-50 px-3 py-1 text-blue-700">
                      Confidence{" "}
                      {Math.round(Number(incident.location_confidence || 0) * 100)}
                      %
                    </span>
                    <span className="rounded-lg bg-gray-100 px-3 py-1 text-gray-700">
                      {incident.sync_status || "SENT"}
                    </span>
                  </div>
                  {incident.location_source === "LAST_KNOWN" ? (
                    <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2 text-sm font-semibold text-orange-800">
                      Last confirmed location — not your current live position.
                    </p>
                  ) : null}
                  {incident.description ? (
                    <p className="mt-3 text-sm text-gray-600">
                      {incident.description}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3] p-8 text-center">
                <Siren className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-3 font-bold">No incidents reported</h3>
                <p className="mt-1 text-sm text-gray-500">
                  SOS events will appear here with triage and response status.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            Visitor Telemetry
          </h2>
          <div className="mt-5 space-y-3">
            {pings.length > 0 ? (
              pings.map((ping) => (
                <div key={ping.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                    <MapPin className="h-4 w-4" />
                    {formatDateTime(ping.created_at)}
                  </div>
                  <div className="mt-2 font-bold">
                    {Number(ping.lat).toFixed(4)}, {Number(ping.lng).toFixed(4)}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Accuracy: {ping.accuracy_meters || "unknown"} m
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                Check-ins create consented telemetry records for safety review.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
          Northeast Geofence Intelligence
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {zones.map((zone) => (
            <article key={zone.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{zone.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {[zone.city, zone.state].filter(Boolean).join(", ")}
                  </p>
                </div>
                <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">
                  {zone.severity}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                {zone.safety_message}
              </p>
              <div className="mt-3 text-xs font-semibold uppercase text-gray-500">
                {zone.zone_type} radius {zone.radius_meters}m
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
          Emergency Numbers
        </h2>

        {contacts.length > 0 ? (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              {countries.map((item) => (
                <Link
                  key={item}
                  href={`/dashboard/safety?country=${encodeURIComponent(item)}`}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                    selectedCountry === item
                      ? "border-[var(--primary)] bg-orange-50 text-[var(--primary)]"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {item}
                </Link>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selectedContacts.map((contact) => (
                <article
                  key={contact.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold">{contact.country}</h3>
                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        {contact.country_code}
                      </p>
                    </div>
                    <ShieldAlert className="h-5 w-5 text-[var(--primary)]" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {contactFields.map((field) => {
                      const Icon = field.icon;
                      const value = contact[field.key];

                      return (
                        <div
                          key={field.key}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                            <Icon className="h-4 w-4 text-gray-400" />
                            {field.label}
                          </div>
                          <div className="font-bold">{value || "Not listed"}</div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3] p-8 text-center text-gray-500">
            Seed emergency contacts to enable country lookups.
          </div>
        )}
      </section>
    </div>
  );
}
