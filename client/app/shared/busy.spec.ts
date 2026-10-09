import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { testProviders } from '../testing/test-providers';
import { Busy } from './busy';
import { Notices } from './notices';

describe('Busy', () => {
  it('ignores a second run while the first is still going', async () => {
    const busy = new Busy();
    let finish!: () => void;
    let runs = 0;
    const task = () => {
      runs++;
      return new Promise<void>((resolve) => (finish = resolve));
    };

    const first = busy.run(task);
    expect(busy.active()).toBe(true);
    await busy.run(task);
    expect(runs).toBe(1);

    finish();
    await first;
    expect(busy.active()).toBe(false);
    void busy.run(task);
    expect(runs).toBe(2);
    finish();
  });

  it('is free again after a task fails', async () => {
    const busy = new Busy();
    await expect(busy.run(() => Promise.reject(new Error('no')))).rejects.toThrow('no');
    expect(busy.active()).toBe(false);
  });
});

describe('Notices.warnings', () => {
  // The English messages, which these checks are written in.
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    TestBed.inject(TranslocoService);
  });

  it('replaces the previous warnings and keeps other errors', () => {
    const notices = new Notices();
    notices.error('Error: something else');
    notices.warnings(['a', 'b']);
    notices.warnings(['a']);
    expect(notices.errors()).toEqual(['Error: something else', 'Warning: a']);
    notices.warnings([]);
    expect(notices.errors()).toEqual(['Error: something else']);
  });
});
