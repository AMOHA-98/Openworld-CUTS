const app = document.querySelector('#app');
const toastElement = document.querySelector('#toast');
const DEFAULT_PROMPT = 'Make a compelling 15-30 second vertical edit. You decide what it is about, what feeling it should evoke, and what footage, music, and style to use.';

let pollTimer;
let judgeIndex = 0;

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const toast = (message, bad = false) => {
  toastElement.textContent = message;
  toastElement.className = `toast show${bad ? ' bad' : ''}`;
  setTimeout(() => (toastElement.className = 'toast'), 2800);
};

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {'Content-Type': 'application/json', ...(options.headers ?? {})},
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? 'Something went wrong.');
  return value;
};

const route = () => {
  clearTimeout(pollTimer);
  const match = /^#\/runs\/([^/]+)$/.exec(location.hash);
  if (match) renderRun(decodeURIComponent(match[1]));
  else renderDashboard();
};

const renderDashboard = async () => {
  const runs = await api('/api/runs');
  app.innerHTML = `
    <section class="hero">
      <div>
        <div class="eyebrow">Human taste · machine cuts</div>
        <h1>CUTS</h1>
        <p class="lede">Give models a blank canvas or a guided idea. Let them find their own material, make their own Remotion edits, then watch everything blind.</p>
      </div>
      <form id="create-run" class="panel form-grid">
        <div class="field">
          <label for="title">Round name</label>
          <input id="title" name="title" value="Weekend one" required />
        </div>
        <div class="field">
          <label>Mode</label>
          <div class="mode-switch">
            <label><input type="radio" name="mode" value="free-choice" checked /><span>Free choice</span></label>
            <label><input type="radio" name="mode" value="guided" /><span>Guided</span></label>
          </div>
        </div>
        <div class="field">
          <label for="prompt">Prompt</label>
          <textarea id="prompt" name="prompt">${escapeHtml(DEFAULT_PROMPT)}</textarea>
        </div>
        <div class="field">
          <label for="models">Models · one per line</label>
          <textarea id="models" name="models" placeholder="GPT\nClaude\nGemini" required></textarea>
        </div>
        <div class="field">
          <label for="duration">Duration in seconds</label>
          <input id="duration" name="duration" type="number" min="5" max="60" value="20" />
        </div>
        <button class="button" type="submit">Create workspaces →</button>
      </form>
    </section>
    <div class="section-head"><h2>Rounds</h2><span class="meta">${runs.length} total</span></div>
    <section class="run-list">
      ${runs.length ? runs.map((run) => `
        <a class="run-row" href="#/runs/${encodeURIComponent(run.id)}">
          <div><h3>${escapeHtml(run.title)}</h3><div class="meta">${escapeHtml(run.mode)} · ${run.completedCount}/${run.submissionCount} rendered</div></div>
          <span class="pill ${escapeHtml(run.status)}">${escapeHtml(run.status)}</span>
        </a>`).join('') : '<div class="empty">No rounds yet. Make the first cut.</div>'}
    </section>`;

  const form = document.querySelector('#create-run');
  const prompt = document.querySelector('#prompt');
  form.addEventListener('change', (event) => {
    if (event.target.name === 'mode' && event.target.value === 'free-choice') prompt.value = DEFAULT_PROMPT;
    if (event.target.name === 'mode' && event.target.value === 'guided') {
      prompt.value = 'Make a 20-second vertical edit that makes Paul Atreides feel like a tragic religious figure. Find your own footage and music. Prioritize emotion and rhythm over exposition.';
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      const run = await api('/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          title: data.get('title'),
          mode: data.get('mode'),
          prompt: data.get('prompt'),
          modelLabels: String(data.get('models')).split(/\r?\n/),
          durationSeconds: Number(data.get('duration')),
        }),
      });
      location.hash = `#/runs/${encodeURIComponent(run.id)}`;
    } catch (error) { toast(error.message, true); }
  });
};

const ratingFor = (run, submissionId) =>
  run.ratings.find((rating) => rating.submissionId === submissionId);

const renderRun = async (runId) => {
  try {
    const run = await api(`/api/runs/${encodeURIComponent(runId)}`);
    if (run.status === 'preparing') renderPreparing(run);
    if (run.status === 'judging') renderJudging(run);
    if (run.status === 'judged') renderResults(run);
  } catch (error) {
    app.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
};

const pageHeading = (run) => `
  <a class="back" href="#/">← All rounds</a>
  <div class="eyebrow">${escapeHtml(run.mode)} round</div>
  <h2>${escapeHtml(run.title)}</h2>
  <div class="prompt">${escapeHtml(run.prompt)}</div>`;

const renderPreparing = (run) => {
  const completeCount = run.submissions.filter((item) => item.status === 'complete').length;
  const isRendering = run.submissions.some((item) => item.status === 'rendering');
  app.innerHTML = `
    <section class="page-head"><div>${pageHeading(run)}</div><div class="actions"><button id="begin" class="button" ${completeCount < 2 || isRendering ? 'disabled' : ''}>Judge ${completeCount} edits →</button></div></section>
    <div class="section-head"><h2>Model workspaces</h2><span class="meta">You run the models; CUTS only renders.</span></div>
    <section class="submission-list">
      ${run.submissions.map((submission) => `
        <article class="submission-card">
          <div>
            <div class="actions"><h3>${escapeHtml(submission.modelLabel)}</h3><span class="pill ${escapeHtml(submission.status)}">${escapeHtml(submission.status)}</span></div>
            <div class="path">${escapeHtml(submission.workspacePath)}</div>
            ${submission.failureMessage ? `<div class="error">${escapeHtml(submission.failureMessage)}</div>` : ''}
          </div>
          <div class="actions">
            <button class="button secondary small copy" data-path="${escapeHtml(submission.workspacePath)}">Copy path</button>
            <button class="button small render" data-id="${escapeHtml(submission.id)}" ${submission.status === 'rendering' ? 'disabled' : ''}>${submission.status === 'complete' ? 'Render again' : 'Render'}</button>
          </div>
        </article>`).join('')}
    </section>`;

  document.querySelectorAll('.copy').forEach((button) => button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(button.dataset.path);
    toast('Workspace path copied.');
  }));
  document.querySelectorAll('.render').forEach((button) => button.addEventListener('click', async () => {
    try {
      button.disabled = true;
      await api(`/api/runs/${encodeURIComponent(run.id)}/submissions/${encodeURIComponent(button.dataset.id)}/render`, {method: 'POST'});
      toast('Remotion render started.');
      pollTimer = setTimeout(() => renderRun(run.id), 900);
    } catch (error) { button.disabled = false; toast(error.message, true); }
  }));
  document.querySelector('#begin').addEventListener('click', async () => {
    try {
      judgeIndex = 0;
      await api(`/api/runs/${encodeURIComponent(run.id)}/begin-judging`, {method: 'POST'});
      renderRun(run.id);
    } catch (error) { toast(error.message, true); }
  });
  if (isRendering) pollTimer = setTimeout(() => renderRun(run.id), 1800);
};

const optionalField = (name, label, value = '') => `
  <div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}">
    <option value="">—</option>${Array.from({length: 10}, (_, index) => `<option value="${index + 1}" ${Number(value) === index + 1 ? 'selected' : ''}>${index + 1}</option>`).join('')}
  </select></div>`;

const renderJudging = (run) => {
  judgeIndex = Math.min(judgeIndex, run.submissions.length - 1);
  const submission = run.submissions[judgeIndex];
  const existing = ratingFor(run, submission.id) ?? {};
  const ratedCount = run.submissions.filter((item) => ratingFor(run, item.id)).length;
  const allRated = ratedCount === run.submissions.length;
  app.innerHTML = `
    <a class="back" href="#/">← Exit judging</a>
    <section class="judge-layout">
      <div class="video-shell"><video src="${escapeHtml(submission.videoUrl)}" controls autoplay loop playsinline></video></div>
      <div class="score-box">
        <div class="progress"><span style="width:${((judgeIndex + 1) / run.submissions.length) * 100}%"></span></div>
        <div class="eyebrow">Edit ${judgeIndex + 1} of ${run.submissions.length}</div>
        <h2>${escapeHtml(submission.anonymousLabel)}</h2>
        <p class="lede">Watch it properly. Replay it. Then give it the number it deserves.</p>
        <form id="rating-form">
          <div class="field"><label>Overall · required</label><div class="score-grid">
            ${Array.from({length: 10}, (_, index) => `<button type="button" data-score="${index + 1}" class="${Number(existing.overall) === index + 1 ? 'selected' : ''}">${index + 1}</button>`).join('')}
          </div></div>
          <input type="hidden" name="overall" value="${existing.overall ?? ''}" />
          <details class="details"><summary>Optional detailed scores</summary><div class="details-grid">
            ${optionalField('clipSelection', 'Clip selection', existing.clipSelection)}
            ${optionalField('flow', 'Flow and timing', existing.flow)}
            ${optionalField('musicAndSound', 'Music and sound', existing.musicAndSound)}
            ${optionalField('emotionalImpact', 'Emotional impact', existing.emotionalImpact)}
            ${optionalField('originality', 'Originality', existing.originality)}
          </div></details>
          <div class="field"><label for="notes">Private notes</label><textarea id="notes" name="notes" placeholder="What hit? What felt generic?">${escapeHtml(existing.notes ?? '')}</textarea></div>
          <div class="actions" style="margin-top:18px">
            <button type="button" id="previous" class="button secondary" ${judgeIndex === 0 ? 'disabled' : ''}>← Previous</button>
            <button type="submit" class="button">${judgeIndex === run.submissions.length - 1 ? 'Save rating' : 'Save & next →'}</button>
            <button type="button" id="reveal" class="button danger" ${allRated ? '' : 'disabled'}>Reveal models</button>
          </div>
          <p class="meta" style="margin-top:13px">${ratedCount}/${run.submissions.length} rated</p>
        </form>
      </div>
    </section>`;

  const form = document.querySelector('#rating-form');
  form.querySelectorAll('[data-score]').forEach((button) => button.addEventListener('click', () => {
    form.querySelector('[name=overall]').value = button.dataset.score;
    form.querySelectorAll('[data-score]').forEach((item) => item.classList.toggle('selected', item === button));
  }));
  const save = async () => {
    const data = new FormData(form);
    const overall = Number(data.get('overall'));
    if (!overall) throw new Error('Give this edit an overall score first.');
    const rating = {submissionId: submission.id, overall, notes: String(data.get('notes') ?? '')};
    for (const key of ['clipSelection', 'flow', 'musicAndSound', 'emotionalImpact', 'originality']) {
      if (data.get(key)) rating[key] = Number(data.get(key));
    }
    await api(`/api/runs/${encodeURIComponent(run.id)}/ratings/${encodeURIComponent(submission.id)}`, {method: 'PUT', body: JSON.stringify(rating)});
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try { await save(); if (judgeIndex < run.submissions.length - 1) judgeIndex += 1; renderRun(run.id); }
    catch (error) { toast(error.message, true); }
  });
  document.querySelector('#previous').addEventListener('click', () => { judgeIndex -= 1; renderRun(run.id); });
  document.querySelector('#reveal').addEventListener('click', async () => {
    try { await api(`/api/runs/${encodeURIComponent(run.id)}/reveal`, {method: 'POST'}); renderRun(run.id); }
    catch (error) { toast(error.message, true); }
  });
};

const renderResults = (run) => {
  const ranked = run.submissions
    .map((submission) => ({submission, rating: ratingFor(run, submission.id)}))
    .filter((item) => item.rating)
    .sort((a, b) => b.rating.overall - a.rating.overall);
  app.innerHTML = `
    <section class="page-head"><div>${pageHeading(run)}</div><span class="pill judged">Revealed</span></section>
    <div class="section-head"><h2>The reveal</h2><span class="meta">Your ratings, your taste.</span></div>
    <section class="results-grid">
      ${ranked.map(({submission, rating}, index) => `
        <article class="result">
          <div class="rank">${index + 1}</div>
          <video src="${escapeHtml(submission.videoUrl)}" controls loop playsinline></video>
          <div>
            <div class="eyebrow">${escapeHtml(submission.anonymousLabel)}</div>
            <h2>${escapeHtml(submission.modelLabel)}</h2>
            <div class="big-score">${rating.overall}<span class="meta"> / 10</span></div>
            ${rating.notes ? `<p class="lede">${escapeHtml(rating.notes)}</p>` : ''}
            ${submission.manifest?.title ? `<h3>${escapeHtml(submission.manifest.title)}</h3>` : ''}
            ${submission.manifest?.description ? `<p class="manifest">${escapeHtml(submission.manifest.description)}</p>` : ''}
            <div class="path">${escapeHtml(submission.workspacePath)}</div>
          </div>
        </article>`).join('')}
    </section>`;
};

window.addEventListener('hashchange', route);
route();
