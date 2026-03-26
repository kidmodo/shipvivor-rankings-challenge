import { buildApiUrl } from './js/api.js';
import { hasAdminAccess } from './js/admin.js';
import { countUnreadMessages, getLatestMessageId } from './js/chat.js';
import { clampIndex } from './js/drag.js';
import { setElementHidden } from './js/render.js';
import { CHAT_POLL_INTERVAL_MS, GAME_POLL_INTERVAL_MS } from './js/state.js';
import { downloadBlob } from './js/utils.js';

const TOKEN_KEY = 'shipvivor-token';
const LAST_KNOWN_WEEK_KEY = 'shipvivor-last-known-week';
const DEFAULT_BACKGROUND_IMAGE = './assets/ui/bg-tile.jpg';
const TRIBE_META = {
  vatu: { key: 'vatu', name: 'Vatu' },
  cila: { key: 'cila', name: 'Cila' },
  kalo: { key: 'kalo', name: 'Kalo' },
  merge: { key: 'merge', name: 'Merge' }
};
const USER_AFFILIATION_META = {
  minecraft: {
    key: 'minecraft',
    label: 'Minecraft Survivor',
    tooltip: 'Ship knows this person from, Minecraft Survivor.',
    icon: 'assets/ui/mcsurvivor.jpeg'
  },
  college: {
    key: 'college',
    label: 'College Friend',
    tooltip: 'Ship knows this person from, College Friend.',
    icon: 'assets/ui/college.png'
  },
  chrisblue: {
    key: 'chrisblue',
    label: 'Chris Blue Expanded Universe',
    tooltip: 'Ship knows this person from, Chris Blue Expanded Gameshow Universe.',
    icon: 'assets/ui/chrisblue.webp'
  }
};

const authPanelEl = document.getElementById('authPanel');
const loggedOutViewEl = document.getElementById('loggedOutView');
const compactSessionBarEl = document.getElementById('compactSessionBar');
const loginFormEl = document.getElementById('loginForm');
const signupFormEl = document.getElementById('signupForm');
const logoutBtnEl = document.getElementById('logoutBtn');
const authMessageEl = document.getElementById('authMessage');
const sessionTextEl = document.getElementById('sessionText');
const compactStatusTextEl = document.getElementById('compactStatusText');

const leaderboardListEl = document.getElementById('leaderboardList');
const activeWeekBadgeEl = document.getElementById('activeWeekBadge');
const biggestUpsetTextEl = document.getElementById('biggestUpsetText');
const mostHatedTextEl = document.getElementById('mostHatedText');
const weekRecapLabelEl = document.getElementById('weekRecapLabel');
const weekRecapTextEl = document.getElementById('weekRecapText');
const weekCommentWrapEl = document.getElementById('weekCommentWrap');
const weekCommentTextEl = document.getElementById('weekCommentText');
const weekCommentMetaEl = document.getElementById('weekCommentMeta');
const editWeekRecapBtnEl = document.getElementById('editWeekRecapBtn');
const weekRecapAdminEl = document.getElementById('weekRecapAdmin');
const weekRecapTitleInputEl = document.getElementById('weekRecapTitleInput');
const weekRecapInputEl = document.getElementById('weekRecapInput');
const saveWeekRecapBtnEl = document.getElementById('saveWeekRecapBtn');
const cancelWeekRecapBtnEl = document.getElementById('cancelWeekRecapBtn');
const adminUserPanelEl = document.getElementById('adminUserPanel');
const adminUserTargetEl = document.getElementById('adminUserTarget');
const adminBirthNameInputEl = document.getElementById('adminBirthNameInput');
const adminAffiliationSelectEl = document.getElementById('adminAffiliationSelect');
const adminSaveUserProfileBtnEl = document.getElementById('adminSaveUserProfileBtn');
const adminResetPasswordBtnEl = document.getElementById('adminResetPasswordBtn');
const adminExportDbBtnEl = document.getElementById('adminExportDbBtn');
const adminDeleteUserBtnEl = document.getElementById('adminDeleteUserBtn');
const adminBackgroundPanelEl = document.getElementById('adminBackgroundPanel');
const adminBackgroundFileInputEl = document.getElementById('adminBackgroundFileInput');
const adminBackgroundStatusEl = document.getElementById('adminBackgroundStatus');
const adminBackgroundTileWidthInputEl = document.getElementById('adminBackgroundTileWidthInput');
const adminBackgroundTileHeightInputEl = document.getElementById('adminBackgroundTileHeightInput');
const adminBackgroundOpacityInputEl = document.getElementById('adminBackgroundOpacityInput');
const adminBackgroundOpacityValueEl = document.getElementById('adminBackgroundOpacityValue');
const adminSaveBackgroundBtnEl = document.getElementById('adminSaveBackgroundBtn');
const adminResetBackgroundBtnEl = document.getElementById('adminResetBackgroundBtn');

const appPanelEl = document.getElementById('appPanel');
const saveStatusBannerEl = document.getElementById('saveStatusBanner');
const rankingsViewEl = document.getElementById('rankingsView');
const othersRankingsViewEl = document.getElementById('othersRankingsView');
const chatViewEl = document.getElementById('chatView');
const fullStandingsViewEl = document.getElementById('fullStandingsView');
const setLineupTabBtnEl = document.getElementById('setLineupTabBtn');
const standingsTabBtnEl = document.getElementById('standingsTabBtn');
const othersRankingsTabBtnEl = document.getElementById('othersRankingsTabBtn');
const chatTabBtnEl = document.getElementById('chatTabBtn');
const chatUnreadBadgeEl = document.getElementById('chatUnreadBadge');
const weekSelectEl = document.getElementById('weekSelect');
const saveWeekBtnEl = document.getElementById('saveWeekBtn');
const saveIndicatorEl = document.getElementById('saveIndicator');
const skipWeekBtnEl = document.getElementById('skipWeekBtn');
const skipWeekNoteEl = document.getElementById('skipWeekNote');
const resetWeekBtnEl = document.getElementById('resetWeekBtn');
const advanceWeekBtnEl = document.getElementById('advanceWeekBtn');
const weekStatsEl = document.getElementById('weekStats');

const myScoreTotalEl = document.getElementById('myScoreTotal');
const myScoreBreakdownEl = document.getElementById('myScoreBreakdown');

const othersWeekSelectEl = document.getElementById('othersWeekSelect');
const viewUserSelectEl = document.getElementById('viewUserSelect');
const othersRankingsStatsEl = document.getElementById('othersRankingsStats');
const othersSkipNoteEl = document.getElementById('othersSkipNote');
const omitScorePanelEl = document.getElementById('omitScorePanel');
const omitScoreStatusEl = document.getElementById('omitScoreStatus');
const omitScoreToggleBtnEl = document.getElementById('omitScoreToggleBtn');

const rankListEl = document.getElementById('rankList');
const othersRankListEl = document.getElementById('othersRankList');
const eliminatedBucketEl = document.getElementById('eliminatedBucket');
const weekReportPanelEl = document.getElementById('weekReportPanel');
const weekReportWrapEl = document.getElementById('weekReportWrap');
const chatAvatarSelectEl = document.getElementById('chatAvatarSelect');
const chatAvatarPreviewEl = document.getElementById('chatAvatarPreview');
const saveChatAvatarBtnEl = document.getElementById('saveChatAvatarBtn');
const refreshChatBtnEl = document.getElementById('refreshChatBtn');
const chatMessagesEl = document.getElementById('chatMessages');
const chatEmptyEl = document.getElementById('chatEmpty');
const chatFormEl = document.getElementById('chatForm');
const chatInputEl = document.getElementById('chatInput');
const sendChatBtnEl = document.getElementById('sendChatBtn');
const fullStandingsWrapEl = document.getElementById('fullStandingsWrap');
const lockCountdownTextEl = document.getElementById('lockCountdownText');
const userAffiliationBadgeEl = document.getElementById('userAffiliationBadge');
const scoringHelpBtnEl = document.getElementById('scoringHelpBtn');
const scoringHelpModalEl = document.getElementById('scoringHelpModal');
const closeScoringHelpBtnEl = document.getElementById('closeScoringHelpBtn');

const state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: null,
  cast: [],
  castMap: new Map(),
  currentWeek: 1,
  selectedWeek: 1,
  weeks: [1],
  priorVotedOff: {},
  votedOff: {},
  fullLineup: [],
  activeLineup: [],
  eliminatedLineup: [],
  notes: {},
  previousWeekRanks: {},
  winnerPicks: [],
  tribesById: {},
  skippedWeeks: {},
  omittedWeeks: {},
  isSkippedWeek: false,
  isOmittedWeek: false,
  isNoScoreWeek: false,
  isWeekLocked: false,
  weekLockAt: null,
  isCurrentWeekLocked: false,
  currentWeekLockAt: null,
  allUsers: [],
  userProfiles: {},
  weekReport: null,
  fullStandings: { weeks: [], rows: [] },
  weekRecapWeek: 1,
  weekRecapTitle: '',
  weekRecap: '',
  weekRecapTitleDraft: '',
  weekRecapDraft: '',
  weekRecapEditOpen: false,
  weekCommentWeek: 1,
  weekCommentOfWeek: null,
  lineupOwner: null,
  isViewingOther: false,
  othersWeek: null,
  othersUsername: null,
  othersLineup: [],
  othersNotes: {},
  othersPriorVotedOff: {},
  othersVotedOff: {},
  othersSkippedWeek: false,
  othersOmittedWeek: false,
  othersNoSubmit: false,
  othersHasSavedLineup: false,
  othersCountedByAdmin: false,
  othersWeekReport: null,
  othersWeekCommentOfWeek: null,
  othersLoadedWeek: null,
  othersLoadedUsername: null,
  adminTargetUser: null,
  adminProfileDraftDirty: false,
  adminProfileDraftTarget: null,
  adminProfileDraftBirthName: '',
  adminProfileDraftAffiliation: '',
  activeTab: 'set-lineup',
  chatMessages: [],
  chatAvatarId: null,
  revision: 0,
  lastMutationAt: null,
  requestCounter: 0,
  lastAppliedRequestSeq: 0,
  chatPollTimer: null,
  gamePollTimer: null,
  lockCountdownTimer: null,
  leaderboard: [],
  biggestUpset: null,
  mostHated: null,
  myScore: null,
  backgroundConfig: { tileWidth: 280, tileHeight: 160, overlayOpacity: 0.55, hasCustomImage: false, imageVersion: 0 },
  backgroundImageUrl: null,
  canEditVotedOff: false,
  tribeUpdateInFlight: false,
  birthNameUpdateInFlight: false,
  hasUnsavedChanges: false,
  lastSeenChatMessageId: null,
  unreadChatCount: 0,
  pageHidden: document.hidden,
  dirty: false,
  draggingId: null,
  dropInsertIndex: null,
  loading: false
};

function getChatLastSeenStorageKey(username) {
  const safeUsername = String(username || '').trim().toLowerCase();
  if (!safeUsername) return null;
  return `shipvivor-chat-last-seen:${safeUsername}`;
}

function getLineupDraftStorageKey(username, week) {
  const safeUsername = String(username || '').trim().toLowerCase();
  const weekNum = Number(week);
  if (!safeUsername || !Number.isInteger(weekNum) || weekNum < 1) return null;
  return `shipvivor-lineup-draft:${safeUsername}:week:${weekNum}`;
}

function loadLineupDraft(username, week) {
  const key = getLineupDraftStorageKey(username, week);
  if (!key) return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function storeLineupDraft(username, week, draft) {
  const key = getLineupDraftStorageKey(username, week);
  if (!key) return;
  if (!draft || typeof draft !== 'object') {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(draft));
}

function clearLineupDraft(username, week) {
  const key = getLineupDraftStorageKey(username, week);
  if (!key) return;
  localStorage.removeItem(key);
}

function getChatDraftStorageKey(username) {
  const safeUsername = String(username || '').trim().toLowerCase();
  if (!safeUsername) return null;
  return `shipvivor-chat-draft:${safeUsername}`;
}

function loadChatDraft(username) {
  const key = getChatDraftStorageKey(username);
  if (!key) return '';
  return String(localStorage.getItem(key) || '');
}

function storeChatDraft(username, value) {
  const key = getChatDraftStorageKey(username);
  if (!key) return;
  const text = String(value || '');
  if (!text) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, text);
}

function getBackgroundImageCacheKey(version) {
  const versionNum = Number(version);
  if (!Number.isInteger(versionNum) || versionNum < 1) return null;
  return `shipvivor-background-image:${versionNum}`;
}

function loadCachedBackgroundImage(version) {
  const key = getBackgroundImageCacheKey(version);
  if (!key) return '';
  return String(localStorage.getItem(key) || '');
}

function storeCachedBackgroundImage(version, dataUrl) {
  const key = getBackgroundImageCacheKey(version);
  if (!key || !dataUrl) return;
  localStorage.setItem(key, dataUrl);
}

function loadStoredLastSeenChatMessageId(username) {
  const key = getChatLastSeenStorageKey(username);
  if (!key) return null;
  const value = localStorage.getItem(key);
  return value ? String(value) : null;
}

function storeLastSeenChatMessageId(username, messageId) {
  const key = getChatLastSeenStorageKey(username);
  if (!key) return;
  if (!messageId) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, String(messageId));
}

function saveCurrentLineupDraft() {
  if (!state.user || state.isViewingOther || state.selectedWeek !== state.currentWeek) return;
  storeLineupDraft(state.user.username, state.selectedWeek, {
    fullLineup: state.fullLineup,
    notes: state.notes,
    winnerPicks: state.winnerPicks,
    updatedAt: new Date().toISOString()
  });
}

function clearCurrentLineupDraft() {
  if (!state.user || state.isViewingOther) return;
  clearLineupDraft(state.user.username, state.selectedWeek);
}

function restoreCurrentLineupDraft() {
  if (!state.user || state.isViewingOther || state.selectedWeek !== state.currentWeek) return false;
  const draft = loadLineupDraft(state.user.username, state.selectedWeek);
  if (!draft) return false;

  const draftLineup = normalizeLineup(draft.fullLineup || state.fullLineup);
  const draftNotes = draft.notes && typeof draft.notes === 'object' && !Array.isArray(draft.notes)
    ? Object.fromEntries(Object.entries(draft.notes).map(([id, value]) => [id, String(value || '').slice(0, 700)]))
    : {};
  const draftWinnerPicks = normalizeWinnerPicks(draft.winnerPicks || []);
  const sameLineup = JSON.stringify(draftLineup) === JSON.stringify(state.fullLineup);
  const sameNotes = JSON.stringify(draftNotes) === JSON.stringify(state.notes || {});
  const sameWinnerPicks = JSON.stringify(draftWinnerPicks) === JSON.stringify(state.winnerPicks || []);
  if (sameLineup && sameNotes && sameWinnerPicks) return false;

  state.fullLineup = draftLineup;
  state.notes = draftNotes;
  state.winnerPicks = draftWinnerPicks;
  deriveDisplayBuckets();
  state.dirty = true;
  state.hasUnsavedChanges = true;
  return true;
}

function showMessage(text, isError = true) {
  authMessageEl.textContent = text || '';
  authMessageEl.style.color = isError ? '#6f2117' : '#145035';
  if (compactStatusTextEl) {
    compactStatusTextEl.textContent = state.user ? (text || '') : '';
    compactStatusTextEl.style.color = isError ? '#6f2117' : '#145035';
  }
}

function clearMessage() {
  showMessage('', false);
}

function setToken(token) {
  state.token = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiRequest(action, { method = 'GET', params = {}, data = null } = {}) {
  const requestSeq = ++state.requestCounter;
  const url = buildApiUrl(action, params);
  const upperMethod = String(method || 'GET').toUpperCase();
  const requestData = (
    data
    && typeof data === 'object'
    && !Array.isArray(data)
    && upperMethod !== 'GET'
    && upperMethod !== 'HEAD'
  )
    ? { ...data, expectedRevision: data.expectedRevision ?? state.revision }
    : data;

  const headers = { 'content-type': 'application/json' };
  if (state.token) headers.authorization = `Bearer ${state.token}`;

  const response = await fetch(url.toString(), {
    method: upperMethod,
    cache: 'no-store',
    headers,
    body: requestData ? JSON.stringify(requestData) : null
  });

  if (response.status === 304) {
    return { ok: true, unchanged: true, __requestSeq: requestSeq };
  }

  const payload = await response.json().catch(() => ({}));
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    payload.__requestSeq = requestSeq;
  }
  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function hasUnsavedWeekRecapDraft() {
  if (!state.user?.isAdmin) return false;
  return (
    String(state.weekRecapTitleDraft || '') !== String(state.weekRecapTitle || '')
    || String(state.weekRecapDraft || '') !== String(state.weekRecap || '')
  );
}

function hasPendingLocalEdits() {
  return Boolean(state.dirty || state.adminProfileDraftDirty || hasUnsavedWeekRecapDraft());
}

function shouldApplyPayload(payload) {
  const requestSeq = Number(payload?.__requestSeq || 0);
  const incomingRevision = Number(payload?.revision);
  const hasRevision = Number.isInteger(incomingRevision) && incomingRevision >= 0;

  if (hasRevision && incomingRevision < state.revision) {
    return false;
  }

  if (
    requestSeq > 0
    && requestSeq < state.lastAppliedRequestSeq
    && (!hasRevision || incomingRevision <= state.revision)
  ) {
    return false;
  }

  return true;
}

function consumePayloadMeta(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!shouldApplyPayload(payload)) return false;

  const incomingRevision = Number(payload.revision);
  if (Number.isInteger(incomingRevision) && incomingRevision >= 0) {
    state.revision = Math.max(state.revision, incomingRevision);
  }
  if (typeof payload.lastMutationAt === 'string') {
    state.lastMutationAt = payload.lastMutationAt;
  }
  const requestSeq = Number(payload.__requestSeq || 0);
  if (requestSeq > state.lastAppliedRequestSeq) {
    state.lastAppliedRequestSeq = requestSeq;
  }
  return true;
}

async function handleConflictError(error, { reloadWeek = state.selectedWeek, refreshChat = true } = {}) {
  if (!error || error.status !== 409) return false;
  if (error.payload && typeof error.payload === 'object') {
    consumePayloadMeta(error.payload);
  }
  if (state.user) {
    await loadGame(reloadWeek, true, 0);
    if (refreshChat) {
      await fetchChatData(true);
    }
  }
  showMessage(error.message || 'Someone else updated the app. Reload and try again.');
  return true;
}

function normalizeBackgroundConfigClient(config) {
  const source = config && typeof config === 'object' ? config : {};
  const tileWidth = Math.max(120, Math.min(640, Math.round(Number(source.tileWidth) || 280)));
  const tileHeight = Math.max(80, Math.min(420, Math.round(Number(source.tileHeight) || 160)));
  const overlayOpacity = Math.max(0.1, Math.min(0.9, Number(source.overlayOpacity) || 0.55));
  const imageVersion = Number(source.imageVersion);
  return {
    tileWidth,
    tileHeight,
    overlayOpacity: Math.round(overlayOpacity * 100) / 100,
    hasCustomImage: Boolean(source.hasCustomImage),
    imageVersion: Number.isInteger(imageVersion) && imageVersion >= 0 ? imageVersion : 0
  };
}

function applyBackgroundAppearance() {
  const root = document.documentElement;
  const config = normalizeBackgroundConfigClient(state.backgroundConfig);
  const imageUrl = state.backgroundImageUrl || DEFAULT_BACKGROUND_IMAGE;
  const blurWidth = Math.max(80, Math.round(config.tileWidth * 0.89));
  const blurHeight = Math.max(60, Math.round(config.tileHeight * 0.91));
  const cssUrl = `url("${String(imageUrl).replace(/"/g, '\\"')}")`;
  root.style.setProperty('--app-bg-image', cssUrl);
  root.style.setProperty('--app-bg-size-main', `${config.tileWidth}px ${config.tileHeight}px`);
  root.style.setProperty('--app-bg-size-blur', `${blurWidth}px ${blurHeight}px`);
  root.style.setProperty('--app-bg-overlay-opacity', String(config.overlayOpacity));
}

async function ensureBackgroundImageLoaded() {
  const config = normalizeBackgroundConfigClient(state.backgroundConfig);
  state.backgroundConfig = config;
  if (!config.hasCustomImage || config.imageVersion < 1) {
    state.backgroundImageUrl = null;
    applyBackgroundAppearance();
    return;
  }

  const cached = loadCachedBackgroundImage(config.imageVersion);
  if (cached) {
    state.backgroundImageUrl = cached;
    applyBackgroundAppearance();
    return;
  }

  try {
    const url = buildApiUrl('background-image', { version: config.imageVersion });
    const response = await fetch(url.toString(), { method: 'GET', cache: 'force-cache' });
    if (!response.ok) {
      state.backgroundImageUrl = null;
      applyBackgroundAppearance();
      return;
    }
    const dataUrl = await response.text();
    if (dataUrl) {
      state.backgroundImageUrl = dataUrl;
      storeCachedBackgroundImage(config.imageVersion, dataUrl);
    } else {
      state.backgroundImageUrl = null;
    }
  } catch {
    state.backgroundImageUrl = null;
  }
  applyBackgroundAppearance();
}

function normalizeLineup(lineup) {
  const safeOrder = Array.isArray(lineup) ? lineup.filter((id) => state.castMap.has(id)) : [];
  const missing = state.cast.map((castaway) => castaway.id).filter((id) => !safeOrder.includes(id));
  return [...safeOrder, ...missing];
}

function normalizeWinnerPicks(picks) {
  if (!Array.isArray(picks)) return [];
  const normalized = [];
  for (const id of picks) {
    if (!state.castMap.has(id)) continue;
    if (normalized.includes(id)) continue;
    normalized.push(id);
    if (normalized.length >= 3) break;
  }
  return normalized;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBirthName(username) {
  if (!username) return '';
  const raw = state.userProfiles?.[username]?.birthName;
  return typeof raw === 'string' ? raw.trim() : '';
}

function getUserAffiliation(username) {
  if (!username) return '';
  const raw = String(state.userProfiles?.[username]?.affiliation || '').trim().toLowerCase();
  return USER_AFFILIATION_META[raw] ? raw : '';
}

function renderAffiliationIconHtml(username, className = 'affiliation-icon') {
  const key = getUserAffiliation(username);
  const meta = USER_AFFILIATION_META[key];
  if (!meta) return '';
  return `<img class="${escapeHtml(className)}" src="${escapeHtml(meta.icon)}" alt="${escapeHtml(meta.label)}" title="${escapeHtml(meta.tooltip)}" loading="lazy">`;
}

function formatUserLabelText(username) {
  const safeUsername = String(username || '').trim();
  const birthName = getBirthName(safeUsername);
  return birthName ? `${birthName} (${safeUsername})` : safeUsername;
}

function formatUserLabelHtml(username, { includeAffiliationIcon = false } = {}) {
  const safeUsername = String(username || '').trim();
  const safeUserHtml = escapeHtml(safeUsername);
  const birthName = getBirthName(safeUsername);
  const iconHtml = includeAffiliationIcon ? renderAffiliationIconHtml(safeUsername, 'affiliation-icon inline') : '';
  if (!birthName) {
    return `<span class="user-label"><span class="user-label-birth">${safeUserHtml}</span>${iconHtml}</span>`;
  }
  return `<span class="user-label"><span class="user-label-birth">${escapeHtml(birthName)}</span> (<span class="user-label-username">${safeUserHtml}</span>)${iconHtml}</span>`;
}

function deriveDisplayBuckets() {
  const priorMap = state.priorVotedOff || {};
  state.activeLineup = state.fullLineup.filter((id) => !priorMap[id]);
  state.eliminatedLineup = state.fullLineup.filter((id) => priorMap[id]);
}

function isLineupEditable() {
  return Boolean(
    state.user
    && state.selectedWeek === state.currentWeek
    && !state.isNoScoreWeek
    && !state.isOmittedWeek
    && !state.isWeekLocked
    && !state.isSkippedWeek
    && !state.isViewingOther
  );
}

function canViewPastUserLineups() {
  return Boolean(
    state.user
    && state.selectedWeek < state.currentWeek
    && !state.isNoScoreWeek
  );
}

function escapeAndFormatMessage(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function formatEtDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  }).format(date);
}

function getDisplayedRecapWeek() {
  const fallbackWeek = state.user ? state.selectedWeek : state.currentWeek;
  const week = Number(state.weekRecapWeek || fallbackWeek || state.currentWeek || 1);
  return Number.isInteger(week) && week >= 1 ? week : 1;
}

function isRecapEditable() {
  return Boolean(state.user?.isAdmin && getDisplayedRecapWeek() === state.currentWeek);
}

function closeWeekRecapEditor(resetDraft = true) {
  state.weekRecapEditOpen = false;
  if (resetDraft) {
    state.weekRecapTitleDraft = state.weekRecapTitle;
    state.weekRecapDraft = state.weekRecap;
  }
}

function formatCountdown(remainingMs) {
  const safeMs = Math.max(0, Math.floor(remainingMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatPoints(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.0';
  return num.toFixed(1);
}

function formatRankDelta(currentRank, previousRank) {
  const current = Number(currentRank);
  const previous = Number(previousRank);
  if (!Number.isInteger(current) || !Number.isInteger(previous)) return null;
  const delta = previous - current;
  if (delta > 0) return { value: delta, text: `+${delta}`, className: 'positive' };
  if (delta < 0) return { value: delta, text: String(delta), className: 'negative' };
  return { value: 0, text: '0', className: 'neutral' };
}

function getLatestChatMessageId() {
  return getLatestMessageId(state.chatMessages);
}

function updateUnreadChatState() {
  const latestId = getLatestChatMessageId();
  if (!latestId) {
    state.unreadChatCount = 0;
    if (state.activeTab === 'chat') {
      state.lastSeenChatMessageId = null;
      storeLastSeenChatMessageId(state.user?.username, null);
    }
    return;
  }
  if (!state.lastSeenChatMessageId) {
    state.lastSeenChatMessageId = latestId;
    storeLastSeenChatMessageId(state.user?.username, latestId);
    state.unreadChatCount = 0;
    return;
  }
  const unreadCount = countUnreadMessages(state.chatMessages, state.lastSeenChatMessageId);
  const hasLastSeenMessage = state.chatMessages.some((message) => message.id === state.lastSeenChatMessageId);
  if (!hasLastSeenMessage) {
    state.unreadChatCount = state.activeTab === 'chat' ? 0 : unreadCount;
    if (state.activeTab === 'chat') {
      state.lastSeenChatMessageId = latestId;
      storeLastSeenChatMessageId(state.user?.username, latestId);
    }
    return;
  }
  state.unreadChatCount = state.activeTab === 'chat' ? 0 : unreadCount;
}

function markChatAsSeen() {
  const latestId = getLatestChatMessageId();
  if (!latestId) return;
  state.lastSeenChatMessageId = latestId;
  storeLastSeenChatMessageId(state.user?.username, latestId);
  state.unreadChatCount = 0;
  renderChatUnreadBadge();
}

function renderChatUnreadBadge() {
  if (!chatUnreadBadgeEl) return;
  const unreadCount = state.activeTab === 'chat' ? 0 : Number(state.unreadChatCount || 0);
  chatUnreadBadgeEl.textContent = String(unreadCount);
  chatUnreadBadgeEl.classList.toggle('hidden', unreadCount < 1);
}

function stopChatPolling() {
  if (!state.chatPollTimer) return;
  window.clearInterval(state.chatPollTimer);
  state.chatPollTimer = null;
}

function startChatPolling() {
  stopChatPolling();
  if (!state.user || state.pageHidden) return;
  state.chatPollTimer = window.setInterval(() => {
    fetchChatData(true);
  }, CHAT_POLL_INTERVAL_MS);
}

function stopGamePolling() {
  if (!state.gamePollTimer) return;
  window.clearInterval(state.gamePollTimer);
  state.gamePollTimer = null;
}

function startGamePolling() {
  stopGamePolling();
  if (!state.user || state.pageHidden) return;
  state.gamePollTimer = window.setInterval(async () => {
    if (!state.user || state.loading || state.isViewingOther || hasPendingLocalEdits()) return;
    try {
      const payload = await apiRequest('game', {
        params: {
          week: state.selectedWeek,
          sinceRevision: state.revision
        }
      });
      if (payload.unchanged) return;
      const applied = applyPayload(payload);
      if (applied) render();
    } catch {
      // silent background sync
    }
  }, GAME_POLL_INTERVAL_MS);
}

function renderLockCountdown() {
  if (!lockCountdownTextEl) return;
  const lockDate = new Date(state.currentWeekLockAt || '');
  if (!Number.isFinite(lockDate.getTime())) {
    lockCountdownTextEl.textContent = '--:--:--';
    return;
  }
  const remaining = lockDate.getTime() - Date.now();
  if (remaining <= 0 || state.isCurrentWeekLocked) {
    lockCountdownTextEl.textContent = 'Locked';
    return;
  }
  lockCountdownTextEl.textContent = formatCountdown(remaining);
}

function stopLockCountdownTimer() {
  if (!state.lockCountdownTimer) return;
  window.clearInterval(state.lockCountdownTimer);
  state.lockCountdownTimer = null;
}

function startLockCountdownTimer() {
  stopLockCountdownTimer();
  renderLockCountdown();
  if (!state.user) return;
  state.lockCountdownTimer = window.setInterval(renderLockCountdown, 1000);
}

function setActiveTab(tabName) {
  if (tabName === 'chat') {
    state.activeTab = 'chat';
  } else if (tabName === 'standings') {
    state.activeTab = 'standings';
  } else if (tabName === 'others-rankings') {
    state.activeTab = 'others-rankings';
  } else {
    state.activeTab = 'set-lineup';
  }
  const chatActive = state.activeTab === 'chat';
  const standingsActive = state.activeTab === 'standings';
  const setLineupActive = state.activeTab === 'set-lineup';
  const othersActive = state.activeTab === 'others-rankings';
  setLineupTabBtnEl.classList.toggle('active', setLineupActive);
  standingsTabBtnEl.classList.toggle('active', standingsActive);
  othersRankingsTabBtnEl.classList.toggle('active', othersActive);
  chatTabBtnEl.classList.toggle('active', chatActive);
  rankingsViewEl.classList.toggle('hidden', !setLineupActive);
  othersRankingsViewEl.classList.toggle('hidden', !othersActive);
  chatViewEl.classList.toggle('hidden', !chatActive);
  fullStandingsViewEl.classList.toggle('hidden', !standingsActive);

  if (chatActive) {
    renderChat();
    markChatAsSeen();
  }
  if (standingsActive) {
    renderFullStandings();
  }
  if (othersActive) {
    renderOthersRankings();
  }
  renderUserAffiliationBadge();
  renderChatUnreadBadge();
  startChatPolling();
}

function getTribeMeta(castawayId) {
  const defaultTribe = TRIBE_META.vatu;
  const historyKeysRaw = state.tribesById?.[castawayId];
  const historyKeys = Array.isArray(historyKeysRaw) && historyKeysRaw.length
    ? historyKeysRaw.filter((key) => TRIBE_META[key])
    : [defaultTribe.key];
  const safeHistory = historyKeys.length ? historyKeys : [defaultTribe.key];
  const activeKey = safeHistory[safeHistory.length - 1];
  return {
    key: activeKey,
    name: TRIBE_META[activeKey]?.name || defaultTribe.name,
    history: safeHistory.map((key) => ({
      key,
      name: TRIBE_META[key]?.name || key
    }))
  };
}

function captureCardPositions() {
  const positions = new Map();
  rankListEl.querySelectorAll('.cast-card').forEach((card) => {
    positions.set(card.dataset.id, card.getBoundingClientRect().top);
  });
  return positions;
}

function animateReorderedCards(beforePositions) {
  if (!beforePositions || beforePositions.size === 0) return;
  const animations = [];
  rankListEl.querySelectorAll('.cast-card').forEach((card) => {
    const previousTop = beforePositions.get(card.dataset.id);
    if (previousTop === undefined) return;
    const currentTop = card.getBoundingClientRect().top;
    const delta = previousTop - currentTop;
    if (Math.abs(delta) < 1) return;
    card.style.transition = 'none';
    card.style.transform = `translateY(${delta}px)`;
    animations.push(card);
  });

  if (!animations.length) return;
  requestAnimationFrame(() => {
    for (const card of animations) {
      card.style.transition = 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)';
      card.style.transform = '';
      card.addEventListener('transitionend', () => {
        card.style.transition = '';
      }, { once: true });
    }
  });
}

function applyActiveLineup(nextLineup, animate = true) {
  const beforePositions = animate ? captureCardPositions() : null;
  state.activeLineup = nextLineup;
  state.fullLineup = [...state.activeLineup, ...state.eliminatedLineup];
  setDirty(true);
  renderRankList();
  if (animate) {
    animateReorderedCards(beforePositions);
  }
}

function movePlayerToIndex(id, nextIndex) {
  if (!isLineupEditable()) return;
  const currentIndex = state.activeLineup.indexOf(id);
  if (currentIndex < 0) return;
  const boundedIndex = clampIndex(nextIndex, 0, state.activeLineup.length - 1);
  if (boundedIndex === currentIndex) return;

  const next = [...state.activeLineup];
  next.splice(currentIndex, 1);
  next.splice(boundedIndex, 0, id);
  applyActiveLineup(next, true);
}

function clearDropIndicator() {
  state.dropInsertIndex = null;
  rankListEl.querySelectorAll('.cast-card').forEach((card) => {
    card.classList.remove('drop-before', 'drop-after');
  });
}

function getDragInsertIndex(clientY) {
  const cards = Array.from(rankListEl.querySelectorAll('.cast-card:not(.dragging)'));
  if (!cards.length) return 0;
  for (let index = 0; index < cards.length; index += 1) {
    const rect = cards[index].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return index;
    }
  }
  return cards.length;
}

function updateDropIndicator(insertIndex) {
  const cards = Array.from(rankListEl.querySelectorAll('.cast-card:not(.dragging)'));
  clearDropIndicator();
  if (!cards.length) return;

  if (insertIndex <= 0) {
    cards[0].classList.add('drop-before');
    return;
  }
  if (insertIndex >= cards.length) {
    cards[cards.length - 1].classList.add('drop-after');
    return;
  }
  cards[insertIndex].classList.add('drop-before');
}

function applyPayload(payload) {
  if (!consumePayloadMeta(payload)) return false;
  if (payload.unchanged) return false;

  const hadLocalWeekRecapDraft = hasUnsavedWeekRecapDraft();
  const previousUsername = state.user?.username || null;

  state.user = payload.user || null;
  if (state.user?.username !== previousUsername) {
    state.lastSeenChatMessageId = loadStoredLastSeenChatMessageId(state.user?.username);
    state.unreadChatCount = 0;
  }
  state.cast = Array.isArray(payload.cast) ? payload.cast : [];
  state.castMap = new Map(state.cast.map((castaway) => [castaway.id, castaway]));
  const payloadCurrentWeek = Number(payload.currentWeek || 1);
  const cachedWeek = Number(localStorage.getItem(LAST_KNOWN_WEEK_KEY) || 0);
  state.currentWeek = Math.max(payloadCurrentWeek, cachedWeek, 1);
  localStorage.setItem(LAST_KNOWN_WEEK_KEY, String(state.currentWeek));
  state.selectedWeek = Number(payload.selectedWeek || state.currentWeek);
  if (state.selectedWeek > state.currentWeek) {
    state.selectedWeek = state.currentWeek;
  }
  state.weeks = Array.isArray(payload.weeks) && payload.weeks.length ? payload.weeks : [1];
  const completedWeeks = state.weeks.filter((week) => week > 1 && week < state.currentWeek);
  if (!completedWeeks.length) {
    state.othersWeek = null;
    state.othersLineup = [];
    state.othersNotes = {};
    state.othersPriorVotedOff = {};
    state.othersVotedOff = {};
    state.othersWeekReport = null;
    state.othersWeekCommentOfWeek = null;
    state.othersLoadedWeek = null;
    state.othersLoadedUsername = null;
  } else if (!completedWeeks.includes(state.othersWeek)) {
    state.othersWeek = completedWeeks[completedWeeks.length - 1];
    state.othersLoadedWeek = null;
  }
  state.priorVotedOff = payload.priorVotedOff || {};
  state.votedOff = payload.votedOff || {};
  state.fullLineup = normalizeLineup(payload.lineup || state.cast.map((castaway) => castaway.id));
  state.notes = payload.notes || {};
  state.previousWeekRanks = payload.previousWeekRanks && typeof payload.previousWeekRanks === 'object'
    ? payload.previousWeekRanks
    : {};
  state.winnerPicks = normalizeWinnerPicks(payload.winnerPicks || []);
  state.tribesById = payload.tribesById && typeof payload.tribesById === 'object'
    ? payload.tribesById
    : {};
  deriveDisplayBuckets();
  state.skippedWeeks = payload.skippedWeeks || {};
  state.omittedWeeks = payload.omittedWeeks || {};
  state.isSkippedWeek = Boolean(payload.isSkippedWeek);
  state.isOmittedWeek = Boolean(payload.isOmittedWeek);
  state.isNoScoreWeek = Boolean(payload.isNoScoreWeek);
  state.isWeekLocked = Boolean(payload.isWeekLocked);
  state.weekLockAt = typeof payload.weekLockAt === 'string' ? payload.weekLockAt : null;
  state.isCurrentWeekLocked = Boolean(payload.isCurrentWeekLocked);
  if (typeof payload.currentWeekLockAt === 'string') {
    state.currentWeekLockAt = payload.currentWeekLockAt;
  } else if (state.selectedWeek === state.currentWeek && state.weekLockAt) {
    state.currentWeekLockAt = state.weekLockAt;
  } else {
    state.currentWeekLockAt = null;
  }
  state.allUsers = Array.isArray(payload.allUsers) ? payload.allUsers : [];
  state.userProfiles = payload.userProfiles && typeof payload.userProfiles === 'object'
    ? payload.userProfiles
    : {};
  state.weekReport = payload.weekReport || null;
  state.fullStandings = payload.fullStandings || { weeks: [], rows: [] };
  const chat = payload.chat || {};
  state.chatMessages = Array.isArray(chat.messages) ? chat.messages : [];
  state.chatAvatarId = chat.userAvatarId || state.chatAvatarId || state.cast[0]?.id || null;
  updateUnreadChatState();
  state.lineupOwner = state.user?.username || null;
  state.isViewingOther = false;
  if (state.adminTargetUser && !state.allUsers.includes(state.adminTargetUser)) {
    state.adminTargetUser = null;
  }
  state.leaderboard = Array.isArray(payload.leaderboard) ? payload.leaderboard : [];
  state.biggestUpset = payload.biggestUpset || null;
  state.mostHated = payload.mostHated || payload.lowestRankedActive || null;
  state.myScore = payload.myScore || null;
  state.backgroundConfig = normalizeBackgroundConfigClient(payload.backgroundConfig || state.backgroundConfig);
  state.weekRecapWeek = Number(payload.weekRecapWeek || state.selectedWeek || state.currentWeek || 1);
  state.weekRecapTitle = String(payload.weekRecapTitle || `Week ${state.weekRecapWeek} Recap`);
  state.weekRecap = String(payload.weekRecap || '');
  state.weekCommentWeek = Number(payload.weekCommentWeek || Math.max(1, state.weekRecapWeek - 1));
  state.weekCommentOfWeek = payload.weekCommentOfWeek || null;
  if (!hadLocalWeekRecapDraft || !state.weekRecapEditOpen) {
    state.weekRecapTitleDraft = state.weekRecapTitle;
    state.weekRecapDraft = state.weekRecap;
  }
  if (!isRecapEditable()) {
    closeWeekRecapEditor(false);
  }
  state.canEditVotedOff = Boolean(payload.canEditVotedOff);
  if (!state.adminTargetUser || !state.allUsers.includes(state.adminTargetUser)) {
    state.adminProfileDraftDirty = false;
    state.adminProfileDraftTarget = null;
    state.adminProfileDraftBirthName = '';
    state.adminProfileDraftAffiliation = '';
  } else if (!state.adminProfileDraftDirty) {
    state.adminProfileDraftTarget = state.adminTargetUser;
    state.adminProfileDraftBirthName = getBirthName(state.adminTargetUser);
    state.adminProfileDraftAffiliation = getUserAffiliation(state.adminTargetUser);
  }
  const restoredLocalDraft = restoreCurrentLineupDraft();
  if (!restoredLocalDraft) {
    state.dirty = false;
    state.hasUnsavedChanges = false;
  }
  void ensureBackgroundImageLoaded();
  return true;
}

function updateSaveState() {
  const editable = isLineupEditable();
  saveWeekBtnEl.disabled = !editable || !state.dirty;
  resetWeekBtnEl.disabled = !editable;
  if (saveIndicatorEl) {
    saveIndicatorEl.classList.toggle('hidden', !state.hasUnsavedChanges);
  }
  renderSaveStatusBanner();
}

function hasSavedCurrentWeekLineup() {
  if (!state.user?.username) return false;
  const currentUserRow = Array.isArray(state.fullStandings?.rows)
    ? state.fullStandings.rows.find((row) => row.username === state.user.username)
    : null;
  return Boolean(currentUserRow?.savedWeeks?.[state.currentWeek]);
}

function renderSaveStatusBanner() {
  if (!saveStatusBannerEl) return;
  if (!state.user) {
    saveStatusBannerEl.textContent = '';
    saveStatusBannerEl.classList.add('hidden');
    saveStatusBannerEl.classList.remove('is-unsaved', 'is-missing');
    return;
  }

  let bannerText = '';
  if (state.hasUnsavedChanges) {
    bannerText = 'Changes not Saved';
  } else if (!hasSavedCurrentWeekLineup()) {
    bannerText = 'No Lineup Saved this Week';
  }

  saveStatusBannerEl.textContent = bannerText;
  saveStatusBannerEl.classList.toggle('hidden', !bannerText);
  saveStatusBannerEl.classList.toggle('is-unsaved', bannerText === 'Changes not Saved');
  saveStatusBannerEl.classList.toggle('is-missing', bannerText === 'No Lineup Saved this Week');
}

function renderLeaderboard() {
  leaderboardListEl.innerHTML = '';

  if (!state.leaderboard.length) {
    leaderboardListEl.innerHTML = '<li class="leaderboard-empty">No players yet.</li>';
    renderAdminUserPanel();
    renderAdminBackgroundPanel();
    return;
  }

  const topRows = state.leaderboard.slice(0, 5);
  topRows.forEach((row, index) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';

    const rankBadge = document.createElement('span');
    rankBadge.className = 'leaderboard-rank';
    rankBadge.textContent = `#${index + 1}`;
    li.appendChild(rankBadge);

    const nameWrap = document.createElement('span');
    nameWrap.className = 'leaderboard-name-wrap';
    if (state.user?.isAdmin) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'leaderboard-user-btn leaderboard-name';
      btn.dataset.username = row.username;
      btn.innerHTML = formatUserLabelHtml(row.username);
      nameWrap.appendChild(btn);
    } else {
      const username = document.createElement('span');
      username.className = 'leaderboard-name';
      username.innerHTML = formatUserLabelHtml(row.username);
      nameWrap.appendChild(username);
    }
    li.appendChild(nameWrap);

    const scoreText = document.createElement('span');
    scoreText.className = 'leaderboard-points';
    scoreText.textContent = `${formatPoints(row.points)} pts`;
    li.appendChild(scoreText);

    if (state.user && row.username === state.user.username) {
      li.classList.add('current-user');
    }
    leaderboardListEl.appendChild(li);
  });
  renderAdminUserPanel();
  renderAdminBackgroundPanel();
}

function setAdminTargetUser(username) {
  const normalized = String(username || '').trim();
  if (!normalized || !state.allUsers.includes(normalized)) return;
  state.adminTargetUser = normalized;
  state.adminProfileDraftTarget = normalized;
  state.adminProfileDraftBirthName = getBirthName(normalized);
  state.adminProfileDraftAffiliation = getUserAffiliation(normalized);
  state.adminProfileDraftDirty = false;
}

function renderAdminUserPanel() {
  const isAdmin = hasAdminAccess(state.user);
  if (!isAdmin || !state.adminTargetUser) {
    setElementHidden(adminUserPanelEl, true);
    adminUserTargetEl.textContent = '';
    if (adminBirthNameInputEl) adminBirthNameInputEl.value = '';
    if (adminAffiliationSelectEl) adminAffiliationSelectEl.value = '';
    if (adminSaveUserProfileBtnEl) adminSaveUserProfileBtnEl.disabled = true;
    return;
  }
  if (state.adminProfileDraftTarget !== state.adminTargetUser) {
    state.adminProfileDraftTarget = state.adminTargetUser;
    state.adminProfileDraftBirthName = getBirthName(state.adminTargetUser);
    state.adminProfileDraftAffiliation = getUserAffiliation(state.adminTargetUser);
    state.adminProfileDraftDirty = false;
  }
  setElementHidden(adminUserPanelEl, false);
  adminUserTargetEl.innerHTML = `Selected user: ${formatUserLabelHtml(state.adminTargetUser, { includeAffiliationIcon: true })}`;
  if (adminBirthNameInputEl) {
    adminBirthNameInputEl.value = state.adminProfileDraftBirthName || '';
  }
  if (adminAffiliationSelectEl) {
    adminAffiliationSelectEl.value = state.adminProfileDraftAffiliation || '';
  }
  const isSelf = state.adminTargetUser === state.user.username;
  adminDeleteUserBtnEl.disabled = isSelf;
  if (adminExportDbBtnEl) {
    adminExportDbBtnEl.disabled = false;
  }
  if (adminSaveUserProfileBtnEl) {
    adminSaveUserProfileBtnEl.disabled = !state.adminProfileDraftDirty;
  }
}

function renderAdminBackgroundPanel() {
  const isAdmin = hasAdminAccess(state.user);
  if (!adminBackgroundPanelEl) return;
  setElementHidden(adminBackgroundPanelEl, !isAdmin);
  if (!isAdmin) return;

  const config = normalizeBackgroundConfigClient(state.backgroundConfig);
  if (adminBackgroundTileWidthInputEl && document.activeElement !== adminBackgroundTileWidthInputEl) {
    adminBackgroundTileWidthInputEl.value = String(config.tileWidth);
  }
  if (adminBackgroundTileHeightInputEl && document.activeElement !== adminBackgroundTileHeightInputEl) {
    adminBackgroundTileHeightInputEl.value = String(config.tileHeight);
  }
  if (adminBackgroundOpacityInputEl && document.activeElement !== adminBackgroundOpacityInputEl) {
    adminBackgroundOpacityInputEl.value = String(config.overlayOpacity);
  }
  if (adminBackgroundOpacityValueEl) {
    adminBackgroundOpacityValueEl.textContent = `Current opacity: ${Math.round(config.overlayOpacity * 100)}%`;
  }
  if (adminBackgroundStatusEl) {
    const fileName = adminBackgroundFileInputEl?.files?.[0]?.name;
    adminBackgroundStatusEl.textContent = fileName
      ? `Selected file: ${fileName}`
      : (config.hasCustomImage ? `Custom background active (version ${config.imageVersion}).` : 'Using default site background.');
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read background image.'));
    reader.readAsDataURL(file);
  });
}

async function adminSaveBackgroundSettings() {
  if (!hasAdminAccess(state.user)) return;
  const file = adminBackgroundFileInputEl?.files?.[0] || null;
  if (file && file.size > 2 * 1024 * 1024) {
    showMessage('Background image must be 2 MB or smaller.');
    return;
  }

  let imageDataUrl = '';
  if (file) {
    try {
      imageDataUrl = await readFileAsDataUrl(file);
    } catch (error) {
      showMessage(error.message || 'Failed to read background image.');
      return;
    }
  }

  try {
    const payload = await apiRequest('admin-update-background', {
      method: 'POST',
      data: {
        imageDataUrl,
        tileWidth: Number(adminBackgroundTileWidthInputEl?.value || state.backgroundConfig.tileWidth),
        tileHeight: Number(adminBackgroundTileHeightInputEl?.value || state.backgroundConfig.tileHeight),
        overlayOpacity: Number(adminBackgroundOpacityInputEl?.value || state.backgroundConfig.overlayOpacity)
      }
    });
    if (adminBackgroundFileInputEl) {
      adminBackgroundFileInputEl.value = '';
    }
    applyPayload(payload);
    showMessage('Background updated.', false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to update background.');
  }
}

async function adminResetBackgroundSettings() {
  if (!hasAdminAccess(state.user)) return;
  try {
    const payload = await apiRequest('admin-update-background', {
      method: 'POST',
      data: {
        clearImage: true,
        tileWidth: 280,
        tileHeight: 160,
        overlayOpacity: 0.55
      }
    });
    if (adminBackgroundFileInputEl) {
      adminBackgroundFileInputEl.value = '';
    }
    applyPayload(payload);
    showMessage('Background reset to default.', false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to reset background.');
  }
}

function renderUserAffiliationBadge() {
  if (!userAffiliationBadgeEl) return;
  const username = state.activeTab === 'others-rankings'
    ? (state.othersUsername || state.user?.username)
    : (state.isViewingOther ? state.lineupOwner : state.user?.username);
  const key = getUserAffiliation(username);
  const meta = USER_AFFILIATION_META[key];
  if (!username || !meta) {
    userAffiliationBadgeEl.classList.add('hidden');
    userAffiliationBadgeEl.innerHTML = '';
    return;
  }
  userAffiliationBadgeEl.classList.remove('hidden');
  userAffiliationBadgeEl.innerHTML = `<img class="affiliation-icon badge" src="${escapeHtml(meta.icon)}" alt="${escapeHtml(meta.label)}" title="${escapeHtml(meta.tooltip)}">`;
}

function openScoringHelpModal() {
  if (!scoringHelpModalEl) return;
  scoringHelpModalEl.classList.remove('hidden');
}

function closeScoringHelpModal() {
  if (!scoringHelpModalEl) return;
  scoringHelpModalEl.classList.add('hidden');
}

function renderBanner() {
  activeWeekBadgeEl.textContent = `Week ${state.currentWeek}`;
  if (!state.biggestUpset) {
    biggestUpsetTextEl.textContent = 'No elimination data yet.';
  } else {
    biggestUpsetTextEl.innerHTML = `${formatUserLabelHtml(state.biggestUpset.username)} got ${state.biggestUpset.points} point(s) on ${escapeHtml(state.biggestUpset.playerName)} in Week ${state.biggestUpset.week}.`;
  }
  if (!mostHatedTextEl) return;
  if (!state.mostHated || !Array.isArray(state.mostHated.players) || !state.mostHated.players.length) {
    mostHatedTextEl.textContent = 'No data yet.';
    return;
  }
  const names = state.mostHated.players.map((entry) => escapeHtml(entry.name)).join(', ');
  const avg = Number(state.mostHated.averageRank || 0).toFixed(2);
  mostHatedTextEl.innerHTML = `<strong>${names}</strong> (avg rank ${avg}).`;
}

function renderWeekRecap() {
  const recapWeek = getDisplayedRecapWeek();
  const recapTitle = String(state.weekRecapTitle || `Week ${recapWeek} Recap`).trim();
  const recapMessage = String(state.weekRecap || '').trim();
  weekRecapLabelEl.textContent = recapTitle || `Week ${recapWeek} Recap`;
  weekRecapTextEl.innerHTML = state.weekRecap
    ? escapeAndFormatMessage(state.weekRecap)
    : 'No recap posted yet.';
  const recapLength = recapMessage.length;
  weekRecapTextEl.classList.toggle('text-short', recapLength > 0 && recapLength < 260);
  weekRecapTextEl.classList.toggle('text-medium', recapLength >= 260 && recapLength < 900);
  weekRecapTextEl.classList.toggle('text-long', recapLength >= 900);

  const isAdmin = Boolean(state.user?.isAdmin);
  const recapEditable = isRecapEditable();
  if (editWeekRecapBtnEl) {
    editWeekRecapBtnEl.classList.toggle('hidden', !(isAdmin && recapEditable));
    editWeekRecapBtnEl.setAttribute('aria-pressed', state.weekRecapEditOpen ? 'true' : 'false');
  }
  if (!isAdmin || !recapEditable) {
    closeWeekRecapEditor(false);
  }
  weekRecapAdminEl.classList.toggle('hidden', !(isAdmin && recapEditable && state.weekRecapEditOpen));
  const hasLocalDraft = hasUnsavedWeekRecapDraft();
  const titleFocused = document.activeElement === weekRecapTitleInputEl;
  const messageFocused = document.activeElement === weekRecapInputEl;
  if ((!titleFocused && !messageFocused) || !hasLocalDraft) {
    if (weekRecapTitleInputEl) {
      weekRecapTitleInputEl.value = state.weekRecapTitleDraft || '';
    }
    weekRecapInputEl.value = state.weekRecapDraft || '';
  }

  const comment = state.weekCommentOfWeek;
  const commentWeek = Number(state.weekCommentWeek || Math.max(1, recapWeek - 1));
  if (!weekCommentWrapEl || !weekCommentTextEl || !weekCommentMetaEl) return;
  if (!comment || Number(comment.week) !== commentWeek || !comment.note) {
    weekCommentWrapEl.classList.add('hidden');
    weekCommentTextEl.textContent = '';
    weekCommentMetaEl.textContent = '';
    return;
  }

  weekCommentWrapEl.classList.remove('hidden');
  weekCommentTextEl.innerHTML = escapeAndFormatMessage(comment.note);
  const updatedAtText = comment.updatedAt ? new Date(comment.updatedAt).toLocaleString() : '';
  weekCommentMetaEl.innerHTML = `${formatUserLabelHtml(comment.username)} on <strong>${escapeHtml(comment.castawayName)}</strong>${updatedAtText ? ` • ${escapeHtml(updatedAtText)}` : ''}`;
}

function toggleWeekRecapEditor(forceOpen = null) {
  if (!isRecapEditable()) return;
  const nextOpen = forceOpen === null ? !state.weekRecapEditOpen : Boolean(forceOpen);
  if (nextOpen) {
    state.weekRecapTitleDraft = state.weekRecapTitle;
    state.weekRecapDraft = state.weekRecap;
    state.weekRecapEditOpen = true;
  } else {
    closeWeekRecapEditor(true);
  }
  renderWeekRecap();
}

function renderAuth() {
  if (state.user) {
    loggedOutViewEl.classList.add('hidden');
    authPanelEl.classList.add('hidden');
    compactSessionBarEl.classList.remove('hidden');
    sessionTextEl.textContent = `${state.user.username}${state.user.isAdmin ? ' (Admin)' : ''}`;
  } else {
    authPanelEl.classList.remove('hidden');
    loggedOutViewEl.classList.remove('hidden');
    compactSessionBarEl.classList.add('hidden');
    sessionTextEl.textContent = '';
    if (compactStatusTextEl) compactStatusTextEl.textContent = '';
  }
}

function renderScore() {
  if (!state.user || !state.myScore) {
    myScoreTotalEl.textContent = 'Total points: 0.0';
    myScoreBreakdownEl.innerHTML = '<li>No eliminations scored yet.</li>';
    return;
  }

  myScoreTotalEl.textContent = `Total points: ${formatPoints(state.myScore.totalPoints)}`;
  myScoreBreakdownEl.innerHTML = '';

  if (!state.myScore.weekBreakdown.length) {
    myScoreBreakdownEl.innerHTML = '<li>No eliminations scored yet.</li>';
    return;
  }

  const visibleEntries = state.myScore.weekBreakdown.filter((weekEntry) => Number(weekEntry.week) > 1);
  if (!visibleEntries.length) {
    myScoreBreakdownEl.innerHTML = '<li>No eliminations scored yet.</li>';
    return;
  }

  for (const weekEntry of visibleEntries) {
    if (weekEntry.noScore) {
      continue;
    }
    if (weekEntry.skipped) {
      const li = document.createElement('li');
      li.textContent = `Week ${weekEntry.week}: skipped (0 points)`;
      myScoreBreakdownEl.appendChild(li);
      continue;
    }
    if (weekEntry.omitted) {
      const li = document.createElement('li');
      li.textContent = `Week ${weekEntry.week}: omitted from score (0 points)`;
      myScoreBreakdownEl.appendChild(li);
      continue;
    }
    const parts = weekEntry.eliminations
      .map((item) => `${item.name} (#${item.rank}/${item.activeCount} = +${formatPoints(item.points)})`)
      .join('; ');
    const li = document.createElement('li');
    li.textContent = `Week ${weekEntry.week}: +${formatPoints(weekEntry.points)} - ${parts}`;
    myScoreBreakdownEl.appendChild(li);
  }
}

function toggleWinnerPick(castawayId) {
  if (!isLineupEditable()) return;
  const id = String(castawayId || '').trim();
  if (!id || !state.castMap.has(id)) return;
  const current = [...state.winnerPicks];
  const existingIndex = current.indexOf(id);
  if (existingIndex >= 0) {
    current.splice(existingIndex, 1);
    state.winnerPicks = current;
    setDirty(true);
    renderRankList();
    return;
  }
  if (current.length >= 3) {
    showMessage('You can only set up to 3 winner picks.');
    return;
  }
  current.push(id);
  state.winnerPicks = current;
  setDirty(true);
  renderRankList();
}

function renderControls() {
  const selectableWeeks = state.weeks.filter((week) => week > 1);
  weekSelectEl.replaceChildren();
  selectableWeeks.forEach((week) => {
    const option = document.createElement('option');
    option.value = String(week);
    option.textContent = `Week ${week}`;
    weekSelectEl.appendChild(option);
  });
  if (selectableWeeks.includes(state.selectedWeek)) {
    weekSelectEl.value = String(state.selectedWeek);
  } else if (selectableWeeks.includes(state.currentWeek)) {
    weekSelectEl.value = String(state.currentWeek);
  }
  weekSelectEl.disabled = !selectableWeeks.length;

  const thisWeekVotedOff = state.activeLineup.filter((id) => Boolean(state.votedOff[id])).length;
  weekStatsEl.textContent = `${state.activeLineup.length} in this week's ranking | ${thisWeekVotedOff} marked voted off | ${state.eliminatedLineup.length} prior eliminated`;

  if (state.user?.isAdmin) {
    const canAdvanceWeek = !state.isViewingOther && state.selectedWeek === state.currentWeek;
    advanceWeekBtnEl.classList.remove('hidden');
    advanceWeekBtnEl.disabled = !canAdvanceWeek;
  } else {
    advanceWeekBtnEl.classList.add('hidden');
    advanceWeekBtnEl.disabled = true;
  }

  const isCurrentWeek = state.selectedWeek === state.currentWeek;
  if (state.isNoScoreWeek || (state.isWeekLocked && isCurrentWeek) || !isCurrentWeek || state.isViewingOther) {
    skipWeekBtnEl.textContent = 'Week Locked';
    skipWeekBtnEl.disabled = true;
  } else {
    skipWeekBtnEl.textContent = state.isSkippedWeek ? 'Unskip Week' : 'Skip Week';
    skipWeekBtnEl.disabled = false;
  }

  if (state.isNoScoreWeek) {
    skipWeekNoteEl.classList.remove('hidden');
    skipWeekNoteEl.textContent = `Week ${state.selectedWeek} is excluded from scoring.`;
  } else if (state.isOmittedWeek) {
    skipWeekNoteEl.classList.remove('hidden');
    if (state.isViewingOther) {
      skipWeekNoteEl.textContent = `${formatUserLabelText(state.lineupOwner)} is omitted from Week ${state.selectedWeek} scoring.`;
    } else {
      skipWeekNoteEl.textContent = `Your score is omitted for Week ${state.selectedWeek}.`;
    }
  } else if (state.isWeekLocked && isCurrentWeek) {
    const lockText = formatEtDateTime(state.weekLockAt);
    skipWeekNoteEl.classList.remove('hidden');
    skipWeekNoteEl.textContent = lockText
      ? `Week ${state.selectedWeek} locked at ${lockText}. Rankings are read-only.`
      : `Week ${state.selectedWeek} is locked. Rankings are read-only.`;
  } else if (state.isSkippedWeek) {
    skipWeekNoteEl.classList.remove('hidden');
    skipWeekNoteEl.textContent = `Week ${state.selectedWeek} is skipped for your account. You will score 0 points this week.`;
  } else if (state.isViewingOther) {
    skipWeekNoteEl.classList.remove('hidden');
    skipWeekNoteEl.textContent = `Viewing ${formatUserLabelText(state.lineupOwner)} rankings for Week ${state.selectedWeek}.`;
  } else if (!isCurrentWeek) {
    skipWeekNoteEl.classList.remove('hidden');
    skipWeekNoteEl.textContent = state.canEditVotedOff
      ? `Week ${state.selectedWeek} is complete and read-only for rankings. Admin can still fix voted-off players here.`
      : `Week ${state.selectedWeek} is complete and read-only.`;
  } else {
    skipWeekNoteEl.classList.add('hidden');
    skipWeekNoteEl.textContent = '';
  }

  updateSaveState();
}

function renderTribeRow(castawayId, { allowAdminControls = true } = {}) {
  const tribe = getTribeMeta(castawayId);
  const activeIndex = tribe.history.length - 1;
  const adminMode = Boolean(state.user?.isAdmin && allowAdminControls);
  const pills = tribe.history
    .map((entry, index) => {
      const activeClass = index === activeIndex ? ' tribe-pill-active' : '';
      const removeClass = adminMode ? ' tribe-pill-removable' : '';
      const dataAttrs = adminMode
        ? ` data-role="tribe-pill" data-castaway-id="${castawayId}" data-tribe-index="${index}"`
        : '';
      return `<span class="tribe-pill tribe-pill-${entry.key}${activeClass}${removeClass}"${dataAttrs}>${escapeHtml(entry.name)}</span>`;
    })
    .join('');
  const addButton = state.user?.isAdmin
    ? `<button type="button" class="tribe-add-btn" data-role="add-tribe" aria-label="Change active tribe">+</button>`
    : '';
  return `<div class="tribe-row"><div class="tribe-pills">${pills}</div>${addButton}</div>`;
}

function renderRankList() {
  rankListEl.classList.toggle('skipped', state.isSkippedWeek);
  rankListEl.innerHTML = '';
  const editable = isLineupEditable();
  const canSetCommentOfWeek = Boolean(
    state.user?.isAdmin
    && state.isViewingOther
    && state.selectedWeek < state.currentWeek
    && !state.isNoScoreWeek
    && state.lineupOwner
  );

  for (const [index, id] of state.activeLineup.entries()) {
    const castaway = state.castMap.get(id);
    if (!castaway) continue;
    const tribe = getTribeMeta(id);
    const isWinnerPick = state.winnerPicks.includes(id);
    const noteText = String(state.notes[id] || '');
    const hasNote = Boolean(noteText.trim());
    const isCommentOfWeek = Boolean(
      canSetCommentOfWeek
      && state.weekCommentOfWeek
      && Number(state.weekCommentOfWeek.week) === state.selectedWeek
      && state.weekCommentOfWeek.username === state.lineupOwner
      && state.weekCommentOfWeek.castawayId === id
    );
    const rankDelta = formatRankDelta(index + 1, state.previousWeekRanks?.[id]);
    const showRankDelta = Boolean(rankDelta && state.selectedWeek > 2);

    const isVotedOff = Boolean(state.votedOff[id]);
    const li = document.createElement('li');
    li.className = `cast-card tribe-${tribe.key}${isVotedOff ? ' voted-off' : ''}`;
    li.dataset.id = id;
    li.draggable = editable;

    let statusHtml = '';
    if (state.canEditVotedOff) {
      statusHtml = `
        <label class="status">
          <input type="checkbox" data-role="voted-off" ${isVotedOff ? 'checked' : ''}>
          Voted Off
        </label>
      `;
    } else if (isVotedOff) {
      statusHtml = '<span class="voted-off-tag">Voted Off</span>';
    } else {
      statusHtml = '<span class="voted-off-tag">Active</span>';
    }

    li.innerHTML = `
      <div class="move-controls">
        <button type="button" class="move-btn" data-role="move-up" ${index === 0 || !editable ? 'disabled' : ''}>▲</button>
        <button type="button" class="move-btn" data-role="move-down" ${index === state.activeLineup.length - 1 || !editable ? 'disabled' : ''}>▼</button>
        <div class="rank-change${showRankDelta ? ` ${rankDelta.className}` : ' hidden'}" aria-label="${showRankDelta ? `Change from last week: ${rankDelta.text}` : 'No last-week comparison'}">
          ${showRankDelta ? rankDelta.text : ''}
        </div>
      </div>
      <div class="rank">
        <div class="rank-badge">
          <input
            class="rank-input"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="2"
            value="${index + 1}"
            data-role="rank-input"
            aria-label="Ranking position for ${escapeHtml(castaway.name)}"
            ${!editable ? 'disabled' : ''}
          >
        </div>
        <button
          type="button"
          class="winner-crown${isWinnerPick ? ' active' : ''}"
          data-role="winner-pick-toggle"
          aria-pressed="${isWinnerPick ? 'true' : 'false'}"
          aria-label="Toggle winner pick for ${escapeHtml(castaway.name)}"
          title="${isWinnerPick ? 'Winner pick selected' : 'Mark as winner pick'}"
          ${!editable ? 'disabled' : ''}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 18h16l-1.4-7.8-4.2 3.4L12 7l-2.4 6.6-4.2-3.4L4 18Zm0 2h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="photo-wrap">
        <img class="photo" src="${castaway.image}" alt="${escapeHtml(castaway.name)}">
      </div>
      <div class="card-main">
        <div class="name">${escapeHtml(castaway.name)}</div>
        ${renderTribeRow(id)}
        <div class="note-wrap">
          <textarea class="note-input" rows="1" maxlength="700" data-role="note-input" placeholder="Note / justification (optional)" ${!editable ? 'disabled' : ''}>${escapeHtml(noteText)}</textarea>
          ${canSetCommentOfWeek && hasNote ? `
            <button
              type="button"
              class="comment-week-btn${isCommentOfWeek ? ' active' : ''}"
              data-role="comment-week-toggle"
              aria-pressed="${isCommentOfWeek ? 'true' : 'false'}"
            >${isCommentOfWeek ? '★ Comment of the Week' : '☆ Mark Comment of the Week'}</button>
          ` : ''}
        </div>
      </div>
      <div class="status-slot">${statusHtml}</div>
    `;

    if (editable) {
      li.addEventListener('dragstart', onDragStart);
      li.addEventListener('dragend', onDragEnd);
    }

    rankListEl.appendChild(li);

    const votedOffInput = li.querySelector('[data-role="voted-off"]');
    if (votedOffInput) {
      votedOffInput.addEventListener('change', onAdminVotedOffChange);
    }
    const noteInput = li.querySelector('[data-role="note-input"]');
    if (noteInput) {
      noteInput.addEventListener('input', onNoteInputChange);
      autoSizeNoteInput(noteInput);
    }
    const moveUpBtn = li.querySelector('[data-role="move-up"]');
    const moveDownBtn = li.querySelector('[data-role="move-down"]');
    if (moveUpBtn) moveUpBtn.addEventListener('click', () => shiftPlayer(id, -1));
    if (moveDownBtn) moveDownBtn.addEventListener('click', () => shiftPlayer(id, 1));
    const addTribeBtn = li.querySelector('[data-role="add-tribe"]');
    if (addTribeBtn) {
      addTribeBtn.addEventListener('click', () => adminSetCastawayTribe(id));
    }
    li.querySelectorAll('[data-role="tribe-pill"]').forEach((pillEl) => {
      pillEl.addEventListener('click', () => adminRemoveCastawayTribe(id, Number(pillEl.dataset.tribeIndex)));
    });
    const rankInput = li.querySelector('[data-role="rank-input"]');
    if (rankInput) {
      rankInput.addEventListener('change', onRankInputChange);
      rankInput.addEventListener('keydown', onRankInputKeyDown);
    }
    const winnerPickBtn = li.querySelector('[data-role="winner-pick-toggle"]');
    if (winnerPickBtn) {
      winnerPickBtn.addEventListener('click', () => toggleWinnerPick(id));
    }
    const commentWeekBtn = li.querySelector('[data-role="comment-week-toggle"]');
    if (commentWeekBtn) {
      commentWeekBtn.addEventListener('click', () => adminToggleWeekComment(id));
    }
  }
}

function renderWeekReport() {
  if (!state.weekReport || state.selectedWeek >= state.currentWeek) {
    weekReportPanelEl.classList.add('hidden');
    weekReportWrapEl.innerHTML = '';
    return;
  }

  const activeIds = Array.isArray(state.weekReport.activeIds) ? state.weekReport.activeIds : [];
  const rows = Array.isArray(state.weekReport.rows) ? state.weekReport.rows : [];
  if (!activeIds.length || !rows.length) {
    weekReportPanelEl.classList.remove('hidden');
    weekReportWrapEl.innerHTML = '<p class="report-empty">No report data for this week yet.</p>';
    return;
  }

  const headCells = activeIds
    .map((id) => `<th scope="col">${escapeHtml(state.castMap.get(id)?.name || id)}</th>`)
    .join('');

  const bodyRows = rows.map((row) => {
    const rankCells = activeIds
      .map((id) => `<td>${row.ranks?.[id] || '-'}</td>`)
      .join('');
    const suffix = row.skipped
      ? '(Skipped)'
      : (row.omitted
        ? (row.noSubmit && !row.countedByAdmin ? '(No Submit / Omitted)' : '(Omitted)')
        : (row.noSubmit && row.countedByAdmin ? '(No Submit / Counted)' : (row.savedLineup ? '(Submitted)' : '')));
    const userLabel = `${formatUserLabelHtml(row.username)}${suffix ? ` <span class="report-user-suffix">${escapeHtml(suffix)}</span>` : ''}`;
    const currentClass = state.user?.username === row.username ? ' class="report-current-user"' : '';
    return `<tr${currentClass}><th scope="row">${userLabel}</th>${rankCells}</tr>`;
  }).join('');

  weekReportWrapEl.innerHTML = `
    <table class="week-report-table">
      <thead>
        <tr><th scope="col">User</th>${headCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
  weekReportPanelEl.classList.remove('hidden');
}

function renderWeekReportTable(report, wrapEl, panelEl) {
  if (!wrapEl || !panelEl) return;
  if (!report) {
    panelEl.classList.add('hidden');
    wrapEl.innerHTML = '';
    return;
  }
  const activeIds = Array.isArray(report.activeIds) ? report.activeIds : [];
  const rows = Array.isArray(report.rows) ? report.rows : [];
  if (!activeIds.length || !rows.length) {
    panelEl.classList.remove('hidden');
    wrapEl.innerHTML = '<p class="report-empty">No report data for this week yet.</p>';
    return;
  }

  const headCells = activeIds
    .map((id) => `<th scope="col">${escapeHtml(state.castMap.get(id)?.name || id)}</th>`)
    .join('');

  const bodyRows = rows.map((row) => {
    const rankCells = activeIds
      .map((id) => `<td>${row.ranks?.[id] || '-'}</td>`)
      .join('');
    const suffix = row.skipped
      ? '(Skipped)'
      : (row.omitted
        ? (row.noSubmit && !row.countedByAdmin ? '(No Submit / Omitted)' : '(Omitted)')
        : (row.noSubmit && row.countedByAdmin ? '(No Submit / Counted)' : (row.savedLineup ? '(Submitted)' : '')));
    const userLabel = `${formatUserLabelHtml(row.username)}${suffix ? ` <span class="report-user-suffix">${escapeHtml(suffix)}</span>` : ''}`;
    const currentClass = state.user?.username === row.username ? ' class="report-current-user"' : '';
    return `<tr${currentClass}><th scope="row">${userLabel}</th>${rankCells}</tr>`;
  }).join('');

  wrapEl.innerHTML = `
    <table class="week-report-table">
      <thead>
        <tr><th scope="col">User</th>${headCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
  panelEl.classList.remove('hidden');
}

function renderOthersRankingsList() {
  if (!othersRankListEl) return;
  othersRankListEl.innerHTML = '';
  if (!state.othersLineup.length) {
    othersRankListEl.innerHTML = '<li class="cast-card"><div class="card-main"><div class="name">No lineup data yet.</div></div></li>';
    return;
  }

  const priorVotedOff = state.othersPriorVotedOff || {};
  const activeLineup = state.othersLineup.filter((id) => !priorVotedOff[id]);
  const canSetCommentOfWeek = Boolean(
    state.user?.isAdmin
    && state.othersWeek
    && state.othersWeek < state.currentWeek
    && !state.othersOmittedWeek
    && state.othersUsername
  );
  for (const [index, id] of activeLineup.entries()) {
    const castaway = state.castMap.get(id);
    if (!castaway) continue;
    const tribe = getTribeMeta(id);
    const isVotedOff = Boolean(state.othersVotedOff?.[id]);
    const noteText = String(state.othersNotes?.[id] || '');
    const hasNote = Boolean(noteText.trim());
    const isCommentOfWeek = Boolean(
      canSetCommentOfWeek
      && state.othersWeekCommentOfWeek
      && Number(state.othersWeekCommentOfWeek.week) === state.othersWeek
      && state.othersWeekCommentOfWeek.username === state.othersUsername
      && state.othersWeekCommentOfWeek.castawayId === id
    );

    const li = document.createElement('li');
    li.className = `cast-card tribe-${tribe.key}${isVotedOff ? ' voted-off' : ''}`;
    li.dataset.id = id;
    li.innerHTML = `
      <div class="move-controls"></div>
      <div class="rank">
        <div class="rank-badge"><span class="rank-display">${index + 1}</span></div>
      </div>
      <div class="photo-wrap">
        <img class="photo" src="${castaway.image}" alt="${escapeHtml(castaway.name)}">
      </div>
      <div class="card-main">
        <div class="name">${escapeHtml(castaway.name)}</div>
        ${renderTribeRow(id, { allowAdminControls: false })}
        <div class="note-wrap">
          <textarea class="note-input" rows="1" disabled>${escapeHtml(noteText)}</textarea>
          ${canSetCommentOfWeek && hasNote ? `
            <button
              type="button"
              class="comment-week-btn${isCommentOfWeek ? ' active' : ''}"
              data-role="other-comment-week-toggle"
              aria-pressed="${isCommentOfWeek ? 'true' : 'false'}"
            >${isCommentOfWeek ? '★ Comment of the Week' : '☆ Mark Comment of the Week'}</button>
          ` : ''}
        </div>
      </div>
      <div class="status-slot">${isVotedOff ? '<span class="voted-off-tag">Voted Off</span>' : '<span class="voted-off-tag">Active</span>'}</div>
    `;
    othersRankListEl.appendChild(li);
    const noteInput = li.querySelector('.note-input');
    if (noteInput) autoSizeNoteInput(noteInput);
    const commentWeekBtn = li.querySelector('[data-role="other-comment-week-toggle"]');
    if (commentWeekBtn) {
      commentWeekBtn.addEventListener('click', () => adminToggleWeekCommentFromOthers(id));
    }
  }
}

function renderOthersRankings() {
  if (!othersWeekSelectEl || !viewUserSelectEl) return;
  const completedWeeks = state.weeks.filter((week) => week > 1 && week < state.currentWeek);

  othersWeekSelectEl.replaceChildren();
  completedWeeks.forEach((week) => {
    const option = document.createElement('option');
    option.value = String(week);
    option.textContent = `Week ${week}`;
    othersWeekSelectEl.appendChild(option);
  });
  viewUserSelectEl.replaceChildren();
  if (!completedWeeks.length) {
    renderWeekReportTable(null, weekReportWrapEl, weekReportPanelEl);
    if (othersRankingsStatsEl) othersRankingsStatsEl.textContent = 'No completed weeks or other users yet.';
    if (othersSkipNoteEl) {
      othersSkipNoteEl.classList.remove('hidden');
      othersSkipNoteEl.textContent = 'Others rankings unlock after a scored week is complete.';
    }
    if (othersRankListEl) {
      othersRankListEl.innerHTML = '<li class="cast-card"><div class="card-main"><div class="name">No data yet.</div></div></li>';
    }
    omitScorePanelEl.classList.add('hidden');
    return;
  }

  if (!completedWeeks.includes(state.othersWeek)) {
    state.othersWeek = completedWeeks[completedWeeks.length - 1];
  }
  const userOptions = getOthersUserOptionsForWeek(state.othersWeek);
  userOptions.forEach((username) => {
    const option = document.createElement('option');
    option.value = username;
    option.textContent = formatUserLabelText(username);
    viewUserSelectEl.appendChild(option);
  });
  if (!state.othersUsername || !userOptions.includes(state.othersUsername)) {
    state.othersUsername = userOptions[0] || null;
  }
  othersWeekSelectEl.value = String(state.othersWeek);
  viewUserSelectEl.disabled = !userOptions.length;
  if (state.othersUsername) {
    viewUserSelectEl.value = state.othersUsername;
  }

  if (!userOptions.length) {
    renderWeekReportTable(null, weekReportWrapEl, weekReportPanelEl);
    state.othersLineup = [];
    state.othersNotes = {};
    state.othersPriorVotedOff = {};
    state.othersVotedOff = {};
    state.othersSkippedWeek = false;
    state.othersOmittedWeek = false;
    state.othersNoSubmit = false;
    state.othersHasSavedLineup = false;
    state.othersCountedByAdmin = false;
    state.othersWeekReport = null;
    state.othersWeekCommentOfWeek = null;
    state.othersLoadedWeek = null;
    state.othersLoadedUsername = null;
    if (othersRankingsStatsEl) {
      othersRankingsStatsEl.textContent = `Week ${state.othersWeek} has no saved lineups from other users.`;
    }
    if (othersSkipNoteEl) {
      othersSkipNoteEl.classList.remove('hidden');
      othersSkipNoteEl.textContent = 'Only users who actually saved a lineup appear here.';
    }
    if (othersRankListEl) {
      othersRankListEl.innerHTML = '<li class="cast-card"><div class="card-main"><div class="name">No submitted lineups for this week.</div></div></li>';
    }
    omitScorePanelEl.classList.add('hidden');
    return;
  }

  if (
    !state.othersLineup.length
    || state.othersLoadedUsername !== state.othersUsername
    || state.othersLoadedWeek !== state.othersWeek
  ) {
    loadOthersRankingsData(state.othersWeek, state.othersUsername);
    return;
  }

  renderWeekReportTable(state.othersWeekReport, weekReportWrapEl, weekReportPanelEl);
  if (othersRankingsStatsEl) {
    othersRankingsStatsEl.textContent = `Viewing ${formatUserLabelText(state.othersUsername)} - Week ${state.othersWeek}`;
  }
  if (othersSkipNoteEl) {
    othersSkipNoteEl.classList.remove('hidden');
    if (state.othersSkippedWeek) {
      othersSkipNoteEl.textContent = `${formatUserLabelText(state.othersUsername)} skipped Week ${state.othersWeek}.`;
    } else if (state.othersNoSubmit && !state.othersCountedByAdmin) {
      othersSkipNoteEl.textContent = `${formatUserLabelText(state.othersUsername)} did not save a Week ${state.othersWeek} lineup and is omitted from scoring.`;
    } else if (state.othersNoSubmit && state.othersCountedByAdmin) {
      othersSkipNoteEl.textContent = `${formatUserLabelText(state.othersUsername)} did not save a Week ${state.othersWeek} lineup, but is currently being counted by admin override.`;
    } else if (state.othersOmittedWeek) {
      othersSkipNoteEl.textContent = `${formatUserLabelText(state.othersUsername)} was omitted from Week ${state.othersWeek} scoring.`;
    } else {
      othersSkipNoteEl.textContent = `Viewing saved lineup and comments for Week ${state.othersWeek}.`;
    }
  }

  const canAdminToggleOmit = Boolean(
    state.user?.isAdmin
    && state.othersWeek < state.currentWeek
    && state.othersWeek > 1
    && state.othersUsername
  );
  if (canAdminToggleOmit) {
    omitScorePanelEl.classList.remove('hidden');
    omitScoreStatusEl.textContent = state.othersOmittedWeek
      ? `${formatUserLabelText(state.othersUsername)} is currently omitted from Week ${state.othersWeek} scoring.`
      : `${formatUserLabelText(state.othersUsername)} is currently counted in Week ${state.othersWeek} scoring.`;
    omitScoreToggleBtnEl.textContent = state.othersOmittedWeek ? 'Count In Score' : 'Omit From Score';
    omitScoreToggleBtnEl.disabled = false;
  } else {
    omitScorePanelEl.classList.add('hidden');
  }

  renderOthersRankingsList();
}

function computeStandingsMovement(rows, weeks) {
  const usableWeeks = [...weeks]
    .filter((week) => Number.isInteger(week) && week !== 1)
    .sort((a, b) => a - b);
  const scoredWeeks = usableWeeks.filter((week) => week < state.currentWeek);
  if (scoredWeeks.length < 2) return {};

  const currentWeek = scoredWeeks[scoredWeeks.length - 1];
  const previousWeek = scoredWeeks[scoredWeeks.length - 2];

  const computeTotalThroughWeek = (row, upToWeek) => scoredWeeks
    .filter((week) => week <= upToWeek)
    .reduce((sum, week) => sum + Number(row.weekPoints?.[week] || 0), 0);

  const currentRanked = [...rows].sort((a, b) => {
    const delta = computeTotalThroughWeek(b, currentWeek) - computeTotalThroughWeek(a, currentWeek);
    if (delta !== 0) return delta;
    return a.username.localeCompare(b.username);
  });
  const previousRanked = [...rows].sort((a, b) => {
    const delta = computeTotalThroughWeek(b, previousWeek) - computeTotalThroughWeek(a, previousWeek);
    if (delta !== 0) return delta;
    return a.username.localeCompare(b.username);
  });

  const currentPositions = {};
  const previousPositions = {};
  currentRanked.forEach((row, index) => { currentPositions[row.username] = index + 1; });
  previousRanked.forEach((row, index) => { previousPositions[row.username] = index + 1; });

  const movement = {};
  for (const row of rows) {
    const currentPos = currentPositions[row.username];
    const previousPos = previousPositions[row.username];
    if (!currentPos || !previousPos) {
      movement[row.username] = 0;
      continue;
    }
    movement[row.username] = previousPos - currentPos;
  }

  return movement;
}

function getOthersUserOptionsForWeek(week) {
  if (!Number.isInteger(week)) return [];
  const rows = Array.isArray(state.fullStandings?.rows) ? state.fullStandings.rows : [];
  return rows
    .filter((row) => row.username !== state.user?.username && Boolean(row.savedWeeks?.[week]))
    .map((row) => row.username);
}

function renderFullStandings() {
  const weeks = Array.isArray(state.fullStandings?.weeks) ? state.fullStandings.weeks : [];
  const rows = Array.isArray(state.fullStandings?.rows) ? state.fullStandings.rows : [];
  const visibleWeeks = weeks.filter((week) => week !== 1);
  const isAdmin = Boolean(state.user?.isAdmin);
  const movementByUser = computeStandingsMovement(rows, weeks);

  if (!rows.length) {
    fullStandingsWrapEl.innerHTML = '<p class="report-empty">No standings data yet.</p>';
    return;
  }

  const weekHeaders = visibleWeeks.map((week) => `<th scope="col">W${week}</th>`).join('');
  const weekExtremes = {};
  for (const week of visibleWeeks) {
    const weekScores = rows
      .map((row) => Number(row.weekPoints?.[week] || 0))
      .filter((value) => value > 0);
    if (!weekScores.length) continue;
    weekExtremes[week] = {
      best: Math.max(...weekScores),
      worst: Math.min(...weekScores)
    };
  }
  const tableRows = rows.map((row) => {
    const isCurrentUser = row.username === state.user?.username;
    const currentClass = isCurrentUser ? ' class="report-current-user"' : '';
    const weekCells = visibleWeeks
      .map((week) => {
        const points = Number(row.weekPoints?.[week] || 0);
        const isCurrentWeekCell = week === state.currentWeek;
        if (isCurrentWeekCell) {
          const hasSaved = Boolean(row.savedWeeks?.[week]);
          if (hasSaved) {
            return '<td class="standings-week-saved" title="Lineup saved">✔</td>';
          }
          return '<td class="standings-week-nosave" title="No lineup saved yet"><img class="standings-no-lineup-icon" src="assets/ui/nolineup.png" alt="No lineup"></td>';
        }
        const extremes = weekExtremes[week];
        let cellClass = '';
        if (points > 0 && extremes) {
          if (Math.abs(points - extremes.best) < 1e-9) {
            cellClass = ' class="standings-week-best"';
          } else if (Math.abs(points - extremes.worst) < 1e-9) {
            cellClass = ' class="standings-week-worst"';
          }
        }
        return `<td${cellClass}>${formatPoints(points)}</td>`;
      })
      .join('');

    const move = Number(movementByUser[row.username] || 0);
    let moveCell = '<span class="standings-move neutral">-</span>';
    if (move > 0) {
      moveCell = `<span class="standings-move up" title="Moved up ${move} from last week">▲ +${move}</span>`;
    } else if (move < 0) {
      moveCell = `<span class="standings-move down" title="Moved down ${Math.abs(move)} from last week">▼ ${move}</span>`;
    }

    const manageButton = isAdmin
      ? `<button type="button" class="standings-manage-btn" data-manage-user="${escapeHtml(row.username)}" title="Edit user profile">✎</button>`
      : '';
    const userCell = `<div class="standings-user-cell">${formatUserLabelHtml(row.username, { includeAffiliationIcon: true })}${manageButton}</div>`;

    return `<tr${currentClass}><td>${moveCell}</td><th scope="row">${userCell}</th><td><strong>${formatPoints(row.totalPoints)}</strong></td>${weekCells}</tr>`;
  }).join('');

  fullStandingsWrapEl.innerHTML = `
    <table class="week-report-table full-standings-table">
      <thead>
        <tr><th scope="col">Change</th><th scope="col">User</th><th scope="col">Total</th>${weekHeaders}</tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

function renderEliminatedBucket() {
  eliminatedBucketEl.innerHTML = '';
  if (!state.eliminatedLineup.length) {
    eliminatedBucketEl.innerHTML = '<div class="eliminated-item"><div class="eliminated-name">No prior eliminations yet.</div></div>';
    return;
  }

  for (const id of state.eliminatedLineup) {
    const castaway = state.castMap.get(id);
    if (!castaway) continue;
    const tribe = getTribeMeta(id);
    const card = document.createElement('article');
    card.className = `eliminated-item tribe-${tribe.key}`;
    card.innerHTML = `
      <div class="photo-wrap">
        <img class="photo" src="${castaway.image}" alt="${escapeHtml(castaway.name)}">
      </div>
      <div class="eliminated-name">${escapeHtml(castaway.name)}</div>
      <div class="tribe-pill tribe-pill-${tribe.key}">${tribe.name}</div>
    `;
    eliminatedBucketEl.appendChild(card);
  }
}

function renderChat() {
  if (!state.user) return;

  const currentAvatar = state.chatAvatarId || state.cast[0]?.id || '';
  chatAvatarSelectEl.replaceChildren();
  state.cast.forEach((castaway) => {
    const option = document.createElement('option');
    option.value = castaway.id;
    option.textContent = castaway.name;
    chatAvatarSelectEl.appendChild(option);
  });
  if (state.castMap.has(currentAvatar)) {
    chatAvatarSelectEl.value = currentAvatar;
  } else if (state.cast.length) {
    chatAvatarSelectEl.value = state.cast[0].id;
    state.chatAvatarId = state.cast[0].id;
  }
  updateChatAvatarPreview(chatAvatarSelectEl.value);
  if (chatInputEl && document.activeElement !== chatInputEl) {
    const draftText = loadChatDraft(state.user.username);
    if (chatInputEl.value !== draftText) {
      chatInputEl.value = draftText;
    }
  }

  chatMessagesEl.innerHTML = '';
  if (!state.chatMessages.length) {
    chatEmptyEl.classList.remove('hidden');
    return;
  }

  chatEmptyEl.classList.add('hidden');
  for (const message of state.chatMessages) {
    const avatar = state.castMap.get(message.avatarId) || state.cast[0];
    const li = document.createElement('li');
    li.className = `chat-message${message.username === state.user.username ? ' mine' : ''}`;
    const dateLabel = new Date(message.createdAt || Date.now()).toLocaleString();
    li.innerHTML = `
      <div class="chat-avatar-wrap">
        <img class="chat-avatar" src="${avatar?.image || ''}" alt="${escapeHtml(message.username)} avatar">
      </div>
      <div class="chat-bubble">
        <p class="chat-meta">${formatUserLabelHtml(message.username)} <span>${escapeHtml(dateLabel)}</span></p>
        <p class="chat-text">${escapeAndFormatMessage(message.text)}</p>
      </div>
    `;
    chatMessagesEl.appendChild(li);
  }
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  renderChatUnreadBadge();
}

function updateChatAvatarPreview(avatarId) {
  const castaway = state.castMap.get(avatarId) || state.cast[0];
  if (!castaway) {
    chatAvatarPreviewEl.removeAttribute('src');
    return;
  }
  chatAvatarPreviewEl.src = castaway.image;
}

async function fetchChatData(silent = false) {
  if (!state.user) return;
  try {
    const payload = await apiRequest('chat-list', {
      params: {
        sinceRevision: state.revision
      }
    });
    if (!consumePayloadMeta(payload) || payload.unchanged) return;
    const chat = payload.chat || {};
    state.chatMessages = Array.isArray(chat.messages) ? chat.messages : [];
    state.chatAvatarId = chat.userAvatarId || state.chatAvatarId;
    updateUnreadChatState();
    if (state.activeTab === 'chat') {
      renderChat();
      markChatAsSeen();
    } else {
      renderChatUnreadBadge();
    }
  } catch (error) {
    if (!silent) {
      showMessage(error.message || 'Failed to refresh chat.');
    }
  }
}

async function saveChatAvatar() {
  if (!state.user) return;
  const avatarId = chatAvatarSelectEl.value;
  if (!avatarId) return;

  try {
    const payload = await apiRequest('set-chat-avatar', {
      method: 'POST',
      data: { avatarId }
    });
    if (!consumePayloadMeta(payload)) return;
    const chat = payload.chat || {};
    state.chatMessages = Array.isArray(chat.messages) ? chat.messages : state.chatMessages;
    state.chatAvatarId = chat.userAvatarId || avatarId;
    showMessage('Chat avatar updated.', false);
    renderChat();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: true })) return;
    showMessage(error.message || 'Failed to update chat avatar.');
  }
}

async function sendChatMessage(event) {
  event.preventDefault();
  if (!state.user) return;
  const message = String(chatInputEl.value || '').trim();
  if (!message) return;

  sendChatBtnEl.disabled = true;
  try {
    const payload = await apiRequest('send-chat-message', {
      method: 'POST',
      data: { message }
    });
    if (!consumePayloadMeta(payload)) return;
    const chat = payload.chat || {};
    state.chatMessages = Array.isArray(chat.messages) ? chat.messages : state.chatMessages;
    state.chatAvatarId = chat.userAvatarId || state.chatAvatarId;
    chatInputEl.value = '';
    storeChatDraft(state.user.username, '');
    markChatAsSeen();
    renderChat();
    await fetchChatData(true);
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: true })) return;
    showMessage(error.message || 'Failed to send chat message.');
  } finally {
    sendChatBtnEl.disabled = false;
  }
}

function renderAppPanel() {
  if (!state.user) {
    appPanelEl.classList.add('hidden');
    stopLockCountdownTimer();
    stopGamePolling();
    stopChatPolling();
    renderLockCountdown();
    return;
  }

  appPanelEl.classList.remove('hidden');
  startLockCountdownTimer();
  startGamePolling();
  renderControls();
  renderScore();
  renderRankList();
  renderEliminatedBucket();
  renderChat();
  setActiveTab(state.activeTab);
}

function render() {
  renderBanner();
  renderWeekRecap();
  renderAuth();
  renderLeaderboard();
  renderUserAffiliationBadge();
  renderAppPanel();
  renderChatUnreadBadge();
}

async function refreshVisibleData() {
  if (!state.user) return;
  if (!state.loading && !state.isViewingOther && !hasPendingLocalEdits()) {
    try {
      const payload = await apiRequest('game', {
        params: {
          week: state.selectedWeek,
          sinceRevision: state.revision
        }
      });
      if (!payload.unchanged) {
        const applied = applyPayload(payload);
        if (applied) render();
      }
    } catch {
      // silent visibility refresh
    }
  }
  await fetchChatData(true);
}

async function loadGame(week = null, retry = true, staleRetryCount = 0) {
  state.loading = true;
  const params = {};
  if (Number.isInteger(week) && week >= 1) {
    params.week = week;
  }
  try {
    const payload = await apiRequest('game', { params });
    const cachedWeek = Number(localStorage.getItem(LAST_KNOWN_WEEK_KEY) || 0);
    const payloadWeek = Number(payload.currentWeek || 1);
    const userLooksStale = Boolean(state.token && !payload.user);
    const weekLooksStale = Boolean(cachedWeek > 0 && payloadWeek < cachedWeek);
    if ((userLooksStale || weekLooksStale) && staleRetryCount < 5) {
      const waitMs = 220 * (staleRetryCount + 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      await loadGame(week, retry, staleRetryCount + 1);
      return;
    }
    const applied = applyPayload(payload);
    clearMessage();
    if (applied) {
      render();
    }
  } catch (error) {
    if (error.status === 401 && state.token && retry) {
      setToken(null);
      await loadGame(null, false, 0);
      return;
    }
    showMessage(error.message || 'Failed to load game data.');
    render();
  } finally {
    state.loading = false;
  }
}

async function loadViewedUserWeek(username) {
  if (!state.user) return;
  if (!canViewPastUserLineups()) return;
  if (!username || username === state.user.username) {
    await loadGame(state.selectedWeek);
    return;
  }

  try {
    const payload = await apiRequest('view-user-week', {
      params: { week: state.selectedWeek, username }
    });
    if (!consumePayloadMeta(payload)) return;
    if (payload.unchanged) return;
    state.lineupOwner = payload.username;
    state.isViewingOther = true;
    state.priorVotedOff = payload.priorVotedOff || {};
    state.votedOff = payload.votedOff || {};
    state.fullLineup = normalizeLineup(payload.lineup || state.cast.map((castaway) => castaway.id));
    state.notes = payload.notes || {};
    state.winnerPicks = normalizeWinnerPicks(payload.winnerPicks || []);
    state.weekRecapWeek = Number(payload.weekRecapWeek || state.selectedWeek || 1);
    state.weekRecapTitle = String(payload.weekRecapTitle || `Week ${state.weekRecapWeek} Recap`);
    state.weekRecap = String(payload.weekRecap || '');
    state.weekCommentOfWeek = payload.weekCommentOfWeek || null;
    closeWeekRecapEditor(true);
    deriveDisplayBuckets();
    state.isSkippedWeek = Boolean(payload.isSkippedWeek);
    state.isOmittedWeek = Boolean(payload.isOmittedWeek);
    state.othersNoSubmit = false;
    state.othersHasSavedLineup = false;
    state.othersCountedByAdmin = false;
    state.canEditVotedOff = false;
    state.dirty = false;
    clearMessage();
    render();
  } catch (error) {
    showMessage(error.message || 'Unable to load selected user rankings.');
    viewUserSelectEl.value = state.user.username;
  }
}

async function loadOthersRankingsData(week, username) {
  if (!state.user) return;
  const weekNum = Number(week);
  const targetUsername = String(username || '').trim();
  if (!Number.isInteger(weekNum) || weekNum < 2 || weekNum >= state.currentWeek) return;
  if (!targetUsername || targetUsername === state.user.username) return;

  try {
    const payload = await apiRequest('view-user-week', {
      params: { week: weekNum, username: targetUsername }
    });
    if (!consumePayloadMeta(payload)) return;
    if (payload.unchanged) return;
    state.othersWeek = weekNum;
    state.othersUsername = payload.username;
    state.othersLineup = normalizeLineup(payload.lineup || state.cast.map((castaway) => castaway.id));
    state.othersNotes = payload.notes || {};
    state.othersPriorVotedOff = payload.priorVotedOff || {};
    state.othersVotedOff = payload.votedOff || {};
    state.othersSkippedWeek = Boolean(payload.isSkippedWeek);
    state.othersOmittedWeek = Boolean(payload.isOmittedWeek);
    state.othersNoSubmit = Boolean(payload.noSubmit);
    state.othersHasSavedLineup = Boolean(payload.hasSavedLineup);
    state.othersCountedByAdmin = Boolean(payload.countedByAdmin);
    state.othersWeekReport = payload.weekReport || null;
    state.othersWeekCommentOfWeek = payload.weekCommentOfWeek || null;
    state.othersLoadedWeek = weekNum;
    state.othersLoadedUsername = payload.username;
    clearMessage();
    renderOthersRankings();
  } catch (error) {
    showMessage(error.message || 'Unable to load selected user rankings.');
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const formData = new FormData(loginFormEl);

  try {
    const payload = await apiRequest('login', {
      method: 'POST',
      data: {
        username: formData.get('username'),
        password: formData.get('password')
      }
    });
    setToken(payload.token);
    applyPayload(payload);
    state.selectedWeek = state.currentWeek;
    showMessage('Logged in.', false);
    render();
    loginFormEl.reset();
  } catch (error) {
    showMessage(error.message || 'Unable to log in.');
  }
}

async function handleSignupSubmit(event) {
  event.preventDefault();
  const formData = new FormData(signupFormEl);

  try {
    const payload = await apiRequest('signup', {
      method: 'POST',
      data: {
        username: formData.get('username'),
        password: formData.get('password')
      }
    });
    setToken(payload.token);
    applyPayload(payload);
    state.selectedWeek = state.currentWeek;
    showMessage('Account created and logged in.', false);
    render();
    signupFormEl.reset();
  } catch (error) {
    showMessage(error.message || 'Unable to create account.');
  }
}

async function handleLogout() {
  try {
    await apiRequest('logout', { method: 'POST' });
  } catch {
    // best effort
  }
  setToken(null);
  stopLockCountdownTimer();
  stopGamePolling();
  stopChatPolling();
  state.user = null;
  await loadGame();
  showMessage('Logged out.', false);
}

function setDirty(value) {
  state.dirty = value;
  state.hasUnsavedChanges = value;
  if (value) {
    saveCurrentLineupDraft();
  } else {
    clearCurrentLineupDraft();
  }
  updateSaveState();
}

function onDragStart(event) {
  if (!isLineupEditable()) return;
  state.draggingId = event.currentTarget.dataset.id;
  event.currentTarget.classList.add('dragging');
  state.dropInsertIndex = null;
  event.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  state.draggingId = null;
  clearDropIndicator();
}

function shiftPlayer(id, direction) {
  if (!isLineupEditable()) return;
  const currentIndex = state.activeLineup.indexOf(id);
  if (currentIndex < 0) return;
  movePlayerToIndex(id, currentIndex + direction);
}

function autoSizeNoteInput(element) {
  if (!element) return;
  element.style.height = 'auto';
  const minHeight = 44;
  const maxHeight = 180;
  const nextHeight = Math.max(minHeight, Math.min(element.scrollHeight, maxHeight));
  element.style.height = `${nextHeight}px`;
  element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function onNoteInputChange(event) {
  if (!isLineupEditable()) return;
  const li = event.target.closest('.cast-card');
  const id = li?.dataset.id;
  if (!id) return;
  autoSizeNoteInput(event.target);
  state.notes[id] = String(event.target.value || '').slice(0, 700);
  setDirty(true);
}

function onRankInputChange(event) {
  if (!isLineupEditable()) return;
  const li = event.target.closest('.cast-card');
  const id = li?.dataset.id;
  if (!id) return;

  const currentIndex = state.activeLineup.indexOf(id);
  if (currentIndex < 0) return;

  const rawText = String(event.target.value || '').trim();
  const rawValue = Number.parseInt(rawText, 10);
  if (!Number.isInteger(rawValue) || rawValue < 1) {
    event.target.value = String(currentIndex + 1);
    return;
  }
  movePlayerToIndex(id, rawValue - 1);
}

function onRankInputKeyDown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

rankListEl.addEventListener('dragover', (event) => {
  if (!isLineupEditable()) return;
  if (!state.draggingId) return;
  event.preventDefault();
  const insertIndex = getDragInsertIndex(event.clientY);
  state.dropInsertIndex = insertIndex;
  updateDropIndicator(insertIndex);
});

rankListEl.addEventListener('dragleave', (event) => {
  if (!state.draggingId) return;
  const nextTarget = event.relatedTarget;
  if (nextTarget && rankListEl.contains(nextTarget)) return;
  clearDropIndicator();
});

rankListEl.addEventListener('drop', (event) => {
  if (!isLineupEditable()) return;
  event.preventDefault();
  if (!state.draggingId) return;

  const draggingId = state.draggingId;
  const withoutDragged = state.activeLineup.filter((id) => id !== draggingId);
  const desiredIndex = Number.isInteger(state.dropInsertIndex) ? state.dropInsertIndex : withoutDragged.length;
  const boundedIndex = clampIndex(desiredIndex, 0, withoutDragged.length);
  withoutDragged.splice(boundedIndex, 0, draggingId);
  applyActiveLineup(withoutDragged, true);
  state.draggingId = null;
  clearDropIndicator();
});

async function saveLineup() {
  if (!state.user) return;
  if (state.selectedWeek !== state.currentWeek) {
    showMessage(`Week ${state.selectedWeek} is complete and cannot be edited.`);
    return;
  }
  if (state.isViewingOther) {
    showMessage('Switch back to your own lineup before saving.');
    return;
  }
  if (state.isNoScoreWeek) {
    showMessage(`Week ${state.selectedWeek} is excluded from scoring and cannot be edited.`);
    return;
  }
  if (state.isWeekLocked) {
    const lockText = formatEtDateTime(state.weekLockAt);
    showMessage(lockText
      ? `Week ${state.selectedWeek} locked at ${lockText}.`
      : `Week ${state.selectedWeek} is locked.`);
    return;
  }
  if (state.isSkippedWeek) {
    showMessage(`Week ${state.selectedWeek} is skipped. Unskip it to save a lineup.`);
    return;
  }
  try {
    const payload = await apiRequest('save-lineup', {
      method: 'POST',
      data: {
        week: state.selectedWeek,
        order: state.activeLineup,
        notes: state.notes,
        winnerPicks: state.winnerPicks
      }
    });
    clearCurrentLineupDraft();
    applyPayload(payload);
    showMessage(`Week ${state.selectedWeek} lineup saved.`, false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to save lineup.');
  }
}

function resetCurrentWeekLineup() {
  if (!isLineupEditable()) return;
  state.fullLineup = state.cast.map((castaway) => castaway.id);
  deriveDisplayBuckets();
  state.notes = {};
  setDirty(true);
  renderRankList();
  renderEliminatedBucket();
}

async function toggleSkipWeek() {
  if (!state.user) return;
  if (state.selectedWeek !== state.currentWeek) return;
  if (state.isViewingOther) return;
  if (state.isNoScoreWeek) return;
  if (state.isWeekLocked) return;
  const actionWord = state.isSkippedWeek ? 'unskip' : 'skip';
  const confirmMessage = state.isSkippedWeek
    ? `Unskip Week ${state.selectedWeek}? This week will be scored normally again.`
    : `Skip Week ${state.selectedWeek}? You will forfeit all points for this week.`;
  if (!window.confirm(confirmMessage)) return;

  try {
    const payload = await apiRequest('set-skip-week', {
      method: 'POST',
      data: {
        week: state.selectedWeek,
        skip: !state.isSkippedWeek
      }
    });
    applyPayload(payload);
    showMessage(`Week ${state.selectedWeek} ${actionWord}ped.`, false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to update skip setting.');
  }
}

async function onAdminVotedOffChange(event) {
  const li = event.target.closest('.cast-card');
  const id = li?.dataset.id;
  if (!id || !state.canEditVotedOff) return;

  const nextMap = { ...state.votedOff, [id]: event.target.checked };

  try {
    const payload = await apiRequest('admin-update-votedoff', {
      method: 'POST',
      data: {
        week: state.selectedWeek,
        votedOff: nextMap
      }
    });
    applyPayload(payload);
    showMessage(`Updated voted-off status for Week ${state.selectedWeek}.`, false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to update voted-off status.');
    render();
  }
}

async function adminSetCastawayTribe(castawayId) {
  if (!state.user?.isAdmin) return;
  if (state.tribeUpdateInFlight) {
    showMessage('Please wait for the previous tribe update to finish.');
    return;
  }
  const castaway = state.castMap.get(castawayId);
  if (!castaway) return;
  const current = getTribeMeta(castawayId).key;
  const rawInput = window.prompt(
    `Set active tribe for ${castaway.name}. Enter one: vatu, cila, kalo, merge`,
    current
  );
  if (rawInput === null) return;
  const tribeKey = String(rawInput || '').trim().toLowerCase();
  if (!['vatu', 'cila', 'kalo', 'merge'].includes(tribeKey)) {
    showMessage('Invalid tribe key. Use vatu, cila, kalo, or merge.');
    return;
  }

  try {
    state.tribeUpdateInFlight = true;
    const payload = await apiRequest('admin-update-cast-tribe', {
      method: 'POST',
      data: {
        castawayId,
        tribeKey,
        week: state.selectedWeek
      }
    });
    applyPayload(payload);
    showMessage(`${castaway.name} active tribe set to ${tribeKey.toUpperCase()}.`, false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to update active tribe.');
  } finally {
    state.tribeUpdateInFlight = false;
  }
}

async function adminToggleOmitScoreWeek() {
  if (!state.user?.isAdmin) return;
  if (!state.othersUsername || !Number.isInteger(state.othersWeek)) return;
  const targetUsername = state.othersUsername;
  const targetWeek = state.othersWeek;
  if (!(targetWeek < state.currentWeek) || targetWeek <= 1) return;
  const nextOmit = !state.othersOmittedWeek;
  const confirmMessage = nextOmit
    ? `Omit ${targetUsername} from Week ${targetWeek} scoring?`
    : `Include ${targetUsername} back into Week ${targetWeek} scoring?`;
  if (!window.confirm(confirmMessage)) return;

  omitScoreToggleBtnEl.disabled = true;
  try {
    const payload = await apiRequest('admin-set-omit-score-week', {
      method: 'POST',
      data: {
        username: targetUsername,
        week: targetWeek,
        omit: nextOmit,
        requestedWeek: targetWeek
      }
    });
    applyPayload(payload);
    showMessage(
      nextOmit
        ? `${targetUsername} omitted from Week ${targetWeek} scoring.`
        : `${targetUsername} included for Week ${targetWeek} scoring.`,
      false
    );
    state.othersOmittedWeek = nextOmit;
    await loadOthersRankingsData(targetWeek, targetUsername);
  } catch (error) {
    if (await handleConflictError(error, { reloadWeek: targetWeek, refreshChat: false })) return;
    showMessage(error.message || 'Failed to update omit score setting.');
  } finally {
    omitScoreToggleBtnEl.disabled = false;
  }
}

async function adminRemoveCastawayTribe(castawayId, tribeIndex) {
  if (!state.user?.isAdmin) return;
  if (!Number.isInteger(tribeIndex) || tribeIndex < 0) return;
  if (state.tribeUpdateInFlight) {
    showMessage('Please wait for the previous tribe update to finish.');
    return;
  }
  const castaway = state.castMap.get(castawayId);
  if (!castaway) return;
  const tribe = getTribeMeta(castawayId);
  const label = tribe.history[tribeIndex]?.name;
  if (!label) return;
  if (tribe.history.length <= 1) {
    showMessage('Each player must keep at least one tribe.');
    return;
  }
  const confirmed = window.confirm(`Remove ${label} from ${castaway.name}'s tribe history?`);
  if (!confirmed) return;

  try {
    state.tribeUpdateInFlight = true;
    const payload = await apiRequest('admin-remove-cast-tribe', {
      method: 'POST',
      data: {
        castawayId,
        tribeIndex,
        week: state.selectedWeek
      }
    });
    applyPayload(payload);
    showMessage(`Removed ${label} from ${castaway.name}'s tribe history.`, false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to remove tribe.');
  } finally {
    state.tribeUpdateInFlight = false;
  }
}

async function adminToggleWeekComment(castawayId) {
  if (!state.user?.isAdmin) return;
  if (!state.isViewingOther || !state.lineupOwner) return;
  if (!(state.selectedWeek < state.currentWeek) || state.isNoScoreWeek) return;
  const username = state.lineupOwner;
  const note = String(state.notes?.[castawayId] || '').trim();
  const current = state.weekCommentOfWeek;
  const isCurrentSelection = Boolean(
    current
    && Number(current.week) === state.selectedWeek
    && current.username === username
    && current.castawayId === castawayId
  );
  const enabled = !isCurrentSelection;
  if (enabled && !note) {
    showMessage('No note found for this castaway in this week.');
    return;
  }

  try {
    const payload = await apiRequest('admin-set-week-comment', {
      method: 'POST',
      data: {
        week: state.selectedWeek,
        username,
        castawayId,
        enabled,
        requestedWeek: state.selectedWeek
      }
    });
    applyPayload(payload);
    await loadViewedUserWeek(username);
    showMessage(
      enabled
        ? 'Comment of the Week updated.'
        : 'Comment of the Week cleared.',
      false
    );
  } catch (error) {
    if (await handleConflictError(error, { reloadWeek: state.selectedWeek, refreshChat: false })) return;
    showMessage(error.message || 'Failed to update comment of the week.');
  }
}

async function adminToggleWeekCommentFromOthers(castawayId) {
  if (!state.user?.isAdmin) return;
  const week = Number(state.othersWeek);
  const username = state.othersUsername;
  if (!username || !Number.isInteger(week) || week < 2 || week >= state.currentWeek) return;
  const note = String(state.othersNotes?.[castawayId] || '').trim();
  const current = state.othersWeekCommentOfWeek;
  const isCurrentSelection = Boolean(
    current
    && Number(current.week) === week
    && current.username === username
    && current.castawayId === castawayId
  );
  const enabled = !isCurrentSelection;
  if (enabled && !note) {
    showMessage('No note found for this castaway in this week.');
    return;
  }

  try {
    const payload = await apiRequest('admin-set-week-comment', {
      method: 'POST',
      data: {
        week,
        username,
        castawayId,
        enabled,
        requestedWeek: week
      }
    });
    applyPayload(payload);
    await loadOthersRankingsData(week, username);
    showMessage(
      enabled
        ? 'Comment of the Week updated.'
        : 'Comment of the Week cleared.',
      false
    );
  } catch (error) {
    if (await handleConflictError(error, { reloadWeek: week, refreshChat: false })) return;
    showMessage(error.message || 'Failed to update comment of the week.');
  }
}

async function advanceWeek() {
  if (!state.user?.isAdmin) return;
  if (state.isViewingOther || state.selectedWeek !== state.currentWeek) {
    showMessage(`Switch to Week ${state.currentWeek} before advancing.`);
    return;
  }
  if (!window.confirm('Advance to the next week? This creates a new week with current voted-off players carried over.')) {
    return;
  }

  try {
    const payload = await apiRequest('admin-advance-week', {
      method: 'POST',
      data: {
        selectedWeek: state.selectedWeek,
        expectedCurrentWeek: state.currentWeek
      }
    });
    applyPayload(payload);
    showMessage(`Advanced to Week ${state.currentWeek}.`, false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to advance week.');
  }
}

async function saveWeekRecap() {
  if (!state.user?.isAdmin) return;
  if (!isRecapEditable()) {
    showMessage('Only the active week recap can be edited.');
    return;
  }
  saveWeekRecapBtnEl.disabled = true;
  try {
    const payload = await apiRequest('admin-update-week-recap', {
      method: 'POST',
      data: {
        week: state.currentWeek,
        title: state.weekRecapTitleDraft || '',
        message: state.weekRecapDraft || ''
      }
    });
    const applied = applyPayload(payload);
    closeWeekRecapEditor(true);
    state.weekRecapTitleDraft = state.weekRecapTitle;
    state.weekRecapDraft = state.weekRecap;
    showMessage(`Week ${state.currentWeek} recap saved.`, false);
    if (applied) render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to save week recap.');
  } finally {
    saveWeekRecapBtnEl.disabled = false;
  }
}

async function adminChangeUserPassword() {
  if (!state.user?.isAdmin || !state.adminTargetUser) return;
  const nextPassword = window.prompt(`Set a new password for "${state.adminTargetUser}" (min 8 chars):`);
  if (!nextPassword) return;

  try {
    const payload = await apiRequest('admin-update-user-password', {
      method: 'POST',
      data: {
        username: state.adminTargetUser,
        password: nextPassword
      }
    });
    applyPayload(payload);
    showMessage(`Password updated for ${state.adminTargetUser}.`, false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to update password.');
  }
}

async function adminSaveUserProfile() {
  if (!state.user?.isAdmin || !state.adminTargetUser) return;
  const username = state.adminTargetUser;
  const birthName = adminBirthNameInputEl ? String(adminBirthNameInputEl.value || '') : '';
  const affiliation = adminAffiliationSelectEl ? String(adminAffiliationSelectEl.value || '') : '';
  if (state.birthNameUpdateInFlight) return;
  state.birthNameUpdateInFlight = true;
  try {
    const payload = await apiRequest('admin-update-user-profile', {
      method: 'POST',
      data: {
        username,
        birthName,
        affiliation
      }
    });
    const applied = applyPayload(payload);
    state.adminProfileDraftDirty = false;
    state.adminProfileDraftTarget = username;
    state.adminProfileDraftBirthName = getBirthName(username);
    state.adminProfileDraftAffiliation = getUserAffiliation(username);
    state.adminTargetUser = null;
    showMessage(`Saved profile for ${formatUserLabelText(username)}.`, false);
    if (applied) {
      render();
    } else {
      renderAdminUserPanel();
    }
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to save user profile.');
  } finally {
    state.birthNameUpdateInFlight = false;
  }
}

async function adminDeleteUser() {
  if (!state.user?.isAdmin || !state.adminTargetUser) return;
  if (!window.confirm(`Delete user "${state.adminTargetUser}" and all their data?`)) return;

  try {
    const payload = await apiRequest('admin-delete-user', {
      method: 'POST',
      data: { username: state.adminTargetUser }
    });
    const removedUsername = state.adminTargetUser;
    applyPayload(payload);
    state.adminTargetUser = null;
    showMessage(`Deleted user ${removedUsername}.`, false);
    render();
  } catch (error) {
    if (await handleConflictError(error, { refreshChat: false })) return;
    showMessage(error.message || 'Failed to delete user.');
  }
}

async function adminExportDb() {
  if (!state.user?.isAdmin || !state.token) return;
  const url = buildApiUrl('admin-export-db');

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        authorization: `Bearer ${state.token}`
      }
    });
    if (!response.ok) {
      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }
      throw new Error(payload.error || `Request failed (${response.status})`);
    }
    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
    const filename = filenameMatch?.[1] || `shipvivor-backup-${new Date().toISOString().slice(0, 10)}.json`;
    downloadBlob(blob, filename);
    showMessage('Database export downloaded.', false);
  } catch (error) {
    showMessage(error.message || 'Failed to export database.');
  }
}

weekSelectEl.addEventListener('change', async (event) => {
  const rawWeek = String(event.target.value || '').trim();
  if (!rawWeek) return;
  const selectedWeek = Number(rawWeek);
  if (!Number.isInteger(selectedWeek) || selectedWeek < 2 || selectedWeek > state.currentWeek) {
    weekSelectEl.value = String(state.selectedWeek);
    return;
  }
  if (state.dirty || hasUnsavedWeekRecapDraft()) {
    const confirmDiscard = window.confirm('You have unsaved changes. Discard them and switch weeks?');
    if (!confirmDiscard) {
      weekSelectEl.value = String(state.selectedWeek);
      return;
    }
    if (state.dirty) {
      clearCurrentLineupDraft();
      state.dirty = false;
      state.hasUnsavedChanges = false;
    }
    if (hasUnsavedWeekRecapDraft()) {
      closeWeekRecapEditor(true);
    }
  }
  await loadGame(selectedWeek);
});

saveWeekBtnEl.addEventListener('click', saveLineup);
skipWeekBtnEl.addEventListener('click', toggleSkipWeek);
saveWeekRecapBtnEl.addEventListener('click', saveWeekRecap);
if (cancelWeekRecapBtnEl) {
  cancelWeekRecapBtnEl.addEventListener('click', () => toggleWeekRecapEditor(false));
}
if (editWeekRecapBtnEl) {
  editWeekRecapBtnEl.addEventListener('click', () => toggleWeekRecapEditor());
}
omitScoreToggleBtnEl.addEventListener('click', adminToggleOmitScoreWeek);
setLineupTabBtnEl.addEventListener('click', async () => {
  if (state.selectedWeek !== state.currentWeek && !state.dirty) {
    await loadGame(state.currentWeek);
  }
  setActiveTab('set-lineup');
});
standingsTabBtnEl.addEventListener('click', () => setActiveTab('standings'));
othersRankingsTabBtnEl.addEventListener('click', () => {
  setActiveTab('others-rankings');
  renderOthersRankings();
});
chatTabBtnEl.addEventListener('click', () => {
  setActiveTab('chat');
  fetchChatData(true);
});
if (othersWeekSelectEl) {
  othersWeekSelectEl.addEventListener('change', async (event) => {
    const week = Number(event.target.value);
    if (!Number.isInteger(week)) return;
    state.othersWeek = week;
    if (state.othersUsername) {
      await loadOthersRankingsData(week, state.othersUsername);
    }
  });
}
viewUserSelectEl.addEventListener('change', async (event) => {
  const username = String(event.target.value || '').trim();
  if (!username || !Number.isInteger(state.othersWeek)) return;
  state.othersUsername = username;
  await loadOthersRankingsData(state.othersWeek, username);
});
saveChatAvatarBtnEl.addEventListener('click', saveChatAvatar);
refreshChatBtnEl.addEventListener('click', () => fetchChatData());
chatFormEl.addEventListener('submit', sendChatMessage);
chatInputEl.addEventListener('input', (event) => {
  storeChatDraft(state.user?.username, event.target.value || '');
});
chatAvatarSelectEl.addEventListener('change', (event) => {
  updateChatAvatarPreview(event.target.value);
});

resetWeekBtnEl.addEventListener('click', () => {
  if (!window.confirm(`Reset Week ${state.selectedWeek} lineup to default order?`)) return;
  resetCurrentWeekLineup();
});

advanceWeekBtnEl.addEventListener('click', advanceWeek);

loginFormEl.addEventListener('submit', handleLoginSubmit);
signupFormEl.addEventListener('submit', handleSignupSubmit);
logoutBtnEl.addEventListener('click', handleLogout);
adminResetPasswordBtnEl.addEventListener('click', adminChangeUserPassword);
adminDeleteUserBtnEl.addEventListener('click', adminDeleteUser);
if (weekRecapTitleInputEl) {
  weekRecapTitleInputEl.addEventListener('input', (event) => {
    state.weekRecapTitleDraft = String(event.target.value || '').slice(0, 120);
  });
}
weekRecapInputEl.addEventListener('input', (event) => {
  state.weekRecapDraft = String(event.target.value || '').slice(0, 2400);
});

leaderboardListEl.addEventListener('click', (event) => {
  if (!state.user?.isAdmin) return;
  const target = event.target.closest('.leaderboard-user-btn');
  if (!target) return;
  const username = target.dataset.username;
  if (!username) return;
  setAdminTargetUser(username);
  renderAdminUserPanel();
});

fullStandingsWrapEl.addEventListener('click', (event) => {
  if (!state.user?.isAdmin) return;
  const target = event.target.closest('[data-manage-user]');
  if (!target) return;
  const username = target.dataset.manageUser;
  if (!username) return;
  setAdminTargetUser(username);
  renderAdminUserPanel();
});

if (adminBirthNameInputEl) {
  adminBirthNameInputEl.addEventListener('input', (event) => {
    state.adminProfileDraftBirthName = String(event.target.value || '');
    const target = state.adminTargetUser;
    if (!target) {
      state.adminProfileDraftDirty = false;
      return;
    }
    const serverName = getBirthName(target);
    const serverAffiliation = getUserAffiliation(target);
    state.adminProfileDraftDirty = (
      state.adminProfileDraftBirthName !== serverName
      || (state.adminProfileDraftAffiliation || '') !== serverAffiliation
    );
    if (adminSaveUserProfileBtnEl) {
      adminSaveUserProfileBtnEl.disabled = !state.adminProfileDraftDirty;
    }
  });
}

if (adminAffiliationSelectEl) {
  adminAffiliationSelectEl.addEventListener('change', (event) => {
    state.adminProfileDraftAffiliation = String(event.target.value || '');
    const target = state.adminTargetUser;
    if (!target) {
      state.adminProfileDraftDirty = false;
      return;
    }
    const serverName = getBirthName(target);
    const serverAffiliation = getUserAffiliation(target);
    state.adminProfileDraftDirty = (
      state.adminProfileDraftBirthName !== serverName
      || (state.adminProfileDraftAffiliation || '') !== serverAffiliation
    );
    if (adminSaveUserProfileBtnEl) {
      adminSaveUserProfileBtnEl.disabled = !state.adminProfileDraftDirty;
    }
  });
}

if (adminSaveUserProfileBtnEl) {
  adminSaveUserProfileBtnEl.addEventListener('click', adminSaveUserProfile);
}

if (adminExportDbBtnEl) {
  adminExportDbBtnEl.addEventListener('click', adminExportDb);
}

if (adminBackgroundFileInputEl) {
  adminBackgroundFileInputEl.addEventListener('change', renderAdminBackgroundPanel);
}

if (adminBackgroundOpacityInputEl) {
  adminBackgroundOpacityInputEl.addEventListener('input', renderAdminBackgroundPanel);
}

if (adminBackgroundTileWidthInputEl) {
  adminBackgroundTileWidthInputEl.addEventListener('input', renderAdminBackgroundPanel);
}

if (adminBackgroundTileHeightInputEl) {
  adminBackgroundTileHeightInputEl.addEventListener('input', renderAdminBackgroundPanel);
}

if (adminSaveBackgroundBtnEl) {
  adminSaveBackgroundBtnEl.addEventListener('click', adminSaveBackgroundSettings);
}

if (adminResetBackgroundBtnEl) {
  adminResetBackgroundBtnEl.addEventListener('click', adminResetBackgroundSettings);
}

if (scoringHelpBtnEl) {
  scoringHelpBtnEl.addEventListener('click', openScoringHelpModal);
}

if (closeScoringHelpBtnEl) {
  closeScoringHelpBtnEl.addEventListener('click', closeScoringHelpModal);
}

if (scoringHelpModalEl) {
  scoringHelpModalEl.addEventListener('click', (event) => {
    if (event.target === scoringHelpModalEl) {
      closeScoringHelpModal();
    }
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && scoringHelpModalEl && !scoringHelpModalEl.classList.contains('hidden')) {
    closeScoringHelpModal();
  }
});

document.addEventListener('visibilitychange', () => {
  state.pageHidden = document.hidden;
  if (state.pageHidden) {
    stopGamePolling();
    stopChatPolling();
    return;
  }
  refreshVisibleData();
  startGamePolling();
  startChatPolling();
});

window.addEventListener('beforeunload', (event) => {
  if (!state.hasUnsavedChanges) return;
  event.preventDefault();
  event.returnValue = '';
});

loadGame();
