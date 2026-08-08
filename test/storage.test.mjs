import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('creates isolated workspaces and keeps identities hidden while judging', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'cuts-test-'));
  process.env.CUTS_RUNS_ROOT = temporaryRoot;

  const storage = await import(`../src/server/storage.mjs?test=${Date.now()}`);
  try {
    const run = await storage.createRun({
      title: 'Test round',
      mode: 'free-choice',
      prompt: '',
      modelLabels: ['GPT', 'Claude'],
      durationSeconds: 12,
    });

    assert.equal(run.submissions.length, 2);
    assert.equal(run.settings.durationSeconds, 12);
    for (const submission of run.submissions) {
      const task = await readFile(
        path.join(submission.workspacePath, 'CUTS_TASK.md'),
        'utf8',
      );
      assert.match(task, /Make a compelling/);
      assert.match(task, new RegExp(submission.modelLabel));
      assert.match(task, /media:download/);
      assert.match(task, /render:workspace/);
      assert.match(task, new RegExp(submission.workspacePath.replaceAll('\\', '\\\\')));
    }

    for (const submission of run.submissions) {
      const renderLogPath = path.join(submission.workspacePath, 'output', 'render.log');
      await writeFile(renderLogPath, 'render complete\n', 'utf8');
      await writeFile(
        path.join(submission.workspacePath, 'output', 'submission.json'),
        `${JSON.stringify({title: `${submission.modelLabel} cut`, sources: [{url: 'https://example.com/source'}]})}\n`,
        'utf8',
      );
      await storage.updateSubmission(run.id, submission.id, {
        status: 'complete',
        videoPath: path.join(submission.workspacePath, 'output', 'final.mp4'),
        renderLogPath,
      });
    }

    await storage.beginJudging(run.id);
    const blind = await storage.getPublicRun(run.id);
    assert.equal(blind.status, 'judging');
    assert.equal(blind.submissions.length, 2);
    assert.ok(blind.submissions.every((submission) => submission.modelLabel === undefined));
    assert.ok(blind.submissions.every((submission) => submission.manifest === undefined));
    assert.ok(blind.submissions.every((submission) => submission.renderLog === undefined));

    for (const submission of blind.submissions) {
      await storage.saveRating(run.id, {
        submissionId: submission.id,
        overall: 8,
      });
    }

    const revealed = await storage.revealRun(run.id);
    assert.equal(revealed.status, 'judged');
    assert.deepEqual(
      new Set(revealed.submissions.map((submission) => submission.modelLabel)),
      new Set(['GPT', 'Claude']),
    );
    assert.ok(revealed.submissions.every((submission) => submission.manifest?.sources?.length === 1));
    assert.ok(revealed.submissions.every((submission) => submission.renderLog === 'render complete\n'));
  } finally {
    await rm(temporaryRoot, {recursive: true, force: true});
    delete process.env.CUTS_RUNS_ROOT;
  }
});
