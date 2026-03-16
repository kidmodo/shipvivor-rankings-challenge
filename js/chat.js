export function getLatestMessageId(messages) {
  if (!Array.isArray(messages) || !messages.length) return null;
  const latest = messages[messages.length - 1];
  return typeof latest?.id === 'string' ? latest.id : null;
}

export function countUnreadMessages(messages, lastSeenMessageId) {
  if (!Array.isArray(messages) || !messages.length) return 0;
  if (!lastSeenMessageId) return messages.length;
  const lastSeenIndex = messages.findIndex((message) => message.id === lastSeenMessageId);
  if (lastSeenIndex < 0) return messages.length;
  return Math.max(0, messages.length - lastSeenIndex - 1);
}
