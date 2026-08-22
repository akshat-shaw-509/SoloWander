"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clipboard,
  Crosshair,
  MessageSquare,
  Phone,
  Send,
  Siren,
  WifiOff,
} from "lucide-react";

import { recordSafetyCheckIn } from "@/app/dashboard/actions";
import type {
  NormalizedSosLocation,
  SafetyIncidentPayload,
} from "@/lib/safety/incident";
import {
  estimateSearchArea,
  readLastKnownLocation,
  resolveSosLocation,
  startContinuousLocationTracking,
} from "@/lib/safety/location-tracker";
import {
  enqueueSos,
  queuedSosCount,
  sendSosPayload,
  syncQueuedSos,
  type QueuedSos,
} from "@/lib/safety/sos-queue";

type TouristSafetyControlsProps = {
  sessionId?: string | null;
  tripId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyCallNumber?: string | null;
};

type SimpleLocation = {
  lat: string;
  lng: string;
  accuracy: string;
};

const emptyLocation: SimpleLocation = {
  lat: "",
  lng: "",
  accuracy: "",
};

function fillFormLocation(
  form: HTMLFormElement,
  location: NormalizedSosLocation,
) {
  (form.elements.namedItem("lat") as HTMLInputElement).value =
    location.latitude === null ? "" : String(location.latitude);
  (form.elements.namedItem("lng") as HTMLInputElement).value =
    location.longitude === null ? "" : String(location.longitude);
  (form.elements.namedItem("accuracy") as HTMLInputElement).value =
    location.accuracy === null ? "" : String(location.accuracy);
}

function normalizePhone(phone?: string | null) {
  return phone?.replace(/\s+/g, "") || "";
}

function formatLocation(location: NormalizedSosLocation | null) {
  if (!location || location.latitude === null || location.longitude === null) {
    return "Location not available";
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

function formatLocationSource(source?: string | null) {
  if (source === "CURRENT_GPS") {
    return "LIVE LOCATION";
  }

  if (source === "LAST_KNOWN") {
    return "LAST KNOWN LOCATION";
  }

  return "LOCATION UNAVAILABLE";
}

function mapLink(location: NormalizedSosLocation | null) {
  if (!location || location.latitude === null || location.longitude === null) {
    return "";
  }

  return `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
}

function lastKnownAsResolvedLocation(): NormalizedSosLocation | null {
  const lastKnown = readLastKnownLocation();

  if (!lastKnown) {
    return null;
  }

  return {
    latitude: lastKnown.latitude,
    longitude: lastKnown.longitude,
    accuracy: lastKnown.accuracy,
    timestamp: lastKnown.timestamp,
    locationSource: "LAST_KNOWN",
    confidence: 0.5,
  };
}

async function readBatteryLevel() {
  const batteryNavigator = navigator as Navigator & {
    getBattery?: () => Promise<{ level: number }>;
  };

  if (!batteryNavigator.getBattery) {
    return null;
  }

  try {
    const battery = await batteryNavigator.getBattery();
    return Math.round(battery.level * 100) / 100;
  } catch {
    return null;
  }
}

function payloadFromForm({
  form,
  sessionId,
  tripId,
  location,
  deviceInfo,
}: {
  form: HTMLFormElement;
  sessionId?: string | null;
  tripId?: string | null;
  location: NormalizedSosLocation;
  deviceInfo: Record<string, unknown>;
}): SafetyIncidentPayload {
  const formData = new FormData(form);
  const read = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  return {
    sosId: crypto.randomUUID(),
    sessionId: sessionId || null,
    tripId: tripId || null,
    incidentType: read("incident_type") || "sos",
    description: read("description") || null,
    locationNote: read("location_note") || null,
    status: "SENT",
    syncStatus: "SENT",
    location,
    deviceInfo,
    searchArea: estimateSearchArea(location),
  } as SafetyIncidentPayload;
}

export default function TouristSafetyControls({
  sessionId,
  tripId,
  emergencyContactName,
  emergencyContactPhone,
  emergencyCallNumber,
}: TouristSafetyControlsProps) {
  const router = useRouter();
  const checkInFormRef = useRef<HTMLFormElement>(null);
  const incidentFormRef = useRef<HTMLFormElement>(null);
  const [location, setLocation] = useState<SimpleLocation>(emptyLocation);
  const [resolvedLocation, setResolvedLocation] =
    useState<NormalizedSosLocation | null>(null);
  const [status, setStatus] = useState("Starting location monitor...");
  const [isLocating, setIsLocating] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  const smsTarget = normalizePhone(emergencyContactPhone || emergencyCallNumber);
  const callTarget = normalizePhone(emergencyCallNumber || emergencyContactPhone);
  const emergencyMessage = [
    "SoloWander SOS. I need help.",
    `Location status: ${formatLocationSource(resolvedLocation?.locationSource)}`,
    `Location: ${formatLocation(resolvedLocation)}`,
    mapLink(resolvedLocation),
    emergencyContactName ? `Emergency contact: ${emergencyContactName}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    const loadCachedLocation = window.setTimeout(() => {
      setResolvedLocation((current) => current ?? lastKnownAsResolvedLocation());
    }, 0);
    queuedSosCount().then(setQueuedCount).catch(() => undefined);

    const stopTracking = startContinuousLocationTracking(
      (next) => {
        setResolvedLocation({
          latitude: next.latitude,
          longitude: next.longitude,
          accuracy: next.accuracy,
          timestamp: next.timestamp,
          locationSource: "CURRENT_GPS",
          confidence: 0.9,
        });
        setStatus("Location monitor active.");
      },
      (error) => {
        setStatus(
          error.code === error.PERMISSION_DENIED
            ? "GPS permission denied. SOS will use the last known location if available."
            : "GPS is unavailable right now. SOS fallback is active.",
        );
      },
    );

    async function retryQueued() {
      if (!navigator.onLine) {
        return;
      }

      const results = await syncQueuedSos();
      if (results.some((result) => result.status === "sent")) {
        setStatus("Pending SOS synced after internet returned.");
        router.refresh();
      }
      queuedSosCount().then(setQueuedCount).catch(() => undefined);
    }

    window.addEventListener("online", retryQueued);
    retryQueued();

    return () => {
      window.clearTimeout(loadCachedLocation);
      stopTracking();
      window.removeEventListener("online", retryQueued);
    };
  }, [router]);

  async function submitCheckIn() {
    const form = checkInFormRef.current;

    if (!form || !sessionId) {
      return;
    }

    setIsLocating(true);
    const nextLocation = await resolveSosLocation();
    setResolvedLocation(nextLocation);
    fillFormLocation(form, nextLocation);
    setLocation({
      lat: nextLocation.latitude === null ? "" : String(nextLocation.latitude),
      lng: nextLocation.longitude === null ? "" : String(nextLocation.longitude),
      accuracy:
        nextLocation.accuracy === null ? "" : String(nextLocation.accuracy),
    });
    setIsLocating(false);

    if (nextLocation.latitude === null || nextLocation.longitude === null) {
      setStatus("No location available for check-in.");
      return;
    }

    form.requestSubmit();
  }

  async function submitIncident() {
    const form = incidentFormRef.current;

    if (!form) {
      return;
    }

    setIsLocating(true);
    const nextLocation = await resolveSosLocation();
    const deviceInfo = {
      batteryLevel: await readBatteryLevel(),
      online: navigator.onLine,
    };
    const payload = payloadFromForm({
      form,
      sessionId,
      tripId,
      location: nextLocation,
      deviceInfo,
    });

    setResolvedLocation(nextLocation);
    setIsLocating(false);

    if (!navigator.onLine) {
      await enqueueSos({
        ...payload,
        sosId: payload.sosId || crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: "PENDING_SYNC",
        syncStatus: "PENDING_SYNC",
      } satisfies QueuedSos);
      setQueuedCount(await queuedSosCount());
      setStatus(
        "SOS recorded on this device. It will be transmitted automatically when connectivity becomes available.",
      );
      return;
    }

    try {
      await sendSosPayload(payload);
      setStatus("SOS transmitted to the safety backend and dispatch channels.");
      router.refresh();
    } catch {
      await enqueueSos({
        ...payload,
        sosId: payload.sosId || crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: "PENDING_SYNC",
        syncStatus: "PENDING_SYNC",
      } satisfies QueuedSos);
      setQueuedCount(await queuedSosCount());
      setStatus(
        "Backend unavailable. SOS recorded locally and will retry automatically.",
      );
    }
  }

  async function copyEmergencyMessage() {
    await navigator.clipboard.writeText(emergencyMessage);
    setStatus("Emergency message copied.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
          Live Safety Check-In
        </h2>
        <p className="mt-1 text-sm text-gray-500">{status}</p>
        {resolvedLocation ? (
          <div className="mt-2 rounded-lg bg-[#F5F5F3] p-3 text-xs font-semibold text-gray-600">
            <div>{formatLocationSource(resolvedLocation.locationSource)}</div>
            <div className="mt-1">{formatLocation(resolvedLocation)}</div>
            <div className="mt-1">
              Confidence: {Math.round(resolvedLocation.confidence * 100)}%
            </div>
            {resolvedLocation.locationSource === "LAST_KNOWN" ? (
              <div className="mt-1 text-orange-700">
                Last confirmed location, not the current live position.
              </div>
            ) : null}
          </div>
        ) : null}

        <form ref={checkInFormRef} action={recordSafetyCheckIn}>
          <input type="hidden" name="session_id" value={sessionId || ""} />
          <input type="hidden" name="lat" defaultValue={location.lat} />
          <input type="hidden" name="lng" defaultValue={location.lng} />
          <input
            type="hidden"
            name="accuracy"
            defaultValue={location.accuracy}
          />
        </form>

        <button
          type="button"
          disabled={!sessionId || isLocating}
          onClick={submitCheckIn}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--secondary)] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <Crosshair className="h-4 w-4" />
          {isLocating ? "Resolving location..." : "Send Check-In"}
        </button>
      </div>

      <div className="rounded-lg border border-red-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Siren className="h-5 w-5 text-red-600" />
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
            Emergency SOS
          </h2>
        </div>
        {queuedCount > 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-800">
            <WifiOff className="h-4 w-4" />
            {queuedCount} SOS record{queuedCount === 1 ? "" : "s"} pending sync.
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <a
            href={callTarget ? `tel:${callTarget}` : undefined}
            aria-disabled={!callTarget}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
              callTarget
                ? "bg-[var(--dark)] text-white"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
          <a
            href={
              smsTarget
                ? `sms:${smsTarget}?&body=${encodeURIComponent(emergencyMessage)}`
                : undefined
            }
            aria-disabled={!smsTarget}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
              smsTarget
                ? "bg-red-50 text-red-700"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            SMS
          </a>
          <button
            type="button"
            onClick={copyEmergencyMessage}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700"
          >
            <Clipboard className="h-4 w-4" />
            Copy
          </button>
        </div>

        <form ref={incidentFormRef} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="incident_type"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Incident type
            </label>
            <select
              id="incident_type"
              name="incident_type"
              defaultValue="sos"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="sos">SOS</option>
              <option value="medical">Medical</option>
              <option value="lost">Lost or stranded</option>
              <option value="harassment">Harassment</option>
              <option value="theft">Theft</option>
              <option value="transport">Transport issue</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              What happened?
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              placeholder="Describe what you can. This is optional in a panic."
            />
          </div>

          <div className="rounded-lg border border-red-100 bg-red-50 p-3">
            <div className="text-sm font-bold text-red-800">
              Location fallback
            </div>
            <p className="mt-1 text-xs text-red-700">
              No coordinates required. The app tries live GPS first, then the
              last confirmed device location, then submits with location
              unavailable.
            </p>
            <input
              name="location_note"
              className="mt-3 w-full rounded-lg border border-red-200 px-3 py-2 text-sm outline-none focus:border-red-500"
              placeholder="Optional: landmark, hotel, road name, vehicle number..."
            />
          </div>

          <button
            type="button"
            onClick={submitIncident}
            disabled={isLocating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-red-300"
          >
            <Send className="h-4 w-4" />
            {isLocating ? "Resolving location..." : "Send SOS"}
          </button>
        </form>
      </div>
    </div>
  );
}
