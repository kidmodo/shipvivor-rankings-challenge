const {
  CAST_IDS,
  DEFAULT_TRIBE_BY_ID,
  LEGACY_SCORE_WEEK,
  NO_SCORE_WEEKS
} = require('../constants');
const {
  autoOmitMissingLineupsForWeek,
  computeWeekReport,
  ensureWeek,
  getEffectiveWeekVotedOff,
  getNotesForWeek,
  propagateVotedOffForward
} = require('../game');
const { parseBody, response } = require('../http');
const {
  defaultWeekRecapTitle,
  ensureUserProfile,
  normalizeChatMessages,
  normalizeScoreInclusionsMap,
  normalizeScoreOmissionsMap,
  normalizeTribeKey,
  normalizeTribesById,
  normalizeUsername,
  normalizeVotedOff,
  normalizeWeekCommentsMap,
  sanitizeBirthName,
  sanitizeNote,
  sanitizeUserAffiliation,
  sanitizeWeekRecap,
  sanitizeWeekRecapTitle
} = require('../normalize');
const { buildGamePayload } = require('../payloads');
const { hashPassword, validatePassword } = require('../auth');

function requireAdmin(authenticatedUser) {
  return Boolean(authenticatedUser?.isAdmin);
}

function validateCurrentWeek(db, week) {
  return Number.isInteger(week) && week >= 1 && week <= db.game.currentWeek;
}

function validateExistingUser(db, username) {
  return Boolean(username && db.users[username]);
}

async function handleAdminUpdateVotedOff({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const week = Number(body.week);
  if (!validateCurrentWeek(db, week)) {
    return { response: response(400, { ok: false, error: 'Invalid week.' }) };
  }
  if (NO_SCORE_WEEKS.has(week)) {
    return { response: response(400, { ok: false, error: 'This week is locked.' }) };
  }

  const votedOff = normalizeVotedOff(body.votedOff);
  db.game.weeks[week] = { votedOff };
  propagateVotedOffForward(db, week);
  if (week < db.game.currentWeek) {
    db.reports[week] = computeWeekReport(db, week);
  }

  return {
    save: true,
    response: response(200, {
      ok: true,
      ...buildGamePayload(db, authenticatedUser, week)
    })
  };
}

async function handleAdminUpdateCastTribe({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const castawayId = String(body.castawayId || '').trim();
  if (!CAST_IDS.includes(castawayId)) {
    return { response: response(400, { ok: false, error: 'Invalid castaway.' }) };
  }
  const tribeKey = normalizeTribeKey(body.tribeKey, '');
  if (!tribeKey) {
    return { response: response(400, { ok: false, error: 'Invalid tribe key. Use vatu, cila, kalo, or merge.' }) };
  }
  if (body.week !== undefined) {
    const requestedWeek = Number(body.week);
    if (!validateCurrentWeek(db, requestedWeek)) {
      return { response: response(400, { ok: false, error: 'Invalid week.' }) };
    }
  }

  const normalizedTribes = normalizeTribesById(db.tribesById);
  const history = normalizedTribes[castawayId] || [DEFAULT_TRIBE_BY_ID[castawayId] || 'vatu'];
  const nextHistory = [...history];
  nextHistory.push(tribeKey);
  normalizedTribes[castawayId] = nextHistory;
  db.tribesById = normalizedTribes;

  const requestedWeek = Number(body.week);
  const safeWeek = Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= db.game.currentWeek
    ? requestedWeek
    : db.game.currentWeek;
  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, safeWeek) })
  };
}

async function handleAdminRemoveCastTribe({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const castawayId = String(body.castawayId || '').trim();
  if (!CAST_IDS.includes(castawayId)) {
    return { response: response(400, { ok: false, error: 'Invalid castaway.' }) };
  }
  if (body.week !== undefined) {
    const requestedWeek = Number(body.week);
    if (!validateCurrentWeek(db, requestedWeek)) {
      return { response: response(400, { ok: false, error: 'Invalid week.' }) };
    }
  }
  const tribeIndex = Number(body.tribeIndex);
  if (!Number.isInteger(tribeIndex) || tribeIndex < 0) {
    return { response: response(400, { ok: false, error: 'Invalid tribe index.' }) };
  }

  const normalizedTribes = normalizeTribesById(db.tribesById);
  const history = normalizedTribes[castawayId] || [DEFAULT_TRIBE_BY_ID[castawayId] || 'vatu'];
  if (history.length <= 1) {
    return { response: response(400, { ok: false, error: 'Each player must keep at least one tribe.' }) };
  }
  if (tribeIndex >= history.length) {
    return { response: response(400, { ok: false, error: 'Tribe index out of range.' }) };
  }
  const nextHistory = [...history];
  nextHistory.splice(tribeIndex, 1);
  normalizedTribes[castawayId] = nextHistory;
  db.tribesById = normalizedTribes;

  const requestedWeek = Number(body.week);
  const safeWeek = Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= db.game.currentWeek
    ? requestedWeek
    : db.game.currentWeek;
  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, safeWeek) })
  };
}

async function handleAdminAdvanceWeek({ db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const completedWeek = db.game.currentWeek;
  autoOmitMissingLineupsForWeek(db, completedWeek);
  db.reports[completedWeek] = computeWeekReport(db, completedWeek);
  const nextWeek = db.game.currentWeek + 1;
  const previousVotedOff = getEffectiveWeekVotedOff(db, db.game.currentWeek);
  db.game.weeks[nextWeek] = { votedOff: previousVotedOff };
  db.game.currentWeek = nextWeek;

  return {
    save: true,
    response: response(200, {
      ok: true,
      ...buildGamePayload(db, authenticatedUser, nextWeek)
    })
  };
}

async function handleAdminJumpWeek({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }
  const body = await parseBody(event);
  const requestedWeek = Number(body.week);
  if (!Number.isInteger(requestedWeek) || requestedWeek < 1) {
    return { response: response(400, { ok: false, error: 'Invalid week.' }) };
  }
  const week = ensureWeek(db, body.week);
  if (!week) return { response: response(400, { ok: false, error: 'Invalid week.' }) };
  if (week > db.game.currentWeek) db.game.currentWeek = week;
  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, week) })
  };
}

async function handleAdminUpdateWeekRecap({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const week = Number(body.week);
  if (!validateCurrentWeek(db, week)) {
    return { response: response(400, { ok: false, error: 'Invalid week.' }) };
  }

  const title = sanitizeWeekRecapTitle(body.title) || defaultWeekRecapTitle(week);
  const message = sanitizeWeekRecap(body.message);
  db.weekRecaps[week] = { title, message };

  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, db.game.currentWeek) })
  };
}

async function handleAdminSetWeekComment({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const week = Number(body.week);
  const enabled = body.enabled !== undefined ? Boolean(body.enabled) : true;

  if (!Number.isInteger(week) || week < 1 || week >= db.game.currentWeek) {
    return { response: response(400, { ok: false, error: 'Comment of the week can only be set on completed weeks.' }) };
  }
  if (NO_SCORE_WEEKS.has(week)) {
    return { response: response(400, { ok: false, error: 'This week is excluded from scoring.' }) };
  }
  if (body.requestedWeek !== undefined) {
    const requestedWeek = Number(body.requestedWeek);
    if (!validateCurrentWeek(db, requestedWeek)) {
      return { response: response(400, { ok: false, error: 'Invalid week.' }) };
    }
  }
  if (!db.weekComments || typeof db.weekComments !== 'object') {
    db.weekComments = {};
  }

  if (!enabled) {
    delete db.weekComments[week];
  } else {
    const username = normalizeUsername(body.username);
    const castawayId = String(body.castawayId || '').trim();
    if (!validateExistingUser(db, username)) {
      return { response: response(404, { ok: false, error: 'User not found.' }) };
    }
    if (!CAST_IDS.includes(castawayId)) {
      return { response: response(400, { ok: false, error: 'Invalid castaway.' }) };
    }
    const note = getNotesForWeek(db, username, week)[castawayId];
    if (!note) {
      return { response: response(400, { ok: false, error: 'No note found for that castaway in this week.' }) };
    }
    db.weekComments[week] = {
      username,
      castawayId,
      note: sanitizeNote(note),
      updatedAt: new Date().toISOString()
    };
  }
  db.weekComments = normalizeWeekCommentsMap(db.weekComments, db.users);

  const requestedWeek = Number(body.requestedWeek);
  const safeWeek = Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= db.game.currentWeek
    ? requestedWeek
    : db.game.currentWeek;
  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, safeWeek) })
  };
}

async function handleAdminSetOmitScoreWeek({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const username = normalizeUsername(body.username);
  const week = Number(body.week);
  const omit = Boolean(body.omit);

  if (!validateExistingUser(db, username)) {
    return { response: response(404, { ok: false, error: 'User not found.' }) };
  }
  if (!Number.isInteger(week) || week < 1 || week >= db.game.currentWeek) {
    return { response: response(400, { ok: false, error: 'You can only omit completed weeks.' }) };
  }
  if (NO_SCORE_WEEKS.has(week)) {
    return { response: response(400, { ok: false, error: 'That week is already excluded from scoring.' }) };
  }
  if (body.requestedWeek !== undefined) {
    const requestedWeek = Number(body.requestedWeek);
    if (!validateCurrentWeek(db, requestedWeek)) {
      return { response: response(400, { ok: false, error: 'Invalid week.' }) };
    }
  }

  if (!db.scoreOmissions[username] || typeof db.scoreOmissions[username] !== 'object') {
    db.scoreOmissions[username] = {};
  }
  if (!db.scoreInclusions[username] || typeof db.scoreInclusions[username] !== 'object') {
    db.scoreInclusions[username] = {};
  }
  if (omit) {
    db.scoreOmissions[username][week] = true;
    delete db.scoreInclusions[username][week];
  } else {
    delete db.scoreOmissions[username][week];
    db.scoreInclusions[username][week] = true;
  }
  db.scoreOmissions[username] = normalizeScoreOmissionsMap(db.scoreOmissions[username]);
  db.scoreInclusions[username] = normalizeScoreInclusionsMap(db.scoreInclusions[username]);
  db.reports[week] = computeWeekReport(db, week);

  const requestedWeek = Number(body.requestedWeek);
  const safeWeek = Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= db.game.currentWeek
    ? requestedWeek
    : db.game.currentWeek;

  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, safeWeek) })
  };
}

async function handleAdminSetBirthName({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const username = normalizeUsername(body.username);
  if (!validateExistingUser(db, username)) {
    return { response: response(404, { ok: false, error: 'User not found.' }) };
  }

  ensureUserProfile(db, username).birthName = sanitizeBirthName(body.birthName);

  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, db.game.currentWeek) })
  };
}

async function handleAdminUpdateUserProfile({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const username = normalizeUsername(body.username);
  if (!validateExistingUser(db, username)) {
    return { response: response(404, { ok: false, error: 'User not found.' }) };
  }

  const profile = ensureUserProfile(db, username);
  profile.birthName = sanitizeBirthName(body.birthName);
  profile.affiliation = sanitizeUserAffiliation(body.affiliation);

  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, db.game.currentWeek) })
  };
}

async function handleAdminUpdateUserPassword({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const username = normalizeUsername(body.username);
  const password = body.password;
  if (!validateExistingUser(db, username)) {
    return { response: response(404, { ok: false, error: 'User not found.' }) };
  }
  if (!validatePassword(password)) {
    return { response: response(400, { ok: false, error: 'Password must be at least 8 characters.' }) };
  }
  const { salt, hash } = hashPassword(password);
  db.users[username].salt = salt;
  db.users[username].hash = hash;

  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, db.game.currentWeek) })
  };
}

async function handleAdminDeleteUser({ event, db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  const body = await parseBody(event);
  const username = normalizeUsername(body.username);
  if (!validateExistingUser(db, username)) {
    return { response: response(404, { ok: false, error: 'User not found.' }) };
  }
  if (username === authenticatedUser.username) {
    return { response: response(400, { ok: false, error: 'You cannot delete your own account.' }) };
  }

  delete db.users[username];
  delete db.lineups[username];
  delete db.notes[username];
  delete db.skips[username];
  delete db.scoreInclusions[username];
  delete db.scoreOmissions[username];
  delete db.winnerPicks[username];
  delete db.profiles[username];
  if (db.legacyWeekScores && typeof db.legacyWeekScores === 'object') {
    const weekMap = db.legacyWeekScores[LEGACY_SCORE_WEEK];
    if (weekMap && typeof weekMap === 'object') {
      delete weekMap[username];
    }
  }
  db.chat.messages = normalizeChatMessages(db.chat.messages).filter((row) => row.username !== username);

  for (const [week, report] of Object.entries(db.reports)) {
    if (!report || !Array.isArray(report.rows)) continue;
    db.reports[week] = {
      ...report,
      rows: report.rows.filter((row) => row.username !== username)
    };
  }
  if (db.weekComments && typeof db.weekComments === 'object') {
    for (const [week, entry] of Object.entries(db.weekComments)) {
      if (!entry || typeof entry !== 'object') continue;
      if (normalizeUsername(entry.username) === username) {
        delete db.weekComments[week];
      }
    }
  }

  return {
    save: true,
    response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, db.game.currentWeek) })
  };
}

async function handleAdminExportDb({ db, authenticatedUser }) {
  if (!requireAdmin(authenticatedUser)) {
    return { response: response(403, { ok: false, error: 'Admin access required.' }) };
  }

  return {
    attachMeta: false,
    response: {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="shipvivor-backup-${new Date().toISOString().slice(0, 10)}.json"`
      },
      body: JSON.stringify(db, null, 2)
    }
  };
}

module.exports = {
  handleAdminAdvanceWeek,
  handleAdminDeleteUser,
  handleAdminExportDb,
  handleAdminJumpWeek,
  handleAdminRemoveCastTribe,
  handleAdminSetBirthName,
  handleAdminSetOmitScoreWeek,
  handleAdminSetWeekComment,
  handleAdminUpdateCastTribe,
  handleAdminUpdateUserPassword,
  handleAdminUpdateUserProfile,
  handleAdminUpdateVotedOff,
  handleAdminUpdateWeekRecap
};
