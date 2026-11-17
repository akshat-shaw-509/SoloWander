import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSafetyIncidentRecord } from "@/lib/safety/incident";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ activePlan: null });
    }

    const { data: plan } = await supabase
      .from("sentinel_flight_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .maybeSingle();

    return NextResponse.json({ activePlan: plan });
  } catch (err) {
    return NextResponse.json({ activePlan: null });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { destination, expectedReturnAt, notes, contacts } = body;

    const planData = {
      destination: destination || "Wilderness Trek",
      expected_return_at: expectedReturnAt,
      status: "ACTIVE",
      notes: notes || null,
      emergency_contacts: contacts || [],
      user_id: user?.id || null,
      created_at: new Date().toISOString(),
    };

    if (user) {
      await supabase.from("sentinel_flight_plans").insert(planData);
    }

    return NextResponse.json({ ok: true, plan: planData });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to arm watchdog" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { action } = body; // "CHECK_IN" | "COMPLETE"

    if (user) {
      if (action === "COMPLETE") {
        await supabase
          .from("sentinel_flight_plans")
          .update({ status: "COMPLETED", ended_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("status", "ACTIVE");
      } else {
        await supabase
          .from("sentinel_flight_plans")
          .update({ last_check_in_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("status", "ACTIVE");
      }
    }

    return NextResponse.json({ ok: true, action });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update watchdog" },
      { status: 500 },
    );
  }
}
