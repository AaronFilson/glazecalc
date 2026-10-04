import { HttpErrorResponse } from '@angular/common/http';

/** The server's { msg } for a failed request, or the fallback text. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && err.error && typeof err.error.msg === 'string') {
    return err.error.msg;
  }
  return fallback;
}
