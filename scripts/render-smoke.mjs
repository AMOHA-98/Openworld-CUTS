import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

const temporaryRoot = await mkdtemp(path.join(process.cwd(), '.cuts-render-test-'));
process.env.CUTS_RUNS_ROOT = path.join(temporaryRoot, 'runs');

const storage = await import(`../src/server/storage.mjs?smoke=${Date.now()}`);
const {queueRender} = await import(`../src/server/render.mjs?smoke=${Date.now()}`);

try {
  const run = await storage.createRun({
    title: 'Render smoke',
    mode: 'guided',
    prompt: 'Make a minimal abstract motion study.',
    modelLabels: ['Fixture A', 'Fixture B'],
    durationSeconds: 5,
  });
  const submission = run.submissions[0];
  await writeFile(
    path.join(submission.workspacePath, 'src', 'Edit.tsx'),
    `import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

export const Edit: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 149], [-240, 240]);
  return (
    <AbsoluteFill style={{backgroundColor: '#090909', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: 280, height: 280, borderRadius: 999, backgroundColor: '#d8ff43', transform: \`translateX(\${x}px)\`}} />
    </AbsoluteFill>
  );
};
`,
    'utf8',
  );

  await queueRender(run.id, submission.id);
  const deadline = Date.now() + 120_000;
  let latest;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    latest = await storage.getRun(run.id);
    const status = latest.submissions[0].status;
    if (status === 'complete' || status === 'failed') break;
  }

  const rendered = latest?.submissions[0];
  assert.equal(rendered?.status, 'complete', rendered?.failureMessage);
  assert.ok(rendered.videoPath);
  console.log(`Remotion smoke render complete: ${rendered.videoPath}`);
} finally {
  await rm(temporaryRoot, {recursive: true, force: true});
}
