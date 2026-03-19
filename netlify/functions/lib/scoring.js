const {
  CASTAWAYS,
  LEGACY_SCORE_WEEK,
  NO_SCORE_WEEKS,
  SCALED_SCORE_ALPHA,
  SCALED_SCORE_BASE_CAP,
  SCALED_SCORE_START_WEEK
} = require('./constants');
const {
  getLineupForWeek,
  getUserJoinedWeek,
  getWeekTransition,
  hasSavedLineupForWeek
} = require('./game');
const {
  normalizeScoreInclusionsMap,
  normalizeScoreOmissionsMap,
  normalizeSkippedWeeks
} = require('./normalize');
const { getBirthNameForUsername } = require('./profiles');

function getScoringVersionForWeek(week) {
  if (Number(week) === LEGACY_SCORE_WEEK) return 'legacy_v1';
  if (Number(week) >= SCALED_SCORE_START_WEEK) return 'scaled_v2';
  return 'legacy_v0';
}

function clampRank(rank, min, max) {
  if (!Number.isFinite(rank)) return min;
  return Math.max(min, Math.min(max, Math.round(rank)));
}

function roundToTenth(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 10) / 10;
}

function getWeekScoringStatus(db, username, week) {
  if (!username || !db.users?.[username]) {
    return {
      savedLineup: false,
      noScore: NO_SCORE_WEEKS.has(week),
      skipped: false,
      joinedLate: false,
      explicitOmit: false,
      explicitInclude: false,
      noSubmit: false,
      omitted: false
    };
  }
  const joinedWeek = getUserJoinedWeek(db, username);
  const skippedWeeks = normalizeSkippedWeeks(db.skips[username]);
  const omittedWeeks = normalizeScoreOmissionsMap(db.scoreOmissions[username]);
  const includedWeeks = normalizeScoreInclusionsMap(db.scoreInclusions[username]);
  const savedLineup = hasSavedLineupForWeek(db, username, week);
  const noScore = NO_SCORE_WEEKS.has(week);
  const skipped = Boolean(skippedWeeks[week]);
  const joinedLate = week < joinedWeek;
  const explicitOmit = Boolean(omittedWeeks[week]);
  const explicitInclude = Boolean(includedWeeks[week]);
  const noSubmit = week >= SCALED_SCORE_START_WEEK && !savedLineup && !joinedLate;
  const omitted = Boolean(explicitOmit || joinedLate || (noSubmit && !explicitInclude));
  return {
    savedLineup,
    noScore,
    skipped,
    joinedLate,
    explicitOmit,
    explicitInclude,
    noSubmit,
    omitted
  };
}

function computeLegacyWeekPoints(db, username, week) {
  const { previousWeekVotedOff: priorWeekVotedOff, currentWeekVotedOff } = getWeekTransition(db, week);
  const lineup = getLineupForWeek(db, username, week);
  const activeOrder = lineup.filter((id) => !priorWeekVotedOff[id]);
  const eliminations = [];
  for (const id of activeOrder) {
    if (!priorWeekVotedOff[id] && currentWeekVotedOff[id]) {
      const rank = activeOrder.indexOf(id) + 1;
      eliminations.push({
        id,
        name: CASTAWAYS.find((castaway) => castaway.id === id)?.name || id,
        rank,
        activeCount: activeOrder.length,
        points: rank
      });
    }
  }
  const points = eliminations.reduce((sum, entry) => sum + entry.points, 0);
  return { points, eliminations };
}

function getStoredLegacyWeekScore(db, username, week = LEGACY_SCORE_WEEK) {
  const weekMap = db.legacyWeekScores?.[week];
  if (!weekMap || typeof weekMap !== 'object') return 0;
  const value = Number(weekMap[username]);
  if (!Number.isFinite(value) || value < 0) return 0;
  return roundToTenth(value);
}

function computeScaledWeekPoints(db, username, week) {
  const { previousWeekVotedOff: priorWeekVotedOff, currentWeekVotedOff } = getWeekTransition(db, week);
  const lineup = getLineupForWeek(db, username, week);
  const activeOrder = lineup.filter((id) => !priorWeekVotedOff[id]);
  const N = activeOrder.length;
  if (N < 1) {
    return { points: 0, eliminations: [], cap: 0, activeCount: 0 };
  }

  const cap = SCALED_SCORE_BASE_CAP * Math.pow(N / SCALED_SCORE_BASE_CAP, SCALED_SCORE_ALPHA);
  const eliminations = [];
  for (const [index, id] of activeOrder.entries()) {
    if (!priorWeekVotedOff[id] && currentWeekVotedOff[id]) {
      const rawRank = index + 1;
      const rank = clampRank(rawRank, 1, N);
      const pointsRaw = N === 1
        ? 1
        : 1 + ((rank - 1) * (cap - 1)) / (N - 1);
      const points = roundToTenth(pointsRaw);
      eliminations.push({
        id,
        name: CASTAWAYS.find((castaway) => castaway.id === id)?.name || id,
        rank,
        activeCount: N,
        cap: roundToTenth(cap),
        points
      });
    }
  }

  if (!eliminations.length) {
    return { points: 0, eliminations: [], cap: roundToTenth(cap), activeCount: N };
  }

  const averagePoints = eliminations.reduce((sum, entry) => sum + entry.points, 0) / eliminations.length;
  return {
    points: roundToTenth(averagePoints),
    eliminations,
    cap: roundToTenth(cap),
    activeCount: N
  };
}

function computeScoreBreakdown(db, username) {
  let totalPoints = 0;
  const weekBreakdown = [];

  for (let week = 1; week <= db.game.currentWeek; week += 1) {
    const status = getWeekScoringStatus(db, username, week);
    const scoringVersion = getScoringVersionForWeek(week);

    if (status.skipped || status.noScore || status.omitted) {
      weekBreakdown.push({
        week,
        points: 0,
        scoringVersion,
        skipped: status.skipped,
        noScore: status.noScore,
        omitted: status.omitted,
        noSubmit: status.noSubmit,
        savedLineup: status.savedLineup,
        countedByAdmin: status.explicitInclude,
        eliminations: []
      });
      continue;
    }

    if (week === LEGACY_SCORE_WEEK) {
      const points = getStoredLegacyWeekScore(db, username, LEGACY_SCORE_WEEK);
      const { eliminations } = computeLegacyWeekPoints(db, username, week);
      if (points > 0 || eliminations.length > 0) {
        weekBreakdown.push({
          week,
          points: roundToTenth(points),
          scoringVersion: 'legacy_v1',
          eliminations
        });
        totalPoints = roundToTenth(totalPoints + points);
      }
      continue;
    }

    if (week >= SCALED_SCORE_START_WEEK) {
      const scaled = computeScaledWeekPoints(db, username, week);
      if (scaled.points > 0 || scaled.eliminations.length > 0) {
        weekBreakdown.push({
          week,
          points: roundToTenth(scaled.points),
          scoringVersion: 'scaled_v2',
          cap: scaled.cap,
          activeCount: scaled.activeCount,
          eliminations: scaled.eliminations
        });
        totalPoints = roundToTenth(totalPoints + scaled.points);
      }
      continue;
    }

    const legacy = computeLegacyWeekPoints(db, username, week);
    if (legacy.points > 0 || legacy.eliminations.length > 0) {
      weekBreakdown.push({
        week,
        points: legacy.points,
        scoringVersion,
        eliminations: legacy.eliminations
      });
      totalPoints = roundToTenth(totalPoints + legacy.points);
    }
  }

  return { totalPoints: roundToTenth(totalPoints), weekBreakdown };
}

function buildLeaderboard(db) {
  const rows = Object.keys(db.users).map((username) => {
    const score = computeScoreBreakdown(db, username);
    return {
      username,
      birthName: getBirthNameForUsername(db, username),
      points: score.totalPoints
    };
  });

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.username.localeCompare(b.username);
  });

  return rows;
}

function buildFullStandings(db) {
  const weeks = Array.from({ length: db.game.currentWeek }, (_, index) => index + 1);
  const rows = Object.keys(db.users).map((username) => {
    const score = computeScoreBreakdown(db, username);
    const weekPoints = {};
    const savedWeeks = {};
    for (const week of weeks) {
      weekPoints[week] = 0;
      savedWeeks[week] = hasSavedLineupForWeek(db, username, week);
    }
    for (const weekEntry of score.weekBreakdown) {
      weekPoints[weekEntry.week] = Number(weekEntry.points || 0);
    }
    return {
      username,
      birthName: getBirthNameForUsername(db, username),
      totalPoints: score.totalPoints,
      weekPoints,
      savedWeeks
    };
  });

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.username.localeCompare(b.username);
  });

  return { weeks, rows };
}

module.exports = {
  buildFullStandings,
  buildLeaderboard,
  computeLegacyWeekPoints,
  computeScaledWeekPoints,
  computeScoreBreakdown,
  getWeekScoringStatus,
  roundToTenth
};
