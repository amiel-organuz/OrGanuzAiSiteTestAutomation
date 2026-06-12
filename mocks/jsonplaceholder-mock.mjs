import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.MOCK_DB_PATH || resolve(__dirname, 'jsonplaceholder-db.json');
const PORT = parseInt(process.env.MOCK_PORT || '3001', 10);
const HOST = process.env.MOCK_HOST || '127.0.0.1';

const db = JSON.parse(readFileSync(DB_PATH, 'utf8'));
const NESTED = {
  posts: ['comments'],
  albums: ['photos'],
  users: ['posts', 'albums', 'todos'],
};
const FK = { comments: 'postId', photos: 'albumId', posts: 'userId', albums: 'userId', todos: 'userId' };

function send(res, status, body, headers = {}) {
  const json = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization',
    'Content-Length': Buffer.byteLength(json),
    ...headers,
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolveBody) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolveBody({});
      try { resolveBody(JSON.parse(raw)); } catch { resolveBody({}); }
    });
  });
}

function filterByQuery(items, params) {
  if (!params) return items;
  let out = items;
  for (const [key, value] of params.entries()) {
    if (['_limit', '_start', '_end', '_sort', '_order', '_page'].includes(key)) continue;
    out = out.filter((it) => String(it[key]) === value);
  }
  return out;
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, undefined);

  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts.length === 0) return send(res, 200, { message: 'JSONPlaceholder mock' });

  const [resource, idStr, sub] = parts;
  const collection = db[resource];
  if (!Array.isArray(collection)) return send(res, 404, {});

  if (req.method === 'GET') {
    if (!idStr) return send(res, 200, filterByQuery(collection, url.searchParams));
    const id = Number(idStr);
    const item = collection.find((x) => x.id === id);
    if (!sub) return item ? send(res, 200, item) : send(res, 404, {});
    if (!Number.isFinite(id) || !item) return send(res, 404, {});
    if (!NESTED[resource]?.includes(sub) || !db[sub]) return send(res, 404, {});
    const fk = FK[sub];
    if (!fk) return send(res, 404, {});
    return send(res, 200, db[sub].filter((x) => x[fk] === id));
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const newId = (collection[collection.length - 1]?.id ?? 0) + 1;
    return send(res, 201, { ...body, id: newId });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    if (!idStr) return send(res, 404, {});
    const id = Number(idStr);
    const body = await readBody(req);
    return send(res, 200, { ...body, id });
  }

  if (req.method === 'DELETE') {
    return send(res, 200, {});
  }

  send(res, 405, {});
}

http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error('mock error:', err);
    send(res, 500, { error: String(err) });
  });
}).listen(PORT, HOST, () => {
  console.log(`JSONPlaceholder mock listening on http://${HOST}:${PORT}`);
});
