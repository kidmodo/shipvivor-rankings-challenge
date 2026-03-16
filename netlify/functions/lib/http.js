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
  parseBody,
  response
};
