const {
  CAST_IDS,
  LEGACY_SCORE_WEEK,
  LOCK_ANCHOR_UTC_MS,
  LOCK_ANCHOR_WEEK,
  LOCKED_WEEK_ONE_ELIMINATIONS,
  WEEK_MS
} = require('./constants');
const {
  defaultLineup,
  defaultVotedOff,
  normalizeNotesMap,
  normalizeOrder,
  normalizeScoreOmissionsMap,
  normalizeSkippedWeeks,
  normalizeVotedOff,
  normalizeWeekRecapEntry,
  normalizeWinnerPicksList
} = require('./normalize');

function getEffectiveWeekVotedOff(db, week) {
  const votedOff = normalizeVotedOff(db.game.weeks[week]?.votedOff);
  if (Number(week) === 1) {
    for (const id of LOCKED_WEEK_ONE_ELIMINATIONS) {
      votedOff[id] = true;
    }
  }
  return votedOff;
}

function applyLockedGameState(db) {
  let changed = false;
  if (!db.game.weeks[1]) {
    db.game.weeks[1] = { votedOff: defaultVotedOff() };
    changed = true;
  }
  const current = normalizeVotedOff(db.game.weeks[1].votedOff);
  for (const id of LOCKED_WEEK_ONE_ELIMINATIONS) {
    if (!current[id]) {
      current[id] = true;
      changed = true;
    }
  }
  if (changed) {
    db.game.weeks[1].votedOff = current;
  }
  return changed;
}

function getNotesForWeek(db, username, week) {
  const userNotes = db.notes[username] || {};
  const weekNotes = userNotes[week] || {};
  return normalizeNotesMap(weekNotes);
}

function getWinnerPicksForWeek(db, username, week) {
  const userWinnerPicks = db.winnerPicks[username] || {};
  return normalizeWinnerPicksList(userWinnerPicks[week] || []);
}

function getUserJoinedWeek(db, username) {
  const joinedWeek = Number(db.users?.[username]?.joinedWeek || 1);
  if (!Number.isInteger(joinedWeek) || joinedWeek < 1) return 1;
  return joinedWeek;
}

function ensureWeek(db, week) {
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1) return null;
  if (!db.game.weeks[weekNum]) {
    const previousWeek = Math.max(1, weekNum - 1);
    const previousVotedOff = normalizeVotedOff(db.game.weeks[previousWeek]?.votedOff);
    db.game.weeks[weekNum] = { votedOff: previousVotedOff };
  }
  return weekNum;
}

function getWeekLockDate(week) {
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1) return null;
  const offsetWeeks = weekNum - LOCK_ANCHOR_WEEK;
  return new Date(LOCK_ANCHOR_UTC_MS + (offsetWeeks * WEEK_MS));
}

function isWeekLocked(week, now = Date.now()) {
  const lockDate = getWeekLockDate(week);
  if (!lockDate) return false;
  return now >= lockDate.getTime();
}

function formatWeekLockTime(lockDate) {
  if (!lockDate) return 'Wednesday at 8:00 PM ET';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  }).format(lockDate);
}

function getWeekTransition(db, week) {
  const previousWeekVotedOff = week > 1 ? getEffectiveWeekVotedOff(db, week - 1) : defaultVotedOff();
  const currentWeekVotedOff = getEffectiveWeekVotedOff(db, week);
  const eliminations = CAST_IDS.filter((id) => !previousWeekVotedOff[id] && currentWeekVotedOff[id]);
  return {
    previousWeekVotedOff,
    currentWeekVotedOff,
    eliminations
  };
}

function getLineupForWeek(db, username, week) {
  const userLineups = db.lineups[username] || {};
  for (let cursor = week; cursor >= 1; cursor -= 1) {
    if (userLineups[cursor]) return normalizeOrder(userLineups[cursor]);
  }
  return defaultLineup();
}

function getRankMapForWeek(db, username, week) {
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1 || !db.users?.[username]) {
    return {};
  }
  const priorWeekVotedOff = weekNum > 1 ? getEffectiveWeekVotedOff(db, weekNum - 1) : defaultVotedOff();
  const lineup = getLineupForWeek(db, username, weekNum);
  const activeOrder = lineup.filter((id) => !priorWeekVotedOff[id]);
  const rankMap = {};
  activeOrder.forEach((id, index) => {
    rankMap[id] = index + 1;
  });
  return rankMap;
}

function hasSavedLineupForWeek(db, username, week) {
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1) return false;
  const userLineups = db.lineups?.[username];
  if (!userLineups || typeof userLineups !== 'object') return false;
  return Array.isArray(userLineups[weekNum]);
}

function computeWeekReport(db, week) {
  if (!Number.isInteger(week) || week < 1 || week > db.game.currentWeek) return null;
  const priorVotedOff = week > 1 ? getEffectiveWeekVotedOff(db, week - 1) : defaultVotedOff();
  const activeIds = CAST_IDS.filter((id) => !priorVotedOff[id]);
  const rows = Object.keys(db.users)
    .sort((a, b) => a.localeCompare(b))
    .map((username) => {
      const lineup = getLineupForWeek(db, username, week);
      const activeOrder = lineup.filter((id) => activeIds.includes(id));
      const ranks = {};
      for (const [index, id] of activeOrder.entries()) {
        ranks[id] = index + 1;
      }
      const skippedWeeks = normalizeSkippedWeeks(db.skips[username]);
      const omittedWeeks = normalizeScoreOmissionsMap(db.scoreOmissions[username]);
      const joinedWeek = getUserJoinedWeek(db, username);
      return {
        username,
        skipped: Boolean(skippedWeeks[week]),
        omitted: Boolean(omittedWeeks[week] || week < joinedWeek),
        ranks
      };
    });

  return {
    week,
    generatedAt: new Date().toISOString(),
    activeIds,
    rows
  };
}

function getWeekRecapForWeek(db, week) {
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1) {
    return normalizeWeekRecapEntry(1, null);
  }
  return normalizeWeekRecapEntry(weekNum, db.weekRecaps?.[weekNum]);
}

module.exports = {
  applyLockedGameState,
  computeWeekReport,
  ensureWeek,
  formatWeekLockTime,
  getEffectiveWeekVotedOff,
  getLineupForWeek,
  getNotesForWeek,
  getRankMapForWeek,
  getUserJoinedWeek,
  getWeekLockDate,
  getWeekRecapForWeek,
  getWeekTransition,
  getWinnerPicksForWeek,
  hasSavedLineupForWeek,
  isWeekLocked
};
