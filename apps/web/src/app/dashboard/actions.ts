"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hasSupabaseConfig } from "@/lib/supabase/env";
import {
  createSafetyIncidentRecord,
  safetyIncidentPayloadFromFormData,
} from "@/lib/safety/incident";
import { createClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value || null;
}

function readInteger(formData: FormData, key: string, fallback = 0) {
  const value = Number.parseInt(readString(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function readFloat(formData: FormData, key: string) {
  const value = Number.parseFloat(readString(formData, key));
  return Number.isFinite(value) ? value : null;
}

function readMoneyMinorUnits(formData: FormData, key: string) {
  const value = Number.parseFloat(readString(formData, key));
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function riskForSeverity(severity?: string | null) {
  if (severity === "critical") {
    return "red";
  }

  if (severity === "high") {
    return "orange";
  }

  if (severity === "medium") {
    return "yellow";
  }

  return "green";
}

type PackingItem = {
  id: string;
  label: string;
  isPacked: boolean;
};

function readPackingItems(value: unknown): PackingItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("label" in item) ||
        typeof item.label !== "string"
      ) {
        return null;
      }

      return {
        id:
          "id" in item && typeof item.id === "string"
            ? item.id
            : randomUUID(),
        label: item.label.trim(),
        isPacked:
          "isPacked" in item && typeof item.isPacked === "boolean"
            ? item.isPacked
            : false,
      };
    })
    .filter((item): item is PackingItem => Boolean(item?.label));
}

async function getAuthenticatedContext() {
  if (!hasSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

async function getAuthorityContext() {
  const { supabase, user } = await getAuthenticatedContext();
  const { data: authorityProfile } = await supabase
    .from("authority_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!authorityProfile) {
    redirect("/dashboard/authority?error=authority");
  }

  return { supabase, user, authorityProfile };
}

export async function createTrip(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const destination = readString(formData, "destination");

  if (!destination) {
    redirect("/dashboard/trips/new?error=destination");
  }

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      destination,
      city: readNullableString(formData, "city"),
      country: readNullableString(formData, "country"),
      start_date: readNullableString(formData, "start_date"),
      end_date: readNullableString(formData, "end_date"),
      total_budget: readInteger(formData, "total_budget"),
      currency: readString(formData, "currency") || "INR",
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/dashboard/trips/new?error=${encodeURIComponent(error?.message || "create")}`,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trips");
  redirect(`/dashboard/trips/${data.id}`);
}

export async function deleteTrip(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const tripId = readString(formData, "trip_id");

  if (tripId) {
    await supabase
      .from("trips")
      .delete()
      .eq("id", tripId)
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trips");
  redirect("/dashboard/trips");
}

export async function createExpense(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const name = readString(formData, "name");
  const amount = readMoneyMinorUnits(formData, "amount");
  const category = readString(formData, "category") || "Other";

  if (!name || amount <= 0) {
    revalidatePath("/dashboard/expenses");
    return;
  }

  const tripId = readNullableString(formData, "trip_id");

  await supabase.from("expenses").insert({
    user_id: user.id,
    trip_id: tripId,
    name,
    amount,
    category,
    expense_date:
      readNullableString(formData, "expense_date") ??
      new Date().toISOString().slice(0, 10),
    notes: readNullableString(formData, "notes"),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expenses");

  if (tripId) {
    revalidatePath(`/dashboard/trips/${tripId}`);
  }
}

export async function addPackingItem(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const tripId = readString(formData, "trip_id");
  const label = readString(formData, "label");

  if (!tripId || !label) {
    revalidatePath("/dashboard/packing");
    return;
  }

  const { data: existingList } = await supabase
    .from("packing_lists")
    .select("id, items")
    .eq("user_id", user.id)
    .eq("trip_id", tripId)
    .limit(1)
    .maybeSingle();

  const items = [
    ...readPackingItems(existingList?.items),
    { id: randomUUID(), label, isPacked: false },
  ];

  if (existingList?.id) {
    await supabase
      .from("packing_lists")
      .update({ items })
      .eq("id", existingList.id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("packing_lists").insert({
      user_id: user.id,
      trip_id: tripId,
      items,
    });
  }

  revalidatePath("/dashboard/packing");
}

export async function togglePackingItem(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const listId = readString(formData, "list_id");
  const itemId = readString(formData, "item_id");

  if (!listId || !itemId) {
    revalidatePath("/dashboard/packing");
    return;
  }

  const { data: packingList } = await supabase
    .from("packing_lists")
    .select("items")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  const items = readPackingItems(packingList?.items).map((item) =>
    item.id === itemId ? { ...item, isPacked: !item.isPacked } : item,
  );

  await supabase
    .from("packing_lists")
    .update({ items })
    .eq("id", listId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/packing");
}

export async function deletePackingItem(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const listId = readString(formData, "list_id");
  const itemId = readString(formData, "item_id");

  if (!listId || !itemId) {
    revalidatePath("/dashboard/packing");
    return;
  }

  const { data: packingList } = await supabase
    .from("packing_lists")
    .select("items")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  const items = readPackingItems(packingList?.items).filter(
    (item) => item.id !== itemId,
  );

  await supabase
    .from("packing_lists")
    .update({ items })
    .eq("id", listId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/packing");
}

export async function createCommunityPost(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const title = readString(formData, "title");

  if (!title) {
    redirect("/dashboard/community?error=title");
  }

  await supabase.from("community_posts").insert({
    user_id: user.id,
    city: readNullableString(formData, "city"),
    post_type: readString(formData, "post_type") || "general",
    title,
    body: readNullableString(formData, "body"),
  });

  revalidatePath("/dashboard/community");
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const name = readString(formData, "name");
  const preferredCurrency = readString(formData, "preferred_currency") || "INR";

  await supabase.from("users").upsert({
    id: user.id,
    email: user.email || "",
    name: name || null,
    home_country: readString(formData, "home_country") || "IN",
    preferred_currency: preferredCurrency,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?updated=profile");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function saveSafetyProfile(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const fullName = readString(formData, "full_name");

  if (!fullName) {
    redirect("/dashboard/safety?error=profile");
  }

  const { data: existingProfile } = await supabase
    .from("tourist_safety_profiles")
    .select("digital_id_code")
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("tourist_safety_profiles").upsert({
    user_id: user.id,
    full_name: fullName,
    phone: readNullableString(formData, "phone"),
    emergency_contact_name: readNullableString(
      formData,
      "emergency_contact_name",
    ),
    emergency_contact_phone: readNullableString(
      formData,
      "emergency_contact_phone",
    ),
    blood_group: readNullableString(formData, "blood_group"),
    medical_notes: readNullableString(formData, "medical_notes"),
    home_country: readString(formData, "home_country") || "IN",
    digital_id_code:
      existingProfile?.digital_id_code ??
      `SW-NE-${randomUUID().slice(0, 8).toUpperCase()}`,
    is_location_sharing_enabled:
      readString(formData, "is_location_sharing_enabled") === "on",
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/dashboard/safety");
  redirect("/dashboard/safety?updated=profile");
}

export async function startSafetySession(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const tripId = readNullableString(formData, "trip_id");

  await supabase
    .from("safety_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("status", "active");

  await supabase.from("safety_sessions").insert({
    user_id: user.id,
    trip_id: tripId,
    status: "active",
    risk_level: "green",
    consent_snapshot: {
      locationSharing: true,
      emergencyContactAccess: true,
      startedFrom: "tourist_safety_app",
    },
  });

  revalidatePath("/dashboard/safety");
  redirect("/dashboard/safety?updated=session");
}

export async function endSafetySession(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const sessionId = readString(formData, "session_id");

  if (sessionId) {
    await supabase
      .from("safety_sessions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        risk_level: "green",
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard/safety");
}

export async function recordSafetyCheckIn(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const sessionId = readString(formData, "session_id");
  const lat = readFloat(formData, "lat");
  const lng = readFloat(formData, "lng");
  const accuracy = readFloat(formData, "accuracy");

  if (!sessionId || lat === null || lng === null) {
    redirect("/dashboard/safety?error=location");
  }

  const [{ data: session }, { data: zones }] = await Promise.all([
    supabase
      .from("safety_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("geofence_zones")
      .select("id, center_lat, center_lng, radius_meters, severity")
      .eq("is_active", true),
  ]);

  if (!session) {
    redirect("/dashboard/safety?error=session");
  }

  const matchingZone = (zones ?? []).find((zone) => {
    const zoneLat = Number(zone.center_lat);
    const zoneLng = Number(zone.center_lng);

    return (
      Number.isFinite(zoneLat) &&
      Number.isFinite(zoneLng) &&
      metersBetween({ lat, lng }, { lat: zoneLat, lng: zoneLng }) <=
        Number(zone.radius_meters)
    );
  });

  await supabase.from("location_pings").insert({
    session_id: sessionId,
    user_id: user.id,
    lat,
    lng,
    accuracy_meters: accuracy,
    source: "manual_check_in",
  });

  if (matchingZone) {
    await supabase.from("geofence_events").insert({
      session_id: sessionId,
      user_id: user.id,
      zone_id: matchingZone.id,
      event_type: "inside",
      lat,
      lng,
    });
  }

  await supabase
    .from("safety_sessions")
    .update({
      last_lat: lat,
      last_lng: lng,
      last_location_at: new Date().toISOString(),
      last_check_in_at: new Date().toISOString(),
      last_geofence_zone_id: matchingZone?.id ?? null,
      risk_level: matchingZone ? riskForSeverity(matchingZone.severity) : "green",
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/safety");
  redirect(
    `/dashboard/safety?updated=${matchingZone ? "geofence" : "checkin"}`,
  );
}

export async function createSafetyIncident(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  await createSafetyIncidentRecord({
    supabase,
    userId: user.id,
    payload: safetyIncidentPayloadFromFormData(formData),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/safety");
  redirect("/dashboard/safety?updated=incident");
}

export async function saveAuthorityProfile(formData: FormData) {
  const { supabase, user } = await getAuthenticatedContext();
  const operatorName = readString(formData, "operator_name");

  if (!operatorName) {
    redirect("/dashboard/authority?error=operator");
  }

  await supabase.from("authority_profiles").upsert({
    user_id: user.id,
    operator_name: operatorName,
    department: readString(formData, "department") || "Tourism Safety Cell",
    jurisdiction: readString(formData, "jurisdiction") || "Northeast India",
    control_room_phone: readNullableString(formData, "control_room_phone"),
  });

  revalidatePath("/dashboard/authority");
  redirect("/dashboard/authority?updated=operator");
}

export async function createAuthorityResponder(formData: FormData) {
  const { supabase, user } = await getAuthorityContext();
  const name = readString(formData, "name");

  if (!name) {
    redirect("/dashboard/authority?error=responder");
  }

  await supabase.from("authority_responders").insert({
    authority_user_id: user.id,
    name,
    role: readString(formData, "role") || "field_responder",
    phone: readNullableString(formData, "phone"),
    base_city: readNullableString(formData, "base_city"),
    status: readString(formData, "status") || "available",
  });

  revalidatePath("/dashboard/authority");
  redirect("/dashboard/authority?updated=responder");
}

export async function createAuthorityGeofence(formData: FormData) {
  const { supabase, user } = await getAuthorityContext();
  const name = readString(formData, "name");
  const centerLat = readFloat(formData, "center_lat");
  const centerLng = readFloat(formData, "center_lng");
  const radiusMeters = readInteger(formData, "radius_meters");
  const safetyMessage = readString(formData, "safety_message");

  if (!name || centerLat === null || centerLng === null || !safetyMessage) {
    redirect("/dashboard/authority?error=geofence");
  }

  await supabase.from("geofence_zones").insert({
    name,
    zone_type: readString(formData, "zone_type") || "caution",
    severity: readString(formData, "severity") || "medium",
    city: readNullableString(formData, "city"),
    state: readNullableString(formData, "state"),
    center_lat: centerLat,
    center_lng: centerLng,
    radius_meters: radiusMeters || 1000,
    safety_message: safetyMessage,
    created_by_user_id: user.id,
    is_active: true,
  });

  revalidatePath("/dashboard/authority");
  revalidatePath("/dashboard/safety");
  redirect("/dashboard/authority?updated=geofence");
}

export async function assignIncidentResponder(formData: FormData) {
  const { supabase, user } = await getAuthorityContext();
  const incidentId = readString(formData, "incident_id");
  const responderId = readNullableString(formData, "responder_id");
  const priority = readString(formData, "response_priority") || "P2";

  if (!incidentId) {
    redirect("/dashboard/authority?error=incident");
  }

  await supabase
    .from("safety_incidents")
    .update({
      assigned_responder_id: responderId,
      response_priority: priority,
      status: responderId ? "acknowledged" : "reported",
      updated_at: new Date().toISOString(),
    })
    .eq("id", incidentId);

  await supabase.from("safety_incident_updates").insert({
    incident_id: incidentId,
    user_id: user.id,
    status: responderId ? "acknowledged" : "reported",
    note: responderId
      ? `Assigned responder with priority ${priority}.`
      : "Responder assignment cleared.",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/authority");
  redirect("/dashboard/authority?updated=assigned");
}

export async function updateIncidentResponse(formData: FormData) {
  const { supabase, user } = await getAuthorityContext();
  const incidentId = readString(formData, "incident_id");
  const status = readString(formData, "status");
  const note = readNullableString(formData, "note");

  if (!incidentId || !status) {
    redirect("/dashboard/authority?error=status");
  }

  await supabase
    .from("safety_incidents")
    .update({
      status,
      control_room_notes: note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", incidentId);

  await supabase.from("safety_incident_updates").insert({
    incident_id: incidentId,
    user_id: user.id,
    status,
    note,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/authority");
  revalidatePath("/dashboard/safety");
  redirect("/dashboard/authority?updated=status");
}
