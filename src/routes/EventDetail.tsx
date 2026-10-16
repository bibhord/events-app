import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { getEvent } from '../api/events';
import { ErrorBanner } from '../components/ErrorBanner';
import { Modal } from '../components/Modal';
import type { Event } from '../types';

/**
 * A route that renders as a modal, so /events/3 is a real URL: it can be
 * linked, reloaded and closed with the back button. Rendering the modal
 * from the list's own state instead would have satisfied "use a modal" but
 * not "with the use of react-router".
 *
 * It fetches the single event rather than reading it out of the list, both
 * because the assignment asks for GET /events/{id} and because the page
 * then works on a cold load with no list in memory.
 */
export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // A malformed id is knowable during render, so it is derived rather than
  // pushed into state from an effect. Only the fetch needs an effect.
  const numericId = Number(id);
  const idIsValid = Number.isInteger(numericId) && numericId > 0;
  const idError = idIsValid
    ? null
    : new ApiError('http', `"${id}" is not a valid event id.`, 404);

  const [event, setEvent] = useState<Event | null>(null);
  const [fetchError, setFetchError] = useState<ApiError | null>(null);
  const [fetching, setFetching] = useState(idIsValid);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!idIsValid) return;

    const controller = new AbortController();
    // Synchronising with an external system: the flag has to flip before the
    // request goes out, which is not something render can derive.
    // oxlint-disable-next-line react/set-state-in-effect
    setFetching(true);
    setFetchError(null);

    getEvent(numericId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setEvent(data);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setFetchError(
          caught instanceof ApiError ? caught : new ApiError('network', 'Unexpected error.'),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false);
      });

    return () => controller.abort();
  }, [numericId, idIsValid, attempt]);

  const error = idError ?? fetchError;
  const loading = idIsValid && fetching;

  const close = () => navigate('/');

  return (
    <Modal title={event?.name ?? 'Event'} onClose={close}>
      {loading && <p className="muted">Loading…</p>}

      {error && (
        <ErrorBanner error={error} onRetry={() => setAttempt((n) => n + 1)} />
      )}

      {!loading && !error && event && (
        <dl className="detail">
          <dt>Name</dt>
          <dd>{event.name || '(untitled)'}</dd>
          <dt>Description</dt>
          <dd>{event.description || '(none)'}</dd>
          <dt>Company</dt>
          <dd>{event.company || '(none)'}</dd>
          <dt>Color</dt>
          <dd>
            <span className="swatch" aria-hidden="true" style={{ background: event.color }} />
            {event.color || '(none)'}
          </dd>
        </dl>
      )}
    </Modal>
  );
}
