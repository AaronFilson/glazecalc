import { ComponentFixture } from '@angular/core/testing';

/** The field of the picker (shared/picker.ts) in an element. */
export const pickerField = (root: ParentNode = document, nth = 0): HTMLInputElement =>
  root.querySelectorAll<HTMLInputElement>('input[role="combobox"]')[nth]!;

/** The options the open list shows, as text without the spaces the template leaves. */
export const pickerOptions = (root: ParentNode = document): string[] =>
  [...root.querySelectorAll('[role="option"]')].map((o) => (o.textContent ?? '').replace(/\s+/g, ' ').trim());

/** A key pressed in the field; true if the picker took it (the default was prevented). */
export async function press(fixture: ComponentFixture<unknown>, field: HTMLElement, key: string): Promise<boolean> {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  field.dispatchEvent(event);
  await fixture.whenStable();
  return event.defaultPrevented;
}

/** Text typed into the field, as a person types it. */
export async function type(fixture: ComponentFixture<unknown>, field: HTMLInputElement, text: string): Promise<void> {
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
}

/** Chooses an item as a person does: types its name, and presses Enter on the first that matches. */
export async function choosePicked(
  fixture: ComponentFixture<unknown>,
  field: HTMLInputElement,
  name: string
): Promise<void> {
  field.focus();
  await type(fixture, field, name);
  await press(fixture, field, 'Enter');
}
