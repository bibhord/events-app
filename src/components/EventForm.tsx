import { useEffect, useState } from 'react';

import { NAMED_COLORS, isValid, normalize, validate } from '../lib/validation';
import type { FieldErrors } from '../lib/validation';
import { EMPTY_DRAFT, type EventDraft } from '../types';

interface Props {
  initial?: EventDraft;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (draft: EventDraft) => Promise<unknown>;
  onCancel?: () => void;
}

/**
 * Used for both create and edit. Errors appear once a field has been
 * touched or once submit has been pressed, so the form is not shouting at
 * someone who has not typed anything yet. Submit stays enabled: a disabled
 * button that will not say why is worse than a button that explains.
 */
export function EventForm({ initial, submitLabel, busy, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<EventDraft>(initial ?? EMPTY_DRAFT);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initial) setDraft(initial);
  }, [initial]);

  const errors: FieldErrors = validate(draft);

  function show(field: keyof EventDraft): string | undefined {
    return submitted || touched[field] ? errors[field] : undefined;
  }

  function set(field: keyof EventDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setSubmitted(true);
    if (!isValid(errors)) return;

    const result = await onSubmit(normalize(draft));
    // Only clear a create form; a failed save must keep what was typed.
    if (result && !initial) {
      setDraft(EMPTY_DRAFT);
      setTouched({});
      setSubmitted(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <Field label="Name" error={show('name')} htmlFor="name">
        <input
          id="name"
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          aria-invalid={Boolean(show('name'))}
        />
      </Field>

      <Field label="Description" error={show('description')} htmlFor="description">
        <textarea
          id="description"
          rows={3}
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, description: true }))}
          aria-invalid={Boolean(show('description'))}
        />
      </Field>

      <div className="form__row">
        <Field label="Company" error={show('company')} htmlFor="company">
          <input
            id="company"
            value={draft.company}
            onChange={(e) => set('company', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, company: true }))}
            aria-invalid={Boolean(show('company'))}
          />
        </Field>

        <Field label="Color" error={show('color')} htmlFor="color">
          <span className="color-input">
            <input
              id="color"
              list="named-colors"
              value={draft.color}
              placeholder="red"
              onChange={(e) => set('color', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, color: true }))}
              aria-invalid={Boolean(show('color'))}
            />
            <span
              className="swatch"
              aria-hidden="true"
              style={{ background: errors.color ? 'transparent' : draft.color }}
            />
          </span>
          <datalist id="named-colors">
            {NAMED_COLORS.map((color) => (
              <option key={color} value={color} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="form__actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
