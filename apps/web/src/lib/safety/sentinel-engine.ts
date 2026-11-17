/**
 * Autonomous Safety Sentinel Agent Engine
 * Continuous Edge-Computing Telemetry Analyzer, Multi-Factor Risk Scoring R(t),
 * 4-Tier Escalation Ladder, Dead-Man Challenge Loop, and Anti-Coercion Protocol.
 */

import { playAdvisoryChime, playDeadManPulse, playSosDispatchedSiren } from "@/lib/safety/web-audio-alarm";
import { generateDirectGsmSmsUri } from "@/lib/safety/offline-watchdog";

export type EscalationTier = "L0_NOMINAL" | "L1_CAUTION" | "L2_ANOMALY" | "L3_CRISIS";

export type Coordinate = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null; // meters/sec
  heading?: number | null;
  altitude?: number | null;
  timestamp?: number;
};

export type KinematicSnapshot = {
  accelMagnitude: number; // m/s^2 (nominal earth gravity ~9.81)
  shockG: number; // in units of g (~1.0g nominal)
  isImmobile: boolean;
  fallDetected: boolean;
  variance: number;
};

export type SentinelDangerBreakdown = {
  totalRisk: number; // 0.0 to 1.0 (R(t))
  geofenceRisk: number; // G(t)
  routeDriftRisk: number; // D_route(t)
  kinematicRisk: number; // K(t)
  diurnalRisk: number; // T_diurnal(t)
  vitalsRisk: number; // V(t)
  tier: EscalationTier;
  reasons: string[];
  calculatedAt: string;
};

export type SentinelConfig = {
  enabled: boolean;
  safePin: string;
  duressPin: string;
  deadManTimeoutSeconds: number;
  routeWaypoints: Coordinate[];
  emergencyContacts: Array<{ name: string; phone: string }>;
  weights: {
    geofence: number; // default 0.30
    route: number; // default 0.25
    kinematics: number; // default 0.20
    diurnal: number; // default 0.15
    vitals: number; // default 0.10
  };
};

export const DEFAULT_SENTINEL_CONFIG: SentinelConfig = {
  enabled: true,
  safePin: "1234",
  duressPin: "9999",
  deadManTimeoutSeconds: 90,
  routeWaypoints: [],
  emergencyContacts: [],
  weights: {
    geofence: 0.30,
    route: 0.25,
    kinematics: 0.20,
    diurnal: 0.15,
    vitals: 0.10,
  },
};

// Built-in offline safe havens & hazard zones
export const DEFAULT_OFFLINE_ZONES = [
  {
    name: "Unlit Isolated Ridge Corridor",
    type: "HAZARD",
    lat: 28.6139,
    lng: 77.2090,
    radiusMeters: 450,
    baseRisk: 0.85,
  },
  {
    name: "Steep Ravine Drop-off",
    type: "HAZARD",
    lat: 28.6180,
    lng: 77.2150,
    radiusMeters: 300,
    baseRisk: 0.90,
  },
  {
    name: "District Police Station & Tourist Assistance",
    type: "SAFE_HAVEN",
    lat: 28.6100,
    lng: 77.2000,
    radiusMeters: 250,
    baseRisk: 0.05,
  },
];

// Earth geometry helpers
const EARTH_RADIUS_METERS = 6371000;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates perpendicular cross-track distance (meters) from a point
 * to a route segment (P1 -> P2).
 */
export function distanceToSegmentMeters(
  point: { lat: number; lng: number },
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): number {
  const d13 = haversineDistanceMeters(start.lat, start.lng, point.lat, point.lng);
  const d12 = haversineDistanceMeters(start.lat, start.lng, end.lat, end.lng);

  if (d12 === 0) return d13;

  const d23 = haversineDistanceMeters(end.lat, end.lng, point.lat, point.lng);
  // If obtuse triangle, return distance to closer endpoint
  if (d13 * d13 > d12 * d12 + d23 * d23) return d23;
  if (d23 * d23 > d12 * d12 + d13 * d13) return d13;

  // Cross-track approximation
  const s = (d12 + d23 + d13) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - d12) * (s - d23) * (s - d13)));
  return (2 * area) / d12;
}

/**
 * Calculates minimum distance to a planned route polyline
 */
export function calculateRouteDeviation(
  point: { lat: number; lng: number },
  waypoints: Coordinate[],
): number {
  if (waypoints.length === 0) return 0;
  if (waypoints.length === 1) {
    return haversineDistanceMeters(point.lat, point.lng, waypoints[0].lat, waypoints[0].lng);
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dist = distanceToSegmentMeters(point, waypoints[i], waypoints[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

/**
 * Calculates Diurnal Risk Multiplier T_diurnal based on local hour
 * Higher risk in late night/early morning hours (23:00 - 05:00)
 */
export function calculateDiurnalMultiplier(date = new Date()): number {
  const hour = date.getHours() + date.getMinutes() / 60;

  if (hour >= 23 || hour < 4) {
    return 1.0; // Peak night danger
  }
  if (hour >= 4 && hour < 6) {
    return 0.75; // Pre-dawn
  }
  if (hour >= 6 && hour < 8) {
    return 0.35; // Early morning
  }
  if (hour >= 8 && hour < 18) {
    return 0.15; // Broad daylight nominal
  }
  if (hour >= 18 && hour < 21) {
    return 0.45; // Dusk
  }
  return 0.8; // Night (21:00 - 23:00)
}

/**
 * Mathematical Danger Index formulation R(t)
 */
export function evaluateDangerIndex({
  coords,
  kinematics,
  batteryLevel,
  isOnline,
  routeWaypoints,
  hazardZones = DEFAULT_OFFLINE_ZONES,
  weights = DEFAULT_SENTINEL_CONFIG.weights,
  simulatedOverrides,
}: {
  coords: Coordinate | null;
  kinematics: KinematicSnapshot;
  batteryLevel: number | null;
  isOnline: boolean;
  routeWaypoints: Coordinate[];
  hazardZones?: typeof DEFAULT_OFFLINE_ZONES;
  weights?: SentinelConfig["weights"];
  simulatedOverrides?: Partial<SentinelDangerBreakdown>;
}): SentinelDangerBreakdown {
  const reasons: string[] = [];

  // 1. Geofence Danger Factor G(t)
  let geofenceRisk = 0.1;
  if (coords) {
    for (const zone of hazardZones) {
      const dist = haversineDistanceMeters(coords.lat, coords.lng, zone.lat, zone.lng);
      if (zone.type === "HAZARD") {
        if (dist <= zone.radiusMeters) {
          geofenceRisk = Math.max(geofenceRisk, zone.baseRisk);
          reasons.push(`Inside hazard zone: ${zone.name}`);
        } else if (dist <= zone.radiusMeters * 2) {
          geofenceRisk = Math.max(geofenceRisk, zone.baseRisk * 0.5);
          reasons.push(`Approaching hazard zone: ${zone.name} (${Math.round(dist)}m)`);
        }
      } else if (zone.type === "SAFE_HAVEN" && dist <= zone.radiusMeters) {
        geofenceRisk = Math.min(geofenceRisk, 0.05);
      }
    }
  }

  // 2. Route Drift Factor D_route(t)
  let routeDriftRisk = 0.05;
  if (coords && routeWaypoints.length > 0) {
    const deviationMeters = calculateRouteDeviation(coords, routeWaypoints);
    if (deviationMeters > 500) {
      // Exponential penalty for significant off-trail deviation
      routeDriftRisk = Math.min(1.0, 0.3 + (deviationMeters - 500) / 1000);
      reasons.push(`Route deviation: ${Math.round(deviationMeters)}m off planned path`);
    } else if (deviationMeters > 200) {
      routeDriftRisk = 0.35;
      reasons.push(`Minor route drift (${Math.round(deviationMeters)}m)`);
    }
  }

  // 3. Kinematic Shock / Fall Factor K(t)
  let kinematicRisk = 0.05;
  if (kinematics.fallDetected) {
    kinematicRisk = 1.0;
    reasons.push(`High impact shock (${kinematics.shockG.toFixed(1)}g) followed by immobility`);
  } else if (kinematics.shockG > 2.2) {
    kinematicRisk = 0.65;
    reasons.push(`Abnormal acceleration spike (${kinematics.shockG.toFixed(1)}g)`);
  } else if (kinematics.isImmobile && coords && (coords.speed ?? 0) === 0) {
    kinematicRisk = 0.25;
  }

  // 4. Diurnal Temporal Factor T_diurnal(t)
  let diurnalRisk = calculateDiurnalMultiplier();
  if (diurnalRisk >= 0.8) {
    reasons.push("Elevated risk: Nighttime isolated trek corridor");
  }

  // 5. Device Vitals Factor V(t)
  let vitalsRisk = 0.05;
  if (batteryLevel !== null && batteryLevel <= 15) {
    vitalsRisk += 0.45;
    reasons.push(`Critical battery warning (${batteryLevel}%)`);
  }
  if (!isOnline) {
    vitalsRisk += 0.40;
    reasons.push("Complete radio blackout (Zero-Network fallback active)");
  }
  vitalsRisk = Math.min(1.0, vitalsRisk);

  // Apply simulated overrides if in test bench mode
  if (simulatedOverrides?.geofenceRisk !== undefined) {
    geofenceRisk = simulatedOverrides.geofenceRisk;
    if (geofenceRisk >= 0.7) reasons.push("[Simulated] Hazardous geofence boundary breached");
  }
  if (simulatedOverrides?.routeDriftRisk !== undefined) {
    routeDriftRisk = simulatedOverrides.routeDriftRisk;
    if (routeDriftRisk >= 0.7) reasons.push("[Simulated] Severe off-trail route deviation");
  }
  if (simulatedOverrides?.kinematicRisk !== undefined) {
    kinematicRisk = simulatedOverrides.kinematicRisk;
    if (kinematicRisk >= 0.7) reasons.push("[Simulated] High-g violent impact detected");
  }
  if (simulatedOverrides?.diurnalRisk !== undefined) {
    diurnalRisk = simulatedOverrides.diurnalRisk;
    if (diurnalRisk >= 0.7) reasons.push("[Simulated] Late-night isolated corridor");
  }
  if (simulatedOverrides?.vitalsRisk !== undefined) {
    vitalsRisk = simulatedOverrides.vitalsRisk;
    if (vitalsRisk >= 0.7) reasons.push("[Simulated] Complete radio blackout & low battery");
  }

  // Compute weighted sum R(t)
  const totalRisk = Math.max(
    0.0,
    Math.min(
      1.0,
      weights.geofence * geofenceRisk +
        weights.route * routeDriftRisk +
        weights.kinematics * kinematicRisk +
        weights.diurnal * diurnalRisk +
        weights.vitals * vitalsRisk,
    ),
  );

  // Determine Escalation Ladder Tier
  let tier: EscalationTier = "L0_NOMINAL";
  if (totalRisk >= 0.75 || kinematics.fallDetected) {
    tier = "L3_CRISIS";
  } else if (totalRisk >= 0.60) {
    tier = "L2_ANOMALY";
  } else if (totalRisk >= 0.40) {
    tier = "L1_CAUTION";
  }

  return {
    totalRisk,
    geofenceRisk,
    routeDriftRisk,
    kinematicRisk,
    diurnalRisk,
    vitalsRisk,
    tier,
    reasons,
    calculatedAt: new Date().toISOString(),
  };
}
