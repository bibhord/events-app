/** An event as the API returns it. */
export interface Event {
  id: number;
  name: string;
  description: string;
  company: string;
  color: string;
  /** Everything below is present on the seeded records but is not part of
   *  what this app creates or edits. Optional so our own payloads typecheck. */
  isActive?: boolean;
  date?: string;
  time?: string;
  email?: string;
  phone?: string;
  address?: string;
  image?: string;
  createdOn?: string;
}

/** The fields this app is responsible for. The assignment asks for these
 *  four on both create and update. */
export interface EventDraft {
  name: string;
  description: string;
  company: string;
  color: string;
}

export const EMPTY_DRAFT: EventDraft = {
  name: '',
  description: '',
  company: '',
  color: '',
};

export function toDraft(event: Event): EventDraft {
  return {
    name: event.name ?? '',
    description: event.description ?? '',
    company: event.company ?? '',
    color: event.color ?? '',
  };
}
