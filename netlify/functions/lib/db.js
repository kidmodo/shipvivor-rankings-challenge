const fs = require('node:fs/promises');
const path = require('node:path');

const { connectLambda, getStore } = require('@netlify/blobs');

const { hashPassword } = require('./auth');
const {
  BLOB_STATE_KEY,
  BLOB_STORE_NAME,
  CAST_IDS,
  LEGACY_SCORE_WEEK,
  LOCAL_DB_PATH
} = require('./constants');
const { computeLegacyWeekPoints } = require('./scoring');
const {
  createDefaultTribesById,
  defaultLineup,
  defaultVotedOff,
  ensureUserProfile,
  normalizeChatMessages,
  normalizeScoreOmissionsMap,
  normalizeSkippedWeeks,
  normalizeTribesById,
  normalizeUsername,
  normalizeVotedOff,
  normalizeWeekCommentsMap,
  normalizeWeekRecapEntry,
  normalizeWinnerPicksMap
} = require('./normalize');

function createDefaultDb() {
  return {
    meta: {
      revision: 0,
      lastMutationAt: null
    },
    users: {},
    sessions: {},
    lineups: {},
    notes: {},
    skips: {},
    scoreOmissions: {},
    winnerPicks: {},
    tribesById: createDefaultTribesById(),
    profiles: {},
    chat: { messages: [] },
    reports: {},
    weekRecaps: {},
    weekComments: {},
    legacyWeekScores: {},
    game: {
      currentWeek: 1,
      weeks: {
        1: { votedOff: defaultVotedOff() }
      }
    }
  };
}

function ensureDbShape(db) {
  let changed = false;

  if (!db.meta || typeof db.meta !== 'object') {
    db.meta = { revision: 0, lastMutationAt: null };
    changed = true;
  }
  const revision = Number(db.meta.revision);
  if (!Number.isInteger(revision) || revision < 0) {
    db.meta.revision = 0;
    changed = true;
  }
  if (db.meta.lastMutationAt !== null && typeof db.meta.lastMutationAt !== 'string') {
    db.meta.lastMutationAt = null;
    changed = true;
  }

  if (!db.users || typeof db.users !== 'object') {
    db.users = {};
    changed = true;
  }
  if (!db.sessions || typeof db.sessions !== 'object') {
    db.sessions = {};
    changed = true;
  }
  if (!db.lineups || typeof db.lineups !== 'object') {
    db.lineups = {};
    changed = true;
  }
  if (!db.notes || typeof db.notes !== 'object') {
    db.notes = {};
    changed = true;
  }
  if (!db.skips || typeof db.skips !== 'object') {
    db.skips = {};
    changed = true;
  }
  if (!db.scoreOmissions || typeof db.scoreOmissions !== 'object') {
    db.scoreOmissions = {};
    changed = true;
  }
  if (!db.winnerPicks || typeof db.winnerPicks !== 'object') {
    db.winnerPicks = {};
    changed = true;
  }
  const normalizedTribesById = normalizeTribesById(db.tribesById);
  if (JSON.stringify(normalizedTribesById) !== JSON.stringify(db.tribesById || {})) {
    db.tribesById = normalizedTribesById;
    changed = true;
  }
  if (!db.profiles || typeof db.profiles !== 'object') {
    db.profiles = {};
    changed = true;
  }
  if (!db.chat || typeof db.chat !== 'object') {
    db.chat = { messages: [] };
    changed = true;
  }
  const normalizedChatMessages = normalizeChatMessages(db.chat.messages);
  if (JSON.stringify(normalizedChatMessages) !== JSON.stringify(db.chat.messages || [])) {
    db.chat.messages = normalizedChatMessages;
    changed = true;
  }
  if (!db.reports || typeof db.reports !== 'object') {
    db.reports = {};
    changed = true;
  }
  if (!db.weekRecaps || typeof db.weekRecaps !== 'object') {
    db.weekRecaps = {};
    changed = true;
  } else {
    const normalizedWeekRecaps = {};
    for (const [weekKey, value] of Object.entries(db.weekRecaps)) {
      const weekNum = Number(weekKey);
      if (!Number.isInteger(weekNum) || weekNum < 1) {
        changed = true;
        continue;
      }
      const normalizedEntry = normalizeWeekRecapEntry(weekNum, value);
      normalizedWeekRecaps[weekNum] = normalizedEntry;
      if (JSON.stringify(normalizedEntry) !== JSON.stringify(value)) {
        changed = true;
      }
    }
    if (JSON.stringify(normalizedWeekRecaps) !== JSON.stringify(db.weekRecaps)) {
      db.weekRecaps = normalizedWeekRecaps;
      changed = true;
    }
  }
  if (!db.weekComments || typeof db.weekComments !== 'object') {
    db.weekComments = {};
    changed = true;
  } else {
    const normalizedWeekComments = normalizeWeekCommentsMap(db.weekComments, db.users);
    if (JSON.stringify(normalizedWeekComments) !== JSON.stringify(db.weekComments)) {
      db.weekComments = normalizedWeekComments;
      changed = true;
    }
  }
  if (!db.legacyWeekScores || typeof db.legacyWeekScores !== 'object') {
    db.legacyWeekScores = {};
    changed = true;
  }
  if (!db.legacyWeekScores[LEGACY_SCORE_WEEK] || typeof db.legacyWeekScores[LEGACY_SCORE_WEEK] !== 'object') {
    db.legacyWeekScores[LEGACY_SCORE_WEEK] = {};
    changed = true;
  } else {
    for (const [username, score] of Object.entries(db.legacyWeekScores[LEGACY_SCORE_WEEK])) {
      const normalizedUsername = normalizeUsername(username);
      const normalizedScore = Number.isFinite(Number(score)) && Number(score) >= 0 ? Math.round(Number(score)) : 0;
      if (normalizedUsername !== username || normalizedScore !== score) {
        if (normalizedUsername !== username) {
          delete db.legacyWeekScores[LEGACY_SCORE_WEEK][username];
        }
        db.legacyWeekScores[LEGACY_SCORE_WEEK][normalizedUsername] = normalizedScore;
        changed = true;
      }
    }
  }
  if (!db.game || typeof db.game !== 'object') {
    db.game = { currentWeek: 1, weeks: { 1: { votedOff: defaultVotedOff() } } };
    changed = true;
  }
  if (!Number.isInteger(db.game.currentWeek) || db.game.currentWeek < 1) {
    db.game.currentWeek = 1;
    changed = true;
  }
  if (!db.game.weeks || typeof db.game.weeks !== 'object') {
    db.game.weeks = { 1: { votedOff: defaultVotedOff() } };
    changed = true;
  }
  for (let week = 1; week <= db.game.currentWeek; week += 1) {
    const weekData = db.game.weeks[week];
    if (!weekData || typeof weekData !== 'object') {
      db.game.weeks[week] = { votedOff: defaultVotedOff() };
      changed = true;
      continue;
    }
    const normalized = normalizeVotedOff(weekData.votedOff);
    if (JSON.stringify(normalized) !== JSON.stringify(weekData.votedOff || {})) {
      db.game.weeks[week].votedOff = normalized;
      changed = true;
    }
  }

  for (const username of Object.keys(db.users)) {
    const joinedWeek = Number(db.users[username]?.joinedWeek || 1);
    if (!Number.isInteger(joinedWeek) || joinedWeek < 1 || joinedWeek > db.game.currentWeek) {
      db.users[username].joinedWeek = Math.max(1, Math.min(Number.isInteger(joinedWeek) ? joinedWeek : 1, db.game.currentWeek));
      changed = true;
    }
    if (!db.lineups[username] || typeof db.lineups[username] !== 'object') {
      db.lineups[username] = { 1: defaultLineup() };
      changed = true;
    }
    if (!db.notes[username] || typeof db.notes[username] !== 'object') {
      db.notes[username] = {};
      changed = true;
    }
    if (!db.skips[username] || typeof db.skips[username] !== 'object') {
      db.skips[username] = {};
      changed = true;
    } else {
      const normalizedSkips = normalizeSkippedWeeks(db.skips[username]);
      if (JSON.stringify(normalizedSkips) !== JSON.stringify(db.skips[username])) {
        db.skips[username] = normalizedSkips;
        changed = true;
      }
    }
    if (!db.scoreOmissions[username] || typeof db.scoreOmissions[username] !== 'object') {
      db.scoreOmissions[username] = {};
      changed = true;
    } else {
      const normalizedOmissions = normalizeScoreOmissionsMap(db.scoreOmissions[username]);
      if (JSON.stringify(normalizedOmissions) !== JSON.stringify(db.scoreOmissions[username])) {
        db.scoreOmissions[username] = normalizedOmissions;
        changed = true;
      }
    }
    if (!db.winnerPicks[username] || typeof db.winnerPicks[username] !== 'object') {
      db.winnerPicks[username] = {};
      changed = true;
    } else {
      const normalizedWinnerPicks = normalizeWinnerPicksMap(db.winnerPicks[username]);
      if (JSON.stringify(normalizedWinnerPicks) !== JSON.stringify(db.winnerPicks[username])) {
        db.winnerPicks[username] = normalizedWinnerPicks;
        changed = true;
      }
    }
    const beforeProfile = JSON.stringify(db.profiles[username] || null);
    ensureUserProfile(db, username);
    if (JSON.stringify(db.profiles[username] || null) !== beforeProfile) {
      changed = true;
    }
    if (!(username in db.legacyWeekScores[LEGACY_SCORE_WEEK])) {
      const legacyWeekTwoScore = db.game.currentWeek >= LEGACY_SCORE_WEEK
        ? computeLegacyWeekPoints(db, username, LEGACY_SCORE_WEEK).points
        : 0;
      db.legacyWeekScores[LEGACY_SCORE_WEEK][username] = Math.max(0, Math.round(legacyWeekTwoScore));
      changed = true;
    }
  }

  return changed;
}

function touchRevision(db) {
  if (!db.meta || typeof db.meta !== 'object') {
    db.meta = { revision: 0, lastMutationAt: null };
  }
  const current = Number(db.meta.revision);
  db.meta.revision = Number.isInteger(current) && current >= 0 ? current + 1 : 1;
  db.meta.lastMutationAt = new Date().toISOString();
}

function attachMetaToResponse(responseObj, db) {
  if (!responseObj || typeof responseObj !== 'object') return responseObj;
  const rawBody = responseObj.body;
  if (typeof rawBody !== 'string') return responseObj;
  let payload = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return responseObj;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return responseObj;
  payload.revision = Number(db?.meta?.revision || 0);
  payload.lastMutationAt = db?.meta?.lastMutationAt || null;
  responseObj.body = JSON.stringify(payload);
  return responseObj;
}

async function readLocalDb() {
  try {
    const raw = await fs.readFile(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    const db = createDefaultDb();
    await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    return db;
  }
}

async function writeLocalDb(db) {
  await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

async function withBlobDb(event, callback) {
  connectLambda(event);
  const store = getStore(BLOB_STORE_NAME);
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const current = await store.getWithMetadata(BLOB_STATE_KEY, { type: 'json' });
    const db = current?.data || createDefaultDb();
    const result = await callback(db);

    if (!result?.save) {
      if (result?.response && result.attachMeta !== false) attachMetaToResponse(result.response, db);
      return result;
    }

    touchRevision(db);

    const writeOptions = current?.etag
      ? { onlyIfMatch: current.etag }
      : { onlyIfNew: true };
    const writeResult = await store.setJSON(BLOB_STATE_KEY, db, writeOptions);

    if (writeResult.modified) {
      delete result.save;
      if (result?.response && result.attachMeta !== false) attachMetaToResponse(result.response, db);
      return result;
    }
  }

  throw new Error('Failed to persist game state after multiple retry attempts.');
}

async function withDb(event, callback) {
  const runningInNetlify = Boolean(
    process.env.NETLIFY
    || process.env.CONTEXT
    || process.env.URL
    || process.env.NETLIFY_IMAGES_CDN_DOMAIN
  );

  if (runningInNetlify || event?.blobs) {
    try {
      return await withBlobDb(event, callback);
    } catch (error) {
      if (runningInNetlify) throw error;
    }
  }

  const db = await readLocalDb();
  const result = await callback(db);
  if (result?.save) {
    touchRevision(db);
    await writeLocalDb(db);
    delete result.save;
  }
  if (result?.response && result.attachMeta !== false) attachMetaToResponse(result.response, db);
  return result;
}

function cleanExpiredSessions(db) {
  if (!db.sessions || typeof db.sessions !== 'object') db.sessions = {};
}

function ensureAdminUser(db) {
  const adminUsername = 'ship';
  const adminPassword = process.env.SHIPVIVOR_ADMIN_PASSWORD;
  let changed = false;

  if (db.users[adminUsername]) {
    if (!db.users[adminUsername].isAdmin) {
      db.users[adminUsername].isAdmin = true;
      changed = true;
    }
    if (!db.skips[adminUsername] || typeof db.skips[adminUsername] !== 'object') {
      db.skips[adminUsername] = {};
      changed = true;
    }
    if (!db.scoreOmissions[adminUsername] || typeof db.scoreOmissions[adminUsername] !== 'object') {
      db.scoreOmissions[adminUsername] = {};
      changed = true;
    }
    if (!db.notes[adminUsername] || typeof db.notes[adminUsername] !== 'object') {
      db.notes[adminUsername] = {};
      changed = true;
    }
    if (!db.winnerPicks[adminUsername] || typeof db.winnerPicks[adminUsername] !== 'object') {
      db.winnerPicks[adminUsername] = {};
      changed = true;
    }
    if (!db.lineups[adminUsername] || typeof db.lineups[adminUsername] !== 'object') {
      db.lineups[adminUsername] = { 1: defaultLineup() };
      changed = true;
    }
    const beforeProfile = JSON.stringify(db.profiles[adminUsername] || null);
    ensureUserProfile(db, adminUsername);
    if (JSON.stringify(db.profiles[adminUsername] || null) !== beforeProfile) {
      changed = true;
    }
    if (!db.legacyWeekScores || typeof db.legacyWeekScores !== 'object') {
      db.legacyWeekScores = { [LEGACY_SCORE_WEEK]: { [adminUsername]: 0 } };
      changed = true;
    } else if (!db.legacyWeekScores[LEGACY_SCORE_WEEK] || typeof db.legacyWeekScores[LEGACY_SCORE_WEEK] !== 'object') {
      db.legacyWeekScores[LEGACY_SCORE_WEEK] = { [adminUsername]: 0 };
      changed = true;
    } else if (!(adminUsername in db.legacyWeekScores[LEGACY_SCORE_WEEK])) {
      db.legacyWeekScores[LEGACY_SCORE_WEEK][adminUsername] = 0;
      changed = true;
    }
    return changed;
  }

  if (!adminPassword) return false;

  const { salt, hash } = hashPassword(adminPassword);
  db.users[adminUsername] = {
    username: adminUsername,
    salt,
    hash,
    isAdmin: true,
    joinedWeek: 1,
    createdAt: new Date().toISOString()
  };
  db.lineups[adminUsername] = { 1: defaultLineup() };
  db.notes[adminUsername] = {};
  db.skips[adminUsername] = {};
  db.scoreOmissions[adminUsername] = {};
  db.winnerPicks[adminUsername] = {};
  db.profiles[adminUsername] = { chatAvatarId: CAST_IDS[0], birthName: '', affiliation: '' };
  if (!db.legacyWeekScores || typeof db.legacyWeekScores !== 'object') db.legacyWeekScores = {};
  if (!db.legacyWeekScores[LEGACY_SCORE_WEEK] || typeof db.legacyWeekScores[LEGACY_SCORE_WEEK] !== 'object') {
    db.legacyWeekScores[LEGACY_SCORE_WEEK] = {};
  }
  if (!(adminUsername in db.legacyWeekScores[LEGACY_SCORE_WEEK])) {
    db.legacyWeekScores[LEGACY_SCORE_WEEK][adminUsername] = 0;
  }
  return true;
}

module.exports = {
  cleanExpiredSessions,
  createDefaultDb,
  ensureAdminUser,
  ensureDbShape,
  readLocalDb,
  touchRevision,
  withBlobDb,
  withDb,
  writeLocalDb
};
