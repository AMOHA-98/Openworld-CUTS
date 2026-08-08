import path from 'node:path';

export const projectRoot = process.cwd();
export const runsRoot = process.env.CUTS_RUNS_ROOT
  ? path.resolve(process.env.CUTS_RUNS_ROOT)
  : path.join(projectRoot, 'runs');
export const templateRoot = path.join(projectRoot, 'remotion-template');
export const webRoot = path.join(projectRoot, 'web');

const safeSegment = (value, label) => {
  if (!/^[a-zA-Z0-9-]+$/.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
};

export const runRoot = (runId) => path.join(runsRoot, safeSegment(runId, 'run ID'));
export const runFile = (runId) => path.join(runRoot(runId), 'run.json');
export const ratingsFile = (runId) => path.join(runRoot(runId), 'ratings.json');
export const submissionRoot = (runId, submissionId) =>
  path.join(runRoot(runId), 'submissions', safeSegment(submissionId, 'submission ID'));
export const workspaceRoot = (runId, submissionId) =>
  path.join(submissionRoot(runId, submissionId), 'workspace');

export const resolveWorkspacePath = (candidate) => {
  const resolved = path.resolve(candidate);
  const root = path.resolve(runsRoot);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Workspace must be inside the CUTS runs directory.');
  }
  if (path.basename(resolved).toLowerCase() !== 'workspace') {
    throw new Error('Expected a generated CUTS workspace directory.');
  }
  return resolved;
};
