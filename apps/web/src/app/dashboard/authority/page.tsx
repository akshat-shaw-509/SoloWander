import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDot,
  MapPin,
  Plus,
  Radio,
  ShieldAlert,
  Users,
} from "lucide-react";

import {
  assignIncidentResponder,
  createAuthorityGeofence,
  createAuthorityResponder,
  saveAuthorityProfile,
  updateIncidentResponse,
} from "@/app/dashboard/actions";
import SafetyRealtime from "@/components/SafetyRealtime";
import { createClient } from "@/lib/supabase/server";

type AuthorityPageProps = {
  searchParams: Promise<{ error?: string; updated?: string }>;
};

type AuthorityProfile = {
  id: string;
  operator_name: string;
  department: string;
  jurisdiction: string;
  control_room_phone: string | null;
};

type Incident = {
  id: string;
  client_sos_id: string | null;
  user_id: string;
  incident_type: string;
  severity: string;
  status: string;
  description: string | null;
  lat: number | string | null;
  lng: number | string | null;
  ai_summary: string | null;
  created_at: string | null;
  response_priority: string | null;
  assigned_responder_id: string | null;
  location_source: string | null;
  location_timestamp: string | null;
  location_confidence: number | string | null;
  sync_status: string | null;
  search_area: {
    center?: {
      latitude?: number;
      longitude?: number;
    };
    estimatedRadiusMeters?: number;
    basedOn?: string;
    confidence?: number;
  } | null;
};

type SafetySession = {
  id: string;
  user_id: string;
  risk_level: string | null;
  started_at: string | null;
  last_lat: number | string | null;
  last_lng: number | string | null;
  last_check_in_at: string | null;
};

type TouristProfile = {
  user_id: string;
  full_name: string;
  phone: string | null;
  digital_id_code: string;
  emergency_contact_phone: string | null;
};

type Responder = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  base_city: string | null;
  status: string;
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
  user_id: string;
  lat: number | string;
  lng: number | string;
  created_at: string | null;
};

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

function severityClasses(severity?: string | null) {
  if (severity === "critical") {
    return "bg-red-600 text-white";
  }

  if (severity === "high") {
    return "bg-red-50 text-red-700";
  }

  if (severity === "medium") {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-green-50 text-green-700";
}

function statusClasses(status?: string | null) {
  if (status === "resolved") {
    return "bg-green-50 text-green-700";
  }

  if (status === "dispatched") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "acknowledged") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-red-50 text-red-700";
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

function locationClasses(source?: string | null) {
  if (source === "CURRENT_GPS") {
    return "bg-green-50 text-green-700";
  }

  if (source === "LAST_KNOWN") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-gray-100 text-gray-700";
}

export default async function AuthorityPage({
  searchParams,
}: AuthorityPageProps) {
  const { error, updated } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: authorityData } = await supabase
    .from("authority_profiles")
    .select("id, operator_name, department, jurisdiction, control_room_phone")
    .eq("user_id", user?.id)
    .maybeSingle();

  const authority = authorityData as AuthorityProfile | null;

  if (!authority) {
    return (
      <div className="mx-auto max-w-3xl">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
            Authority Command Dashboard
          </h1>
          <p className="mt-1 text-gray-500">
            Create an operator profile to unlock incident response, geofence
            control, and regional visitor telemetry.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Operator name is required.
          </div>
        ) : null}

        <section className="mt-6 rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
                Control Room Setup
              </h2>
            </div>
          </div>

          <form action={saveAuthorityProfile} className="space-y-5 p-5">
            <div>
              <label
                htmlFor="operator_name"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Operator name
              </label>
              <input
                id="operator_name"
                name="operator_name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                placeholder="District safety officer"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="department"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Department
                </label>
                <input
                  id="department"
                  name="department"
                  defaultValue="Tourism Safety Cell"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label
                  htmlFor="jurisdiction"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Jurisdiction
                </label>
                <input
                  id="jurisdiction"
                  name="jurisdiction"
                  defaultValue="Northeast India"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="control_room_phone"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Control room phone
              </label>
              <input
                id="control_room_phone"
                name="control_room_phone"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                placeholder="+91..."
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white"
            >
              Activate command dashboard
            </button>
          </form>
        </section>
      </div>
    );
  }

  const [
    { data: incidentsData },
    { data: sessionsData },
    { data: profilesData },
    { data: respondersData },
    { data: zonesData },
    { data: pingsData },
  ] = await Promise.all([
    supabase
      .from("safety_incidents")
      .select("id, client_sos_id, user_id, incident_type, severity, status, description, lat, lng, ai_summary, created_at, response_priority, assigned_responder_id, location_source, location_timestamp, location_confidence, sync_status, search_area")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("safety_sessions")
      .select("id, user_id, risk_level, started_at, last_lat, last_lng, last_check_in_at")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(25),
    supabase
      .from("tourist_safety_profiles")
      .select("user_id, full_name, phone, digital_id_code, emergency_contact_phone"),
    supabase
      .from("authority_responders")
      .select("id, name, role, phone, base_city, status")
      .eq("authority_user_id", user?.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("geofence_zones")
      .select("id, name, zone_type, severity, city, state, radius_meters, safety_message")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("location_pings")
      .select("id, user_id, lat, lng, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const incidents = (incidentsData ?? []) as Incident[];
  const sessions = (sessionsData ?? []) as SafetySession[];
  const profiles = (profilesData ?? []) as TouristProfile[];
  const responders = (respondersData ?? []) as Responder[];
  const zones = (zonesData ?? []) as GeofenceZone[];
  const pings = (pingsData ?? []) as LocationPing[];
  const openIncidents = incidents.filter((incident) =>
    ["reported", "acknowledged", "dispatched"].includes(incident.status),
  );
  const criticalIncidents = openIncidents.filter(
    (incident) => incident.severity === "critical",
  );
  const availableResponders = responders.filter(
    (responder) => responder.status === "available",
  );

  function profileFor(userId: string) {
    return profiles.find((profile) => profile.user_id === userId);
  }

  function responderFor(responderId?: string | null) {
    return responders.find((responder) => responder.id === responderId);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
            Authority Command Dashboard
          </h1>
          <p className="mt-1 text-gray-500">
            {authority.department} - {authority.jurisdiction}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SafetyRealtime
            channelName={`authority-command-${user?.id || "guest"}`}
            tables={[
              "safety_incidents",
              "safety_incident_updates",
              "safety_sessions",
              "location_pings",
              "authority_responders",
              "geofence_zones",
            ]}
            notifyIncidents
          />
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
            <div className="font-bold">{authority.operator_name}</div>
            <div className="text-gray-500">
              {authority.control_room_phone || "Control room phone pending"}
            </div>
          </div>
        </div>
      </div>

      {updated ? (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Command dashboard updated: {updated}.
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Some required command-center details were missing.
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Open incidents
            </span>
            <ShieldAlert className="h-5 w-5 text-red-600" />
          </div>
          <div className="mt-4 text-3xl font-bold">{openIncidents.length}</div>
          <p className="mt-1 text-sm text-gray-500">
            {criticalIncidents.length} critical
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Active tourists
            </span>
            <Radio className="h-5 w-5 text-[var(--secondary)]" />
          </div>
          <div className="mt-4 text-3xl font-bold">{sessions.length}</div>
          <p className="mt-1 text-sm text-gray-500">Consented sessions</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Responders
            </span>
            <Users className="h-5 w-5 text-[var(--info)]" />
          </div>
          <div className="mt-4 text-3xl font-bold">{availableResponders.length}</div>
          <p className="mt-1 text-sm text-gray-500">Available now</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">
              Geofences
            </span>
            <MapPin className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div className="mt-4 text-3xl font-bold">{zones.length}</div>
          <p className="mt-1 text-sm text-gray-500">Active risk zones</p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            Incident Response Board
          </h2>

          <div className="mt-5 space-y-4">
            {incidents.length > 0 ? (
              incidents.map((incident) => {
                const tourist = profileFor(incident.user_id);
                const responder = responderFor(incident.assigned_responder_id);

                return (
                  <article
                    key={incident.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase text-gray-500">
                          <span>
                            {incident.incident_type === "sos"
                              ? "EMERGENCY SOS"
                              : incident.incident_type}
                          </span>
                          <span>{formatDateTime(incident.created_at)}</span>
                          <span>{incident.response_priority || "P2"}</span>
                          <span>{incident.sync_status || "SENT"}</span>
                        </div>
                        <h3 className="mt-2 font-bold">
                          {incident.ai_summary || "Incident reported"}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {tourist
                            ? `${tourist.full_name} - ${tourist.digital_id_code}`
                            : "Tourist profile unavailable"}
                        </p>
                        {incident.lat && incident.lng ? (
                          <p className="mt-1 text-sm text-gray-500">
                            {Number(incident.lat).toFixed(4)},{" "}
                            {Number(incident.lng).toFixed(4)}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                          <span
                            className={`rounded-lg px-3 py-1 ${locationClasses(incident.location_source)}`}
                          >
                            {locationLabel(incident.location_source)}
                          </span>
                          <span className="rounded-lg bg-blue-50 px-3 py-1 text-blue-700">
                            Confidence{" "}
                            {Math.round(Number(incident.location_confidence || 0) * 100)}
                            %
                          </span>
                          <span className="rounded-lg bg-gray-100 px-3 py-1 text-gray-700">
                            {formatDateTime(incident.location_timestamp)}
                          </span>
                        </div>
                        {incident.location_source === "LAST_KNOWN" ? (
                          <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2 text-sm font-semibold text-orange-800">
                            Last confirmed location, not the current live
                            position.
                          </p>
                        ) : null}
                        {incident.location_source === "UNAVAILABLE" ? (
                          <p className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm font-semibold text-gray-700">
                            Location unavailable at the time this SOS was
                            submitted.
                          </p>
                        ) : null}
                        {incident.search_area?.estimatedRadiusMeters &&
                        incident.search_area.center?.latitude &&
                        incident.search_area.center?.longitude ? (
                          <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-sm font-semibold text-blue-800">
                            Estimated search area, not confirmed location:
                            radius about{" "}
                            {incident.search_area.estimatedRadiusMeters}m from{" "}
                            {incident.search_area.center.latitude.toFixed(4)},{" "}
                            {incident.search_area.center.longitude.toFixed(4)}.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${severityClasses(incident.severity)}`}
                        >
                          {incident.severity}
                        </span>
                        <span
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${statusClasses(incident.status)}`}
                        >
                          {incident.status}
                        </span>
                      </div>
                    </div>

                    {incident.description ? (
                      <p className="mt-3 text-sm text-gray-600">
                        {incident.description}
                      </p>
                    ) : null}

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <form
                        action={assignIncidentResponder}
                        className="rounded-lg bg-[#F5F5F3] p-3"
                      >
                        <input
                          type="hidden"
                          name="incident_id"
                          value={incident.id}
                        />
                        <div className="grid gap-3 sm:grid-cols-[1fr_90px]">
                          <select
                            name="responder_id"
                            defaultValue={incident.assigned_responder_id || ""}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                          >
                            <option value="">Unassigned</option>
                            {responders.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <select
                            name="response_priority"
                            defaultValue={incident.response_priority || "P2"}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                          >
                            <option value="P1">P1</option>
                            <option value="P2">P2</option>
                            <option value="P3">P3</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="mt-3 w-full rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white"
                        >
                          {responder ? `Assigned to ${responder.name}` : "Assign"}
                        </button>
                      </form>

                      <form
                        action={updateIncidentResponse}
                        className="rounded-lg bg-[#F5F5F3] p-3"
                      >
                        <input
                          type="hidden"
                          name="incident_id"
                          value={incident.id}
                        />
                        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                          <select
                            name="status"
                            defaultValue={incident.status}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                          >
                            <option value="reported">Reported</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="resolved">Resolved</option>
                          </select>
                          <input
                            name="note"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                            placeholder="Control room note"
                          />
                        </div>
                        <button
                          type="submit"
                          className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700"
                        >
                          Update status
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-[#F5F5F3] p-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-3 font-bold">No incidents yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  SOS reports from tourist safety sessions will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
              Add Responder
            </h2>
            <form action={createAuthorityResponder} className="mt-5 space-y-3">
              <input
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                placeholder="Responder name"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="role"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                  placeholder="Police / guide / medic"
                />
                <input
                  name="phone"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                  placeholder="Phone"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="base_city"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                  placeholder="Base city"
                />
                <select
                  name="status"
                  defaultValue="available"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--secondary)] px-4 py-2.5 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Add responder
              </button>
            </form>

            <div className="mt-5 space-y-2">
              {responders.map((responder) => (
                <div
                  key={responder.id}
                  className="rounded-lg border border-gray-200 p-3 text-sm"
                >
                  <div className="font-bold">{responder.name}</div>
                  <div className="text-gray-500">
                    {responder.role} - {responder.base_city || "No base"}
                  </div>
                  <div className="mt-1 font-semibold text-[var(--secondary)]">
                    {responder.status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
              Create Geofence
            </h2>
            <form action={createAuthorityGeofence} className="mt-5 space-y-3">
              <input
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                placeholder="Zone name"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="city"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                  placeholder="City"
                />
                <input
                  name="state"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                  placeholder="State"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  name="center_lat"
                  required
                  type="number"
                  step="0.000001"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                  placeholder="Lat"
                />
                <input
                  name="center_lng"
                  required
                  type="number"
                  step="0.000001"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                  placeholder="Lng"
                />
                <input
                  name="radius_meters"
                  required
                  type="number"
                  min="100"
                  defaultValue="1000"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                  placeholder="Radius"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="zone_type"
                  defaultValue="caution"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                >
                  <option value="caution">Caution</option>
                  <option value="hazard">Hazard</option>
                  <option value="restricted">Restricted</option>
                  <option value="low_network">Low network</option>
                  <option value="route_risk">Route risk</option>
                </select>
                <select
                  name="severity"
                  defaultValue="medium"
                  className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <textarea
                name="safety_message"
                required
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)]"
                placeholder="Alert message shown to tourists entering this zone."
              />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white"
              >
                <AlertTriangle className="h-4 w-4" />
                Publish geofence
              </button>
            </form>
          </section>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            Active Visitor Telemetry
          </h2>
          <div className="mt-5 space-y-3">
            {sessions.map((session) => {
              const tourist = profileFor(session.user_id);

              return (
                <div
                  key={session.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">
                        {tourist?.full_name || "Unknown tourist"}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {tourist?.digital_id_code || "No digital ID"} - check-in{" "}
                        {formatDateTime(session.last_check_in_at)}
                      </div>
                    </div>
                    <span
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${severityClasses(session.risk_level)}`}
                    >
                      {session.risk_level || "green"}
                    </span>
                  </div>
                  {session.last_lat && session.last_lng ? (
                    <div className="mt-3 text-sm font-semibold text-gray-600">
                      {Number(session.last_lat).toFixed(4)},{" "}
                      {Number(session.last_lng).toFixed(4)}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-500">
                No active tourist monitoring sessions yet.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            Recent Location Pings
          </h2>
          <div className="mt-5 space-y-3">
            {pings.map((ping) => {
              const tourist = profileFor(ping.user_id);

              return (
                <div
                  key={ping.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-3 text-sm"
                >
                  <div>
                    <div className="font-bold">
                      {tourist?.full_name || "Unknown tourist"}
                    </div>
                    <div className="text-gray-500">
                      {formatDateTime(ping.created_at)}
                    </div>
                  </div>
                  <div className="font-semibold text-gray-600">
                    {Number(ping.lat).toFixed(4)}, {Number(ping.lng).toFixed(4)}
                  </div>
                </div>
              );
            })}
            {pings.length === 0 ? (
              <p className="text-sm text-gray-500">
                Location check-ins will stream into this panel.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
          Active Geofence Zones
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {zones.map((zone) => (
            <article key={zone.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{zone.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {[zone.city, zone.state].filter(Boolean).join(", ") ||
                      "No location label"}
                  </p>
                </div>
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${severityClasses(zone.severity)}`}
                >
                  {zone.severity}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                {zone.safety_message}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                <CircleDot className="h-3 w-3" />
                {zone.zone_type} - {zone.radius_meters}m
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
