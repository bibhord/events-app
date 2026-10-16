import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEvent, updateEvent } from './events';
import type { Event } from '../types';

const seeded: Event = {
  id: 7,
  name: 'Event 1',
  description: 'original',
  company: 'GEEKFARM',
  color: 'red',
  date: '2021-01-05',
  time: '06:56',
  email: 'wallsschwartz@geekfarm.com',
  phone: '+1 (831) 446-3332',
  address: '697 Brooklyn Road',
  isActive: true,
  image: 'https://placeimg.com/320/240/arch',
  createdOn: '2020-09-05T03:56:56 +06:00',
};

function captureRequest() {
  const fetchMock = vi
    .fn()
    .mockImplementation((_url: string, init: RequestInit) =>
      Promise.resolve(new Response(init.body as string, { status: 200 })),
    );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const bodyOf = (fetchMock: ReturnType<typeof captureRequest>, call = 0) =>
  JSON.parse(fetchMock.mock.calls[call][1].body as string);

afterEach(() => vi.unstubAllGlobals());

describe('updateEvent', () => {
  it('sends the whole record, not just the edited fields', async () => {
    // PUT replaces the record on this server. Sending only the four fields
    // the form owns silently destroys the other six.
    const fetchMock = captureRequest();

    await updateEvent(seeded, {
      name: 'Renamed',
      description: 'changed',
      company: 'GEEKFARM',
      color: 'blue',
    });

    const body = bodyOf(fetchMock);
    expect(body.date).toBe('2021-01-05');
    expect(body.email).toBe('wallsschwartz@geekfarm.com');
    expect(body.phone).toBe('+1 (831) 446-3332');
    expect(body.address).toBe('697 Brooklyn Road');
    expect(body.isActive).toBe(true);
    expect(body.image).toBe('https://placeimg.com/320/240/arch');
  });

  it('applies the edits over the existing values', async () => {
    const fetchMock = captureRequest();

    await updateEvent(seeded, {
      name: 'Renamed',
      description: 'changed',
      company: 'ACME',
      color: 'blue',
    });

    expect(bodyOf(fetchMock)).toMatchObject({
      name: 'Renamed',
      description: 'changed',
      company: 'ACME',
      color: 'blue',
    });
  });

  it('keeps the id and puts to that id', async () => {
    const fetchMock = captureRequest();

    await updateEvent(seeded, { name: 'n', description: 'd', company: 'c', color: 'red' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/7$/);
    expect(init.method).toBe('PUT');
    expect(bodyOf(fetchMock).id).toBe(7);
  });
});

describe('createEvent', () => {
  it('does not send an id, since the server generates it', async () => {
    const fetchMock = captureRequest();

    await createEvent({ name: 'n', description: 'd', company: 'c', color: 'red' });

    expect(bodyOf(fetchMock)).not.toHaveProperty('id');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });
});
