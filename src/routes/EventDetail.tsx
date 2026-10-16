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

  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      setError(new ApiError('http', `"${id}" is not a valid event id.`, 404));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getEvent(numericId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setEvent(data);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof ApiError ? caught : new ApiError('network', 'Unexpected error.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, attempt]);

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
