import { TestBed } from '@angular/core/testing';
import { provideEnglish } from '../testing/i18n';
import { OfflineAsk, OfflineAskDialog, type AskQuestion } from './offline-ask';
import { waitFor } from '../testing/test-providers';

const question = (changes: Partial<AskQuestion> = {}): AskQuestion => ({
  title: 'Keep it?',
  body: ['First paragraph.', 'Second paragraph.'],
  choices: [
    { id: 'keep', label: 'Keep on this device', primary: true },
    { id: 'delete', label: 'Delete from this device', danger: true },
    { id: 'cancel', label: 'Cancel' }
  ],
  cancel: 'cancel',
  ...changes
});

const buttons = (root: HTMLElement) => [...root.querySelectorAll('button')];

async function open(ask: AskQuestion) {
  TestBed.configureTestingModule({ providers: [...provideEnglish()] });
  const service = TestBed.inject(OfflineAsk);
  const fixture = TestBed.createComponent(OfflineAskDialog);
  document.body.append(fixture.nativeElement);
  const answer = service.ask(ask);
  await fixture.whenStable();
  return { service, fixture, answer, root: fixture.nativeElement as HTMLElement };
}

describe('OfflineAskDialog', () => {
  it('shows nothing until a question is asked', async () => {
    TestBed.configureTestingModule({ providers: [...provideEnglish()] });
    const fixture = TestBed.createComponent(OfflineAskDialog);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('is a labelled modal alert dialog, focuses the first answer, and resolves with the chosen id', async () => {
    const { fixture, answer, root } = await open(question());
    const dialog = root.querySelector('[role="alertdialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(root.querySelector('#ask-title')?.textContent).toBe('Keep it?');
    expect(dialog.getAttribute('aria-labelledby')).toBe('ask-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('ask-body');
    expect(root.querySelector('#ask-body')?.textContent).toContain('Second paragraph.');
    expect(buttons(root).map((b) => b.textContent?.trim())).toEqual([
      'Keep on this device',
      'Delete from this device',
      'Cancel'
    ]);
    await waitFor(() => expect(document.activeElement).toBe(buttons(root)[0]));
    buttons(root)[1].click();
    expect(await answer).toBe('delete');
    await fixture.whenStable();
    expect(root.querySelector('[role="alertdialog"]')).toBeNull();
    fixture.nativeElement.remove();
  });

  it('focuses the choice that asks for it', async () => {
    const { fixture, root } = await open(
      question({
        choices: [
          { id: 'delete', label: 'Delete', danger: true },
          { id: 'cancel', label: 'Cancel', primary: true, focus: true }
        ]
      })
    );
    await waitFor(() => expect(document.activeElement).toBe(buttons(root)[1]));
    fixture.nativeElement.remove();
  });

  it('keeps the focus inside, and Escape answers with the cancel choice', async () => {
    const { fixture, answer, root } = await open(question());
    const dialog = root.querySelector<HTMLElement>('[role="alertdialog"]')!;
    const last = buttons(root)[2];
    last.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons(root)[0]);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(await answer).toBe('cancel');
    fixture.nativeElement.remove();
  });

  it('a new question cancels an older one still open', async () => {
    const { service, fixture, answer } = await open(question());
    const next = service.ask(question({ title: 'Another?' }));
    expect(await answer).toBe('cancel');
    service.open()!.answer('keep');
    expect(await next).toBe('keep');
    fixture.nativeElement.remove();
  });
});
