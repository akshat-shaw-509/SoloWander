import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSafetyIncidentRecord } from "@/lib/safety/incident";
import type { SentinelDangerBreakdown, Coordinate } from "@/lib/safety/sentinel-engine";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      coords,
      breakdown,
      isDuress = false,
      triggerType = "AUTONOMOUS_SENTINEL",
      note,
      sessionId,
      tripId,
    }: {
      coords: Coordinate | null;
      breakdown: SentinelDangerBreakdown;
      isDuress?: boolean;
      triggerType?: string;
      note?: string;
      sessionId?: string;
      tripId?: string;
    } = body;

    const shouldEscalateToSos =
      isDuress ||
      breakdown.tier === "L3_CRISIS" ||
      triggerType === "DEAD_MAN_EXPIRED";

    if (!shouldEscalateToSos) {
      // Just telemetry logging
      return NextResponse.json({
        ok: true,
        logged: true,
        tier: breakdown.tier,
        risk: breakdown.totalRisk,
      });
    }

    // Determine user identifier
    const userId = user?.id || "00000000-0000-0000-0000-000000000000";
    const userEmail = user?.email || "sentinel-alert@solowander.app";

    const incidentType = isDuress
      ? "silent_duress_sos"
      : breakdown.kinematicRisk >= 0.8
        ? "fall_impact_sos"
        : breakdown.geofenceRisk >= 0.7
          ? "hazard_breach_sos"
          : "autonomous_sentinel_sos";

    const description = [
      isDuress ? "🚨 COVERT SILENT DURESS PIN ENTERED BY TRAVELER" : null,
      `Autonomous Escalation: Tier ${breakdown.tier} (Risk: ${Math.round(breakdown.totalRisk * 100)}%)`,
      breakdown.reasons.length > 0 ? `Factors: ${breakdown.reasons.join("; ")}` : null,
      note ? `Note: ${note}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const recordResult = await createSafetyIncidentRecord({
      supabase,
      userId,
      userEmail,
      payload: {
        incidentType,
        description,
        sessionId: sessionId || null,
        tripId: tripId || null,
        location: {
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          accuracy: coords?.accuracy ?? null,
          timestamp: new Date().toISOString(),
          locationSource: coords ? "CURRENT_GPS" : "UNAVAILABLE",
          confidence: coords ? 0.95 : 0.2,
        },
        deviceInfo: {
          autonomousSentinel: true,
          duressMode: isDuress,
          dangerScore: breakdown.totalRisk,
          tier: breakdown.tier,
          factors: breakdown.reasons,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      escalated: true,
      incidentId: recordResult.incidentId,
      sosId: recordResult.sosId,
      duress: isDuress,
      tier: breakdown.tier,
    });
  } catch (error) {
    console.error("[Sentinel API Error]:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sentinel processing error",
      },
      { status: 500 },
    );
  }
}
