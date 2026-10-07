import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE } from '../core/api-base';
import { sessionExpiredInterceptor } from '../core/session-expired.interceptor';

export const API = 'http://api.test';

/** HTTP (with the session interceptor) against a fake API, plus an empty router. */
export function testProviders() {
  return [
    provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
    provideHttpClientTesting(),
    provideRouter([]),
    { provide: API_BASE, useValue: API }
  ];
}

export function httpMock(): HttpTestingController {
  return TestBed.inject(HttpTestingController);
}

/** Lets pending promises finish, then renders. */
export async function settle(fixture?: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  if (fixture) await fixture.whenStable();
}

/** Answers every outstanding GET whose URL ends with the path. */
export function answer(path: string, body: object | null): void {
  httpMock()
    .match((req) => req.url.endsWith(path))
    .forEach((req) => req.flush(body));
}

/**
 * What a field is marked wrong with (shared/field-checks.ts), read as assistive
 * technology does: aria-invalid, and the message its aria-describedby names. ''
 * when it is not marked.
 */
export function fieldProblem(fixture: ComponentFixture<unknown>, id: string): string {
  const field = (fixture.nativeElement as HTMLElement).querySelector('#' + id);
  if (!field) throw new Error('no field #' + id);
  if (field.getAttribute('aria-invalid') !== 'true') return '';
  const ids = (field.getAttribute('aria-describedby') ?? '').split(' ');
  const message = ids.map((one) => document.getElementById(one)).find((el) => el?.classList.contains('field-problem'));
  return message?.textContent?.trim() ?? '';
}

export function text(fixture: ComponentFixture<unknown>, selector = ':root'): string {
  const root = fixture.nativeElement as HTMLElement;
  const el = selector === ':root' ? root : root.querySelector(selector);
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}
