# CUTS

> An LLM edit battle, judged by Ahmed.

## 1. Summary

CUTS is a local weekend project that gives multiple LLM coding agents an editing prompt and lets each agent make an edit from scratch. A run can be completely open-ended or guided toward a particular subject or idea.

Each model is responsible for the whole creative process: interpreting the prompt, forming a concept, searching for footage and music, downloading the material it wants, selecting moments, writing a Remotion composition, and rendering the finished video. In a free-choice run, GPT might choose Spider-Man while Claude chooses an F-35. In a guided run, both might edit Paul Atreides but arrive at completely different source material, music, moods, and cuts.

The completed edits are shown anonymously in a simple judging interface. Ahmed watches and rates them, then reveals which model made each one.

CUTS is an experiment and a toy, not a formal benchmark or publishing platform.

## 2. Core Experience

1. Ahmed creates a CUTS run and names the competing models.
2. Ahmed chooses free-choice or guided mode and writes or accepts the run prompt.
3. Every model receives the same prompt for that run.
4. CUTS creates an independent Remotion workspace and task file for each model.
5. Each model searches the web and chooses its own source material.
6. Each model creates and renders an edit with Remotion.
7. CUTS collects the successful videos and hides their model identities.
8. Ahmed watches the edits in a randomized order and rates them.
9. Once judging is complete, CUTS reveals the models and results.

### Free-choice mode

The models choose the subject, meaning, material, and style.

Default prompt:

> Make a compelling 15-30 second vertical edit. You decide what it is about, what feeling it should evoke, and what footage, music, and style to use.

### Guided mode

The prompt supplies a subject, theme, emotion, or creative constraint while leaving sourcing and execution entirely to the models.

Example prompt:

> Make a 20-second vertical edit that makes Paul Atreides feel like a tragic religious figure. Find your own footage and music. Prioritize emotion and rhythm over exposition.

Guided mode must not provide clips, music, timecodes, shot lists, reference edits, or implementation instructions.

## 3. Principles

### Models make every creative decision

There are no human editors, human curators, reference timelines, or preselected source bins. The models choose what to make and how to make it.

### Ahmed is the only judge

CUTS does not use an LLM judge, aesthetic model, engagement predictor, or automatic taste score. Automated checks may confirm that a file exists, plays correctly, and satisfies basic format constraints, but they never decide whether an edit is good.

### The process stays open-ended

Free-choice runs let models choose their own subjects as well as their concepts, sources, songs, editing styles, and technical approaches. Guided runs constrain only what the prompt explicitly asks for. In both modes, CUTS avoids preselecting cultural material or forcing submissions through a restrictive edit template.

### Judging stays blind

Model names, logs, code, and source choices remain hidden until Ahmed finishes rating every successful submission in a run.

### Everything stays local

CUTS does not publish or upload edits. It stores source material, code, renders, and ratings locally.

## 4. MVP Scope

The first version supports:

- One local user
- Free-choice and guided run modes
- Two or more manually managed model submissions
- Independent workspaces for each model
- A generated task file that Ahmed gives to each model
- Arbitrary Remotion/React compositions
- Local MP4 rendering
- Anonymous randomized playback
- A required overall rating and optional detailed ratings
- Optional private notes
- Model reveal and final ranking
- A saved record of prompts, artifacts, failures, and results

## 5. Explicit Non-Goals

CUTS v0 does not need:

- Formal benchmark methodology
- Academic metrics or statistical significance
- LLM-based judging
- Professional editor baselines
- Human-curated footage
- Social-media posting or engagement tracking
- Accounts, authentication, or collaboration
- A public leaderboard
- Cloud rendering
- A general-purpose nonlinear video editor UI
- Automatic copyright clearance
- Model APIs, provider SDKs, or coding-agent CLI integrations

## 6. Manual Model Workflow

CUTS never launches or controls an LLM. Ahmed chooses and runs each model himself, then points that model at the workspace CUTS created for it.

Each generated workspace contains:

- A `CUTS_TASK.md` containing the run prompt and output contract
- Output requirements
- The CUTS Remotion starter project
- Empty local media and output directories

Ahmed may use any model, interface, browser, or coding environment he wants. Those tools are outside CUTS and require no provider-specific integration.

The model is instructed to:

1. Interpret the prompt and form its own creative direction.
2. In free-choice mode, choose the subject without suggestions from CUTS.
3. In guided mode, follow the requested subject or idea while making every sourcing and creative decision itself.
4. Search for audiovisual source material.
5. Download the clips, images, music, and sound it wants to use.
6. Inspect the material and identify useful time ranges.
7. Implement the edit as a Remotion composition.
8. Render the final MP4.
9. Write a small manifest describing the result and its sources.

CUTS does not repair a model's composition or finish an incomplete edit on its behalf. Ahmed tells CUTS when a workspace is ready, and CUTS invokes Remotion to render it. A failed render remains visible as a failed submission.

### Acquisition helpers

CUTS provides two deliberately narrow local commands without choosing any material for the model:

- A zero-dependency direct HTTPS media downloader built on Node's standard library
- An optional wrapper around a manually supplied official `yt-dlp` standalone executable for supported platform page URLs

Neither helper searches for material, makes creative choices, invokes an LLM, installs packages, or publishes anything. The model must decide what it wants, supply each source URL, and record that source in its submission manifest.

### Iterative rendering

Each generated task file includes a command that renders its workspace to `output/final.mp4` with the same Remotion pipeline as the CUTS web app. This lets a model inspect failures and iterate autonomously before Ahmed begins judging. The web app's Render button remains the final convenient handoff.

## 7. Remotion Contract

Models may edit the supplied Remotion project freely. React code is the source of truth for the finished edit.

Every submission must expose a composition with the configured composition ID and render to:

```text
output/final.mp4
```

Default output settings:

```text
Resolution: 1080x1920
Frame rate: 30 fps
Duration: 15-30 seconds
Video: H.264 MP4
Audio: AAC
```

The starter project should provide useful primitives without prescribing an aesthetic:

- Video and audio placement
- Clip trimming
- Sequences
- Cropping and vertical-video fitting
- Volume envelopes
- Playback-rate changes
- Basic transitions
- Text and captions
- Color and transform helpers

Models may ignore these helpers and write their own components.

## 8. Submission Manifest

Each model writes `output/submission.json`:

```json
{
  "title": "The Burden of Prophecy",
  "description": "A tragic, escalating portrait built around silence and crowd imagery.",
  "compositionId": "CutsEntry",
  "sources": [
    {
      "url": "https://example.com/source-video",
      "localFile": "assets/source-video.mp4",
      "type": "video"
    }
  ]
}
```

Only `compositionId` and a playable `output/final.mp4` are required for judging. Missing descriptive metadata should not disqualify an otherwise successful edit.

## 9. Judging Experience

The judging screen shows one anonymous video at a time in a clean, distraction-free player.

Visible information:

- Anonymous label such as `Cut A`
- The neutral CUTS task and output constraints
- Video player with replay and scrubbing
- Rating controls
- Optional notes field

Hidden information:

- Model name
- Model provider
- Source manifest
- Search history
- Remotion code
- Execution time and cost

### Ratings

The only required rating is:

- **Overall:** 1-10

Optional expanded ratings:

- Clip selection
- Flow and cut timing
- Music and sound
- Emotional impact
- Originality

Ahmed can replay or revise ratings until pressing **Reveal results**. CUTS then locks the ratings and displays each model's identity, score, video, manifest, and workspace artifacts.

## 10. Results

The results screen ranks successful edits by Ahmed's overall score.

It displays:

- Rank
- Model name
- Overall and optional category ratings
- Ahmed's notes
- Final video
- Source list
- Model-written description
- Link to the local Remotion project
- Run duration and status

Failed submissions appear below successful submissions with their failure stage and final error message.

## 11. Suggested Project Structure

```text
cuts/
  web/                     # Plain browser run manager, judge, and results UI
  src/server/              # Local Node HTTP server and Remotion renderer
  remotion-template/       # Starter copied into every model workspace
  runs/
    <run-id>/
      run.json
      ratings.json
      submissions/
        <submission-id>/
          private.json     # Model identity; never sent to judging view
          workspace/       # Model's complete working directory
          output/
            final.mp4
            submission.json
            render.log
```

## 12. Minimal Data Model

### Run

```ts
type Run = {
  id: string;
  title: string;
  mode: 'free-choice' | 'guided';
  prompt: string;
  modelIds: string[];
  status: 'draft' | 'running' | 'ready-to-judge' | 'judged';
  createdAt: string;
  settings: {
    width: number;
    height: number;
    fps: number;
  };
};
```

### Submission

```ts
type Submission = {
  id: string;
  runId: string;
  anonymousLabel: string;
  modelId: string;
  status: 'waiting-for-model' | 'ready-to-render' | 'rendering' | 'complete' | 'failed';
  videoPath?: string;
  workspacePath: string;
  startedAt?: string;
  completedAt?: string;
  failureStage?: string;
  failureMessage?: string;
};
```

### Rating

```ts
type Rating = {
  submissionId: string;
  overall: number;
  clipSelection?: number;
  flow?: number;
  musicAndSound?: number;
  emotionalImpact?: number;
  originality?: number;
  notes?: string;
};
```

## 13. Safety and Operational Limits

Because models may add downloaded media and code to their workspaces, CUTS should:

- Keep every model in a separate workspace
- Restrict downloaded media to expected file types
- Refuse to execute downloaded scripts or binaries
- Preserve render logs
- Render only from the model's assigned workspace
- Never upload or publish automatically
- Never request, store, or expose provider credentials

The CUTS control app uses only Node's standard library. Its only external packages are Remotion's bundler and renderer plus Remotion's required React runtime. Dependencies are pinned exactly, installed locally from a committed lockfile, and installed with lifecycle scripts disabled.

CUTS is intended for private experimentation. Source availability does not imply permission to redistribute or publicly post the resulting edit.

## 14. MVP Acceptance Criteria

CUTS v0 is complete when Ahmed can:

1. Create either a free-choice or guided run with at least two models.
2. Generate a separate task file and Remotion workspace for every named model.
3. Let Ahmed run each model manually in its assigned workspace.
4. Render each completed workspace through Remotion without manually fixing it.
5. Watch the videos without seeing model identities.
6. Give each video an overall 1-10 rating.
7. Reveal the models and see the ranked results.
8. Open every model's sources, code, logs, and final video afterward.

## 15. Later, If It Is Fun

Possible additions—not requirements for the weekend build:

- Head-to-head tournament mode
- Side-by-side synchronized playback
- Cost and completion-time comparisons
- A “guess the model” field before reveal
- Exportable highlight reel of the competing edits
- Rematches with the same prompt and fresh model context
- Theme nights such as anime, directors, athletes, villains, or political mythology
