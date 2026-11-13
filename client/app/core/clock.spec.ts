import { TestBed } from '@angular/core/testing';
import { NOW, dayOf } from './clock';

describe('the clock', () => {
  it('tells the time now unless a test fixes it, and the day it falls on here', () => {
    const before = Date.now();
    const now = TestBed.inject(NOW)();
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(Date.now());
    expect(dayOf(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
