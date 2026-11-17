/**
 * Offline Watchdog & Inverted "Flight Plan" Dead-Man Engine
 * Handles radio-blackout autonomous tracking, offline state persistence,
 * and GSM telephony/SMS fallback payloads.
 */

export type FlightPlan = {
  id: string;
  destination: string;
  trailName?: string;
  expectedReturnAt: string; // ISO string
  createdAt: string;
  status: "ACTIVE" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  checkInIntervalMinutes: number;
  lastCheckInAt: string;
  emergencyContacts: Array<{ name: string; phone: string }>;
  notes?: string;
};

const FLIGHT_PLAN_STORAGE_KEY = "solowander:sentinel:flight-plan";
const PENDING_TELEMETRY_KEY = "solowander:sentinel:pending-telemetry";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Read the active flight plan from persistent local storage
 */
export function getActiveFlightPlan(): FlightPlan | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(FLIGHT_PLAN_STORAGE_KEY);
    if (!raw) return null;
    const plan = JSON.parse(raw) as FlightPlan;
    if (plan.status === "ACTIVE" || plan.status === "OVERDUE") {
      // Refresh overdue status
      const now = Date.now();
      const returnTime = new Date(plan.expectedReturnAt).getTime();
      if (now > returnTime && plan.status === "ACTIVE") {
        plan.status = "OVERDUE";
        saveFlightPlan(plan);
      }
      return plan;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save or update a flight plan
 */
export function saveFlightPlan(plan: FlightPlan): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(FLIGHT_PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch (err) {
    console.error("Failed to persist flight plan:", err);
  }
}

/**
 * Check in to the active flight plan to extend or confirm safety
 */
export function checkInFlightPlan(extendMinutes = 0): FlightPlan | null {
  const plan = getActiveFlightPlan();
  if (!plan) return null;

  const now = new Date().toISOString();
  plan.lastCheckInAt = now;
  plan.status = "ACTIVE";

  if (extendMinutes > 0) {
    const currentReturn = new Date(plan.expectedReturnAt).getTime();
    plan.expectedReturnAt = new Date(currentReturn + extendMinutes * 60000).toISOString();
  }

  saveFlightPlan(plan);
  return plan;
}

/**
 * Complete and safely disarm the active flight plan
 */
export function completeFlightPlan(): void {
  const plan = getActiveFlightPlan();
  if (plan) {
    plan.status = "COMPLETED";
    saveFlightPlan(plan);
  }
  if (isBrowser()) {
    window.localStorage.removeItem(FLIGHT_PLAN_STORAGE_KEY);
  }
}

/**
 * Generates direct native GSM SMS URI with high-precision GPS coordinates
 * and emergency distress code for zero-data environments.
 */
export function generateDirectGsmSmsUri({
  emergencyPhone,
  travelerName,
  lat,
  lng,
  accuracy,
  dangerScore,
  batteryLevel,
  isDuress = false,
}: {
  emergencyPhone: string;
  travelerName: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  dangerScore: number;
  batteryLevel: number | null;
  isDuress?: boolean;
}): string {
  const cleanPhone = emergencyPhone.replace(/[^\d+]/g, "");
  const coords =
    lat !== null && lng !== null
      ? `${lat.toFixed(6)},${lng.toFixed(6)}`
      : "GPS_UNAVAILABLE";
  const mapsUrl =
    lat !== null && lng !== null
      ? `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`
      : "";

  const prefix = isDuress ? "URGENT DURESS ALERT" : "EMERGENCY SOS";
  const battery = batteryLevel !== null ? ` | Bat: ${batteryLevel}%` : "";
  const acc = accuracy !== null ? ` (±${Math.round(accuracy)}m)` : "";
  const risk = ` | Risk: ${Math.round(dangerScore * 100)}%`;

  const message = `${prefix} - SoloWander Sentinel
Traveler: ${travelerName}
Pos: ${coords}${acc}${risk}${battery}
Map: ${mapsUrl}
Autonomous alert triggered. Please dispatch assistance.`;

  // Standard iOS/Android sms uri encoding
  const separator = navigator.userAgent.match(/iPhone|iPad|iPod/i) ? "&" : "?";
  return `sms:${cleanPhone}${separator}body=${encodeURIComponent(message)}`;
}

/**
 * Generates direct native GSM Phone Call URI
 */
export function generateDirectGsmCallUri(phone: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  return `tel:${cleanPhone}`;
}

/**
 * Register online burst-sync event listener to flush queued telemetry
 * as soon as network connectivity is restored.
 */
export function setupReconnectionBurstSync(
  onSync: () => Promise<void> | void,
): () => void {
  if (!isBrowser()) return () => undefined;

  const handleOnline = () => {
    console.info("[Sentinel] Network connectivity restored. Initiating burst sync...");
    Promise.resolve(onSync()).catch((err) =>
      console.error("[Sentinel] Error during reconnection burst sync:", err),
    );
  };

  window.addEventListener("online", handleOnline);
  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
