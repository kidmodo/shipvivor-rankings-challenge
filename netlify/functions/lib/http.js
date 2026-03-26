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

function parseExpectedRevision(body) {
  const value = Number(body?.expectedRevision);
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

function getRevisionConflictResponse(db, expectedRevision) {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return null;
  const currentRevision = Number(db?.meta?.revision || 0);
  if (expectedRevision === currentRevision) return null;
  return response(409, {
    ok: false,
    error: 'Someone else updated the app. Reload and try again.',
    conflict: true,
    currentRevision,
    lastMutationAt: db?.meta?.lastMutationAt || null
  });
}

async function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function emptyResponse(statusCode, headers = {}) {
  return {
    statusCode,
    headers,
    body: ''
  };
}

module.exports = {
  emptyResponse,
  getRevisionConflictResponse,
  parseBody,
  parseExpectedRevision,
  response
};
