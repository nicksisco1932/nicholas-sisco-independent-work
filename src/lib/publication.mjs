/** One fail-closed publication gate shared by pages, listings and exports. */
export function isPublished(entry) {
  const data = entry?.data ?? entry;
  if (data?.published === true && String(data.status ?? '').trim().toLowerCase() === 'draft') {
    throw new Error(`Publication conflict: ${entry?.id ?? data?.title ?? 'entry'} is marked published and draft.`);
  }
  return data?.published === true;
}
