const { getTokenFromEvent, getUserFromToken } = require('./lib/auth');
const { cleanExpiredSessions, ensureAdminUser, ensureDbShape, withDb } = require('./lib/db');
const { applyLockedGameState } = require('./lib/game');
const { response } = require('./lib/http');
const { handleLogin, handleLogout, handleSignup } = require('./lib/routes/auth-routes');
const {
  handleAdminAdvanceWeek,
  handleAdminDeleteUser,
  handleAdminExportDb,
  handleAdminJumpWeek,
  handleAdminRemoveCastTribe,
  handleAdminSetBirthName,
  handleAdminSetOmitScoreWeek,
  handleAdminSetWeekComment,
  handleAdminUpdateBackground,
  handleAdminUpdateCastTribe,
  handleAdminUpdateUserPassword,
  handleAdminUpdateUserProfile,
  handleAdminUpdateVotedOff,
  handleAdminUpdateWeekRecap
} = require('./lib/routes/admin-routes');
const { handleChatList, handleSendChatMessage, handleSetChatAvatar } = require('./lib/routes/chat-routes');
const {
  handleBackgroundImage,
  handleGame,
  handleSaveLineup,
  handleSetSkipWeek,
  handleViewUserWeek
} = require('./lib/routes/game-routes');

const routes = {
  game: { methods: ['GET'], handler: handleGame },
  signup: { methods: ['POST'], handler: handleSignup },
  login: { methods: ['POST'], handler: handleLogin },
  logout: { methods: ['POST'], handler: handleLogout },
  'save-lineup': { methods: ['POST'], handler: handleSaveLineup },
  'set-skip-week': { methods: ['POST'], handler: handleSetSkipWeek },
  'admin-update-votedoff': { methods: ['POST'], handler: handleAdminUpdateVotedOff },
  'admin-update-cast-tribe': { methods: ['POST'], handler: handleAdminUpdateCastTribe },
  'admin-remove-cast-tribe': { methods: ['POST'], handler: handleAdminRemoveCastTribe },
  'admin-advance-week': { methods: ['POST'], handler: handleAdminAdvanceWeek },
  'admin-jump-week': { methods: ['POST'], handler: handleAdminJumpWeek },
  'view-user-week': { methods: ['GET'], handler: handleViewUserWeek },
  'admin-update-week-recap': { methods: ['POST'], handler: handleAdminUpdateWeekRecap },
  'admin-set-week-comment': { methods: ['POST'], handler: handleAdminSetWeekComment },
  'admin-update-background': { methods: ['POST'], handler: handleAdminUpdateBackground },
  'admin-set-omit-score-week': { methods: ['POST'], handler: handleAdminSetOmitScoreWeek },
  'admin-set-birth-name': { methods: ['POST'], handler: handleAdminSetBirthName },
  'admin-update-user-profile': { methods: ['POST'], handler: handleAdminUpdateUserProfile },
  'admin-update-user-password': { methods: ['POST'], handler: handleAdminUpdateUserPassword },
  'admin-delete-user': { methods: ['POST'], handler: handleAdminDeleteUser },
  'chat-list': { methods: ['GET'], handler: handleChatList },
  'set-chat-avatar': { methods: ['POST'], handler: handleSetChatAvatar },
  'send-chat-message': { methods: ['POST'], handler: handleSendChatMessage },
  'admin-export-db': { methods: ['GET'], handler: handleAdminExportDb },
  'background-image': { methods: ['GET'], handler: handleBackgroundImage }
};

exports.handler = async (event) => {
  const action = (event.queryStringParameters?.action || '').trim();
  const method = event.httpMethod || 'GET';

  return withDb(event, async (db) => {
    let needsSave = ensureDbShape(db);
    if (ensureAdminUser(db)) needsSave = true;
    if (applyLockedGameState(db)) needsSave = true;
    cleanExpiredSessions(db);

    const token = getTokenFromEvent(event);
    const authenticatedUser = getUserFromToken(db, token);
    const route = routes[action];

    if (!route) {
      return { response: response(404, { ok: false, error: 'Unknown action.' }) };
    }

    if (!['game', 'signup', 'login', 'logout', 'background-image'].includes(action) && !authenticatedUser) {
      return { response: response(401, { ok: false, error: 'Unauthorized.' }) };
    }

    if (!route.methods.includes(method)) {
      return { response: response(404, { ok: false, error: 'Unknown action.' }) };
    }

    return route.handler({
      action,
      authenticatedUser,
      db,
      event,
      method,
      needsSave
    });
  }).then((result) => result.response);
};
