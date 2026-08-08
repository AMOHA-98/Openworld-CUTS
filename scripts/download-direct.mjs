import {createHash} from 'node:crypto';
import {createWriteStream} from 'node:fs';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {safeMediaFilename, validateRemoteUrl} from '../src/server/media-security.mjs';
import {resolveWorkspacePath} from '../src/server/paths.mjs';

const [, , workspaceArgument, urlArgument, filenameArgument] = process.argv;
if (!workspaceArgument || !urlArgument || !filenameArgument) {
  throw new Error(
    'Usage: npm.cmd run media:download -- "<workspace>" "<https-media-url>" "<filename.mp4>"',
  );
}

const workspace = resolveWorkspacePath(workspaceArgument);
const filename = safeMediaFilename(filenameArgument);
const assetsDirectory = path.join(workspace, 'public', 'assets');
const outputPath = path.join(assetsDirectory, filename);
const maximumBytes = Number(process.env.CUTS_MAX_DOWNLOAD_BYTES ?? 750 * 1024 * 1024);
const timeoutSignal = AbortSignal.timeout(5 * 60 * 1000);

await mkdir(assetsDirectory, {recursive: true});

let currentUrl = await validateRemoteUrl(urlArgument);
let response;
for (let redirect = 0; redirect <= 5; redirect += 1) {
  response = await fetch(currentUrl, {
    redirect: 'manual',
    signal: timeoutSignal,
    headers: {'User-Agent': 'CUTS/0.1 direct-media-downloader'},
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location) throw new Error('Media redirect did not include a destination.');
    currentUrl = await validateRemoteUrl(new URL(location, currentUrl).href);
    continue;
  }
  break;
}

if (!response || response.status >= 300) {
  throw new Error(`Media download failed with HTTP ${response?.status ?? 'unknown'}.`);
}
if (!response.ok || !response.body) {
  throw new Error(`Media download failed with HTTP ${response.status}.`);
}

const contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? '';
if (
  contentType &&
  !contentType.startsWith('video/') &&
  !contentType.startsWith('audio/') &&
  !contentType.startsWith('image/') &&
  contentType !== 'application/octet-stream'
) {
  throw new Error(`Refusing unexpected content type: ${contentType}`);
}
const declaredBytes = Number(response.headers.get('content-length') ?? 0);
if (declaredBytes > maximumBytes) {
  throw new Error(`Media is larger than the ${Math.floor(maximumBytes / 1024 / 1024)} MB limit.`);
}

let downloadedBytes = 0;
const hash = createHash('sha256');
const limiter = new Transform({
  transform(chunk, _encoding, callback) {
    downloadedBytes += chunk.length;
    if (downloadedBytes > maximumBytes) {
      callback(new Error(`Media exceeded the ${Math.floor(maximumBytes / 1024 / 1024)} MB limit.`));
      return;
    }
    hash.update(chunk);
    callback(null, chunk);
  },
});

try {
  await pipeline(Readable.fromWeb(response.body), limiter, createWriteStream(outputPath, {flags: 'wx'}));
  const metadata = {
    originalUrl: urlArgument,
    finalUrl: currentUrl.href,
    filename,
    contentType,
    bytes: downloadedBytes,
    sha256: hash.digest('hex'),
    downloadedAt: new Date().toISOString(),
  };
  await writeFile(`${outputPath}.source.json`, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  console.log(`Downloaded ${downloadedBytes} bytes to ${outputPath}`);
  console.log(`SHA-256 ${metadata.sha256}`);
} catch (error) {
  await rm(outputPath, {force: true});
  throw error;
}
