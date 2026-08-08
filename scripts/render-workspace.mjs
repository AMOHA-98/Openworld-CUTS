import {stat} from 'node:fs/promises';
import {resolveWorkspacePath} from '../src/server/paths.mjs';
import {renderWorkspace} from '../src/server/render.mjs';

const [, , workspaceArgument] = process.argv;
if (!workspaceArgument) {
  throw new Error('Usage: npm.cmd run render:workspace -- "<workspace>"');
}

const workspacePath = resolveWorkspacePath(workspaceArgument);
await stat(workspacePath);

console.log(`Rendering ${workspacePath}`);
const result = await renderWorkspace({workspacePath});
console.log(`Created ${result.outputLocation} (${result.bytes} bytes)`);
console.log(`Log: ${result.renderLogPath}`);
