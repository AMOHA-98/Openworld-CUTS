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
- Direct media downloads use Node's built-in `fetch`; no downloader package is installed.

## Intended external packages

Only Remotion's required runtime is allowed:

- `remotion`
- `@remotion/bundler`
- `@remotion/renderer`
- `react`
- `react-dom`

Run `npm run audit:prod` after dependency changes. An audit is useful evidence, not a guarantee that packages are safe.

## Optional platform acquisition tool

Platform page URLs may be handled by a manually supplied standalone `yt-dlp` executable. It is not an npm dependency, is never installed automatically, and is gitignored. Obtain it only from the official project, verify the release and file yourself, and place it at `tools/yt-dlp.exe` or set `CUTS_YTDLP_PATH`.

The CUTS wrapper starts the executable directly without a shell, ignores external configuration, disables playlists, applies a 750 MB size cap, and requests a self-contained file so no separate FFmpeg installation is needed. This reduces exposure; it does not make arbitrary downloads trustworthy.

## Media boundaries

- Acquisition commands only accept generated workspace paths under `runs/`.
- The direct downloader requires HTTPS, blocks DNS results in private/local/reserved ranges, checks content type and extension, refuses overwrite, and records a SHA-256 digest.
- Models are instructed never to download or execute code, packages, extensions, or binaries.
- Remotion compositions are still model-authored code. Run CUTS only on a machine and account where you are comfortable executing that code, and inspect unfamiliar changes when appropriate.
- Copyright, license, privacy, and platform terms remain the user's responsibility.
