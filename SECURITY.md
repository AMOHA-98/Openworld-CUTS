# Dependency policy

CUTS deliberately keeps its Node dependency surface small.

## Rules

- Dependencies are installed only into this repository's local `node_modules/`.
- Exact versions are recorded in `package.json` and `package-lock.json`.
- Reinstalls use `npm ci`, which treats the lockfile as frozen.
- Package lifecycle scripts are disabled in `.npmrc` with `ignore-scripts=true`.
- CUTS does not use global npm installs or `npx`.
- New dependencies require an explicit reason and manual review.
- The browser interface uses plain HTML, CSS, and JavaScript.
- The server uses Node's built-in HTTP and filesystem modules.

## Intended external packages

Only Remotion's required runtime is allowed:

- `remotion`
- `@remotion/bundler`
- `@remotion/renderer`
- `react`
- `react-dom`

Run `npm run audit:prod` after dependency changes. An audit is useful evidence, not a guarantee that packages are safe.
