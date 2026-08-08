import {randomUUID} from 'node:crypto';
import {cp, mkdir, open, readFile, readdir, rename, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {
  ratingsFile,
  projectRoot,
  runFile,
  runRoot,
  runsRoot,
  templateRoot,
  workspaceRoot,
} from './paths.mjs';

export const DEFAULT_FREE_CHOICE_PROMPT =
  'Make a compelling 15-30 second vertical edit. You decide what it is about, what feeling it should evoke, and what footage, music, and style to use.';

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42) || 'cuts-run';

const shuffle = (input) => {
  const output = [...input];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
};

const noFallback = Symbol('no-fallback');

export const readJson = async (filePath, fallback = noFallback) => {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (fallback !== noFallback && error.code === 'ENOENT') return fallback;
    throw error;
  }
};

export const writeJson = async (filePath, value) => {
  await mkdir(path.dirname(filePath), {recursive: true});
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
};

const taskMarkdown = (run, modelLabel, submissionWorkspace) => `# CUTS task

You are creating one entry for CUTS. Your entry is identified privately as **${modelLabel}**, but the finished edit will be judged anonymously.

## Prompt

${run.prompt}

## Your job

Make every creative decision yourself. ${
  run.mode === 'free-choice'
    ? 'Choose the subject, concept, footage, music, mood, and style.'
    : 'Interpret the guided prompt in your own way and choose all footage, music, mood, and stylistic decisions yourself.'
}

Search for and download the audiovisual material you want. Put local media inside \`public/assets/\`. Build the edit in Remotion by replacing \`src/Edit.tsx\` and removing the \`CUTS_STARTER_NOT_EDITED\` marker.

The registered composition must remain named \`CutsEntry\`. Preview or render as often as you need; CUTS will also render the composition after Ahmed marks this workspace ready.

## Local helper commands

Run these from PowerShell. They are intentionally narrow and do not install packages or invoke an LLM.

Direct media file URL:

\`\`\`powershell
npm.cmd --prefix "${projectRoot}" run media:download -- "${submissionWorkspace}" "https://example.com/clip.mp4" "clip.mp4"
\`\`\`

For a YouTube or other supported page URL, CUTS can use an optional manually supplied \`tools/yt-dlp.exe\`:

\`\`\`powershell
npm.cmd --prefix "${projectRoot}" run media:acquire -- "${submissionWorkspace}" "https://example.com/watch-page"
\`\`\`

Render your current composition to \`output/final.mp4\`:

\`\`\`powershell
npm.cmd --prefix "${projectRoot}" run render:workspace -- "${submissionWorkspace}"
\`\`\`

Only download media files. Do not download or execute scripts, packages, browser extensions, or binaries. Record the original page or media URLs in \`output/submission.json\`.

## Output contract

- ${run.settings.width}x${run.settings.height}
- ${run.settings.fps} fps
- ${run.settings.durationSeconds} seconds
- Remotion composition ID: \`CutsEntry\`
- Keep all required media inside this workspace

Optionally write \`output/submission.json\`:

\`\`\`json
{
  "title": "Your title",
  "description": "What you were going for",
  "compositionId": "CutsEntry",
  "sources": [
    {"url": "https://source.example/video", "localFile": "public/assets/video.mp4", "type": "video"}
  ]
}
\`\`\`

Do not use an LLM to judge the edit. Do not ask for reference edits or human curation. The creative work is yours; Ahmed will watch and rate the result.
`;

export const initializeStorage = async () => {
  await mkdir(runsRoot, {recursive: true});
};

export const createRun = async (input) => {
  const modelLabels = (input.modelLabels ?? []).map((label) => label.trim()).filter(Boolean);
  if (modelLabels.length < 2) throw new Error('Add at least two models.');

  const title = input.title?.trim() || 'Untitled CUTS';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const id = `${timestamp}-${slugify(title)}-${randomUUID().slice(0, 6)}`;
  const submissionIds = modelLabels.map(() => randomUUID());
  const shuffledIds = shuffle(submissionIds);
  const labelById = new Map(
    shuffledIds.map((submissionId, index) => [
      submissionId,
      `Cut ${String.fromCharCode(65 + index)}`,
    ]),
  );

  const submissions = modelLabels.map((modelLabel, index) => {
    const submissionId = submissionIds[index];
    return {
      id: submissionId,
      runId: id,
      anonymousLabel: labelById.get(submissionId) ?? `Cut ${index + 1}`,
      modelLabel,
      status: 'waiting-for-model',
      workspacePath: workspaceRoot(id, submissionId),
    };
  });

  const mode = input.mode === 'guided' ? 'guided' : 'free-choice';
  const prompt =
    mode === 'free-choice'
      ? input.prompt?.trim() || DEFAULT_FREE_CHOICE_PROMPT
      : input.prompt?.trim();
  if (!prompt) throw new Error('A guided run needs a prompt.');

  const run = {
    id,
    title,
    mode,
    prompt,
    status: 'preparing',
    createdAt: new Date().toISOString(),
    settings: {
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: Math.min(60, Math.max(5, Number(input.durationSeconds) || 20)),
    },
    judgeOrder: [],
    submissions,
  };

  await mkdir(runRoot(id), {recursive: true});
  await writeJson(runFile(id), run);
  await writeJson(ratingsFile(id), []);

  await Promise.all(
    submissions.map(async (submission) => {
      await cp(templateRoot, submission.workspacePath, {recursive: true});
      await writeJson(
        path.join(submission.workspacePath, 'cuts-settings.json'),
        run.settings,
      );
      await writeFile(
        path.join(submission.workspacePath, 'CUTS_TASK.md'),
        taskMarkdown(run, submission.modelLabel, submission.workspacePath),
        'utf8',
      );
    }),
  );

  return run;
};

export const getRun = (runId) => readJson(runFile(runId));
export const saveRun = (run) => writeJson(runFile(run.id), run);
export const getRatings = (runId) => readJson(ratingsFile(runId), []);

export const saveRating = async (runId, rating) => {
  const run = await getRun(runId);
  if (run.status !== 'judging') throw new Error('Ratings are locked right now.');
  if (!run.judgeOrder.includes(rating.submissionId)) {
    throw new Error('That submission is not part of this judging round.');
  }
  if (!Number.isInteger(rating.overall) || rating.overall < 1 || rating.overall > 10) {
    throw new Error('Overall rating must be an integer from 1 to 10.');
  }

  const ratings = await getRatings(runId);
  const nextRatings = ratings.filter(
    (existing) => existing.submissionId !== rating.submissionId,
  );
  nextRatings.push(rating);
  await writeJson(ratingsFile(runId), nextRatings);
  return nextRatings;
};

export const listRuns = async () => {
  await initializeStorage();
  const entries = await readdir(runsRoot, {withFileTypes: true});
  const records = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          const run = await getRun(entry.name);
          return {
            id: run.id,
            title: run.title,
            mode: run.mode,
            status: run.status,
            createdAt: run.createdAt,
            submissionCount: run.submissions.length,
            completedCount: run.submissions.filter(
              (submission) => submission.status === 'complete',
            ).length,
          };
        } catch {
          return null;
        }
      }),
  );
  return records.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const readManifest = async (submission) => {
  try {
    return await readJson(path.join(submission.workspacePath, 'output', 'submission.json'), null);
  } catch (error) {
    return {error: `Could not read submission.json: ${error.message}`};
  }
};

const readLogTail = async (filePath, maximumBytes = 100_000) => {
  if (!filePath) return null;
  let handle;
  try {
    const file = await stat(filePath);
    const bytesToRead = Math.min(file.size, maximumBytes);
    const buffer = Buffer.alloc(bytesToRead);
    handle = await open(filePath, 'r');
    await handle.read(buffer, 0, bytesToRead, file.size - bytesToRead);
    const prefix = file.size > maximumBytes ? '[Earlier log output omitted]\n' : '';
    return `${prefix}${buffer.toString('utf8')}`;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    return `Could not read render log: ${error.message}`;
  } finally {
    await handle?.close();
  }
};

export const getPublicRun = async (runId) => {
  const run = await getRun(runId);
  const ratings = await getRatings(runId);
  const revealIdentity = run.status !== 'judging';
  const revealArtifacts = run.status === 'judged';

  const submissions = await Promise.all(
    run.submissions.map(async (submission) => {
      const manifest = revealArtifacts ? await readManifest(submission) : undefined;
      const renderLog = revealArtifacts
        ? await readLogTail(submission.renderLogPath)
        : undefined;
      return {
        id: submission.id,
        runId: submission.runId,
        anonymousLabel: submission.anonymousLabel,
        status: submission.status,
        workspacePath: revealIdentity ? submission.workspacePath : '',
        videoPath: revealArtifacts ? submission.videoPath : undefined,
        renderLogPath: revealArtifacts ? submission.renderLogPath : undefined,
        renderLog,
        startedAt: submission.startedAt,
        completedAt: submission.completedAt,
        failureMessage: revealIdentity ? submission.failureMessage : undefined,
        modelLabel: revealIdentity ? submission.modelLabel : undefined,
        videoUrl:
          submission.status === 'complete'
            ? `/media/${encodeURIComponent(run.id)}/${encodeURIComponent(submission.id)}/final.mp4`
            : undefined,
        manifest,
      };
    }),
  );

  const orderedSubmissions =
    run.status === 'judging'
      ? run.judgeOrder.map((id) => submissions.find((item) => item.id === id)).filter(Boolean)
      : submissions;

  return {...run, submissions: orderedSubmissions, ratings};
};

export const beginJudging = async (runId) => {
  const run = await getRun(runId);
  if (run.status !== 'preparing') throw new Error('Judging has already started.');
  const completedIds = run.submissions
    .filter((submission) => submission.status === 'complete')
    .map((submission) => submission.id);
  if (completedIds.length < 2) throw new Error('Render at least two edits first.');
  run.judgeOrder = shuffle(completedIds);
  run.status = 'judging';
  await saveRun(run);
  return getPublicRun(runId);
};

export const revealRun = async (runId) => {
  const run = await getRun(runId);
  if (run.status !== 'judging') throw new Error('This run is not being judged.');
  const ratings = await getRatings(runId);
  const ratedIds = new Set(ratings.map((rating) => rating.submissionId));
  if (run.judgeOrder.some((id) => !ratedIds.has(id))) {
    throw new Error('Rate every edit before revealing the models.');
  }
  run.status = 'judged';
  await saveRun(run);
  return getPublicRun(runId);
};

export const updateSubmission = async (runId, submissionId, update) => {
  const run = await getRun(runId);
  const submission = run.submissions.find((item) => item.id === submissionId);
  if (!submission) throw new Error('Submission not found.');
  Object.assign(submission, update);
  await saveRun(run);
  return submission;
};
