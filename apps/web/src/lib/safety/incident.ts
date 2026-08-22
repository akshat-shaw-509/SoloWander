import { randomUUID } from "node:crypto";

import {
  dispatchSafetyIncident,
  summarizeDispatchResults,
} from "@/lib/safety/dispatch";

export type LocationSource = "CURRENT_GPS" | "LAST_KNOWN" | "UNAVAILABLE";
export type IncidentSyncStatus = "SENT" | "PENDING_SYNC";

export type NormalizedSosLocation = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string | null;
  locationSource: LocationSource;
  confidence: number;
};

export type SearchAreaEstimate = {
  center: {
    latitude: number;
    longitude: number;
  };
  estimatedRadiusMeters: number;
  basedOn: "LAST_KNOWN_LOCATION";
  confidence: number;
};

export type SafetyIncidentPayload = {
  sosId?: string;
  sessionId?: string | null;
  tripId?: string | null;
  incidentType?: string;
  description?: string | null;
  locationNote?: string | null;
  location: NormalizedSosLocation;
  syncStatus?: IncidentSyncStatus;
  deviceInfo?: Record<string, unknown>;
  searchArea?: SearchAreaEstimate | null;
};

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
      };
    };
    insert: (
      values: Record<string, unknown>,
    ) => {
      select: (columns: string) => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
    update: (
      values: Record<string, unknown>,
    ) => {
      eq: (
        column: string,
        value: string,
      ) => {
        eq: (
          column: string,
          value: string,
        ) => Promise<{ data?: unknown; error?: unknown }>;
      };
    };
  };
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function classifyIncident(type: string, description: string) {
  const text = `${type} ${description}`.toLowerCase();
  const criticalTerms = ["attack", "assault", "harass", "injured", "bleeding"];
  const highTerms = ["lost", "stranded", "accident", "medical", "theft"];
  const severity = criticalTerms.some((term) => text.includes(term))
    ? "critical"
    : highTerms.some((term) => text.includes(term))
      ? "high"
      : type === "sos"
        ? "high"
        : "medium";

  return {
    severity,
    summary: `AI triage: ${severity.toUpperCase()} ${type.replaceAll("_", " ")} incident. ${description || "No description provided."}`,
  };
}

function riskForSeverity(severity: string) {
  return severity === "critical" ? "red" : "orange";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeLocation(location: NormalizedSosLocation) {
  const latitude = isFiniteNumber(location.latitude) ? location.latitude : null;
  const longitude = isFiniteNumber(location.longitude) ? location.longitude : null;
  const hasCoordinates = latitude !== null && longitude !== null;

  return {
    latitude,
    longitude,
    accuracy: isFiniteNumber(location.accuracy) ? location.accuracy : null,
    timestamp: location.timestamp || null,
    locationSource: hasCoordinates ? location.locationSource : "UNAVAILABLE",
    confidence: Math.max(0, Math.min(1, Number(location.confidence) || 0)),
  } satisfies NormalizedSosLocation;
}

export function safetyIncidentPayloadFromFormData(
  formData: FormData,
): SafetyIncidentPayload {
  const getString = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const getNumber = (key: string) => {
    const value = Number.parseFloat(getString(key));
    return Number.isFinite(value) ? value : null;
  };
  const locationSource = getString("location_source") as LocationSource;

  return {
    sosId: getString("sos_id") || randomUUID(),
    sessionId: getString("session_id") || null,
    tripId: getString("trip_id") || null,
    incidentType: getString("incident_type") || "sos",
    description: getString("description") || null,
    locationNote: getString("location_note") || null,
    syncStatus: "SENT",
    deviceInfo: {
      batteryLevel: getNumber("battery_level"),
      online: getString("device_online") !== "false",
    },
    location: {
      latitude: getNumber("lat") ?? getNumber("manual_lat"),
      longitude: getNumber("lng") ?? getNumber("manual_lng"),
      accuracy: getNumber("accuracy"),
      timestamp: getString("location_timestamp") || null,
      locationSource:
        locationSource === "CURRENT_GPS" || locationSource === "LAST_KNOWN"
          ? locationSource
          : "UNAVAILABLE",
      confidence: getNumber("location_confidence") ?? 0,
    },
  };
}

export async function createSafetyIncidentRecord({
  supabase,
  userId,
  payload,
}: {
  supabase: unknown;
  userId: string;
  payload: SafetyIncidentPayload;
}) {
  const db = supabase as SupabaseLike;
  const sosId = payload.sosId || randomUUID();
  const location = normalizeLocation(payload.location);
  const incidentType = payload.incidentType || "sos";
  const description = compact(
    [
      payload.description || "",
      payload.locationNote ? `Location note: ${payload.locationNote}` : "",
      location.locationSource === "LAST_KNOWN"
        ? "Last confirmed location — not the user's current live position."
        : "",
      location.locationSource === "UNAVAILABLE"
        ? "Location unavailable at SOS submission time."
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
  const triage = classifyIncident(incidentType, description);

  const { data: existingIncident } = await db
    .from("safety_incidents")
    .select("id")
    .eq("client_sos_id", sosId)
    .maybeSingle();

  if (existingIncident?.id) {
    return {
      incidentId: String(existingIncident.id),
      sosId,
      duplicate: true,
      location,
    };
  }

  const { data: incident, error } = await db
    .from("safety_incidents")
    .insert({
      client_sos_id: sosId,
      user_id: userId,
      session_id: payload.sessionId || null,
      trip_id: payload.tripId || null,
      incident_type: incidentType,
      severity: triage.severity,
      status: "reported",
      description: description || null,
      lat: location.latitude,
      lng: location.longitude,
      location_accuracy_meters: location.accuracy,
      location_source: location.locationSource,
      location_timestamp: location.timestamp,
      location_confidence: location.confidence,
      sync_status: payload.syncStatus || "SENT",
      device_info: payload.deviceInfo || {},
      search_area: payload.searchArea || null,
      ai_summary: triage.summary,
    })
    .select("id")
    .single();

  if (error || !incident?.id) {
    throw new Error("Unable to create SOS incident");
  }

  await db.from("safety_incident_updates").insert({
    incident_id: incident.id,
    user_id: userId,
    status: "reported",
    note:
      payload.syncStatus === "PENDING_SYNC"
        ? "Offline SOS synced after connectivity returned."
        : "Incident reported from tourist safety app.",
  });

  const dispatchResults = await dispatchSafetyIncident({
    supabase,
    incidentId: String(incident.id),
    userId,
    incidentType,
    severity: triage.severity,
    description: description || null,
    lat: location.latitude,
    lng: location.longitude,
    aiSummary: triage.summary,
  });

  await db.from("safety_incident_updates").insert({
    incident_id: incident.id,
    user_id: userId,
    status: "dispatch_attempted",
    note: summarizeDispatchResults(dispatchResults),
  });

  if (payload.sessionId) {
    await db
      .from("safety_sessions")
      .update({
        risk_level: riskForSeverity(triage.severity),
        last_lat: location.latitude,
        last_lng: location.longitude,
        last_location_at:
          location.latitude !== null && location.longitude !== null
            ? new Date().toISOString()
            : undefined,
      })
      .eq("id", payload.sessionId)
      .eq("user_id", userId);
  }

  return {
    incidentId: String(incident.id),
    sosId,
    duplicate: false,
    location,
  };
}
