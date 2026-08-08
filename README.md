# CUTS

CUTS is a local LLM edit battle. You give models a free-choice or guided prompt, run each model yourself inside its own Remotion workspace, then use CUTS to render, watch, rate, and reveal the entries.

No model APIs or agent CLIs are built into CUTS. No LLM judges the results. Ahmed is the judge.

## Stack

- Node.js 22
- Remotion 4 and its required React runtime
- Plain Node HTTP server
- Plain browser HTML, CSS, and JavaScript
- JSON files on disk instead of a database

The control app has no Express, Vite, TypeScript compiler, router, UI framework, test framework, or separately installed FFmpeg dependency.

## Install

Use Node 22 and install only from the committed lockfile:

```powershell
npm.cmd ci
```

The repository's `.npmrc` disables dependency lifecycle scripts and uses a repository-local npm cache. Dependencies go into the local `node_modules/`; nothing is installed globally.

## Run

```powershell
npm.cmd start
```

Open [http://localhost:4173](http://localhost:4173).

## Workflow

1. Create a free-choice or guided round.
2. Enter the names of at least two models.
3. CUTS creates a private Remotion workspace and `CUTS_TASK.md` for each model under `runs/`.
4. Copy a workspace path and give that directory to the corresponding model yourself.
5. The model chooses and acquires media, records its sources, and replaces `src/Edit.tsx`.
6. The model can render repeatedly with the workspace command. You can also press **Render** in CUTS.
7. Once at least two renders succeed, enter anonymous judging.
8. Watch and rate every edit, reveal the models, then inspect each source manifest, workspace, and render log.

## Media acquisition

For a direct HTTPS URL ending in a supported media filename, use the zero-dependency Node downloader:

```powershell
npm.cmd run media:download -- "C:\full\path\to\workspace" "https://example.com/clip.mp4" "clip.mp4"
```

It only writes expected media extensions inside that workspace's `public/assets/`, blocks local/private network destinations, limits downloads to 750 MB, refuses overwrite, and saves URL/hash metadata beside the file.

For YouTube and other platform page URLs, CUTS has a narrow wrapper around the optional official standalone `yt-dlp` executable. CUTS never downloads or installs it. Put a reviewed copy at `tools/yt-dlp.exe` as described in [tools/README.md](tools/README.md), then run:

```powershell
npm.cmd run media:acquire -- "C:\full\path\to\workspace" "https://www.youtube.com/watch?v=..."
```

The wrapper disables user configuration and playlists, restricts filenames, applies a size limit, requests one self-contained MP4 where possible, and does not invoke a shell or FFmpeg. Only download material you are allowed to use.

## Render a workspace

Models can verify their work without using the web interface:

```powershell
npm.cmd run render:workspace -- "C:\full\path\to\workspace"
```

This uses the same Remotion renderer as CUTS and writes `output/final.mp4` plus `output/render.log`. It accepts only workspaces generated inside the local `runs/` directory.

## Repository layout

```text
edit-bench/
|-- web/                       # Dependency-free browser interface
|-- src/server/                # Node server, storage, security, renderer
|-- scripts/                   # Acquisition, workspace render, smoke render
|-- tools/                     # Instructions; optional binaries are gitignored
|-- remotion-template/         # Copied into every model workspace
|-- runs/                      # Generated locally and gitignored
|-- test/                      # Node's built-in test runner
|-- SPEC.md
|-- SECURITY.md
|-- package.json
`-- package-lock.json
```

The Remotion template belongs in the repository because it is the seed copied into every new model workspace. Models are free to replace its starter component completely.

## Commands

```powershell
npm.cmd run check             # Syntax-check every executable source file
npm.cmd test                  # Test storage, blindness, reveal, and media guards
npm.cmd run smoke:render      # Make a disposable real five-second video
npm.cmd run render:workspace -- "<workspace>"
npm.cmd run media:download -- "<workspace>" "<direct URL>" "<filename>"
npm.cmd run media:acquire -- "<workspace>" "<platform URL>"
npm.cmd run audit:prod        # Check the production dependency tree
```

## Dependency policy

Only five direct npm packages are allowed: `remotion`, `@remotion/bundler`, `@remotion/renderer`, `react`, and `react-dom`. All versions are exact and protected by integrity hashes in `package-lock.json`.

See [SECURITY.md](SECURITY.md) before changing dependencies.

## Media and publishing

CUTS is designed for private local experimentation. A source being available online does not necessarily grant permission to download, reuse, redistribute, or publish it. CUTS never posts edits anywhere.
