import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {validateRemoteUrl} from '../src/server/media-security.mjs';
import {projectRoot, resolveWorkspacePath} from '../src/server/paths.mjs';

const [, , workspaceArgument, urlArgument] = process.argv;
if (!workspaceArgument || !urlArgument) {
  throw new Error(
    'Usage: npm.cmd run media:acquire -- "<workspace>" "<youtube-or-platform-url>"',
  );
}

const workspace = resolveWorkspacePath(workspaceArgument);
const url = await validateRemoteUrl(urlArgument);
const executable = process.env.CUTS_YTDLP_PATH ?? path.join(projectRoot, 'tools', 'yt-dlp.exe');
if (!existsSync(executable)) {
  throw new Error(
    `yt-dlp was not found at ${executable}. Download the official standalone executable into tools/yt-dlp.exe or set CUTS_YTDLP_PATH.`,
  );
}

const assetsDirectory = path.join(workspace, 'public', 'assets');
await mkdir(assetsDirectory, {recursive: true});
const args = [
  '--ignore-config',
  '--no-playlist',
  '--no-overwrites',
  '--restrict-filenames',
  '--max-filesize',
  '750M',
  '--format',
  'b[ext=mp4]/b',
  '--paths',
  assetsDirectory,
  '--output',
  '%(id)s.%(ext)s',
  '--print',
  'after_move:filepath',
  url.href,
];

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(executable, args, {
    cwd: workspace,
    shell: false,
    stdio: 'inherit',
    windowsHide: true,
  });
  child.once('error', reject);
  child.once('exit', (code) => resolve(code ?? 1));
});
if (exitCode !== 0) {
  throw new Error(`yt-dlp exited with code ${exitCode}. No fallback or shell command was attempted.`);
}
