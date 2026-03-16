const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { connectLambda, getStore } = require('@netlify/blobs');

const CASTAWAYS = [
  { id: 'angelina-keeley', name: 'Angelina Keeley', image: 'assets/cast/angelina-keeley.jpg' },
  { id: 'aubry-bracco', name: 'Aubry Bracco', image: 'assets/cast/aubry-bracco.jpg' },
  { id: 'benjamin-coach-wade', name: 'Benjamin "Coach" Wade', image: 'assets/cast/benjamin-coach-wade.jpg' },
  { id: 'charlie-davis', name: 'Charlie Davis', image: 'assets/cast/charlie-davis.jpg' },
  { id: 'chrissy-hofbeck', name: 'Chrissy Hofbeck', image: 'assets/cast/chrissy-hofbeck.jpg' },
  { id: 'christian-hubicki', name: 'Christian Hubicki', image: 'assets/cast/christian-hubicki.jpg' },
  { id: 'cirie-fields', name: 'Cirie Fields', image: 'assets/cast/cirie-fields.jpg' },
  { id: 'colby-donaldson', name: 'Colby Donaldson', image: 'assets/cast/colby-donaldson.jpg' },
  { id: 'dee-valladares', name: 'Dee Valladares', image: 'assets/cast/dee-valladares.jpg' },
  { id: 'emily-flippen', name: 'Emily Flippen', image: 'assets/cast/emily-flippen.jpg' },
  { id: 'genevieve-mushaluk', name: 'Genevieve Mushaluk', image: 'assets/cast/genevieve-mushaluk.jpg' },
  { id: 'jenna-lewis-dougherty', name: 'Jenna Lewis-Dougherty', image: 'assets/cast/jenna-lewis-dougherty.jpg' },
  { id: 'joe-hunter', name: 'Joe Hunter', image: 'assets/cast/joe-hunter.jpg' },
  { id: 'jonathan-young', name: 'Jonathan Young', image: 'assets/cast/jonathan-young.jpg' },
  { id: 'kamilla-karthigesu', name: 'Kamilla Karthigesu', image: 'assets/cast/kamilla-karthigesu.jpg' },
  { id: 'kyle-fraser', name: 'Kyle Fraser', image: 'assets/cast/kyle-fraser.jpg' },
  { id: 'mike-white', name: 'Mike White', image: 'assets/cast/mike-white.jpg' },
  { id: 'ozzy-lusth', name: 'Ozzy Lusth', image: 'assets/cast/ozzy-lusth.jpg' },
  { id: 'q-burdette', name: 'Q Burdette', image: 'assets/cast/q-burdette.jpg' },
  { id: 'rick-devens', name: 'Rick Devens', image: 'assets/cast/rick-devens.jpg' },
  { id: 'rizo-velovic', name: 'Rizo Velovic', image: 'assets/cast/rizo-velovic.jpg' },
  { id: 'savannah-louie', name: 'Savannah Louie', image: 'assets/cast/savannah-louie.jpg' },
  { id: 'stephenie-lagrossa-kendrick', name: 'Stephenie LaGrossa Kendrick', image: 'assets/cast/stephenie-lagrossa-kendrick.jpg' },
  { id: 'tiffany-ervin', name: 'Tiffany Ervin', image: 'assets/cast/tiffany-ervin.jpg' }
];

const CAST_IDS = CASTAWAYS.map((castaway) => castaway.id);
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const TOKEN_SECRET = process.env.SHIPVIVOR_TOKEN_SECRET || 'shipvivor-rankings-token-secret-v1';
const LOCAL_DB_PATH = path.join(os.tmpdir(), 'shipvivor-local-db.json');
const NO_SCORE_WEEKS = new Set([1]);
const LEGACY_SCORE_WEEK = 2;
const SCALED_SCORE_START_WEEK = 3;
const SCALED_SCORE_BASE_CAP = 22;
const SCALED_SCORE_ALPHA = 0.7;
const LOCKED_WEEK_ONE_ELIMINATIONS = new Set(['kyle-fraser', 'jenna-lewis-dougherty']);
const MAX_CHAT_MESSAGES = 250;
const MAX_NOTE_LENGTH = 700;
const MAX_RECAP_LENGTH = 2400;
const MAX_RECAP_TITLE_LENGTH = 120;
const MAX_WINNER_PICKS = 3;
const MAX_BIRTH_NAME_LENGTH = 80;
const LOCK_ANCHOR_WEEK = 3;
const LOCK_ANCHOR_UTC_MS = Date.UTC(2026, 2, 12, 0, 0, 0);
const WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const TRIBE_KEYS = ['vatu', 'cila', 'kalo', 'merge'];
const USER_AFFILIATION_KEYS = ['', 'minecraft', 'college', 'chrisblue'];
const DEFAULT_TRIBE_BY_ID = {
  'angelina-keeley': 'vatu',
  'aubry-bracco': 'vatu',
  'colby-donaldson': 'vatu',
  'genevieve-mushaluk': 'vatu',
  'kyle-fraser': 'vatu',
  'q-burdette': 'vatu',
  'rizo-velovic': 'vatu',
  'stephenie-lagrossa-kendrick': 'vatu',
  'christian-hubicki': 'cila',
  'cirie-fields': 'cila',
  'emily-flippen': 'cila',
  'jenna-lewis-dougherty': 'cila',
  'joe-hunter': 'cila',
  'ozzy-lusth': 'cila',
  'rick-devens': 'cila',
  'savannah-louie': 'cila',
  'benjamin-coach-wade': 'kalo',
  'charlie-davis': 'kalo',
  'chrissy-hofbeck': 'kalo',
  'dee-valladares': 'kalo',
  'jonathan-young': 'kalo',
  'kamilla-karthigesu': 'kalo',
  'mike-white': 'kalo',
  'tiffany-ervin': 'kalo'
};

function defaultVotedOff() {
  const votedOff = {};
  for (const id of CAST_IDS) votedOff[id] = false;
  return votedOff;
}

function defaultLineup() {
  return [...CAST_IDS];
}

function normalizeTribeKey(value, fallback = 'vatu') {
  const key = String(value || '').trim().toLowerCase();
  if (TRIBE_KEYS.includes(key)) return key;
  return fallback;
}

function normalizeTribeHistory(history, fallbackKey = 'vatu') {
  const sequence = Array.isArray(history) ? history : [];
  const normalized = [];
  for (const key of sequence) {
    const normalizedKey = normalizeTribeKey(key, '');
    if (!normalizedKey) continue;
    normalized.push(normalizedKey);
  }
  if (!normalized.length) normalized.push(normalizeTribeKey(fallbackKey, 'vatu'));
  return normalized;
}

function createDefaultTribesById() {
  const map = {};
  for (const castId of CAST_IDS) {
    const fallbackKey = DEFAULT_TRIBE_BY_ID[castId] || 'vatu';
    map[castId] = [fallbackKey];
  }
  return map;
}

function normalizeTribesById(tribesById) {
  const normalized = {};
  const source = tribesById && typeof tribesById === 'object' ? tribesById : {};
  for (const castId of CAST_IDS) {
    const fallbackKey = DEFAULT_TRIBE_BY_ID[castId] || 'vatu';
    normalized[castId] = normalizeTribeHistory(source[castId], fallbackKey);
  }
  return normalized;
}

function normalizeWinnerPicksList(picks) {
  if (!Array.isArray(picks)) return [];
  const normalized = [];
  for (const pick of picks) {
    const castId = String(pick || '').trim();
    if (!CAST_IDS.includes(castId)) continue;
    if (normalized.includes(castId)) continue;
    normalized.push(castId);
    if (normalized.length >= MAX_WINNER_PICKS) break;
  }
  return normalized;
}

function normalizeWinnerPicksMap(userPicks) {
  const normalized = {};
  if (!userPicks || typeof userPicks !== 'object') return normalized;
  for (const [week, picks] of Object.entries(userPicks)) {
    const weekNum = Number(week);
    if (!Number.isInteger(weekNum) || weekNum < 1) continue;
    normalized[weekNum] = normalizeWinnerPicksList(picks);
  }
  return normalized;
}

function normalizeScoreOmissionsMap(omissions) {
  const normalized = {};
  if (!omissions || typeof omissions !== 'object') return normalized;
  for (const [week, value] of Object.entries(omissions)) {
    const weekNum = Number(week);
    if (!Number.isInteger(weekNum) || weekNum < 1) continue;
    normalized[weekNum] = Boolean(value);
  }
  return normalized;
}

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

function normalizeOrder(order) {
  const safeOrder = Array.isArray(order) ? order.filter((id) => CAST_IDS.includes(id)) : [];
  const missing = CAST_IDS.filter((id) => !safeOrder.includes(id));
  return [...safeOrder, ...missing];
}

function normalizeVotedOff(votedOff) {
  const map = defaultVotedOff();
  if (votedOff && typeof votedOff === 'object') {
    for (const [id, value] of Object.entries(votedOff)) {
      if (id in map) map[id] = Boolean(value);
    }
  }
  return map;
}

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

function normalizeSkippedWeeks(skippedWeeks) {
  const map = {};
  if (skippedWeeks && typeof skippedWeeks === 'object') {
    for (const [week, value] of Object.entries(skippedWeeks)) {
      const weekNum = Number(week);
      if (Number.isInteger(weekNum) && weekNum >= 1) {
        map[weekNum] = Boolean(value);
      }
    }
  }
  return map;
}

function sanitizeNote(value) {
  const raw = typeof value === 'string' ? value : '';
  return raw.replace(/\r/g, '').trim().slice(0, MAX_NOTE_LENGTH);
}

function sanitizeWeekRecap(value) {
  const raw = typeof value === 'string' ? value : '';
  return raw.replace(/\r/g, '').trim().slice(0, MAX_RECAP_LENGTH);
}

function sanitizeWeekRecapTitle(value) {
  const raw = typeof value === 'string' ? value : '';
  return raw.replace(/\r/g, '').trim().slice(0, MAX_RECAP_TITLE_LENGTH);
}

function defaultWeekRecapTitle(week) {
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1) return 'Week Recap';
  return `Week ${weekNum} Recap`;
}

function normalizeWeekRecapEntry(week, value) {
  const fallbackTitle = defaultWeekRecapTitle(week);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const title = sanitizeWeekRecapTitle(value.title) || fallbackTitle;
    const message = sanitizeWeekRecap(value.message);
    return { title, message };
  }
  return {
    title: fallbackTitle,
    message: sanitizeWeekRecap(value)
  };
}

function sanitizeBirthName(value) {
  const raw = typeof value === 'string' ? value : '';
  return raw.replace(/\r/g, '').trim().slice(0, MAX_BIRTH_NAME_LENGTH);
}

function sanitizeUserAffiliation(value) {
  const key = String(value || '').trim().toLowerCase();
  return USER_AFFILIATION_KEYS.includes(key) ? key : '';
}

function normalizeNotesMap(notesMap) {
  const normalized = {};
  if (!notesMap || typeof notesMap !== 'object') return normalized;
  for (const [id, value] of Object.entries(notesMap)) {
    if (!CAST_IDS.includes(id)) continue;
    const note = sanitizeNote(value);
    if (note) normalized[id] = note;
  }
  return normalized;
}

function normalizeWeekCommentsMap(weekComments, users = null) {
  const normalized = {};
  if (!weekComments || typeof weekComments !== 'object') return normalized;
  for (const [weekKey, rawEntry] of Object.entries(weekComments)) {
    const weekNum = Number(weekKey);
    if (!Number.isInteger(weekNum) || weekNum < 1) continue;
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) continue;
    const username = normalizeUsername(rawEntry.username);
    if (!validateUsername(username)) continue;
    if (users && !users[username]) continue;
    const castawayId = String(rawEntry.castawayId || '').trim();
    if (!CAST_IDS.includes(castawayId)) continue;
    const note = sanitizeNote(rawEntry.note);
    if (!note) continue;
    normalized[weekNum] = {
      username,
      castawayId,
      note,
      updatedAt: typeof rawEntry.updatedAt === 'string' ? rawEntry.updatedAt : null
    };
  }
  return normalized;
}

function sanitizeChatMessage(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, 500);
}

function normalizeAvatarId(id) {
  const candidate = String(id || '').trim();
  return CAST_IDS.includes(candidate) ? candidate : CAST_IDS[0];
}

function ensureUserProfile(db, username) {
  if (!db.profiles[username] || typeof db.profiles[username] !== 'object') {
    db.profiles[username] = { chatAvatarId: CAST_IDS[0], birthName: '', affiliation: '' };
  }
  db.profiles[username].chatAvatarId = normalizeAvatarId(db.profiles[username].chatAvatarId);
  db.profiles[username].birthName = sanitizeBirthName(db.profiles[username].birthName);
  db.profiles[username].affiliation = sanitizeUserAffiliation(db.profiles[username].affiliation);
  return db.profiles[username];
}

function normalizeChatMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const normalized = [];
  for (const message of messages) {
    if (!message || typeof message !== 'object') continue;
    const username = normalizeUsername(message.username);
    const text = sanitizeChatMessage(message.text);
    const createdAt = typeof message.createdAt === 'string' ? message.createdAt : new Date().toISOString();
    if (!validateUsername(username) || !text) continue;
    normalized.push({
      id: typeof message.id === 'string' ? message.id : crypto.randomBytes(8).toString('hex'),
      username,
      text,
      createdAt,
      avatarId: normalizeAvatarId(message.avatarId)
    });
  }
  return normalized.slice(-MAX_CHAT_MESSAGES);
}

function buildChatPayload(db, authenticatedUser) {
  const rawMessages = db.chat?.messages || [];
  const chatMessages = normalizeChatMessages(rawMessages);

  if (chatMessages.length !== rawMessages.length) {
    db.chat.messages = chatMessages;
  }

  let userAvatarId = null;
  if (authenticatedUser) {
    userAvatarId = ensureUserProfile(db, authenticatedUser.username).chatAvatarId;
  }

  return {
    messages: chatMessages,
    userAvatarId
  };
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

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const check = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
}

function normalizeUsername(input) {
  return String(input || '').trim().toLowerCase();
}

function base64UrlEncode(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input) {
  const normalized = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4 || 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signTokenPayload(payload) {
  return crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('hex');
}

function validateUsername(username) {
  return /^[a-z0-9_-]{3,24}$/.test(username);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function getTokenFromEvent(event) {
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function cleanExpiredSessions(db) {
  // Legacy session storage is no longer used.
  if (!db.sessions || typeof db.sessions !== 'object') db.sessions = {};
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

function hasSavedLineupForWeek(db, username, week) {
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1) return false;
  const userLineups = db.lineups?.[username];
  if (!userLineups || typeof userLineups !== 'object') return false;
  return Array.isArray(userLineups[weekNum]);
}

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
  const userSkippedWeeks = normalizeSkippedWeeks(db.skips[username]);
  const omittedWeeks = normalizeScoreOmissionsMap(db.scoreOmissions[username]);
  const joinedWeek = getUserJoinedWeek(db, username);

  for (let week = 1; week <= db.game.currentWeek; week += 1) {
    const isSkippedWeek = Boolean(userSkippedWeeks[week]);
    const isNoScoreWeek = NO_SCORE_WEEKS.has(week);
    const isOmittedWeek = Boolean(omittedWeeks[week] || week < joinedWeek);
    const scoringVersion = getScoringVersionForWeek(week);

    if (isSkippedWeek || isNoScoreWeek || isOmittedWeek) {
      weekBreakdown.push({
        week,
        points: 0,
        scoringVersion,
        skipped: isSkippedWeek,
        noScore: isNoScoreWeek,
        omitted: isOmittedWeek,
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

function getBirthNameForUsername(db, username) {
  return sanitizeBirthName(db.profiles?.[username]?.birthName);
}

function getAffiliationForUsername(db, username) {
  return sanitizeUserAffiliation(db.profiles?.[username]?.affiliation);
}

function buildUserProfilesPayload(db) {
  const profiles = {};
  for (const username of Object.keys(db.users)) {
    profiles[username] = {
      birthName: getBirthNameForUsername(db, username),
      affiliation: getAffiliationForUsername(db, username)
    };
  }
  return profiles;
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

function computeBiggestUpset(db) {
  const week = db.game.currentWeek - 1;
  if (week < 1 || NO_SCORE_WEEKS.has(week)) return null;

  const { previousWeekVotedOff, eliminations } = getWeekTransition(db, week);
  if (eliminations.length === 0) return null;

  let upset = null;
  for (const username of Object.keys(db.users)) {
    const userSkippedWeeks = normalizeSkippedWeeks(db.skips[username]);
    const omittedWeeks = normalizeScoreOmissionsMap(db.scoreOmissions[username]);
    const joinedWeek = getUserJoinedWeek(db, username);
    if (userSkippedWeeks[week]) continue;
    if (omittedWeeks[week] || week < joinedWeek) continue;

    const lineup = getLineupForWeek(db, username, week);
    const activeOrder = lineup.filter((id) => !previousWeekVotedOff[id]);

    for (const eliminatedId of eliminations) {
      const rank = activeOrder.indexOf(eliminatedId) + 1;
      if (rank <= 0) continue;
      const candidate = {
        week,
        username,
        birthName: getBirthNameForUsername(db, username),
        playerId: eliminatedId,
        playerName: CASTAWAYS.find((castaway) => castaway.id === eliminatedId)?.name || eliminatedId,
        points: rank,
        activeCount: activeOrder.length
      };

      if (!upset) {
        upset = candidate;
        continue;
      }

      if (candidate.points < upset.points) {
        upset = candidate;
        continue;
      }

      if (candidate.points === upset.points && candidate.username.localeCompare(upset.username) < 0) {
        upset = candidate;
      }
    }
  }

  return upset;
}

function computeMostHatedLastWeek(db) {
  const week = db.game.currentWeek - 1;
  if (week < 1 || NO_SCORE_WEEKS.has(week)) return null;
  const priorWeekVotedOff = week > 1 ? getEffectiveWeekVotedOff(db, week - 1) : defaultVotedOff();
  const activeIds = CAST_IDS.filter((id) => !priorWeekVotedOff[id]);
  if (!activeIds.length) return null;

  const rankTotals = {};
  for (const id of activeIds) {
    rankTotals[id] = { total: 0, count: 0 };
  }

  let voterCount = 0;
  for (const username of Object.keys(db.users)) {
    const userSkippedWeeks = normalizeSkippedWeeks(db.skips[username]);
    const omittedWeeks = normalizeScoreOmissionsMap(db.scoreOmissions[username]);
    const joinedWeek = getUserJoinedWeek(db, username);
    if (userSkippedWeeks[week]) continue;
    if (omittedWeeks[week] || week < joinedWeek) continue;

    const lineup = getLineupForWeek(db, username, week);
    const activeOrder = lineup.filter((id) => activeIds.includes(id));
    if (!activeOrder.length) continue;
    voterCount += 1;
    activeOrder.forEach((id, index) => {
      rankTotals[id].total += index + 1;
      rankTotals[id].count += 1;
    });
  }

  const averaged = activeIds
    .map((id) => {
      const info = rankTotals[id];
      if (!info || info.count < 1) return null;
      const averageRank = info.total / info.count;
      return {
        id,
        name: CASTAWAYS.find((castaway) => castaway.id === id)?.name || id,
        averageRank
      };
    })
    .filter(Boolean);

  if (!averaged.length) return null;

  const maxAverage = Math.max(...averaged.map((entry) => entry.averageRank));
  const epsilon = 1e-9;
  const players = averaged
    .filter((entry) => Math.abs(entry.averageRank - maxAverage) <= epsilon)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      averageRank: Number(entry.averageRank.toFixed(2))
    }));

  return {
    week,
    averageRank: Number(maxAverage.toFixed(2)),
    players,
    voterCount
  };
}

function computeLowestRankedActive(db) {
  return computeMostHatedLastWeek(db);
}

function createSession(db, username) {
  const user = db.users[username];
  const payload = {
    username,
    isAdmin: Boolean(user?.isAdmin),
    expiresAt: Date.now() + SESSION_MAX_AGE_MS
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signTokenPayload(encoded);
  return `${encoded}.${signature}`;
}

function getUserFromToken(db, token) {
  if (!token) return null;
  const [encodedPayload, providedSignature] = String(token).split('.');
  if (!encodedPayload || !providedSignature) return null;
  const expectedSignature = signTokenPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const providedBuffer = Buffer.from(providedSignature, 'hex');
  if (expectedBuffer.length !== providedBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  let payload = null;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.username !== 'string' || !validateUsername(payload.username)) return null;
  if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;

  return {
    username: payload.username,
    isAdmin: Boolean(payload.isAdmin)
  };
}

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      pragma: 'no-cache',
      expires: '0'
    },
    body: JSON.stringify(payload)
  };
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
  const store = getStore('shipvivor-db');
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const current = await store.getWithMetadata('state', { type: 'json' });
    const db = current?.data || createDefaultDb();
    const result = await callback(db);

    if (!result?.save) {
      if (result?.response) attachMetaToResponse(result.response, db);
      return result;
    }

    touchRevision(db);

    const writeOptions = current?.etag
      ? { onlyIfMatch: current.etag }
      : { onlyIfNew: true };
    const writeResult = await store.setJSON('state', db, writeOptions);

    if (writeResult.modified) {
      delete result.save;
      if (result?.response) attachMetaToResponse(result.response, db);
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
  if (result?.response) attachMetaToResponse(result.response, db);
  return result;
}

function ensureAdminUser(db) {
  const adminUsername = 'ship';
  if (!db.users[adminUsername]) {
    const { salt, hash } = hashPassword('shipley101');
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
  if (!db.users[adminUsername].isAdmin) {
    db.users[adminUsername].isAdmin = true;
    return true;
  }
  if (!db.skips[adminUsername] || typeof db.skips[adminUsername] !== 'object') {
    db.skips[adminUsername] = {};
    return true;
  }
  if (!db.scoreOmissions[adminUsername] || typeof db.scoreOmissions[adminUsername] !== 'object') {
    db.scoreOmissions[adminUsername] = {};
    return true;
  }
  if (!db.notes[adminUsername] || typeof db.notes[adminUsername] !== 'object') {
    db.notes[adminUsername] = {};
    return true;
  }
  if (!db.winnerPicks[adminUsername] || typeof db.winnerPicks[adminUsername] !== 'object') {
    db.winnerPicks[adminUsername] = {};
    return true;
  }
  if (!db.profiles[adminUsername] || typeof db.profiles[adminUsername] !== 'object') {
    db.profiles[adminUsername] = { chatAvatarId: CAST_IDS[0], birthName: '', affiliation: '' };
    return true;
  }
  const beforeProfile = JSON.stringify(db.profiles[adminUsername] || null);
  ensureUserProfile(db, adminUsername);
  if (JSON.stringify(db.profiles[adminUsername] || null) !== beforeProfile) {
    return true;
  }
  if (!db.legacyWeekScores || typeof db.legacyWeekScores !== 'object') {
    db.legacyWeekScores = { [LEGACY_SCORE_WEEK]: { [adminUsername]: 0 } };
    return true;
  }
  if (!db.legacyWeekScores[LEGACY_SCORE_WEEK] || typeof db.legacyWeekScores[LEGACY_SCORE_WEEK] !== 'object') {
    db.legacyWeekScores[LEGACY_SCORE_WEEK] = { [adminUsername]: 0 };
    return true;
  }
  if (!(adminUsername in db.legacyWeekScores[LEGACY_SCORE_WEEK])) {
    db.legacyWeekScores[LEGACY_SCORE_WEEK][adminUsername] = 0;
    return true;
  }
  return false;
}

function getWeekRecapForWeek(db, week) {
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1) {
    return normalizeWeekRecapEntry(1, null);
  }
  return normalizeWeekRecapEntry(weekNum, db.weekRecaps?.[weekNum]);
}

function getWeekCommentOfWeek(db, week) {
  const weekNum = Number(week);
  if (!Number.isInteger(weekNum) || weekNum < 1) return null;
  const normalizedWeekComments = normalizeWeekCommentsMap(db.weekComments, db.users);
  const entry = normalizedWeekComments[weekNum];
  if (!entry) return null;
  const castaway = CASTAWAYS.find((player) => player.id === entry.castawayId);
  return {
    week: weekNum,
    username: entry.username,
    birthName: getBirthNameForUsername(db, entry.username),
    castawayId: entry.castawayId,
    castawayName: castaway?.name || entry.castawayId,
    note: sanitizeNote(entry.note),
    updatedAt: entry.updatedAt || null
  };
}

function buildGamePayload(db, authenticatedUser, requestedWeek) {
  const week = Number(requestedWeek);
  const selectedWeek = Number.isInteger(week) && week >= 1 && week <= db.game.currentWeek
    ? week
    : db.game.currentWeek;

  const selectedWeekVotedOff = getEffectiveWeekVotedOff(db, selectedWeek);
  const selectedWeekLockDate = getWeekLockDate(selectedWeek);
  const selectedWeekLocked = isWeekLocked(selectedWeek);
  const currentWeekLockDate = getWeekLockDate(db.game.currentWeek);
  const currentWeekLocked = isWeekLocked(db.game.currentWeek);
  const selectedWeekRecap = getWeekRecapForWeek(db, selectedWeek);
  const recapCommentWeek = Math.max(1, selectedWeek - 1);
  const selectedWeekComment = getWeekCommentOfWeek(db, recapCommentWeek);

  let lineup = null;
  let score = null;
  let skippedWeeks = {};
  let omittedWeeks = {};
  let notes = {};
  let winnerPicks = [];
  const priorVotedOff = selectedWeek > 1 ? getEffectiveWeekVotedOff(db, selectedWeek - 1) : defaultVotedOff();

  if (authenticatedUser) {
    lineup = getLineupForWeek(db, authenticatedUser.username, selectedWeek);
    notes = getNotesForWeek(db, authenticatedUser.username, selectedWeek);
    winnerPicks = getWinnerPicksForWeek(db, authenticatedUser.username, selectedWeek);
    score = computeScoreBreakdown(db, authenticatedUser.username);
    skippedWeeks = normalizeSkippedWeeks(db.skips[authenticatedUser.username]);
    omittedWeeks = normalizeScoreOmissionsMap(db.scoreOmissions[authenticatedUser.username]);
  }

  const canShowWeekReport = selectedWeek < db.game.currentWeek;
  const weekReport = canShowWeekReport
    ? (db.reports[selectedWeek] || computeWeekReport(db, selectedWeek))
    : null;
  const chat = authenticatedUser
    ? buildChatPayload(db, authenticatedUser)
    : { messages: [], userAvatarId: null };

  return {
    cast: CASTAWAYS,
    user: authenticatedUser,
    currentWeek: db.game.currentWeek,
    selectedWeek,
    weeks: Array.from({ length: db.game.currentWeek }, (_, index) => index + 1),
    votedOff: selectedWeekVotedOff,
    priorVotedOff,
    lineup,
    notes,
    winnerPicks,
    tribesById: normalizeTribesById(db.tribesById),
    skippedWeeks,
    omittedWeeks,
    isSkippedWeek: Boolean(skippedWeeks[selectedWeek]),
    isOmittedWeek: Boolean(omittedWeeks[selectedWeek]),
    isNoScoreWeek: NO_SCORE_WEEKS.has(selectedWeek),
    isWeekLocked: selectedWeekLocked,
    weekLockAt: selectedWeekLockDate ? selectedWeekLockDate.toISOString() : null,
    isCurrentWeekLocked: currentWeekLocked,
    currentWeekLockAt: currentWeekLockDate ? currentWeekLockDate.toISOString() : null,
    allUsers: Object.keys(db.users).sort((a, b) => a.localeCompare(b)),
    userProfiles: buildUserProfilesPayload(db),
    leaderboard: buildLeaderboard(db),
    fullStandings: buildFullStandings(db),
    weekRecapWeek: selectedWeek,
    weekRecapTitle: selectedWeekRecap.title,
    weekRecap: selectedWeekRecap.message,
    weekCommentWeek: recapCommentWeek,
    weekCommentOfWeek: selectedWeekComment,
    biggestUpset: computeBiggestUpset(db),
    mostHated: computeMostHatedLastWeek(db),
    lowestRankedActive: computeLowestRankedActive(db),
    weekReport,
    chat,
    myScore: score,
    canEditVotedOff: Boolean(authenticatedUser?.isAdmin && selectedWeek === db.game.currentWeek && !NO_SCORE_WEEKS.has(selectedWeek))
  };
}

async function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';
  const action = (event.queryStringParameters?.action || '').trim();

  return withDb(event, async (db) => {
    let needsSave = ensureDbShape(db);
    if (ensureAdminUser(db)) needsSave = true;
    if (applyLockedGameState(db)) needsSave = true;
    cleanExpiredSessions(db);

    const token = getTokenFromEvent(event);
    const authenticatedUser = getUserFromToken(db, token);

    if (action === 'game' && method === 'GET') {
      const sinceRevision = Number(event.queryStringParameters?.sinceRevision);
      if (Number.isInteger(sinceRevision) && sinceRevision >= 0 && sinceRevision === Number(db.meta?.revision || 0)) {
        if (needsSave) {
          return { save: true, response: response(200, { ok: true, unchanged: true }) };
        }
        return { response: response(200, { ok: true, unchanged: true }) };
      }
      if (needsSave) return { save: true, response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, event.queryStringParameters?.week) }) };
      return { response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, event.queryStringParameters?.week) }) };
    }

    if (action === 'signup' && method === 'POST') {
      const body = await parseBody(event);
      const username = normalizeUsername(body.username);
      const password = body.password;

      if (!validateUsername(username)) return { response: response(400, { ok: false, error: 'Username must be 3-24 chars and use letters, numbers, _ or -.' }) };
      if (!validatePassword(password)) return { response: response(400, { ok: false, error: 'Password must be at least 8 characters.' }) };
      if (db.users[username]) return { response: response(409, { ok: false, error: 'Username already exists.' }) };

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

    if (action === 'login' && method === 'POST') {
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

    if (action === 'logout' && method === 'POST') {
      return { response: response(200, { ok: true }) };
    }

    if (!authenticatedUser) {
      return { response: response(401, { ok: false, error: 'Unauthorized.' }) };
    }

    if (action === 'save-lineup' && method === 'POST') {
      const body = await parseBody(event);
      const week = Number(body.week);
      if (!Number.isInteger(week) || week < 1 || week > db.game.currentWeek) {
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

    if (action === 'set-skip-week' && method === 'POST') {
      const body = await parseBody(event);
      const week = Number(body.week);
      if (!Number.isInteger(week) || week < 1 || week > db.game.currentWeek) {
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

    if (action === 'admin-update-votedoff' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }

      const body = await parseBody(event);
      const week = Number(body.week);
      if (week !== db.game.currentWeek) {
        return { response: response(400, { ok: false, error: 'You can only edit voted-off players for the current week.' }) };
      }
      if (NO_SCORE_WEEKS.has(week)) {
        return { response: response(400, { ok: false, error: 'This week is locked.' }) };
      }

      const votedOff = normalizeVotedOff(body.votedOff);
      db.game.weeks[week] = { votedOff };

      return {
        save: true,
        response: response(200, {
          ok: true,
          ...buildGamePayload(db, authenticatedUser, week)
        })
      };
    }

    if (action === 'admin-update-cast-tribe' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
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

    if (action === 'admin-remove-cast-tribe' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }

      const body = await parseBody(event);
      const castawayId = String(body.castawayId || '').trim();
      if (!CAST_IDS.includes(castawayId)) {
        return { response: response(400, { ok: false, error: 'Invalid castaway.' }) };
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

    if (action === 'admin-advance-week' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }

      const completedWeek = db.game.currentWeek;
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

    if (action === 'admin-jump-week' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }
      const body = await parseBody(event);
      const week = ensureWeek(db, body.week);
      if (!week) return { response: response(400, { ok: false, error: 'Invalid week.' }) };
      if (week > db.game.currentWeek) db.game.currentWeek = week;
      return {
        save: true,
        response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, week) })
      };
    }

    if (action === 'view-user-week' && method === 'GET') {
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
      const weekReport = db.reports[week] || computeWeekReport(db, week);
      const skippedWeeks = normalizeSkippedWeeks(db.skips[username]);
      const omittedWeeks = normalizeScoreOmissionsMap(db.scoreOmissions[username]);
      const joinedWeek = getUserJoinedWeek(db, username);
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
          isSkippedWeek: Boolean(skippedWeeks[week]),
          isOmittedWeek: Boolean(omittedWeeks[week] || week < joinedWeek)
        })
      };
    }

    if (action === 'admin-update-week-recap' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }

      const body = await parseBody(event);
      const week = Number(body.week);
      if (!Number.isInteger(week) || week < 1 || week > db.game.currentWeek) {
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

    if (action === 'admin-set-week-comment' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
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
      if (!db.weekComments || typeof db.weekComments !== 'object') {
        db.weekComments = {};
      }

      if (!enabled) {
        delete db.weekComments[week];
      } else {
        const username = normalizeUsername(body.username);
        const castawayId = String(body.castawayId || '').trim();
        if (!db.users[username]) {
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

    if (action === 'admin-set-omit-score-week' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }

      const body = await parseBody(event);
      const username = normalizeUsername(body.username);
      const week = Number(body.week);
      const omit = Boolean(body.omit);

      if (!db.users[username]) {
        return { response: response(404, { ok: false, error: 'User not found.' }) };
      }
      if (!Number.isInteger(week) || week < 1 || week >= db.game.currentWeek) {
        return { response: response(400, { ok: false, error: 'You can only omit completed weeks.' }) };
      }
      if (NO_SCORE_WEEKS.has(week)) {
        return { response: response(400, { ok: false, error: 'That week is already excluded from scoring.' }) };
      }

      if (!db.scoreOmissions[username] || typeof db.scoreOmissions[username] !== 'object') {
        db.scoreOmissions[username] = {};
      }
      if (omit) {
        db.scoreOmissions[username][week] = true;
      } else {
        delete db.scoreOmissions[username][week];
      }
      db.scoreOmissions[username] = normalizeScoreOmissionsMap(db.scoreOmissions[username]);

      const requestedWeek = Number(body.requestedWeek);
      const safeWeek = Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= db.game.currentWeek
        ? requestedWeek
        : db.game.currentWeek;

      return {
        save: true,
        response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, safeWeek) })
      };
    }

    if (action === 'admin-set-birth-name' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }

      const body = await parseBody(event);
      const username = normalizeUsername(body.username);
      if (!db.users[username]) {
        return { response: response(404, { ok: false, error: 'User not found.' }) };
      }

      ensureUserProfile(db, username).birthName = sanitizeBirthName(body.birthName);

      return {
        save: true,
        response: response(200, { ok: true, ...buildGamePayload(db, authenticatedUser, db.game.currentWeek) })
      };
    }

    if (action === 'admin-update-user-profile' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }

      const body = await parseBody(event);
      const username = normalizeUsername(body.username);
      if (!db.users[username]) {
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

    if (action === 'admin-update-user-password' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }

      const body = await parseBody(event);
      const username = normalizeUsername(body.username);
      const password = body.password;
      if (!db.users[username]) {
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

    if (action === 'admin-delete-user' && method === 'POST') {
      if (!authenticatedUser.isAdmin) {
        return { response: response(403, { ok: false, error: 'Admin access required.' }) };
      }

      const body = await parseBody(event);
      const username = normalizeUsername(body.username);
      if (!db.users[username]) {
        return { response: response(404, { ok: false, error: 'User not found.' }) };
      }
      if (username === authenticatedUser.username) {
        return { response: response(400, { ok: false, error: 'You cannot delete your own account.' }) };
      }

      delete db.users[username];
      delete db.lineups[username];
      delete db.notes[username];
      delete db.skips[username];
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

    if (action === 'chat-list' && method === 'GET') {
      const sinceRevision = Number(event.queryStringParameters?.sinceRevision);
      if (Number.isInteger(sinceRevision) && sinceRevision >= 0 && sinceRevision === Number(db.meta?.revision || 0)) {
        return {
          response: response(200, { ok: true, unchanged: true })
        };
      }
      return {
        response: response(200, { ok: true, chat: buildChatPayload(db, authenticatedUser) })
      };
    }

    if (action === 'set-chat-avatar' && method === 'POST') {
      const body = await parseBody(event);
      const avatarId = normalizeAvatarId(body.avatarId);
      ensureUserProfile(db, authenticatedUser.username).chatAvatarId = avatarId;

      return {
        save: true,
        response: response(200, { ok: true, chat: buildChatPayload(db, authenticatedUser) })
      };
    }

    if (action === 'send-chat-message' && method === 'POST') {
      const body = await parseBody(event);
      const text = sanitizeChatMessage(body.message);
      if (!text) {
        return { response: response(400, { ok: false, error: 'Message cannot be empty.' }) };
      }

      const avatarId = ensureUserProfile(db, authenticatedUser.username).chatAvatarId;
      const message = {
        id: crypto.randomBytes(8).toString('hex'),
        username: authenticatedUser.username,
        text,
        createdAt: new Date().toISOString(),
        avatarId
      };
      db.chat.messages = [...normalizeChatMessages(db.chat.messages), message].slice(-MAX_CHAT_MESSAGES);

      return {
        save: true,
        response: response(200, { ok: true, chat: buildChatPayload(db, authenticatedUser) })
      };
    }

    return { response: response(404, { ok: false, error: 'Unknown action.' }) };
  }).then((result) => result.response);
};
