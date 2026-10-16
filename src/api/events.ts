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

export function updateEvent(id: number, draft: EventDraft): Promise<Event> {
  // PUT replaces the record, so send the fields we own. The API does not
  // enforce a schema; these four are what the assignment requires.
  return request<Event>(`/${id}`, { method: 'PUT', body: { ...draft, id } });
}

export function deleteEvent(id: number): Promise<void> {
  return request<void>(`/${id}`, { method: 'DELETE' });
}
