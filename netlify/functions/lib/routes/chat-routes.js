const crypto = require('node:crypto');

const { MAX_CHAT_MESSAGES } = require('../constants');
const {
  emptyResponse,
  getRevisionConflictResponse,
  parseBody,
  parseExpectedRevision,
  response
} = require('../http');
const { buildChatPayload } = require('../payloads');
const { ensureUserProfile, normalizeChatMessages, normalizeAvatarId, sanitizeChatMessage } = require('../normalize');

async function handleChatList({ event, db, authenticatedUser }) {
  const sinceRevision = Number(event.queryStringParameters?.sinceRevision);
  if (Number.isInteger(sinceRevision) && sinceRevision >= 0 && sinceRevision === Number(db.meta?.revision || 0)) {
    return { response: emptyResponse(304) };
  }
  return {
    response: response(200, { ok: true, chat: buildChatPayload(db, authenticatedUser) })
  };
}

async function handleSetChatAvatar({ event, db, authenticatedUser }) {
  const body = await parseBody(event);
  const conflictResponse = getRevisionConflictResponse(db, parseExpectedRevision(body));
  if (conflictResponse) return { response: conflictResponse };
  const avatarId = normalizeAvatarId(body.avatarId);
  ensureUserProfile(db, authenticatedUser.username).chatAvatarId = avatarId;

  return {
    save: true,
    response: response(200, { ok: true, chat: buildChatPayload(db, authenticatedUser) })
  };
}

async function handleSendChatMessage({ event, db, authenticatedUser }) {
  const body = await parseBody(event);
  const conflictResponse = getRevisionConflictResponse(db, parseExpectedRevision(body));
  if (conflictResponse) return { response: conflictResponse };
  if (typeof body.message !== 'string') {
    return { response: response(400, { ok: false, error: 'Message must be a string.' }) };
  }
  const trimmed = body.message.replace(/\r/g, '').trim();
  if (trimmed.length < 1 || trimmed.length > 500) {
    return { response: response(400, { ok: false, error: 'Message must be between 1 and 500 characters.' }) };
  }

  const text = sanitizeChatMessage(body.message);
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

module.exports = {
  handleChatList,
  handleSendChatMessage,
  handleSetChatAvatar
};
