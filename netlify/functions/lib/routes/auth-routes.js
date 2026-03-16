const { createSession, hashPassword, validatePassword, validateUsername, verifyPassword } = require('../auth');
const { CAST_IDS, LEGACY_SCORE_WEEK } = require('../constants');
const { buildGamePayload } = require('../payloads');
const { response, parseBody } = require('../http');
const { defaultLineup, normalizeUsername } = require('../normalize');

async function handleSignup({ event, db }) {
  const body = await parseBody(event);
  const username = normalizeUsername(body.username);
  const password = body.password;

  if (!validateUsername(username)) {
    return { response: response(400, { ok: false, error: 'Username must be 3-24 chars and use letters, numbers, _ or -.' }) };
  }
  if (!validatePassword(password)) {
    return { response: response(400, { ok: false, error: 'Password must be at least 8 characters.' }) };
  }
  if (db.users[username]) {
    return { response: response(409, { ok: false, error: 'Username already exists.' }) };
  }

  const { salt, hash } = hashPassword(password);
  db.users[username] = {
    username,
    salt,
    hash,
    isAdmin: false,
    joinedWeek: db.game.currentWeek,
    createdAt: new Date().toISOString()
  };
  db.lineups[username] = { 1: defaultLineup() };
  db.notes[username] = {};
  db.skips[username] = {};
  db.scoreOmissions[username] = {};
  db.winnerPicks[username] = {};
  db.profiles[username] = { chatAvatarId: CAST_IDS[0], birthName: '', affiliation: '' };
  if (!db.legacyWeekScores || typeof db.legacyWeekScores !== 'object') db.legacyWeekScores = {};
  if (!db.legacyWeekScores[LEGACY_SCORE_WEEK] || typeof db.legacyWeekScores[LEGACY_SCORE_WEEK] !== 'object') {
    db.legacyWeekScores[LEGACY_SCORE_WEEK] = {};
  }
  if (!(username in db.legacyWeekScores[LEGACY_SCORE_WEEK])) {
    db.legacyWeekScores[LEGACY_SCORE_WEEK][username] = 0;
  }
  const sessionToken = createSession(db, username);

  return {
    save: true,
    response: response(200, {
      ok: true,
      token: sessionToken,
      ...buildGamePayload(db, { username, isAdmin: false }, db.game.currentWeek)
    })
  };
}

async function handleLogin({ event, db }) {
  const body = await parseBody(event);
  const username = normalizeUsername(body.username);
  const password = body.password;
  const userRecord = db.users[username];

  if (!userRecord || !verifyPassword(password || '', userRecord.salt, userRecord.hash)) {
    return { response: response(401, { ok: false, error: 'Invalid username or password.' }) };
  }

  const sessionToken = createSession(db, username);
  return {
    save: true,
    response: response(200, {
      ok: true,
      token: sessionToken,
      ...buildGamePayload(db, { username, isAdmin: Boolean(userRecord.isAdmin) }, db.game.currentWeek)
    })
  };
}

async function handleLogout() {
  return { response: response(200, { ok: true }) };
}

module.exports = {
  handleLogin,
  handleLogout,
  handleSignup
};
