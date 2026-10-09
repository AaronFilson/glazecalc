import { HttpErrorResponse } from '@angular/common/http';
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
