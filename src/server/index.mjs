import {createReadStream, existsSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {queueRender} from './render.mjs';
import {webRoot} from './paths.mjs';
import {
  beginJudging,
  createRun,
  getPublicRun,
  getRun,
  initializeStorage,
  listRuns,
  revealRun,
  saveRating,
} from './storage.mjs';

const port = Number(process.env.PORT ?? 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
};

const json = (response, statusCode, value) => {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
};

const readBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const serveFile = async (request, response, filePath) => {
  const file = await stat(filePath);
  const contentType = mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  const range = request.headers.range;

  if (range && contentType === 'video/mp4') {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      response.writeHead(416, {'Content-Range': `bytes */${file.size}`});
      response.end();
      return;
    }
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), file.size - 1) : file.size - 1;
    if (start > end || start >= file.size) {
      response.writeHead(416, {'Content-Range': `bytes */${file.size}`});
      response.end();
      return;
    }
    response.writeHead(206, {
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${file.size}`,
      'Content-Type': contentType,
    });
    createReadStream(filePath, {start, end}).pipe(response);
    return;
  }

  response.writeHead(200, {
    'Content-Length': file.size,
    'Content-Type': contentType,
  });
  createReadStream(filePath).pipe(response);
};

const segments = (pathname) => pathname.split('/').filter(Boolean).map(decodeURIComponent);

const handleApi = async (request, response, pathname) => {
  const parts = segments(pathname);

  if (request.method === 'GET' && pathname === '/api/health') {
    json(response, 200, {ok: true, name: 'CUTS'});
    return true;
  }
  if (request.method === 'GET' && pathname === '/api/runs') {
    json(response, 200, await listRuns());
    return true;
  }
  if (request.method === 'POST' && pathname === '/api/runs') {
    const run = await createRun(await readBody(request));
    json(response, 201, await getPublicRun(run.id));
    return true;
  }
  if (parts[0] === 'api' && parts[1] === 'runs' && parts[2]) {
    const runId = parts[2];
    if (request.method === 'GET' && parts.length === 3) {
      json(response, 200, await getPublicRun(runId));
      return true;
    }
    if (
      request.method === 'POST' &&
      parts[3] === 'submissions' &&
      parts[4] &&
      parts[5] === 'render'
    ) {
      await queueRender(runId, parts[4]);
      json(response, 202, {ok: true});
      return true;
    }
    if (request.method === 'POST' && parts[3] === 'begin-judging') {
      json(response, 200, await beginJudging(runId));
      return true;
    }
    if (request.method === 'PUT' && parts[3] === 'ratings' && parts[4]) {
      const rating = await readBody(request);
      rating.submissionId = parts[4];
      json(response, 200, await saveRating(runId, rating));
      return true;
    }
    if (request.method === 'POST' && parts[3] === 'reveal') {
      json(response, 200, await revealRun(runId));
      return true;
    }
  }

  return false;
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;
    if (pathname.startsWith('/api/')) {
      if (!(await handleApi(request, response, pathname))) {
        json(response, 404, {error: 'Not found.'});
      }
      return;
    }

    const parts = segments(pathname);
    if (
      request.method === 'GET' &&
      parts[0] === 'media' &&
      parts[1] &&
      parts[2] &&
      parts[3] === 'final.mp4'
    ) {
      const run = await getRun(parts[1]);
      const submission = run.submissions.find((item) => item.id === parts[2]);
      if (!submission?.videoPath || !existsSync(submission.videoPath)) {
        json(response, 404, {error: 'Video not found.'});
        return;
      }
      await serveFile(request, response, submission.videoPath);
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      json(response, 405, {error: 'Method not allowed.'});
      return;
    }

    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const target = path.resolve(webRoot, relativePath);
    if (!target.startsWith(`${path.resolve(webRoot)}${path.sep}`) || !existsSync(target)) {
      await serveFile(request, response, path.join(webRoot, 'index.html'));
      return;
    }
    await serveFile(request, response, target);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      json(response, 400, {error: error instanceof Error ? error.message : String(error)});
    } else {
      response.end();
    }
  }
});

await initializeStorage();
server.listen(port, () => {
  console.log(`CUTS is running at http://localhost:${port}`);
});
