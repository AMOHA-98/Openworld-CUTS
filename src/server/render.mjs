import {createWriteStream, existsSync} from 'node:fs';
import {mkdir, readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {projectRoot} from './paths.mjs';
import {getRun, updateSubmission} from './storage.mjs';

const activeRenders = new Set();

const resolveBrowserExecutable = () => {
  if (process.env.CUTS_BROWSER_EXECUTABLE) {
    return process.env.CUTS_BROWSER_EXECUTABLE;
  }
  if (process.platform !== 'win32') return undefined;
  return [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find((candidate) => existsSync(candidate));
};

const containsStarterMarker = async (directory) => {
  const entries = await readdir(directory, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory() && (await containsStarterMarker(fullPath))) return true;
    if (entry.isFile() && /\.(tsx?|jsx?)$/i.test(entry.name)) {
      if ((await readFile(fullPath, 'utf8')).includes('CUTS_STARTER_NOT_EDITED')) {
        return true;
      }
    }
  }
  return false;
};

const appendLog = (stream, message) => {
  stream.write(`[${new Date().toISOString()}] ${message}\n`);
};

const percent = (progress) =>
  Math.round(progress <= 1 ? progress * 100 : progress);

const executeRender = async ({runId, submissionId, submission, entryPoint}) => {
  const key = `${runId}:${submissionId}`;
  const publicDir = path.join(submission.workspacePath, 'public');
  const outputDir = path.join(submission.workspacePath, 'output');
  const outputLocation = path.join(outputDir, 'final.mp4');
  const renderLogPath = path.join(outputDir, 'render.log');
  const browserExecutable = resolveBrowserExecutable();
  await mkdir(outputDir, {recursive: true});

  const log = createWriteStream(renderLogPath, {flags: 'w'});
  appendLog(log, `Bundling ${entryPoint}`);

  try {
    const serveUrl = await bundle({
      entryPoint,
      publicDir,
      rootDir: projectRoot,
      onProgress: (progress) => appendLog(log, `Bundle ${percent(progress)}%`),
    });
    appendLog(log, 'Selecting CutsEntry');
    const composition = await selectComposition({
      serveUrl,
      id: 'CutsEntry',
      inputProps: {},
      browserExecutable,
    });

    appendLog(log, `Rendering ${outputLocation}`);
    await renderMedia({
      codec: 'h264',
      composition,
      serveUrl,
      outputLocation,
      overwrite: true,
      inputProps: {},
      browserExecutable,
      onProgress: ({progress}) => appendLog(log, `Render ${percent(progress)}%`),
    });

    const renderedFile = await stat(outputLocation);
    if (renderedFile.size === 0) throw new Error('Remotion produced an empty file.');
    appendLog(log, `Complete (${renderedFile.size} bytes)`);
    await updateSubmission(runId, submissionId, {
      status: 'complete',
      videoPath: outputLocation,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendLog(log, `FAILED: ${message}`);
    await updateSubmission(runId, submissionId, {
      status: 'failed',
      failureMessage: message,
      completedAt: new Date().toISOString(),
    });
  } finally {
    log.end();
    activeRenders.delete(key);
  }
};

export const queueRender = async (runId, submissionId) => {
  const key = `${runId}:${submissionId}`;
  if (activeRenders.has(key)) throw new Error('This submission is already rendering.');

  const run = await getRun(runId);
  if (run.status !== 'preparing') {
    throw new Error('Renders are locked once judging begins.');
  }
  const submission = run.submissions.find((item) => item.id === submissionId);
  if (!submission) throw new Error('Submission not found.');

  const entryPoint = path.join(submission.workspacePath, 'src', 'index.tsx');
  await stat(entryPoint);
  if (await containsStarterMarker(path.join(submission.workspacePath, 'src'))) {
    throw new Error(
      'The workspace still contains CUTS_STARTER_NOT_EDITED. Let the model replace the starter edit first.',
    );
  }

  const renderLogPath = path.join(submission.workspacePath, 'output', 'render.log');
  activeRenders.add(key);
  await updateSubmission(runId, submissionId, {
    status: 'rendering',
    startedAt: new Date().toISOString(),
    completedAt: undefined,
    failureMessage: undefined,
    renderLogPath,
  });

  void executeRender({runId, submissionId, submission, entryPoint});
};
