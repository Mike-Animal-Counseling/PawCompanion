// services/riskScoring.js
// User-level risk scoring over time: rolling windows, decay, status (ok | watch | flagged).
// No raw message text is stored.

import UserRiskProfile from "../models/UserRiskProfile.js";
import RiskEvent from "../models/RiskEvent.js";

// Half-life 3 days for 7d window, 10 days for 30d window
// newScore = oldScore * exp(-lambda * daysElapsed)
const HALF_LIFE_7D = 3;
const HALF_LIFE_30D = 10;
const LAMBDA_7D = Math.log(2) / HALF_LIFE_7D;
const LAMBDA_30D = Math.log(2) / HALF_LIFE_30D;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Apply exponential decay to a score.
 * @param {number} oldScore - Current score
 * @param {number} daysElapsed - Days since last update
 * @param {number} lambda - Decay constant (ln(2) / halfLifeDays)
 * @returns {number} Decayed score
 */
function applyDecay(oldScore, daysElapsed, lambda) {
  if (oldScore <= 0 || daysElapsed <= 0) return oldScore;
  return oldScore * Math.exp(-lambda * daysElapsed);
}

/**
 * Level ordering for maxLevel30d: none < medium < high
 */
function levelRank(level) {
  const r = { none: 0, medium: 1, high: 2 };
  return r[level] ?? 0;
}

/**
 * Compute points for a risk result.
 * medium → 2 * score, high → 6 * score.
 * Uses default score if risk.score is undefined (0.8 medium, 0.9 high).
 */
function riskToPoints(risk) {
  const level = risk?.level || "none";
  let score = Number(risk?.score);
  if (!Number.isFinite(score) || score < 0) {
    score = level === "high" ? 0.9 : 0.8;
  }
  score = Math.min(1, Math.max(0, score));
  if (level === "medium") return 2 * score;
  if (level === "high") return 6 * score;
  return 0;
}

/**
 * Record a risk event (if medium/high) and update the user's risk profile.
 * Always updates lastActiveAt. Does not store raw message text.
 *
 * @param {Object} params
 * @param {string} params.userId - User identifier
 * @param {string} params.animalId - Animal (conversation) identifier
 * @param {Object} params.risk - Result from detectSelfHarm: { flagged, level, score?, source? }
 * @returns {Promise<Object>} Updated UserRiskProfile (or existing profile when level is none)
 */
export async function recordRiskEventAndUpdateProfile({
  userId,
  animalId,
  risk,
}) {
  const now = new Date();

  let profile = await UserRiskProfile.findOne({ userId });
  if (!profile) {
    profile = new UserRiskProfile({
      userId,
      score7d: 0,
      score30d: 0,
      events7d: 0,
      events30d: 0,
      maxLevel30d: "none",
      status: "ok",
    });
  }

  profile.lastActiveAt = now;

  const level = risk?.level || "none";
  if (level === "none") {
    await profile.save();
    return profile;
  }

  // Store event (no raw message)
  await RiskEvent.create({
    userId,
    animalId,
    timestamp: now,
    level,
    score: risk?.score,
    source: risk?.source,
  });

  const lastRiskAt = profile.lastRiskAt || profile.createdAt || now;
  const daysElapsed = (now - lastRiskAt) / MS_PER_DAY;

  profile.score7d = applyDecay(profile.score7d, daysElapsed, LAMBDA_7D);
  profile.score30d = applyDecay(profile.score30d, daysElapsed, LAMBDA_30D);

  const points = riskToPoints(risk);
  profile.score7d += points;
  profile.score30d += points;
  profile.lastRiskAt = now;

  const cutoff7d = new Date(now - 7 * MS_PER_DAY);
  const cutoff30d = new Date(now - 30 * MS_PER_DAY);

  const [events7d, events30d, highEvents7d] = await Promise.all([
    RiskEvent.countDocuments({ userId, timestamp: { $gte: cutoff7d } }),
    RiskEvent.countDocuments({ userId, timestamp: { $gte: cutoff30d } }),
    RiskEvent.countDocuments({
      userId,
      level: "high",
      timestamp: { $gte: cutoff7d },
    }),
  ]);

  profile.events7d = events7d;
  profile.events30d = events30d;

  if (levelRank(level) > levelRank(profile.maxLevel30d)) {
    profile.maxLevel30d = level;
  }

  // Status: flagged takes precedence, then watch, then ok
  if (profile.score30d >= 18 || highEvents7d >= 2) {
    profile.status = "flagged";
    profile.flagReason =
      profile.score30d >= 18 ? "score_30d" : "high_events_7d";
  } else if (profile.score7d >= 10) {
    profile.status = "watch";
    profile.flagReason = undefined;
  } else {
    profile.status = "ok";
    profile.flagReason = undefined;
  }

  await profile.save();
  return profile;
}

/**
 * Daily scan: flag users who have been inactive 14+ days and have score30d >= 18.
 * Exported for use by a cron/scheduler; not auto-scheduled.
 *
 * @returns {Promise<{ updated: number, profiles: Object[] }>}
 */
export async function scanInactiveHighRiskUsers() {
  const now = new Date();
  const inactiveCutoff = new Date(now - 14 * MS_PER_DAY);

  const profiles = await UserRiskProfile.find({
    lastActiveAt: { $lt: inactiveCutoff },
    score30d: { $gte: 18 },
    status: { $ne: "flagged" },
  });

  for (const profile of profiles) {
    profile.status = "flagged";
    profile.flagReason = "inactive_high_risk";
    await profile.save();
  }

  return { updated: profiles.length, profiles };
}
