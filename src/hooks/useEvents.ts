import { useCallback, useEffect, useState } from 'react';

import * as api from '../api/events';
import { ApiError } from '../api/client';
import { byCompany } from '../lib/sort';
import type { Event, EventDraft } from '../types';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Owns the event list and the four operations on it.
 *
 * Two deliberate choices:
 *
 * 1. Load errors and action errors are separate. A failed delete should not
 *    blank out a list that is on screen and still correct, so the list keeps
 *    rendering and the failure appears above it.
 *
 * 2. Mutations patch local state from the server's own response rather than
 *    re-fetching. One round trip instead of two, and the response is the
 *    authoritative record. The list is re-sorted after every change so a
 *    renamed company does not leave a row stranded in the wrong place.
 */
export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoadState('loading');
    setLoadError(null);
    try {
      const data = await api.listEvents(signal);
      if (signal?.aborted) return;
      setEvents(byCompany(data));
      setLoadState('ready');
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(asApiError(error));
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Synchronising with an external system, which is the case the rule's own
    // guidance carves out. The abort on cleanup is why this cannot be derived
    // during render instead.
    // oxlint-disable-next-line react/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** Shared wrapper so every mutation reports failure the same way. */
  const run = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      setBusy(true);
      setActionError(null);
      try {
        return await operation();
      } catch (error) {
        setActionError(asApiError(error));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const create = useCallback(
    (draft: EventDraft) =>
      run(async () => {
        const created = await api.createEvent(draft);
        setEvents((current) => byCompany([...current, created]));
        return created;
      }),
    [run],
  );

  const update = useCallback(
    (existing: Event, draft: EventDraft) =>
      run(async () => {
        const updated = await api.updateEvent(existing, draft);
        // Replace the row with the server's record rather than merging over
        // the old one. Merging would paper over any difference between what
        // we think the event is and what was actually stored.
        setEvents((current) =>
          byCompany(current.map((event) => (event.id === updated.id ? updated : event))),
        );
        return updated;
      }),
    [run],
  );

  const remove = useCallback(
    (id: number) =>
      run(async () => {
        await api.deleteEvent(id);
        setEvents((current) => current.filter((event) => event.id !== id));
        return true;
      }),
    [run],
  );

  return {
    events,
    loadState,
    loadError,
    actionError,
    busy,
    reload: () => load(),
    dismissActionError: () => setActionError(null),
    create,
    update,
    remove,
  };
}

/** Anything thrown that is not already an ApiError still has to render. */
function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError('network', error instanceof Error ? error.message : 'Unexpected error.');
}
