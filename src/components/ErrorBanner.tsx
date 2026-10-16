import type { ApiError } from '../api/client';

interface Props {
  error: ApiError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * One place that decides how a failure reads. The ApiError kind drives the
 * wording, so "we could not reach the server" and "the server rejected
 * that" are not collapsed into the same unhelpful sentence, and retry is
 * only offered when retrying could actually work.
 */
export function ErrorBanner({ error, onRetry, onDismiss }: Props) {
  return (
    <div className="banner banner--error" role="alert">
      <div>
        <strong>{headline(error.kind)}</strong>
        <p>{error.message}</p>
      </div>
      <div className="banner__actions">
        {onRetry && error.retryable && (
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

function headline(kind: ApiError['kind']): string {
  switch (kind) {
    case 'network':
      return 'Could not reach the server';
    case 'timeout':
      return 'The server took too long';
    case 'http':
      return 'The server rejected that request';
    case 'parse':
      return 'Unreadable response';
    case 'simulated':
      return 'Simulated failure';
  }
}
