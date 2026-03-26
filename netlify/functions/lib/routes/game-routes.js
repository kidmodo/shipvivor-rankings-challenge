const { CAST_IDS, NO_SCORE_WEEKS } = require('../constants');
const { readBackgroundImage } = require('../db');
const {
  computeWeekReport,
  formatWeekLockTime,
  getEffectiveWeekVotedOff,
  getNotesForWeek,
  getLineupForWeek,
  getUserJoinedWeek,
  getWeekLockDate,
  getWeekRecapForWeek,
  getWinnerPicksForWeek,
  isWeekLocked
} = require('../game');
const {
  emptyResponse,
  getRevisionConflictResponse,
  parseBody,
  parseExpectedRevision,
  response
} = require('../http');
const {
  defaultVotedOff,
  normalizeNotesMap,
  normalizeScoreInclusionsMap,
  normalizeOrder,
  normalizeScoreOmissionsMap,
  normalizeSkippedWeeks,
  normalizeWinnerPicksList,
  normalizeUsername
} = require('../normalize');
const { buildGamePayload, getWeekCommentOfWeek } = require('../payloads');
const { getWeekScoringStatus } = require('../scoring');

function validateWeekInRange(db, week, { min = 1, max = db.game.currentWeek } = {}) {
  return Number.isInteger(week) && week >= min && week <= max;
}

function validateLineupOrder(order, activeCastIds) {
  if (!Array.isArray(order)) {
    return 'Lineup order must be an array.';
  }
  const expectedActiveIds = Array.isArray(activeCastIds) ? activeCastIds : CAST_IDS;
  const expectsFullCast = order.length === CAST_IDS.length;
  const expectsActiveCast = order.length === expectedActiveIds.length;
  if (!expectsFullCast && !expectsActiveCast) {
    return `Lineup order must include exactly ${expectedActiveIds.length} active castaways.`;
  }
  const seen = new Set();
  for (const castId of order) {
    if (!CAST_IDS.includes(castId)) {
      return 'Lineup order contains an invalid castaway ID.';
    }
    if (seen.has(castId)) {
      return 'Lineup order cannot include duplicate castaways.';
    }
    seen.add(castId);
  }
  if (expectsActiveCast) {
    for (const castId of expectedActiveIds) {
      if (!seen.has(castId)) {
        return 'Lineup order must include every active castaway exactly once.';
      }
    }
  }
  return null;
}

async function handleGame({ event, db, authenticatedUser, needsSave }) {
  const sinceRevision = Number(event.queryStringParameters?.sinceRevision);
  if (Number.isInteger(sinceRevision) && sinceRevision >= 0 && sinceRevision === Number(db.meta?.revision || 0)) {
    if (needsSave) {
      return { save: true, response: emptyResponse(304) };
    }
    return { response: emptyResponse(304) };
  }

  if (needsSave) {
    return {
      save: true,
      response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, event.queryStringParameters?.week) })
    };
  }
  return { response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, event.queryStringParameters?.week) }) };
}

async function handleSaveLineup({ event, db, authenticatedUser }) {
  const body = await parseBody(event);
  const conflictResponse = getRevisionConflictResponse(db, parseExpectedRevision(body));
  if (conflictResponse) return { response: conflictResponse };
  const week = Number(body.week);
  if (!validateWeekInRange(db, week)) {
    return { response: response(400, { ok: false, error: 'Invalid week.' }) };
  }
  if (week !== db.game.currentWeek) {
    return { response: response(400, { ok: false, error: 'Only the active week can be edited.' }) };
  }
  if (NO_SCORE_WEEKS.has(week)) {
    return { response: response(400, { ok: false, error: 'This week is locked and not scored.' }) };
  }
  if (isWeekLocked(week)) {
    const lockDate = getWeekLockDate(week);
    return {
      response: response(400, {
        ok: false,
        error: `Week ${week} locked at ${formatWeekLockTime(lockDate)}.`
      })
    };
  }

  const priorVotedOff = week > 1 ? getEffectiveWeekVotedOff(db, week - 1) : defaultVotedOff();
  const activeCastIds = CAST_IDS.filter((castId) => !priorVotedOff[castId]);
  const lineupError = validateLineupOrder(body.order, activeCastIds);
  if (lineupError) {
    return { response: response(400, { ok: false, error: lineupError }) };
  }
  if (!body.notes || typeof body.notes !== 'object' || Array.isArray(body.notes)) {
    return { response: response(400, { ok: false, error: 'Notes must be an object keyed by castaway ID.' }) };
  }

  const lineup = normalizeOrder(body.order);
  const winnerPicks = normalizeWinnerPicksList(body.winnerPicks);
  if (!db.lineups[authenticatedUser.username]) db.lineups[authenticatedUser.username] = {};
  db.lineups[authenticatedUser.username][week] = lineup;
  if (!db.notes[authenticatedUser.username]) db.notes[authenticatedUser.username] = {};
  db.notes[authenticatedUser.username][week] = normalizeNotesMap(body.notes);
  if (!db.winnerPicks[authenticatedUser.username] || typeof db.winnerPicks[authenticatedUser.username] !== 'object') {
    db.winnerPicks[authenticatedUser.username] = {};
  }
  db.winnerPicks[authenticatedUser.username][week] = winnerPicks;

  return {
    save: true,
    response: response(200, {
      ok: true,
      ...buildGamePayload(db, authenticatedUser, week)
    })
  };
}

async function handleSetSkipWeek({ event, db, authenticatedUser }) {
  const body = await parseBody(event);
  const conflictResponse = getRevisionConflictResponse(db, parseExpectedRevision(body));
  if (conflictResponse) return { response: conflictResponse };
  const week = Number(body.week);
  if (!validateWeekInRange(db, week)) {
    return { response: response(400, { ok: false, error: 'Invalid week.' }) };
  }
  if (week !== db.game.currentWeek) {
    return { response: response(400, { ok: false, error: 'You can only skip the active week.' }) };
  }
  if (NO_SCORE_WEEKS.has(week)) {
    return { response: response(400, { ok: false, error: 'This week is already excluded from scoring.' }) };
  }
  if (isWeekLocked(week)) {
    const lockDate = getWeekLockDate(week);
    return {
      response: response(400, {
        ok: false,
        error: `Week ${week} locked at ${formatWeekLockTime(lockDate)}.`
      })
    };
  }
  const skip = Boolean(body.skip);
  if (!db.skips[authenticatedUser.username] || typeof db.skips[authenticatedUser.username] !== 'object') {
    db.skips[authenticatedUser.username] = {};
  }
  if (skip) {
    db.skips[authenticatedUser.username][week] = true;
  } else {
    delete db.skips[authenticatedUser.username][week];
  }
  db.skips[authenticatedUser.username] = normalizeSkippedWeeks(db.skips[authenticatedUser.username]);

  return {
    save: true,
    response: response(200, {
      ok: true,
      ...buildGamePayload(db, authenticatedUser, week)
    })
  };
}

async function handleViewUserWeek({ event, db }) {
  const week = Number(event.queryStringParameters?.week);
  const username = normalizeUsername(event.queryStringParameters?.username);
  if (!Number.isInteger(week) || week < 1 || week >= db.game.currentWeek) {
    return { response: response(400, { ok: false, error: 'You can only view completed weeks.' }) };
  }
  if (NO_SCORE_WEEKS.has(week)) {
    return { response: response(400, { ok: false, error: 'That week is excluded from scoring.' }) };
  }
  if (!db.users[username]) {
    return { response: response(404, { ok: false, error: 'User not found.' }) };
  }

  const lineup = getLineupForWeek(db, username, week);
  const notes = getNotesForWeek(db, username, week);
  const winnerPicks = getWinnerPicksForWeek(db, username, week);
  const priorVotedOff = week > 1 ? getEffectiveWeekVotedOff(db, week - 1) : defaultVotedOff();
  const votedOff = getEffectiveWeekVotedOff(db, week);
  const weekReport = computeWeekReport(db, week);
  const skippedWeeks = normalizeSkippedWeeks(db.skips[username]);
  const omittedWeeks = normalizeScoreOmissionsMap(db.scoreOmissions[username]);
  const scoreInclusions = normalizeScoreInclusionsMap(db.scoreInclusions[username]);
  const status = getWeekScoringStatus(db, username, week);
  const weekRecap = getWeekRecapForWeek(db, week);
  const weekCommentOfWeek = getWeekCommentOfWeek(db, week);

  return {
    response: response(200, {
      ok: true,
      week,
      username,
      lineup,
      notes,
      winnerPicks,
      weekReport,
      priorVotedOff,
      votedOff,
      weekRecapWeek: week,
      weekRecapTitle: weekRecap.title,
      weekRecap: weekRecap.message,
      weekCommentOfWeek,
      skippedWeeks,
      omittedWeeks,
      scoreInclusions,
      hasSavedLineup: status.savedLineup,
      noSubmit: status.noSubmit,
      countedByAdmin: status.explicitInclude,
      isSkippedWeek: status.skipped,
      isOmittedWeek: status.omitted
    })
  };
}

async function handleBackgroundImage({ event, db }) {
  const version = Number(event.queryStringParameters?.version || db.settings?.background?.imageVersion || 0);
  const backgroundConfig = db.settings?.background;
  if (!backgroundConfig?.hasCustomImage || !Number.isInteger(version) || version < 1) {
    return { response: response(404, { ok: false, error: 'No custom background image configured.' }) };
  }
  const dataUrl = await readBackgroundImage(event, version);
  if (!dataUrl) {
    return { response: response(404, { ok: false, error: 'Background image not found.' }) };
  }
  return {
    attachMeta: false,
    response: {
      statusCode: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=31536000, immutable'
      },
      body: dataUrl
    }
  };
}

module.exports = {
  handleBackgroundImage,
  handleGame,
  handleSaveLineup,
  handleSetSkipWeek,
  handleViewUserWeek,
  validateWeekInRange
};
