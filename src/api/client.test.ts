import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, request, setSimulateFailures } from './client';

/**
 * These are the tests that matter most for this assignment: the brief asks
 * for error handling and then warns the API will not fail, so the mapping
 * from "what went wrong" to "what the user is told" is the part that would
 * otherwise never be exercised.
 *
 * fetch is stubbed rather than mocked through a library -- there is one
 * call site and the stub is three lines.
 */

const ok = (body: unknown, status = 200) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    statusText: 'OK',
  });

/** Run something expected to fail and hand back what it threw. */
async function captureError(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the request to fail, but it resolved.');
}

afterEach(() => {
  vi.unstubAllGlobals();
  setSimulateFailures(false);
});

describe('request', () => {
  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok([{ id: 1 }])));
    await expect(request('/')).resolves.toEqual([{ id: 1 }]);
  });

  it('sends the JSON content type the API asks for', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({}));
    vi.stubGlobal('fetch', fetchMock);

    await request('/', { method: 'POST', body: { name: 'x' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"name":"x"}');
  });

  it('treats an empty body as success, not as a parse failure', async () => {
    // DELETE on this API answers 200 with nothing useful.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));
    await expect(request('/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  describe('error mapping', () => {
    it('turns a rejected fetch into a network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      const error = await captureError(() => request('/'));
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).kind).toBe('network');
      expect((error as ApiError).retryable).toBe(true);
    });

    it('turns a non-2xx into an http error carrying the status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));

      const error = (await captureError(() => request('/999'))) as ApiError;
      expect(error.kind).toBe('http');
      expect(error.status).toBe(404);
    });

    it('turns an unreadable 2xx body into a parse error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok('<!doctype html>not json')));

      const error = (await captureError(() => request('/'))) as ApiError;
      expect(error.kind).toBe('parse');
    });

    it('does not report a caller-cancelled request as an error to show', async () => {
      const controller = new AbortController();
      controller.abort();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));

      const error = await captureError(() => request('/', { signal: controller.signal }));
      expect(error).not.toBeInstanceOf(ApiError);
    });
  });

  describe('failure simulation', () => {
    it('fails every request while switched on, without touching the network', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      setSimulateFailures(true);

      const error = (await captureError(() => request('/'))) as ApiError;
      expect(error.kind).toBe('simulated');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('stops failing once switched off', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok([])));
      setSimulateFailures(true);
      setSimulateFailures(false);
      await expect(request('/')).resolves.toEqual([]);
    });
  });
});

describe('ApiError.retryable', () => {
  it.each([
    ['network', undefined, true],
    ['timeout', undefined, true],
    ['http', 503, true],
    ['http', 500, true],
    ['http', 404, false],
    ['http', 400, false],
    ['parse', undefined, false],
  ] as const)('%s %s -> %s', (kind, status, expected) => {
    // A 404 must not offer "Try again": retrying produces another 404.
    expect(new ApiError(kind, 'x', status).retryable).toBe(expected);
  });
});
