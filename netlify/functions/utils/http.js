const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

function ok(body, statusCode = 200) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

function fail(message, statusCode = 400, extra = {}) {
  return { statusCode, headers: HEADERS, body: JSON.stringify({ erro: message, ...extra }) };
}

function preflight() {
  return { statusCode: 204, headers: HEADERS, body: '' };
}

function getClientIp(event) {
  const xf = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'];
  if (xf) return xf.split(',')[0].trim();
  return event.headers['client-ip'] || 'desconhecido';
}

module.exports = { ok, fail, preflight, getClientIp, HEADERS };
