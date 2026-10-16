/**
 * A thin fetch wrapper that turns every failure into one ApiError type.
 *
 * The assignment asks for error handling but warns the API is unlikely to
 * fail, so the goal here is that the UI has something specific to react to
 * in each case rather than a generic "something went wrong":
 *
 *   network  - offline, DNS, CORS. Retrying may help.
 *   timeout  - the request was still open after TIMEOUT_MS.
 *   http     - the server answered, with a status we did not want.
 *   parse    - a 2xx whose body was not the JSON we expected.
 *
 * `simulateFailures` exists so the error paths can be demonstrated on
 * command. See the "Simulate API failures" toggle in the UI.
 */

const BASE_URL = 'https://rf-json-server.herokuapp.com/events-3';
const TIMEOUT_MS = 10_000;

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'simulated';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }

  /** Whether trying the same request again could plausibly work. */
  get retryable(): boolean {
    if (this.kind === 'http') return this.status === undefined || this.status >= 500;
    return this.kind !== 'parse';
  }
}

let simulateFailures = false;

export function setSimulateFailures(on: boolean): void {
  simulateFailures = on;
}

export function isSimulatingFailures(): boolean {
  return simulateFailures;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

export async function request<T>(path = '', options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  if (simulateFailures) {
    // Shaped like a real outage so the UI cannot tell the difference.
    await new Promise((resolve) => setTimeout(resolve, 400));
    throw new ApiError('simulated', `Simulated failure on ${method} ${path || '/'}`, 503);
  }

  // Our own timeout, plus whatever the caller passed, so a component
  // unmounting mid-flight aborts the request too.
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  const composed = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal: composed,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    if (signal?.aborted) throw cause; // caller cancelled; not an error to show
    if (timeoutController.signal.aborted) {
      throw new ApiError('timeout', `The server did not respond within ${TIMEOUT_MS / 1000}s.`);
    }
    throw new ApiError('network', 'Could not reach the server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ApiError(
      'http',
      `The server rejected the request (${response.status} ${response.statusText}).`,
      response.status,
    );
  }

  // 204 and empty bodies are valid; DELETE on this API returns {}.
  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('parse', 'The server returned a response we could not read.');
  }
}
