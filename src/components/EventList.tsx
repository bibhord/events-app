import { Link } from 'react-router-dom';

import { isNamedColor } from '../lib/validation';
import type { Event } from '../types';

interface Props {
  events: Event[];
  busy: boolean;
  editingId: number | null;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}

/**
 * Grouped under a company heading rather than repeating the company on
 * every row. The sort is still "by company name"; the grouping just makes
 * that visible instead of something you have to read down the column to
 * notice.
 */
export function EventList({ events, busy, editingId, onEdit, onDelete }: Props) {
  if (events.length === 0) {
    return <p className="empty">No events yet. Add one above.</p>;
  }

  const groups: { company: string; events: Event[] }[] = [];
  for (const event of events) {
    const company = event.company || 'No company';
    const last = groups[groups.length - 1];
    if (last && last.company === company) last.events.push(event);
    else groups.push({ company, events: [event] });
  }

  return (
    <div className="list">
      {groups.map((group) => (
        <section key={group.company}>
          <h3 className="list__company">{group.company}</h3>
          <ul>
            {group.events.map((event) => (
              <li key={event.id} className={editingId === event.id ? 'row row--editing' : 'row'}>
                <span
                  className="swatch"
                  aria-hidden="true"
                  style={{ background: isNamedColor(event.color ?? '') ? event.color : '#ccc' }}
                />
                <div className="row__text">
                  <Link to={`/events/${event.id}`} className="row__name">
                    {event.name || '(untitled)'}
                  </Link>
                  <p className="row__description">{event.description}</p>
                  {/* The company is the group heading, but the brief asks for
                      it per event, so it is on the row as well. */}
                  <p className="row__company">{event.company || 'No company'}</p>
                </div>
                <div className="row__actions">
                  <button type="button" onClick={() => onEdit(event)} disabled={busy}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onDelete(event)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
