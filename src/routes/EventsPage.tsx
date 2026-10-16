import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { isSimulatingFailures, setSimulateFailures } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { EventForm } from '../components/EventForm';
import { EventList } from '../components/EventList';
import { Modal } from '../components/Modal';
import { useEvents } from '../hooks/useEvents';
import { toDraft, type Event, type EventDraft } from '../types';

export function EventsPage() {
  const {
    events,
    loadState,
    loadError,
    actionError,
    busy,
    reload,
    dismissActionError,
    create,
    update,
    remove,
  } = useEvents();

  const [editing, setEditing] = useState<Event | null>(null);
  const [confirming, setConfirming] = useState<Event | null>(null);
  const [simulate, setSimulate] = useState(isSimulatingFailures());

  async function handleUpdate(draft: EventDraft) {
    if (!editing) return null;
    const result = await update(editing, draft);
    if (result) setEditing(null);
    return result;
  }

  async function handleDelete() {
    if (!confirming) return;
    const result = await remove(confirming.id);
    if (result) setConfirming(null);
  }

  function toggleSimulation(on: boolean) {
    setSimulateFailures(on);
    setSimulate(on);
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Events</h1>
          <p className="muted">Sorted by company.</p>
        </div>
        <label className="toggle" title="Make every request fail, to exercise the error paths">
          <input
            type="checkbox"
            checked={simulate}
            onChange={(e) => toggleSimulation(e.target.checked)}
          />
          Simulate API failures
        </label>
      </header>

      {/* Shown here only when no modal is open; otherwise the modal renders it. */}
      {actionError && !editing && !confirming && (
        <ErrorBanner error={actionError} onDismiss={dismissActionError} />
      )}

      <section className="card">
        <h2>Add an event</h2>
        <EventForm submitLabel="Add event" busy={busy} onSubmit={create} />
      </section>

      <section className="card">
        <h2>
          All events{' '}
          {loadState === 'ready' && <span className="muted">({events.length})</span>}
        </h2>

        {loadState === 'loading' && <p className="muted">Loading events…</p>}

        {loadState === 'error' && loadError && (
          <ErrorBanner error={loadError} onRetry={reload} />
        )}

        {loadState === 'ready' && (
          <EventList
            events={events}
            busy={busy}
            editingId={editing?.id ?? null}
            onEdit={(event) => {
              dismissActionError();
              setEditing(event);
            }}
            onDelete={(event) => {
              dismissActionError();
              setConfirming(event);
            }}
          />
        )}
      </section>

      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          {/* The page's own banner is behind the backdrop, so a failed save
              has to report itself in here or it is invisible. */}
          {actionError && <ErrorBanner error={actionError} onDismiss={dismissActionError} />}
          <EventForm
            key={editing.id}
            initial={toDraft(editing)}
            submitLabel="Save changes"
            busy={busy}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {confirming && (
        <Modal title="Delete event" onClose={() => setConfirming(null)}>
          {actionError && <ErrorBanner error={actionError} onDismiss={dismissActionError} />}
          <p>
            Delete <strong>{confirming.name}</strong>? This cannot be undone.
          </p>
          <div className="form__actions">
            <button type="button" className="danger" onClick={handleDelete} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setConfirming(null)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* /events/:id renders here, over this page. */}
      <Outlet />
    </div>
  );
}
