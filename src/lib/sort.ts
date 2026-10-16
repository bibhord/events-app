import type { Event } from '../types';

/**
 * "Sort by company name after loading."
 *
 * Done in one place and re-applied after every mutation, so a newly created
 * or renamed event lands where it belongs instead of at the end of the list.
 * Name is the tiebreaker, otherwise events from the same company would sit
 * in whatever order the server happened to return them. localeCompare with
 * numeric collation keeps "Company 2" ahead of "Company 10".
 */
export function byCompany(events: Event[]): Event[] {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  return [...events].sort(
    (a, b) =>
      collator.compare(a.company ?? '', b.company ?? '') ||
      collator.compare(a.name ?? '', b.name ?? ''),
  );
}
