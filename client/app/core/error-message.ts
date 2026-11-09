import { HttpErrorResponse } from '@angular/common/http';
import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { codedMessage } from '../i18n/coded';

/**
 * The server's message for a failed request, in the reader's language where
 * there is a translation of its code (server/lib/messages.ts), or the
 * server's own English; or the fallback text, for a failure with no message.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && err.error && typeof err.error.msg === 'string') {
    const { code, params, msg } = err.error as {
      code?: unknown;
      params?: Record<string, string | number>;
      msg: string;
    };
    return (typeof code === 'string' && codedMessage('server', code, params)) || msg;
  }
  return fallback;
}

/** Whether a request failed because the network did not reach Glazecalc (offline), not because the server said no. */
export function isOffline(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 0;
}

/** For a page that needs the server (Trash, Shelf, Tokens): "Not available offline" when offline, else `fallback`. */
export function fetchProblem(err: unknown, fallback: string): string {
  return isOffline(err) ? translate(marker('offline.notAvailable')) : errorMessage(err, fallback);
}
