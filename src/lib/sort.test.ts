import { describe, expect, it } from 'vitest';

import { byCompany } from './sort';
import type { Event } from '../types';

const event = (id: number, company: string, name = 'x'): Event =>
  ({ id, company, name, description: '', color: 'red' });

describe('byCompany', () => {
  it('sorts by company regardless of case', () => {
    const sorted = byCompany([event(1, 'ZILCH'), event(2, 'anocha'), event(3, 'Makingway')]);
    expect(sorted.map((e) => e.company)).toEqual(['anocha', 'Makingway', 'ZILCH']);
  });

  it('breaks ties on name, so same-company rows are not left in server order', () => {
    const sorted = byCompany([event(1, 'ZILCH', 'b'), event(2, 'ZILCH', 'a')]);
    expect(sorted.map((e) => e.name)).toEqual(['a', 'b']);
  });

  it('orders numbers the way a person reads them', () => {
    const sorted = byCompany([event(1, 'Co 10'), event(2, 'Co 2')]);
    expect(sorted.map((e) => e.company)).toEqual(['Co 2', 'Co 10']);
  });

  it('does not mutate the array it was given', () => {
    const input = [event(1, 'ZILCH'), event(2, 'ANOCHA')];
    const snapshot = input.map((e) => e.id);
    byCompany(input);
    expect(input.map((e) => e.id)).toEqual(snapshot);
  });

  it('tolerates a missing company rather than throwing', () => {
    const sorted = byCompany([{ id: 1 } as Event, event(2, 'ANOCHA')]);
    expect(sorted).toHaveLength(2);
    expect(sorted[0].id).toBe(1);
  });
});
