// Course interactivity for Forged Fitness pages: quiz self-checks,
// print buttons, and per-lesson progress tracking (localStorage).
// Ported from the production site's course.js; the only behavioral change
// is that the course-index.json fetch is base-aware so it works under the
// GitHub Pages project subpath.
import { loadProgress, saveProgress, clearProgress } from './progress.mjs';

for (const form of document.querySelectorAll('.quiz')) {
  const button = form.querySelector('button');
  button.hidden = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const checked = form.querySelector('input:checked');
    const feedback = form.querySelector('.quiz-feedback');
    if (!checked) { feedback.textContent = 'Choose an answer, then check your reasoning.'; return; }
    const right = checked.value === form.dataset.answer;
    feedback.textContent = (right ? 'Yes. ' : 'Try the explanation below. ') + form.dataset.explanation;
    form.querySelector('details').open = true;
  });
}

for (const button of document.querySelectorAll('[data-print]')) {
  button.hidden = false;
  button.addEventListener('click', () => window.print());
}

try {
  const _base = import.meta.env.BASE_URL;
  const base = _base.endsWith('/') ? _base : _base + '/';
  const response = await fetch(`${base}forged-fitness/course-index.json`);
  if (!response.ok) throw new Error('Course index unavailable');
  const { lessons, paths } = await response.json();
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  let { done, available } = loadProgress(storage, lessons);
  const lessonById = new Map(lessons.map(x => [x.id, x]));
  const current = document.querySelector('[data-complete]');

  function render() {
    for (const element of document.querySelectorAll('[data-total-progress]'))
      element.textContent = Object.keys(done).length + ' of ' + lessons.length + ' lessons marked complete';
    for (const element of document.querySelectorAll('[data-week-progress]')) {
      const group = lessons.filter(x => x.week === Number(element.dataset.weekProgress));
      element.textContent = group.filter(x => done[x.id]).length + ' / ' + group.length + ' complete';
    }
    for (const element of document.querySelectorAll('[data-path-progress]')) {
      const p = paths.find(x => x.id === element.dataset.pathProgress);
      const group = lessons.filter(x => x.week <= p.weeks), n = group.filter(x => done[x.id]).length;
      element.textContent = n === group.length
        ? 'All ' + n + ' lessons marked complete — self-reported participation'
        : n + ' of ' + group.length + ' lessons marked complete';
    }
    for (const element of document.querySelectorAll('[data-lesson-state]'))
      element.textContent = done[element.dataset.lessonState] ? 'Marked complete' : 'Not marked complete';
    for (const meter of document.querySelectorAll('progress')) {
      meter.max = lessons.length;
      meter.value = Object.keys(done).length;
    }
    if (current) {
      const complete = !!done[current.dataset.complete];
      current.textContent = complete ? 'Mark as incomplete' : 'Mark lesson complete';
      current.setAttribute('aria-pressed', String(complete));
      current.disabled = !available;
      current.hidden = false;
    }
    for (const message of document.querySelectorAll('[data-storage-note]'))
      message.textContent = available
        ? 'Progress stays in this browser on this device. Personal notes and quiz answers are not saved.'
        : 'Device storage is unavailable. You can still read every lesson and use all answer explanations.';
    for (const button of document.querySelectorAll('[data-reset]')) {
      button.hidden = false;
      button.disabled = !available;
    }
  }

  if (current) current.addEventListener('click', () => {
    const id = current.dataset.complete, lesson = lessonById.get(id);
    if (!lesson) return;
    const next = { ...done };
    if (next[id]) delete next[id]; else next[id] = lesson.version;
    if (saveProgress(storage, next)) done = next; else available = false;
    render();
  });

  for (const button of document.querySelectorAll('[data-reset]'))
    button.addEventListener('click', () => {
      const panel = document.querySelector('[data-reset-confirm]');
      panel.hidden = false;
    });
  for (const button of document.querySelectorAll('[data-cancel-reset]'))
    button.addEventListener('click', () => document.querySelector('[data-reset-confirm]').hidden = true);
  for (const button of document.querySelectorAll('[data-confirm-reset]'))
    button.addEventListener('click', () => {
      if (clearProgress(storage)) done = {}; else available = false;
      document.querySelector('[data-reset-confirm]').hidden = true;
      render();
    });

  render();
} catch {
  for (const message of document.querySelectorAll('[data-storage-note]'))
    message.textContent = 'Progress is temporarily unavailable. Course reading and self-checks still work.';
}
