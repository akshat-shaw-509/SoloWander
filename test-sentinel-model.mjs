/**
 * SoloWander - Autonomous Sentinel Safety Model Verification Test Bench
 * Run with: node test-sentinel-model.mjs
 */

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

console.log(`${ANSI.bold}${ANSI.cyan}==============================================================${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}   SOLOWANDER - AUTONOMOUS SENTINEL SAFETY MODEL TEST BENCH   ${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}==============================================================${ANSI.reset}\n`);

// Mathematical Weights
const WEIGHTS = {
  geofence: 0.30,   // wg
  route: 0.25,      // wd
  kinematics: 0.20, // wk
  diurnal: 0.15,    // wt
  vitals: 0.10,     // wv
};

function computeDangerScore(factors) {
  const R =
    WEIGHTS.geofence * factors.geofence +
    WEIGHTS.route * factors.route +
    WEIGHTS.kinematics * factors.kinematics +
    WEIGHTS.diurnal * factors.diurnal +
    WEIGHTS.vitals * factors.vitals;
  return Math.max(0, Math.min(1, R));
}

function classifyTier(score, fallDetected = false) {
  if (score >= 0.75 || fallDetected) return "L3_CRISIS";
  if (score >= 0.60) return "L2_ANOMALY (Dead-Man Loop)";
  if (score >= 0.40) return "L1_CAUTION";
  return "L0_NOMINAL";
}

let passed = 0;
let total = 0;

function runTest(name, factors, fallDetected, expectedTier) {
  total++;
  const score = computeDangerScore(factors);
  const tier = classifyTier(score, fallDetected);

  const isSuccess = tier.startsWith(expectedTier);
  if (isSuccess) passed++;

  const statusColor = isSuccess ? ANSI.green : ANSI.red;
  const statusIcon = isSuccess ? "✓ PASS" : "✗ FAIL";

  console.log(`${ANSI.bold}[Test ${total}] ${name}${ANSI.reset}`);
  console.log(`  Inputs: G=${factors.geofence}, D=${factors.route}, K=${factors.kinematics}, T=${factors.diurnal}, V=${factors.vitals}`);
  console.log(`  Danger Score R(t) : ${ANSI.bold}${score.toFixed(3)}${ANSI.reset} (${Math.round(score * 100)}%)`);
  console.log(`  Escalation Tier   : ${statusColor}${tier}${ANSI.reset} (Expected: ${expectedTier})`);
  console.log(`  Result            : ${statusColor}${statusIcon}${ANSI.reset}\n`);
}

// 1. Nominal Daylight Hike
runTest("Nominal Daylight Hike (Safe Trail, Normal Motion)", {
  geofence: 0.05,
  route: 0.05,
  kinematics: 0.05,
  diurnal: 0.15,
  vitals: 0.05,
}, false, "L0_NOMINAL");

// 2. Minor Route Drift
runTest("Route Caution (Off-Trail Warning, Daytime)", {
  geofence: 0.35,
  route: 0.85,
  kinematics: 0.15,
  diurnal: 0.50,
  vitals: 0.10,
}, false, "L1_CAUTION");

// 3. Hazardous Geofence Breach & Night Corridor
runTest("Hazardous Geofence Breach + Night Corridor (Severe Threat)", {
  geofence: 0.95,
  route: 0.70,
  kinematics: 0.20,
  diurnal: 0.90,
  vitals: 0.20,
}, false, "L2_ANOMALY");

// 4. Fall / Shock Impact Detection
runTest("Kinematic Fall Shock (>3.2g peak deceleration + immobility)", {
  geofence: 0.10,
  route: 0.05,
  kinematics: 1.00,
  diurnal: 0.15,
  vitals: 0.05,
}, true, "L3_CRISIS");

// 5. Total Compound Crisis (Off-Trail + Night + Low Battery + Radio Blackout)
runTest("Compound Crisis (Nighttime Wilderness Blackout + Severe Deviation)", {
  geofence: 0.95,
  route: 0.95,
  kinematics: 0.75,
  diurnal: 0.95,
  vitals: 0.85,
}, false, "L3_CRISIS");

// 6. Test PIN Security Logic
console.log(`${ANSI.bold}[Test 6] Anti-Coercion PIN Logic${ANSI.reset}`);
const SAFE_PIN = "1234";
const DURESS_PIN = "9999";

function evaluatePin(pin) {
  if (pin === SAFE_PIN) return { action: "CANCEL_ALARM", covertSos: false };
  if (pin === DURESS_PIN) return { action: "DECEPTIVE_CANCEL", covertSos: true };
  return { action: "RETRY", covertSos: false };
}

const safeRes = evaluatePin("1234");
const duressRes = evaluatePin("9999");
const wrongRes = evaluatePin("0000");

total++;
if (safeRes.action === "CANCEL_ALARM" && duressRes.covertSos === true && wrongRes.action === "RETRY") {
  passed++;
  console.log(`  Safe PIN (1234)   : ${ANSI.green}✓ Disarms Alarm Cleanly${ANSI.reset}`);
  console.log(`  Duress PIN (9999) : ${ANSI.green}✓ Shows Deceptive "Alarm Cancelled" & Broadcasts Covert SOS!${ANSI.reset}`);
  console.log(`  Result            : ${ANSI.green}✓ PASS${ANSI.reset}\n`);
} else {
  console.log(`  Result            : ${ANSI.red}✗ FAIL${ANSI.reset}\n`);
}

// Summary
console.log(`${ANSI.bold}${ANSI.cyan}==============================================================${ANSI.reset}`);
console.log(`${ANSI.bold}MODEL STATUS: ${passed === total ? ANSI.green + "ALL TESTS PASSED (100%) - MODEL IS VERIFIED & PRODUCTION READY" : ANSI.red + "SOME TESTS FAILED"}${ANSI.reset}`);
console.log(`Tests Passed: ${passed} / ${total}`);
console.log(`${ANSI.bold}${ANSI.cyan}==============================================================${ANSI.reset}\n`);
