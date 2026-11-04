import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideEnglish } from '../testing/i18n';
import { Outbox, type OutboxEntry } from './outbox';
import { OutboxConflictDialog, OutboxFailedList } from './outbox-conflict.dialog';

const entry = (changes: Partial<OutboxEntry>): OutboxEntry => ({
  seq: 1,
  userId: 'u1',
  key: 'k',
  area: 'recipe',
  op: 'change',
  id: 'r1',
  baseRev: 3,
  base: { _id: 'r1', title: 'Celadon', rev: 3 },
  body: { recipe: { title: 'Celadon 2' } },
  queuedAt: 0,
  state: 'conflict',
  error: 'record-conflict',
  theirs: { _id: 'r1', title: 'Celadon theirs', rev: 4 },
  ...changes
});

function stub(conflicts: OutboxEntry[], failures: OutboxEntry[] = []) {
  const outbox = {
    conflicts: signal(conflicts),
    failures: signal(failures),
    resolve: vi.fn(() => Promise.resolve()),
    discardFailed: vi.fn(() => Promise.resolve())
  };
  TestBed.configureTestingModule({ providers: [...provideEnglish(), { provide: Outbox, useValue: outbox }] });
  return outbox;
}

const buttons = (root: HTMLElement) => [...root.querySelectorAll('button')];
const labels = (root: HTMLElement) => buttons(root).map((b) => b.textContent?.trim());

describe('OutboxConflictDialog', () => {
  it('asks nothing while no change waits for a decision', async () => {
    stub([]);
    const fixture = TestBed.createComponent(OutboxConflictDialog);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('offers Save mine as a copy (focused), Keep mine and Keep theirs for a changed record', async () => {
    const outbox = stub([entry({})]);
    const fixture = TestBed.createComponent(OutboxConflictDialog);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const dialog = root.querySelector('[role="alertdialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(root.querySelector('#conflict-body')?.textContent).toContain('Celadon 2');
    expect(labels(root)).toEqual(['Save mine as a copy', 'Keep mine', 'Keep theirs']);
    await vi.waitFor(() => expect(document.activeElement).toBe(buttons(root)[0]));

    buttons(root)[2].click();
    expect(outbox.resolve).toHaveBeenCalledWith(1, 'theirs');
    buttons(root)[1].click();
    expect(outbox.resolve).toHaveBeenCalledWith(1, 'mine');
    buttons(root)[0].click();
    expect(outbox.resolve).toHaveBeenCalledWith(1, 'copy');
    fixture.nativeElement.remove();
  });

  it('offers Save as new (focused) and Discard my changes for a record that is gone', async () => {
    const outbox = stub([entry({ error: 'record-gone', theirs: undefined })]);
    const fixture = TestBed.createComponent(OutboxConflictDialog);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(labels(root)).toEqual(['Save as new', 'Discard my changes']);
    await vi.waitFor(() => expect(document.activeElement).toBe(buttons(root)[0]));
    buttons(root)[1].click();
    expect(outbox.resolve).toHaveBeenCalledWith(1, 'discard');
    fixture.nativeElement.remove();
  });

  it('keeps the focus inside while it is open, and Escape puts the question off without losing the change', async () => {
    const outbox = stub([entry({})]);
    const fixture = TestBed.createComponent(OutboxConflictDialog);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const dialog = root.querySelector<HTMLElement>('[role="alertdialog"]')!;
    const last = buttons(root)[2];
    last.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons(root)[0]);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(root.querySelector('[role="alertdialog"]')).toBeNull();
    expect(outbox.resolve).not.toHaveBeenCalled();
    fixture.nativeElement.remove();
  });
});

describe('OutboxFailedList', () => {
  it('lists a refused change with Copy text and Remove', async () => {
    const outbox = stub(
      [],
      [entry({ state: 'failed', error: 'http-400', op: 'create', id: 'tmp:x', body: { title: 'Mine' } })]
    );
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const fixture = TestBed.createComponent(OutboxFailedList);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="status"]')?.textContent).toContain('A change to Mine could not be saved');
    buttons(root)[0].click();
    expect(writeText).toHaveBeenCalledWith('Mine');
    buttons(root)[1].click();
    expect(outbox.discardFailed).toHaveBeenCalledWith(1);
    Reflect.deleteProperty(navigator, 'clipboard');
  });
});
