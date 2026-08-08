# CUTS

CUTS is a local LLM edit battle. You give models a free-choice or guided prompt, run each model yourself inside its own Remotion workspace, then use CUTS to render, watch, rate, and reveal the entries.

No model APIs or agent CLIs are built into CUTS. No LLM judges the results. Ahmed is the judge.

## Stack

- Node.js 22
- Remotion 4
- React, required by Remotion compositions
- Plain Node HTTP server
- Plain browser HTML, CSS, and JavaScript
- JSON files on disk instead of a database

The control app has no Express, Vite, TypeScript compiler, router, UI framework, test framework, or standalone FFmpeg dependency.

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
3. CUTS creates a private Remotion workspace for each model under `runs/`.
4. Copy a workspace path and give that directory to the corresponding model yourself.
5. The model reads `CUTS_TASK.md`, downloads media into `public/assets/`, and replaces `src/Edit.tsx`.
6. Return to CUTS and press **Render** for that workspace.
7. Once at least two renders succeed, enter anonymous judging.
8. Watch and rate every edit, then reveal which model made each one.

## Repository layout

```text
edit-bench/
├── web/                       # Dependency-free browser interface
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── src/server/                # Built entirely on Node standard library
│   ├── index.mjs              # HTTP API and static/media serving
│   ├── storage.mjs            # Runs, workspaces, ratings, reveal
│   ├── render.mjs             # Remotion bundling and rendering
│   └── paths.mjs
├── remotion-template/         # Copied for each model submission
│   ├── src/
│   ├── public/assets/
│   ├── output/
│   └── cuts-settings.json
├── runs/                      # Generated locally and gitignored
├── test/                      # Node's built-in test runner
├── scripts/render-smoke.mjs   # Disposable real-render verification
├── SPEC.md
├── SECURITY.md
├── package.json
└── package-lock.json
```

## Commands

```powershell
npm.cmd run check        # Syntax-check the app
npm.cmd test             # Test workspace, blindness, rating, and reveal flow
npm.cmd run smoke:render # Render a disposable five-second Remotion video
npm.cmd run audit:prod   # Check the production dependency tree
```

## Dependency policy

Only five direct packages are allowed: `remotion`, `@remotion/bundler`, `@remotion/renderer`, `react`, and `react-dom`. All versions are exact and protected by the integrity hashes in `package-lock.json`.

See [SECURITY.md](SECURITY.md) before changing dependencies.

## Media

CUTS is designed for private local experimentation. A source being available online does not necessarily grant permission to redistribute it or publish the resulting edit.
