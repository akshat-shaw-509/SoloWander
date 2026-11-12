import { NextResponse } from "next/server";

import {
  createSafetyIncidentRecord,
  type SafetyIncidentPayload,
} from "@/lib/safety/incident";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as SafetyIncidentPayload;
    const result = await createSafetyIncidentRecord({
      supabase,
      userId: user.id,
      userEmail: user.email,
      payload: {
        ...payload,
        syncStatus: payload.syncStatus || "SENT",
      },
    });

    return NextResponse.json({
      ok: true,
      incidentId: result.incidentId,
      sosId: result.sosId,
      duplicate: result.duplicate,
      location: result.location,
    });
  } catch (error) {
    console.error("Unable to submit SOS incident", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit SOS incident",
      },
      { status: 500 },
    );
  }
}
