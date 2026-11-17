"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Siren,
  Activity,
  Compass,
  Navigation,
  Clock,
  Battery,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  CheckCircle2,
  Lock,
  KeyRound,
  Radio,
  FileText,
  PhoneCall,
  Send,
} from "lucide-react";

import {
  type EscalationTier,
  type Coordinate,
  type KinematicSnapshot,
  type SentinelDangerBreakdown,
  evaluateDangerIndex,
  DEFAULT_SENTINEL_CONFIG,
  DEFAULT_OFFLINE_ZONES,
} from "@/lib/safety/sentinel-engine";
import {
  playAdvisoryChime,
  playDeadManPulse,
  playSosDispatchedSiren,
} from "@/lib/safety/web-audio-alarm";
import {
  getActiveFlightPlan,
  saveFlightPlan,
  checkInFlightPlan,
  completeFlightPlan,
  generateDirectGsmSmsUri,
  generateDirectGsmCallUri,
  setupReconnectionBurstSync,
  type FlightPlan,
} from "@/lib/safety/offline-watchdog";
import { enqueueSos, type QueuedSos } from "@/lib/safety/sos-queue";

type SentinelAgentPanelProps = {
  sessionId?: string | null;
  tripId?: string | null;
  travelerName?: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

export default function SentinelAgentPanel({
  sessionId,
  tripId,
  travelerName = "Solo Traveler",
  emergencyContactName = "Primary Contact",
  emergencyContactPhone = "+15551234567",
}: SentinelAgentPanelProps) {
  // Sentinel state
  const [isArmed, setIsArmed] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(82);

  // Live telemetry
  const [coords, setCoords] = useState<Coordinate | null>({
    lat: 28.6139,
    lng: 77.2090,
    accuracy: 8,
    speed: 1.2,
    heading: 45,
    altitude: 216,
  });

  const [kinematics, setKinematics] = useState<KinematicSnapshot>({
    accelMagnitude: 9.81,
    shockG: 1.0,
    isImmobile: false,
    fallDetected: false,
    variance: 0.04,
  });

  // Danger breakdown
  const [breakdown, setBreakdown] = useState<SentinelDangerBreakdown>({
    totalRisk: 0.18,
    geofenceRisk: 0.1,
    routeDriftRisk: 0.05,
    kinematicRisk: 0.05,
    diurnalRisk: 0.15,
    vitalsRisk: 0.05,
    tier: "L0_NOMINAL",
    reasons: [],
    calculatedAt: new Date().toISOString(),
  });

  // Simulation overrides
  const [simulatedOverrides, setSimulatedOverrides] = useState<
    Partial<SentinelDangerBreakdown>
  >({});
  const [activeSimulationLabel, setActiveSimulationLabel] = useState<string | null>(null);

  // Dead-Man Challenge Loop state (Level 2)
  const [deadManActive, setDeadManActive] = useState(false);
  const [deadManSecondsLeft, setDeadManSecondsLeft] = useState(90);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinFeedback, setPinFeedback] = useState<string | null>(null);
  const [duressDeceptionActive, setDuressDeceptionActive] = useState(false);
  const [sosDispatchedNotification, setSosDispatchedNotification] = useState<string | null>(null);

  // Inverted Watchdog Flight Plan
  const [flightPlan, setFlightPlan] = useState<FlightPlan | null>(null);
  const [flightPlanDestination, setFlightPlanDestination] = useState("Rohtang Pass Alpine Trail");
  const [flightPlanHours, setFlightPlanHours] = useState(2);
  const [watchdogRemainingMin, setWatchdogRemainingMin] = useState<number | null>(null);

  const deadManTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sentinelTickRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial setup: battery & flight plan
  useEffect(() => {
    setOnlineStatus(typeof navigator !== "undefined" ? navigator.onLine : true);

    const updateOnline = () => setOnlineStatus(true);
    const updateOffline = () => setOnlineStatus(false);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOffline);

    // Try reading device battery if Battery API available
    if (typeof navigator !== "undefined" && "getBattery" in navigator) {
      (navigator as unknown as { getBattery: () => Promise<{ level: number }> })
        .getBattery()
        .then((battery) => {
          setBatteryLevel(Math.round(battery.level * 100));
        })
        .catch(() => undefined);
    }

    // Load active flight plan
    const existingPlan = getActiveFlightPlan();
    if (existingPlan) setFlightPlan(existingPlan);

    // Setup reconnection burst sync
    const cleanupSync = setupReconnectionBurstSync(() => {
      console.info("Reconnection sync triggered from Sentinel Panel");
    });

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOffline);
      cleanupSync();
    };
  }, []);

  // 2. Flight plan countdown timer
  useEffect(() => {
    if (!flightPlan || flightPlan.status !== "ACTIVE") {
      setWatchdogRemainingMin(null);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = new Date(flightPlan.expectedReturnAt).getTime() - Date.now();
      const minutes = Math.round(remainingMs / 60000);
      setWatchdogRemainingMin(minutes);

      if (remainingMs <= 0 && flightPlan.status === "ACTIVE") {
        flightPlan.status = "OVERDUE";
        setFlightPlan({ ...flightPlan });
        saveFlightPlan(flightPlan);
      }
    }, 10000);

    const initialMs = new Date(flightPlan.expectedReturnAt).getTime() - Date.now();
    setWatchdogRemainingMin(Math.round(initialMs / 60000));

    return () => clearInterval(interval);
  }, [flightPlan]);

  // 3. Real device sensors (DeviceMotionEvent)
  useEffect(() => {
    if (!isArmed || typeof window === "undefined" || !window.DeviceMotionEvent) return;

    let lastAccel = 9.81;
    let shockDetected = false;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const shockG = mag / 9.81;

      if (shockG > 2.8 && !shockDetected) {
        shockDetected = true;
        setKinematics((prev) => ({
          ...prev,
          accelMagnitude: mag,
          shockG,
          fallDetected: true,
        }));
        setTimeout(() => {
          shockDetected = false;
        }, 15000);
      } else {
        setKinematics((prev) => ({
          ...prev,
          accelMagnitude: mag,
          shockG,
          isImmobile: Math.abs(mag - lastAccel) < 0.2,
          variance: Math.abs(mag - lastAccel),
        }));
      }
      lastAccel = mag;
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [isArmed]);

  // 4. Autonomous Sentinel Evaluation Loop (Adaptive Duty Cycle)
  useEffect(() => {
    if (!isArmed) return;

    const tick = () => {
      const evaluation = evaluateDangerIndex({
        coords,
        kinematics,
        batteryLevel,
        isOnline: onlineStatus,
        routeWaypoints: [
          { lat: 28.6139, lng: 77.2090 },
          { lat: 28.6150, lng: 77.2110 },
          { lat: 28.6180, lng: 77.2150 },
        ],
        simulatedOverrides,
      });

      setBreakdown(evaluation);

      // Level 1: Advisory Alert
      if (evaluation.tier === "L1_CAUTION" && breakdown.tier === "L0_NOMINAL") {
        if (soundEnabled) playAdvisoryChime();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      }

      // Level 2: Anomaly -> Start Dead-Man Challenge Loop
      if (evaluation.tier === "L2_ANOMALY" && !deadManActive && !duressDeceptionActive) {
        startDeadManChallenge();
      }

      // Level 3: Crisis -> Immediate Autonomous SOS Broadcast
      if (evaluation.tier === "L3_CRISIS" && !sosDispatchedNotification) {
        triggerAutonomousSos("CRISIS_THRESHOLD_EXCEEDED", evaluation);
      }
    };

    // Sampling rate: faster (3s) when danger is elevated, slower (15s) when nominal
    const intervalMs =
      breakdown.tier === "L2_ANOMALY" || breakdown.tier === "L3_CRISIS"
        ? 3000
        : breakdown.tier === "L1_CAUTION"
          ? 5000
          : 12000;

    sentinelTickRef.current = setTimeout(tick, intervalMs);

    return () => {
      if (sentinelTickRef.current) clearTimeout(sentinelTickRef.current);
    };
  }, [
    isArmed,
    coords,
    kinematics,
    batteryLevel,
    onlineStatus,
    simulatedOverrides,
    breakdown.tier,
    deadManActive,
    duressDeceptionActive,
    soundEnabled,
    sosDispatchedNotification,
  ]);

  // 5. Dead-Man 90-Second Countdown Loop
  const startDeadManChallenge = useCallback(() => {
    setDeadManActive(true);
    setDeadManSecondsLeft(90);
    setEnteredPin("");
    setPinFeedback(null);

    if (deadManTimerRef.current) clearInterval(deadManTimerRef.current);

    deadManTimerRef.current = setInterval(() => {
      setDeadManSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(deadManTimerRef.current!);
          setDeadManActive(false);
          // Escalation: Timer ran out! Autonomous SOS triggered!
          triggerAutonomousSos("DEAD_MAN_EXPIRED", breakdown);
          return 0;
        }

        // Periodic warning chime
        if (soundEnabled && prev % 10 === 0) {
          const urgency = 1 - prev / 90;
          playDeadManPulse(urgency);
        }

        return prev - 1;
      });
    }, 1000);
  }, [soundEnabled, breakdown]);

  // 6. Handle PIN Verification (Safe PIN vs Duress PIN)
  const handlePinSubmit = () => {
    if (enteredPin === DEFAULT_SENTINEL_CONFIG.safePin) {
      // Safe PIN: Disarm Dead-Man Loop cleanly
      if (deadManTimerRef.current) clearInterval(deadManTimerRef.current);
      setDeadManActive(false);
      setEnteredPin("");
      setPinFeedback("Safe PIN verified. Alarm cancelled.");
      setSimulatedOverrides({});
      setActiveSimulationLabel(null);
    } else if (enteredPin === DEFAULT_SENTINEL_CONFIG.duressPin) {
      // Duress PIN: Deceptive "All Clear" shown to attacker, silent covert SOS sent!
      if (deadManTimerRef.current) clearInterval(deadManTimerRef.current);
      setDeadManActive(false);
      setEnteredPin("");
      setDuressDeceptionActive(true);
      setPinFeedback("Safe PIN accepted. Alarm deactivated.");

      // Covert dispatch
      triggerAutonomousSos("SILENT_DURESS_COERCION", breakdown, true);
    } else {
      setPinFeedback("Incorrect PIN. Please re-enter.");
      setEnteredPin("");
    }
  };

  // 7. Dispatch Autonomous SOS
  const triggerAutonomousSos = async (
    reason: string,
    evalBreakdown: SentinelDangerBreakdown,
    isDuress = false,
  ) => {
    if (soundEnabled && !isDuress) {
      playSosDispatchedSiren();
    }

    const payload = {
      coords,
      breakdown: evalBreakdown,
      isDuress,
      triggerType: reason,
      note: `Autonomous Sentinel: ${reason}`,
      sessionId: sessionId || null,
      tripId: tripId || null,
    };

    setSosDispatchedNotification(
      isDuress
        ? "Covert silent SOS dispatched to authorities and emergency contacts."
        : `Autonomous SOS broadcasted! (${reason})`,
    );

    // If online: send to Sentinel API
    if (onlineStatus && typeof window !== "undefined") {
      try {
        await fetch("/api/safety/sentinel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn("Backend dispatch failed, enqueuing to offline queue:", err);
        // Fallback to offline queue
        enqueueOfflineSos(reason, isDuress);
      }
    } else {
      // Offline: Enqueue to IndexedDB
      enqueueOfflineSos(reason, isDuress);
    }
  };

  const enqueueOfflineSos = async (reason: string, isDuress: boolean) => {
    const offlinePayload: QueuedSos = {
      sosId: crypto.randomUUID(),
      sessionId: sessionId || null,
      tripId: tripId || null,
      incidentType: isDuress ? "silent_duress_sos" : "autonomous_sentinel_sos",
      description: `Autonomous Sentinel SOS [Offline-Queued]: ${reason}`,
      locationNote: "Radio blackout recorded on edge device",
      syncStatus: "PENDING_SYNC",
      createdAt: new Date().toISOString(),
      status: "PENDING_SYNC",
      location: {
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        accuracy: coords?.accuracy ?? null,
        timestamp: new Date().toISOString(),
        locationSource: coords ? "CURRENT_GPS" : "UNAVAILABLE",
        confidence: coords ? 0.9 : 0.2,
      },
      deviceInfo: {
        isDuress,
        dangerScore: breakdown.totalRisk,
        tier: breakdown.tier,
      },
    };

    await enqueueSos(offlinePayload);
  };

  // Simulation Presets
  const runSimulation = (name: string, overrides: Partial<SentinelDangerBreakdown>) => {
    setActiveSimulationLabel(name);
    setSimulatedOverrides(overrides);
    setSosDispatchedNotification(null);
  };

  const resetSimulation = () => {
    setActiveSimulationLabel(null);
    setSimulatedOverrides({});
    setDeadManActive(false);
    setDuressDeceptionActive(false);
    setSosDispatchedNotification(null);
    if (deadManTimerRef.current) clearInterval(deadManTimerRef.current);
  };

  // Watchdog Flight Plan Actions
  const handleArmFlightPlan = async () => {
    const returnAt = new Date(Date.now() + flightPlanHours * 3600000).toISOString();
    const newPlan: FlightPlan = {
      id: crypto.randomUUID(),
      destination: flightPlanDestination,
      expectedReturnAt: returnAt,
      createdAt: new Date().toISOString(),
      status: "ACTIVE",
      checkInIntervalMinutes: 60,
      lastCheckInAt: new Date().toISOString(),
      emergencyContacts: [
        {
          name: emergencyContactName || "Primary Contact",
          phone: emergencyContactPhone || "+91-112",
        },
      ],
      notes: "Solo hiking trail monitoring",
    };

    saveFlightPlan(newPlan);
    setFlightPlan(newPlan);

    if (onlineStatus) {
      await fetch("/api/safety/watchdog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: flightPlanDestination,
          expectedReturnAt: returnAt,
          contacts: newPlan.emergencyContacts,
        }),
      }).catch(() => undefined);
    }
  };

  const handleCheckInFlightPlan = async () => {
    const updated = checkInFlightPlan(60); // extend by 1 hr
    if (updated) {
      setFlightPlan({ ...updated });
      if (onlineStatus) {
        await fetch("/api/safety/watchdog", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "CHECK_IN" }),
        }).catch(() => undefined);
      }
    }
  };

  const handleCompleteFlightPlan = async () => {
    completeFlightPlan();
    setFlightPlan(null);
    if (onlineStatus) {
      await fetch("/api/safety/watchdog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMPLETE" }),
      }).catch(() => undefined);
    }
  };

  const fallbackEmergencyPhone = emergencyContactPhone || "+91-112";

  // GSM Fallback URIs
  const directSmsUri = generateDirectGsmSmsUri({
    emergencyPhone: fallbackEmergencyPhone,
    travelerName,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    accuracy: coords?.accuracy ?? null,
    dangerScore: breakdown.totalRisk,
    batteryLevel,
    isDuress: duressDeceptionActive,
  });

  const directCallUri = generateDirectGsmCallUri(fallbackEmergencyPhone);

  // Visual formatting
  const tierColor =
    breakdown.tier === "L3_CRISIS"
      ? "text-red-700 bg-red-50 border-red-300"
      : breakdown.tier === "L2_ANOMALY"
        ? "text-orange-700 bg-orange-50 border-orange-300"
        : breakdown.tier === "L1_CAUTION"
          ? "text-yellow-700 bg-yellow-50 border-yellow-300"
          : "text-emerald-700 bg-emerald-50 border-emerald-300";

  const tierBadge =
    breakdown.tier === "L3_CRISIS"
      ? "CRISIS (Level 3)"
      : breakdown.tier === "L2_ANOMALY"
        ? "ANOMALY (Level 2)"
        : breakdown.tier === "L1_CAUTION"
          ? "CAUTION (Level 1)"
          : "NOMINAL (Level 0)";

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Radar Status */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${isArmed ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-[family-name:var(--font-heading)] text-xl font-bold">
                  Autonomous Sentinel Agent
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${isArmed ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                  {isArmed ? "Armed & Monitoring" : "Standby"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                Continuous edge kinematics, spatial geofences, and zero-network watchdog protection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              title={soundEnabled ? "Mute audio alarms" : "Enable audio alarms"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4 text-gray-400" />}
              {soundEnabled ? "Audio On" : "Muted"}
            </button>

            <button
              type="button"
              onClick={() => setIsArmed(!isArmed)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                isArmed ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" : "bg-[var(--secondary)] text-white hover:opacity-90"
              }`}
            >
              {isArmed ? "Disarm Sentinel" : "Arm Sentinel"}
            </button>
          </div>
        </div>

        {/* 2. Threat Gauge & Telemetry Strip */}
        <div className="grid gap-6 p-5 lg:grid-cols-3">
          {/* Risk Gauge */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-[#FAF9F6] p-5 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Multi-Factor Danger Score R(t)
            </div>
            <div className="relative mt-3 flex items-center justify-center">
              <svg className="h-32 w-32 -rotate-90 transform">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  stroke="#E2E8F0"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  stroke={
                    breakdown.totalRisk >= 0.75
                      ? "#DC2626"
                      : breakdown.totalRisk >= 0.6
                        ? "#EA580C"
                        : breakdown.totalRisk >= 0.4
                          ? "#CA8A04"
                          : "#16A34A"
                  }
                  strokeWidth="10"
                  strokeDasharray={326.7}
                  strokeDashoffset={326.7 * (1 - breakdown.totalRisk)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-[family-name:var(--font-heading)] text-3xl font-extrabold text-gray-900">
                  {Math.round(breakdown.totalRisk * 100)}%
                </span>
                <span className="text-[10px] font-bold uppercase text-gray-400">
                  Danger Index
                </span>
              </div>
            </div>

            <div className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold ${tierColor}`}>
              <Activity className="h-3.5 w-3.5" />
              {tierBadge}
            </div>
          </div>

          {/* Real-time Telemetry Vectors */}
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-gray-100 bg-[#FAF9F6] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Edge Telemetry Vectors
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white p-2.5 border border-gray-100">
                <div className="text-gray-400">Kinematics</div>
                <div className="mt-0.5 font-bold text-gray-800">
                  {kinematics.shockG.toFixed(1)}g ({kinematics.accelMagnitude.toFixed(1)} m/s²)
                </div>
                <div className="text-[10px] text-gray-500">
                  {kinematics.fallDetected ? "🚨 Fall Spike!" : "Nominal Motion"}
                </div>
              </div>

              <div className="rounded-lg bg-white p-2.5 border border-gray-100">
                <div className="text-gray-400">GNSS Accuracy</div>
                <div className="mt-0.5 font-bold text-gray-800">
                  ±{coords?.accuracy ? Math.round(coords.accuracy) : "--"} meters
                </div>
                <div className="text-[10px] text-gray-500">Satellite Fix</div>
              </div>

              <div className="rounded-lg bg-white p-2.5 border border-gray-100">
                <div className="text-gray-400">Route Deviation</div>
                <div className="mt-0.5 font-bold text-gray-800">
                  {breakdown.routeDriftRisk > 0.3 ? "Off Planned Trail" : "On Route (<50m)"}
                </div>
                <div className="text-[10px] text-gray-500">
                  Weight: {Math.round(breakdown.routeDriftRisk * 100)}%
                </div>
              </div>

              <div className="rounded-lg bg-white p-2.5 border border-gray-100">
                <div className="text-gray-400">Diurnal Factor</div>
                <div className="mt-0.5 font-bold text-gray-800">
                  {Math.round(breakdown.diurnalRisk * 100)}% Risk
                </div>
                <div className="text-[10px] text-gray-500">
                  {breakdown.diurnalRisk > 0.6 ? "Night Corridor" : "Daylight Safe"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200/60 pt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                {onlineStatus ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5 text-red-600" />}
                {onlineStatus ? "Network Connected" : "Radio Blackout"}
              </span>
              <span className="flex items-center gap-1">
                <Battery className="h-3.5 w-3.5 text-gray-500" />
                {batteryLevel !== null ? `${batteryLevel}%` : "100%"}
              </span>
            </div>
          </div>

          {/* Active Risk Factors & Alerts */}
          <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-[#FAF9F6] p-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Active Hazard Factors
              </div>
              <div className="mt-3 space-y-2">
                {breakdown.reasons.length > 0 ? (
                  breakdown.reasons.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-red-50/70 p-2 text-xs font-semibold text-red-800 border border-red-100"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                      <span>{r}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50/70 p-3 text-xs font-semibold text-emerald-800 border border-emerald-100">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>All parameters nominal. Travel path clear.</span>
                  </div>
                )}
              </div>
            </div>

            {sosDispatchedNotification ? (
              <div className="mt-3 rounded-lg border border-red-300 bg-red-100 p-2.5 text-xs font-bold text-red-900">
                {sosDispatchedNotification}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 3. Dead-Man's Challenge Modal (Level 2 Escalation) */}
      {deadManActive ? (
        <div className="rounded-xl border-2 border-orange-400 bg-orange-50 p-6 shadow-md animate-pulse">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-orange-200 p-3 text-orange-800">
              <Siren className="h-8 w-8 animate-bounce" />
            </div>
            <h4 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-black text-orange-900">
              DEAD-MAN CHALLENGE LOOP ACTIVE
            </h4>
            <p className="mt-1 max-w-md text-sm text-orange-800">
              Anomaly detected (Risk {Math.round(breakdown.totalRisk * 100)}%). Enter your Safe PIN to cancel.
              If no response, autonomous Level 3 SOS will dispatch when timer expires.
            </p>

            {/* Countdown circular display */}
            <div className="mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-white font-[family-name:var(--font-heading)] text-3xl font-extrabold text-orange-700 shadow-inner">
              {deadManSecondsLeft}s
            </div>

            {/* PIN Entry */}
            <div className="mt-5 flex w-full max-w-xs flex-col items-center gap-2">
              <div className="flex w-full items-center gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Enter 4-Digit PIN"
                  className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-center text-lg font-bold tracking-widest outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  type="button"
                  onClick={handlePinSubmit}
                  className="rounded-lg bg-orange-600 px-4 py-2 font-bold text-white hover:bg-orange-700"
                >
                  Verify
                </button>
              </div>

              {pinFeedback ? (
                <div className="text-xs font-bold text-orange-900">{pinFeedback}</div>
              ) : (
                <div className="text-[11px] text-orange-700">
                  Default Demo: Safe PIN: <code className="font-bold">1234</code> | Duress PIN: <code className="font-bold">9999</code>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 4. Deceptive Anti-Coercion "Alarm Cancelled" Banner (Duress Mode) */}
      {duressDeceptionActive ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <div className="font-bold text-emerald-900">Safety Check Confirmed — Alarm Deactivated</div>
              <p className="text-xs text-emerald-700">
                All monitoring alerts disarmed. Safe travel mode resumed.
              </p>
            </div>
          </div>
          {/* Silent covert indicator visible only for verification */}
          <div className="mt-2 text-[10px] text-emerald-600/70 italic">
            [Silent Duress Channel: SOS payload transmitted covertly with live coordinates to dispatch network]
          </div>
        </div>
      ) : null}

      {/* 5. Interactive Simulation Test Bench */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-[var(--secondary)]" />
            <h4 className="font-[family-name:var(--font-heading)] text-lg font-bold">
              Autonomous Sentinel Incident Simulator
            </h4>
          </div>
          {activeSimulationLabel ? (
            <button
              type="button"
              onClick={resetSimulation}
              className="flex items-center gap-1 text-xs font-bold text-red-600 hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Simulation
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Test real-time Sentinel edge reactions, dead-man escalation, and zero-network protocols by simulating critical travel scenarios.
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              runSimulation("High-G Fall & Impact", {
                kinematicRisk: 0.95,
              })
            }
            className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-left hover:bg-orange-50 hover:border-orange-200 transition-colors"
          >
            <Activity className="h-4 w-4 text-orange-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-gray-800">Simulate Fall / Impact Shock</div>
              <div className="text-[10px] text-gray-500">3.4g peak spike followed by immobility</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              runSimulation("Hazardous Geofence Breach", {
                geofenceRisk: 0.90,
              })
            }
            className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-left hover:bg-red-50 hover:border-red-200 transition-colors"
          >
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-gray-800">Simulate Geofence Breach</div>
              <div className="text-[10px] text-gray-500">Enter unlit ridge hazard polygon</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              runSimulation("Off-Trail Route Deviation", {
                routeDriftRisk: 0.85,
              })
            }
            className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-left hover:bg-yellow-50 hover:border-yellow-200 transition-colors"
          >
            <Compass className="h-4 w-4 text-yellow-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-gray-800">Simulate 800m Route Drift</div>
              <div className="text-[10px] text-gray-500">Severe deviation from planned trail</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              runSimulation("Late Night Isolated Corridor", {
                diurnalRisk: 0.95,
                geofenceRisk: 0.65,
              })
            }
            className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-left hover:bg-purple-50 hover:border-purple-200 transition-colors"
          >
            <Clock className="h-4 w-4 text-purple-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-gray-800">Simulate Night-Time Risk</div>
              <div className="text-[10px] text-gray-500">High diurnal temporal multiplier</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setOnlineStatus(false);
              runSimulation("Complete Radio Blackout", {
                vitalsRisk: 0.80,
              });
            }}
            className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-left hover:bg-gray-100 hover:border-gray-300 transition-colors"
          >
            <WifiOff className="h-4 w-4 text-gray-700 shrink-0" />
            <div>
              <div className="text-xs font-bold text-gray-800">Simulate Radio Blackout</div>
              <div className="text-[10px] text-gray-500">Zero-network fallback protocol</div>
            </div>
          </button>

          <button
            type="button"
            onClick={startDeadManChallenge}
            className="flex items-center gap-2.5 rounded-lg border border-orange-200 bg-orange-50/50 p-3 text-left hover:bg-orange-100 transition-colors"
          >
            <Siren className="h-4 w-4 text-orange-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-orange-900">Trigger Dead-Man Loop</div>
              <div className="text-[10px] text-orange-700">90s interactive countdown & PIN</div>
            </div>
          </button>
        </div>
      </div>

      {/* 6. Inverted Cloud Watchdog ("Flight Plan" Scheduler) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--primary)]" />
            <h4 className="font-[family-name:var(--font-heading)] text-lg font-bold">
              Inverted Cloud Watchdog ("Flight Plan")
            </h4>
          </div>
          {flightPlan ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              WATCHDOG ARMED
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Before entering complete radio-blackout territory, arm a check-in deadline. If you do not check in before the timer expires, the cloud automatically notifies authorities with your planned route.
        </p>

        {flightPlan ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-bold text-emerald-900">{flightPlan.destination}</div>
                <div className="mt-1 text-xs text-emerald-700">
                  Expected Return: {new Date(flightPlan.expectedReturnAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {watchdogRemainingMin !== null ? ` (${watchdogRemainingMin} minutes remaining)` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCheckInFlightPlan}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Check In (+1hr)
                </button>
                <button
                  type="button"
                  onClick={handleCompleteFlightPlan}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Disarm Watchdog
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={flightPlanDestination}
              onChange={(e) => setFlightPlanDestination(e.target.value)}
              placeholder="Destination / Trail Name"
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-[var(--primary)]"
            />
            <select
              value={flightPlanHours}
              onChange={(e) => setFlightPlanHours(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-[var(--primary)]"
            >
              <option value={1}>Expected in 1 hour</option>
              <option value={2}>Expected in 2 hours</option>
              <option value={4}>Expected in 4 hours</option>
              <option value={8}>Expected in 8 hours</option>
            </select>
            <button
              type="button"
              onClick={handleArmFlightPlan}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              Arm Cloud Watchdog
            </button>
          </div>
        )}
      </div>

      {/* 7. Zero-Network GSM Telephony & SMS Fallback Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h4 className="font-[family-name:var(--font-heading)] text-lg font-bold">
          Zero-Network Direct GSM Dispatch
        </h4>
        <p className="mt-1 text-xs text-gray-500">
          Hardware-level GSM telephony fallback when cell data and internet are 100% disconnected.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href={directCallUri}
            className="flex items-center justify-center gap-2 rounded-lg bg-[var(--dark)] px-4 py-2.5 text-xs font-bold text-white hover:bg-black transition-colors"
          >
            <PhoneCall className="h-4 w-4" />
            Direct GSM Emergency Call
          </a>

          <a
            href={directSmsUri}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
          >
            <Send className="h-4 w-4" />
            Direct GPS Coordinates SMS
          </a>
        </div>
      </div>
    </div>
  );
}
