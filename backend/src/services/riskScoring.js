// Derived, time-decayed risk profile. Raw conversation text is never stored
// here; only the model/keyword level and score for each event.
import UserRiskProfile from '../models/UserRiskProfile.js';
import RiskEvent from '../models/RiskEvent.js';
import { MS_PER_DAY } from '../lib/time.js';

const HALF_LIFE_7D = 3;
const HALF_LIFE_30D = 10;
const LAMBDA_7D = Math.log(2) / HALF_LIFE_7D;
const LAMBDA_30D = Math.log(2) / HALF_LIFE_30D;

function decay(score, days, lambda) {
  if (score <= 0 || days <= 0) return score;
  return score * Math.exp(-lambda * days);
}

function levelRank(level) {
  return { none: 0, medium: 1, high: 2 }[level] ?? 0;
}

function pointsFor(risk) {
  const level = risk?.level || 'none';
  const raw = Number(risk?.score);
  const score = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : level === 'high' ? 0.95 : 0.62;
  if (level === 'medium') return 2 * score;
  if (level === 'high') return 6 * score;
  return 0;
}

export async function recordRiskEventAndUpdateProfile({ userId, animalId, risk }) {
  if (typeof userId !== 'string' || !/^[a-f\d]{24}$/i.test(userId)) throw new TypeError('Invalid risk profile identity');

  const now = new Date();
  let profile = await UserRiskProfile.findOne({ userId });
  if (!profile) {
    profile = new UserRiskProfile({ userId, status: 'ok', maxLevel30d: 'none' });
  }
  profile.lastActiveAt = now;

  const level = risk?.level || 'none';
  if (level === 'none') {
    await profile.save();
    return profile;
  }

  await RiskEvent.create({
    userId,
    animalId: String(animalId || ''),
    timestamp: now,
    level,
    score: risk?.score,
    source: risk?.source,
  });

  const lastRiskAt = profile.lastRiskAt || profile.createdAt || now;
  const days = Math.max(0, (now.getTime() - new Date(lastRiskAt).getTime()) / MS_PER_DAY);
  profile.score7d = decay(profile.score7d || 0, days, LAMBDA_7D) + pointsFor(risk);
  profile.score30d = decay(profile.score30d || 0, days, LAMBDA_30D) + pointsFor(risk);
  profile.lastRiskAt = now;

  const cutoff7d = new Date(now.getTime() - 7 * MS_PER_DAY);
  const cutoff30d = new Date(now.getTime() - 30 * MS_PER_DAY);
  const [events7d, events30d, highEvents7d] = await Promise.all([
    RiskEvent.countDocuments({ userId, timestamp: { $gte: cutoff7d } }),
    RiskEvent.countDocuments({ userId, timestamp: { $gte: cutoff30d } }),
    RiskEvent.countDocuments({ userId, level: 'high', timestamp: { $gte: cutoff7d } }),
  ]);

  profile.events7d = events7d;
  profile.events30d = events30d;
  if (levelRank(level) > levelRank(profile.maxLevel30d)) profile.maxLevel30d = level;

  if (profile.score30d >= 18 || highEvents7d >= 2) {
    profile.status = 'flagged';
    profile.flagReason = profile.score30d >= 18 ? 'score_30d' : 'high_events_7d';
  } else if (profile.score7d >= 10) {
    profile.status = 'watch';
    profile.flagReason = undefined;
  } else {
    profile.status = 'ok';
    profile.flagReason = undefined;
  }

  await profile.save();
  return profile;
}

export async function acknowledgeRiskProfile({ userId, adminId, resolve = false, note = '' }) {
  const update = {
    $set: {
      acknowledgedAt: new Date(),
      acknowledgedBy: String(adminId),
      ...(resolve ? { status: 'ok', flagReason: 'resolved_by_admin' } : {}),
      ...(note ? { adminNote: String(note).slice(0, 500) } : {}),
    },
  };
  return UserRiskProfile.findOneAndUpdate({ userId }, update, { new: true });
}

export async function deleteRiskData(userId) {
  const [events, profile] = await Promise.all([
    RiskEvent.deleteMany({ userId }),
    UserRiskProfile.deleteOne({ userId }),
  ]);
  return { eventsDeleted: events.deletedCount, profileDeleted: profile.deletedCount };
}

export async function scanInactiveHighRiskUsers() {
  const cutoff = new Date(Date.now() - 14 * MS_PER_DAY);
  const profiles = await UserRiskProfile.find({
    lastActiveAt: { $lt: cutoff },
    score30d: { $gte: 18 },
    status: { $ne: 'flagged' },
  });
  for (const profile of profiles) {
    profile.status = 'flagged';
    profile.flagReason = 'inactive_high_risk';
    await profile.save();
  }
  return { updated: profiles.length };
}
