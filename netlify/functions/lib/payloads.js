const { CASTAWAYS, LEGACY_SCORE_WEEK, NO_SCORE_WEEKS } = require('./constants');
const {
  computeWeekReport,
  getEffectiveWeekVotedOff,
  getLineupForWeek,
  getNotesForWeek,
  getRankMapForWeek,
  getUserJoinedWeek,
  getWeekLockDate,
  getWeekRecapForWeek,
  getWeekTransition,
  getWinnerPicksForWeek,
  isWeekLocked
} = require('./game');
const {
  defaultVotedOff,
  ensureUserProfile,
  normalizeChatMessages,
  normalizeScoreInclusionsMap,
  normalizeScoreOmissionsMap,
  normalizeSkippedWeeks,
  normalizeTribesById,
  normalizeWeekCommentsMap,
  sanitizeNote
} = require('./normalize');
const {
  buildFullStandings,
  buildLeaderboard,
  computeScoreBreakdown,
  getWeekScoringStatus
} = require('./scoring');
const { buildUserProfilesPayload, getBirthNameForUsername } = require('./profiles');

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

function computeBiggestUpset(db) {
  const week = db.game.currentWeek - 1;
  if (week < 1 || NO_SCORE_WEEKS.has(week)) return null;

  const { previousWeekVotedOff, eliminations } = getWeekTransition(db, week);
  if (eliminations.length === 0) return null;

  let upset = null;
  for (const username of Object.keys(db.users)) {
    const status = getWeekScoringStatus(db, username, week);
    if (status.skipped || status.omitted) continue;

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
  const activeIds = CASTAWAYS.map((castaway) => castaway.id).filter((id) => !priorWeekVotedOff[id]);
  if (!activeIds.length) return null;

  const rankTotals = {};
  for (const id of activeIds) {
    rankTotals[id] = { total: 0, count: 0 };
  }

  let voterCount = 0;
  for (const username of Object.keys(db.users)) {
    const status = getWeekScoringStatus(db, username, week);
    if (status.skipped || status.omitted) continue;

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
  let scoreInclusions = {};
  let notes = {};
  let winnerPicks = [];
  let previousWeekRanks = {};
  const priorVotedOff = selectedWeek > 1 ? getEffectiveWeekVotedOff(db, selectedWeek - 1) : defaultVotedOff();

  if (authenticatedUser) {
    lineup = getLineupForWeek(db, authenticatedUser.username, selectedWeek);
    notes = getNotesForWeek(db, authenticatedUser.username, selectedWeek);
    winnerPicks = getWinnerPicksForWeek(db, authenticatedUser.username, selectedWeek);
    previousWeekRanks = selectedWeek > LEGACY_SCORE_WEEK
      ? getRankMapForWeek(db, authenticatedUser.username, selectedWeek - 1)
      : {};
    score = computeScoreBreakdown(db, authenticatedUser.username);
    skippedWeeks = normalizeSkippedWeeks(db.skips[authenticatedUser.username]);
    omittedWeeks = normalizeScoreOmissionsMap(db.scoreOmissions[authenticatedUser.username]);
    scoreInclusions = normalizeScoreInclusionsMap(db.scoreInclusions[authenticatedUser.username]);
  }
  const selectedWeekStatus = authenticatedUser
    ? getWeekScoringStatus(db, authenticatedUser.username, selectedWeek)
    : { skipped: false, omitted: false };

  const canShowWeekReport = selectedWeek < db.game.currentWeek;
  const weekReport = canShowWeekReport ? computeWeekReport(db, selectedWeek) : null;
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
    previousWeekRanks,
    winnerPicks,
    tribesById: normalizeTribesById(db.tribesById),
    skippedWeeks,
    omittedWeeks,
    scoreInclusions,
    isSkippedWeek: Boolean(selectedWeekStatus.skipped),
    isOmittedWeek: Boolean(selectedWeekStatus.omitted),
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
    canEditVotedOff: Boolean(authenticatedUser?.isAdmin && selectedWeek > 1 && !NO_SCORE_WEEKS.has(selectedWeek))
  };
}

module.exports = {
  buildChatPayload,
  buildGamePayload,
  buildUserProfilesPayload,
  computeBiggestUpset,
  computeLowestRankedActive,
  computeMostHatedLastWeek,
  getWeekCommentOfWeek
};
