const crypto = require('node:crypto');

const { validateUsername } = require('./auth');
const {
  CAST_IDS,
  DEFAULT_TRIBE_BY_ID,
  MAX_BIRTH_NAME_LENGTH,
  MAX_CHAT_MESSAGES,
  MAX_NOTE_LENGTH,
  MAX_RECAP_LENGTH,
  MAX_RECAP_TITLE_LENGTH,
  MAX_WINNER_PICKS,
  TRIBE_KEYS,
  USER_AFFILIATION_KEYS
} = require('./constants');

function normalizeUsername(input) {
  return String(input || '').trim().toLowerCase();
}

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

module.exports = {
  createDefaultTribesById,
  defaultLineup,
  defaultVotedOff,
  defaultWeekRecapTitle,
  ensureUserProfile,
  normalizeAvatarId,
  normalizeChatMessages,
  normalizeNotesMap,
  normalizeOrder,
  normalizeScoreOmissionsMap,
  normalizeSkippedWeeks,
  normalizeTribeHistory,
  normalizeTribeKey,
  normalizeTribesById,
  normalizeUsername,
  normalizeVotedOff,
  normalizeWeekCommentsMap,
  normalizeWeekRecapEntry,
  normalizeWinnerPicksList,
  normalizeWinnerPicksMap,
  sanitizeBirthName,
  sanitizeChatMessage,
  sanitizeNote,
  sanitizeUserAffiliation,
  sanitizeWeekRecap,
  sanitizeWeekRecapTitle
};
