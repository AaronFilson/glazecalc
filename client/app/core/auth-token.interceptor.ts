import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';

/** Sends the login token, in the 'token' header the API expects, to the API only. */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (!token || !req.url.startsWith(inject(API_BASE) + '/')) return next(req);
  return next(req.clone({ setHeaders: { token } }));
};
