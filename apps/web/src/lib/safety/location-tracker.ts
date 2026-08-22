import type {
  LocationSource,
  NormalizedSosLocation,
  SearchAreaEstimate,
} from "@/lib/safety/incident";

type StoredLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  locationSource: Exclude<LocationSource, "UNAVAILABLE">;
};

const latestLocationKey = "solowander:safety:latest-location";
const locationHistoryKey = "solowander:safety:location-history";
const maxHistoryPoints = 12;
const freshLocationMaxAge = 0;
const stalePositionMaxAgeMs = 120000;

function isBrowser() {
  return typeof window !== "undefined";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function metersBetween(a: StoredLocation, b: StoredLocation) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isFreshPosition(position: GeolocationPosition) {
  return Date.now() - (position.timestamp || 0) <= stalePositionMaxAgeMs;
}

export function confidenceFromAccuracy(accuracy: number | null) {
  if (!accuracy || accuracy <= 0) {
    return 0.65;
  }

  if (accuracy <= 20) {
    return 0.98;
  }

  if (accuracy <= 50) {
    return 0.9;
  }

  if (accuracy <= 100) {
    return 0.78;
  }

  if (accuracy <= 500) {
    return 0.55;
  }

  return 0.35;
}

export function confidenceFromAge(location: StoredLocation) {
  const ageMinutes =
    (Date.now() - new Date(location.timestamp).getTime()) / 60000;
  const accuracyConfidence = confidenceFromAccuracy(location.accuracy);
  const ageConfidence = clamp(1 - ageMinutes / 240, 0.1, 0.85);

  return clamp(Math.min(accuracyConfidence, ageConfidence), 0.1, 0.85);
}

export function readLastKnownLocation() {
  return readJson<StoredLocation | null>(latestLocationKey, null);
}

export function readLocationHistory() {
  return readJson<StoredLocation[]>(locationHistoryKey, []);
}

export function storeLocationFromPosition(
  position: GeolocationPosition,
  source: Exclude<LocationSource, "UNAVAILABLE"> = "CURRENT_GPS",
) {
  const next: StoredLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy)
      ? Math.round(position.coords.accuracy)
      : null,
    timestamp: new Date(position.timestamp || Date.now()).toISOString(),
    locationSource: source,
  };
  const previous = readLastKnownLocation();

  if (
    previous &&
    metersBetween(previous, next) < 15 &&
    Math.abs(
      new Date(next.timestamp).getTime() -
        new Date(previous.timestamp).getTime(),
    ) < 60000
  ) {
    return previous;
  }

  const history = [...readLocationHistory(), next].slice(-maxHistoryPoints);
  writeJson(latestLocationKey, next);
  writeJson(locationHistoryKey, history);

  return next;
}

export function startContinuousLocationTracking(
  onLocation?: (location: StoredLocation) => void,
  onError?: (error: GeolocationPositionError) => void,
) {
  if (!isBrowser() || !navigator.geolocation) {
    return () => undefined;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      if (!isFreshPosition(position)) {
        return;
      }

      const stored = storeLocationFromPosition(position, "CURRENT_GPS");
      onLocation?.(stored);
    },
    (error) => {
      onError?.(error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: freshLocationMaxAge,
      timeout: 20000,
    },
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

function getCurrentPosition(timeout = 12000) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!isBrowser() || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: freshLocationMaxAge,
      timeout,
    });
  });
}

export async function resolveSosLocation(): Promise<NormalizedSosLocation> {
  try {
    const position = await getCurrentPosition();

    if (!isFreshPosition(position)) {
      throw new Error("GPS returned a stale position");
    }

    const current = storeLocationFromPosition(position, "CURRENT_GPS");

    return {
      latitude: current.latitude,
      longitude: current.longitude,
      accuracy: current.accuracy,
      timestamp: current.timestamp,
      locationSource: "CURRENT_GPS",
      confidence: confidenceFromAccuracy(current.accuracy),
    };
  } catch {
    const lastKnown = readLastKnownLocation();

    if (lastKnown) {
      return {
        latitude: lastKnown.latitude,
        longitude: lastKnown.longitude,
        accuracy: lastKnown.accuracy,
        timestamp: lastKnown.timestamp,
        locationSource: "LAST_KNOWN",
        confidence: confidenceFromAge(lastKnown),
      };
    }
  }

  return {
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    locationSource: "UNAVAILABLE",
    confidence: 0,
  };
}

export function estimateSearchArea(
  location: NormalizedSosLocation,
): SearchAreaEstimate | null {
  if (
    location.locationSource !== "LAST_KNOWN" ||
    location.latitude === null ||
    location.longitude === null ||
    !location.timestamp
  ) {
    return null;
  }

  const history = readLocationHistory();
  const recent = history.slice(-2);
  const ageMinutes =
    (Date.now() - new Date(location.timestamp).getTime()) / 60000;
  let speedMetersPerMinute = 75;

  if (recent.length === 2) {
    const distance = metersBetween(recent[0], recent[1]);
    const elapsedMinutes = Math.max(
      1,
      (new Date(recent[1].timestamp).getTime() -
        new Date(recent[0].timestamp).getTime()) /
        60000,
    );
    speedMetersPerMinute = clamp(distance / elapsedMinutes, 20, 180);
  }

  return {
    center: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
    estimatedRadiusMeters: Math.round(
      clamp((location.accuracy || 100) + ageMinutes * speedMetersPerMinute, 100, 10000),
    ),
    basedOn: "LAST_KNOWN_LOCATION",
    confidence: clamp(location.confidence * 0.75, 0.05, 0.65),
  };
}
