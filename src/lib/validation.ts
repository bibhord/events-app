import type { EventDraft } from '../types';

/**
 * The assignment says colors must be "any web safe named color, like red".
 * Validating against the real CSS named-colour list means a typo like
 * "ornage" is caught before it reaches the server, and it lets the list
 * render an accurate swatch.
 */
export const NAMED_COLORS = [
  'aqua', 'aquamarine', 'beige', 'black', 'blue', 'brown', 'chocolate',
  'coral', 'crimson', 'cyan', 'darkblue', 'darkgreen', 'darkorange',
  'darkred', 'fuchsia', 'gold', 'gray', 'green', 'indigo', 'ivory',
  'khaki', 'lavender', 'lime', 'magenta', 'maroon', 'navy', 'olive',
  'orange', 'orchid', 'pink', 'plum', 'purple', 'red', 'salmon',
  'silver', 'tan', 'teal', 'tomato', 'turquoise', 'violet', 'white',
  'yellow',
] as const;

const COLOR_SET = new Set<string>(NAMED_COLORS);

export function isNamedColor(value: string): boolean {
  return COLOR_SET.has(value.trim().toLowerCase());
}

export type FieldErrors = Partial<Record<keyof EventDraft, string>>;

const LIMITS = {
  name: 80,
  description: 500,
  company: 60,
} as const;

/**
 * One pure function, used by both the create and the edit form, and run on
 * submit as well as on change. Keeping it outside the components means the
 * two forms cannot drift apart.
 */
export function validate(draft: EventDraft): FieldErrors {
  const errors: FieldErrors = {};

  const name = draft.name.trim();
  if (!name) errors.name = 'Name is required.';
  else if (name.length > LIMITS.name)
    errors.name = `Name must be ${LIMITS.name} characters or fewer.`;

  const description = draft.description.trim();
  if (!description) errors.description = 'Description is required.';
  else if (description.length > LIMITS.description)
    errors.description = `Description must be ${LIMITS.description} characters or fewer.`;

  const company = draft.company.trim();
  if (!company) errors.company = 'Company is required.';
  else if (company.length > LIMITS.company)
    errors.company = `Company must be ${LIMITS.company} characters or fewer.`;

  const color = draft.color.trim();
  if (!color) errors.color = 'Color is required.';
  else if (!isNamedColor(color))
    errors.color = 'Use a named CSS color, such as red or teal.';

  return errors;
}

export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}

/** Trim before sending, so " Acme " and "Acme" are not two companies. */
export function normalize(draft: EventDraft): EventDraft {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    company: draft.company.trim(),
    color: draft.color.trim().toLowerCase(),
  };
}
