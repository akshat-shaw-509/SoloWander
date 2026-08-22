import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type LocationPingPayload = {
  sessionId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  source?: string | null;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as LocationPingPayload;
    const lat = payload.latitude;
    const lng = payload.longitude;

    if (
      !payload.sessionId ||
      !isFiniteNumber(lat) ||
      !isFiniteNumber(lng)
    ) {
      return NextResponse.json(
        { error: "Valid session and coordinates are required" },
        { status: 400 },
      );
    }

    const [{ data: session }, { data: zones }] = await Promise.all([
      supabase
        .from("safety_sessions")
        .select("id")
        .eq("id", payload.sessionId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("geofence_zones")
        .select("id, center_lat, center_lng, radius_meters, severity")
        .eq("is_active", true),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Session not active" }, { status: 404 });
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
      session_id: payload.sessionId,
      user_id: user.id,
      lat,
      lng,
      accuracy_meters: isFiniteNumber(payload.accuracy)
        ? payload.accuracy
        : null,
      source: payload.source || "automatic_monitor",
    });

    if (matchingZone) {
      await supabase.from("geofence_events").insert({
        session_id: payload.sessionId,
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
        last_geofence_zone_id: matchingZone?.id ?? null,
        risk_level: matchingZone
          ? riskForSeverity(matchingZone.severity)
          : "green",
      })
      .eq("id", payload.sessionId)
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      zoneId: matchingZone?.id ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to record location ping",
      },
      { status: 500 },
    );
  }
}
