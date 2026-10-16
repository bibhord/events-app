import type { Event, EventDraft } from '../types';
import { request } from './client';

export function listEvents(signal?: AbortSignal): Promise<Event[]> {
  return request<Event[]>('/', { signal });
}

export function getEvent(id: number, signal?: AbortSignal): Promise<Event> {
  return request<Event>(`/${id}`, { signal });
}

export function createEvent(draft: EventDraft): Promise<Event> {
  // No id: the server generates it.
  return request<Event>('/', { method: 'POST', body: draft });
}

export function updateEvent(existing: Event, draft: EventDraft): Promise<Event> {
  // PUT *replaces* the record on this server, so the body has to be the whole
  // event, not just the four fields this app edits. Sending only the draft
  // silently drops date, email, phone, address, isActive and image -- and the
  // loss is invisible from the list, which does not show those columns.
  return request<Event>(`/${existing.id}`, {
    method: 'PUT',
    body: { ...existing, ...draft, id: existing.id },
  });
}

export function deleteEvent(id: number): Promise<void> {
  return request<void>(`/${id}`, { method: 'DELETE' });
}
