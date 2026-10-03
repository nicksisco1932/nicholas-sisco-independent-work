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

export function exportProgress(storage, lessons) {
  return loadProgress(storage, lessons).done;
}

// Imports only the existing completion-map format. Validate the entire file
// before writing, ignore changed/unknown lesson versions, and merge so an
// import never erases progress already saved on this origin.
export function importProgress(storage, lessons, text) {
  if (typeof text !== 'string' || text.length > 262_144) {
    return { ok: false, reason: 'The progress file is invalid or too large.' };
  }

  let parsed;
  try { parsed = JSON.parse(text); } catch {
    return { ok: false, reason: 'The progress file is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'The progress file must contain a lesson completion map.' };
  }

  const validCurrent = {};
  for (const lesson of lessons) {
    if (parsed[lesson.id] === lesson.version) validCurrent[lesson.id] = lesson.version;
  }
  const existing = loadProgress(storage, lessons);
  if (!existing.available) return { ok: false, reason: 'Browser storage is unavailable.' };
  const merged = { ...existing.done, ...validCurrent };
  if (!saveProgress(storage, merged)) return { ok: false, reason: 'Progress could not be saved on this device.' };
  return { ok: true, imported: Object.keys(validCurrent).length };
}
