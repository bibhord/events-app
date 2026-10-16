import { describe, expect, it } from 'vitest';

import { isNamedColor, isValid, normalize, validate } from './validation';
import type { EventDraft } from '../types';

const valid: EventDraft = {
  name: 'Launch party',
  description: 'Drinks and a demo',
  company: 'GEEKFARM',
  color: 'red',
};

const draft = (overrides: Partial<EventDraft> = {}): EventDraft => ({ ...valid, ...overrides });

describe('validate', () => {
  it('accepts a complete draft', () => {
    expect(isValid(validate(valid))).toBe(true);
  });

  it('reports every missing field at once, not just the first', () => {
    const errors = validate({ name: '', description: '', company: '', color: '' });
    expect(Object.keys(errors).sort()).toEqual(['color', 'company', 'description', 'name']);
  });

  it.each(['name', 'description', 'company'] as const)(
    'rejects a whitespace-only %s',
    (field) => {
      expect(validate(draft({ [field]: '   ' }))[field]).toBeDefined();
    },
  );

  it('rejects a name over the length limit but accepts one at it', () => {
    expect(validate(draft({ name: 'x'.repeat(81) })).name).toBeDefined();
    expect(validate(draft({ name: 'x'.repeat(80) })).name).toBeUndefined();
  });

  it('rejects a description over the length limit', () => {
    expect(validate(draft({ description: 'x'.repeat(501) })).description).toBeDefined();
  });

  describe('color', () => {
    it('rejects a misspelled colour', () => {
      expect(validate(draft({ color: 'ornage' })).color).toBeDefined();
    });

    it('rejects a hex value, since the brief asks for a named colour', () => {
      expect(validate(draft({ color: '#ff0000' })).color).toBeDefined();
    });

    it('accepts any case or surrounding whitespace', () => {
      expect(isValid(validate(draft({ color: '  TeAl ' })))).toBe(true);
    });
  });
});

describe('isNamedColor', () => {
  it('is tolerant of case and padding', () => {
    expect(isNamedColor(' Red ')).toBe(true);
  });

  it('rejects anything not in the CSS list', () => {
    expect(isNamedColor('blurple')).toBe(false);
    expect(isNamedColor('')).toBe(false);
  });
});

describe('normalize', () => {
  it('trims every field and lowercases the colour', () => {
    expect(
      normalize({ name: ' A ', description: ' B ', company: ' C ', color: ' Red ' }),
    ).toEqual({ name: 'A', description: 'B', company: 'C', color: 'red' });
  });

  it('keeps " Acme " and "Acme" from becoming two companies', () => {
    expect(normalize(draft({ company: ' Acme ' })).company).toBe(
      normalize(draft({ company: 'Acme' })).company,
    );
  });
});
