// Progress storage helpers for the Forged Fitness course.
// Ported verbatim from the production site's progress.mjs
// (forged-fitness/progress.mjs). Progress lives in localStorage on the
// learner's own device; nothing is sent anywhere.
export const KEY = 'forged-fitness:progress:v1';

export function loadProgress(storage, lessons) {
  let raw;
  try { raw = storage.getItem(KEY); } catch { return { done: {}, available: false }; }
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { done: {}, available: true };
    const done = {};
    for (const lesson of lessons) if (parsed[lesson.id] === lesson.version) done[lesson.id] = lesson.version;
    return { done, available: true };
  } catch { return { done: {}, available: true }; }
}

export function saveProgress(storage, done) {
  try { storage.setItem(KEY, JSON.stringify(done)); return true; } catch { return false; }
}

export function clearProgress(storage) {
  try { storage.removeItem(KEY); return true; } catch { return false; }
}
