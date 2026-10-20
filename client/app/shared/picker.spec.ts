import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { pickerField, pickerOptions, press, type } from '../testing/picker';
import { testProviders } from '../testing/test-providers';
import { Picker } from './picker';
import { PickerItem } from './picker-search';

const item = (value: string, label: string, english: string, group = ''): PickerItem => ({
  value,
  label,
  lang: value,
  note: english === label ? undefined : english,
  words: [value, english],
  group
});

const ITEMS = [
  item('en', 'English', 'English'),
  item('ja', '日本語', 'Japanese', 'East Asia'),
  item('ko', '한국어', 'Korean', 'East Asia'),
  item('bg', 'Български', 'Bulgarian', 'Europe'),
  item('de', 'Deutsch', 'German', 'Europe'),
  item('fr', 'Français', 'French', 'Europe'),
  item('tr', 'Türkçe', 'Turkish', 'Middle East')
];

@Component({
  imports: [Picker],
  template: `<label for="pick">Language</label>
    <gc-picker
      inputId="pick"
      label="Language"
      [items]="items"
      [value]="value()"
      placeholder="Search languages"
      showAll="Show all languages"
      noMatch="No language matches"
      (chosen)="chosen.push($event)"
    />`
})
class Host {
  readonly items = ITEMS;
  readonly value = signal('de');
  readonly chosen: string[] = [];
}

describe('Picker', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  const create = async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const field = pickerField(root);
    const list = () => root.querySelector('[role="listbox"]');
    const active = () => root.querySelector('[role="option"].active')?.textContent?.replace(/\s+/g, ' ').trim();
    const status = () => root.querySelector('[role="status"]')!;
    const open = async () => {
      field.focus();
      field.click();
      await fixture.whenStable();
    };
    return { fixture, root, field, list, active, status, open, host: fixture.componentInstance };
  };

  it('is a combobox named by its label, showing the choice, with no list until it is wanted', async () => {
    const { root, field, list } = await create();
    expect(field.getAttribute('role')).toBe('combobox');
    expect(field.getAttribute('aria-autocomplete')).toBe('list');
    expect(field.getAttribute('aria-expanded')).toBe('false');
    expect(field.hasAttribute('aria-controls')).toBe(false);
    expect(field.hasAttribute('aria-activedescendant')).toBe(false);
    expect(field.labels?.[0]?.textContent).toBe('Language');
    expect(field.value).toBe('Deutsch');
    expect(field.getAttribute('lang')).toBe('de');
    expect(field.getAttribute('dir')).toBe('auto');
    expect(list()).toBeNull();
    // For a pointer; the keyboard has the field.
    const toggle = root.querySelector('button')!;
    expect(toggle.getAttribute('aria-label')).toBe('Show all languages');
    expect(toggle.getAttribute('tabindex')).toBe('-1');
  });

  it('opens on a click with the groups, each with its heading, and the choice marked and in focus', async () => {
    const { root, field, list, active, open } = await create();
    await open();
    expect(field.getAttribute('aria-expanded')).toBe('true');
    expect(field.getAttribute('aria-controls')).toBe(list()!.id);
    expect(list()!.getAttribute('aria-label')).toBe('Language');
    // English first, with no heading; then the groups in the order given, each named by its heading.
    const groups = [...root.querySelectorAll('[role="group"]')];
    expect(groups.map((g) => g.getAttribute('aria-labelledby'))).toEqual(
      groups.map((g) => g.querySelector('[role="presentation"]')!.id)
    );
    expect(groups.map((g) => g.querySelector('[role="presentation"]')!.textContent)).toEqual([
      'East Asia',
      'Europe',
      'Middle East'
    ]);
    expect(list()!.firstElementChild!.getAttribute('role')).toBe('option');
    expect(pickerOptions(root)).toEqual([
      'English',
      '日本語 Japanese',
      '한국어 Korean',
      'Български Bulgarian',
      'Deutsch German',
      'Français French',
      'Türkçe Turkish'
    ]);
    // Only the choice is selected, and it has the visual focus, which the field names.
    const selected = [...root.querySelectorAll('[role="option"]')].filter(
      (o) => o.getAttribute('aria-selected') === 'true'
    );
    expect(selected.map((o) => o.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Deutsch German']);
    expect(field.getAttribute('aria-activedescendant')).toBe(selected[0]!.id);
    expect(active()).toBe('Deutsch German');
    // Names are set apart, in their own language; the English beside is marked as English.
    expect(selected[0]!.querySelector('bdi')!.getAttribute('lang')).toBe('de');
    expect(selected[0]!.querySelector('.picker-note')!.getAttribute('lang')).toBe('en');
    // The focus stays in the field.
    expect(document.activeElement).toBe(field);
  });

  it('narrows to what is typed, by a language’s own name or its English name, and says how many match', async () => {
    const { fixture, root, field, active, status, open } = await create();
    await open();
    await type(fixture, field, 'german');
    expect(pickerOptions(root)).toEqual(['Deutsch German']);
    expect(active()).toBe('Deutsch German');
    expect(status().textContent?.trim()).toBe('1 match');
    expect(status().classList.contains('visually-hidden')).toBe(true);
    await type(fixture, field, 'turkce');
    expect(pickerOptions(root)).toEqual(['Türkçe Turkish']);
    await type(fixture, field, 'ko');
    expect(pickerOptions(root)).toEqual(['한국어 Korean']);
    await type(fixture, field, 'fr');
    expect(pickerOptions(root)).toEqual(['Français French']);
    // Two groups left, and only those.
    await type(fixture, field, 'ja');
    expect(pickerOptions(root)).toEqual(['日本語 Japanese']);
    expect(root.querySelectorAll('[role="group"]')).toHaveLength(1);
    await type(fixture, field, '');
    expect(pickerOptions(root)).toHaveLength(ITEMS.length);
    expect(status().textContent?.trim()).toBe('');
  });

  it('says so, in view, when nothing matches, and then has no list', async () => {
    const { fixture, field, list, status, open, host } = await create();
    await open();
    await type(fixture, field, 'klingon');
    expect(list()).toBeNull();
    expect(field.getAttribute('aria-expanded')).toBe('false');
    expect(field.hasAttribute('aria-activedescendant')).toBe(false);
    expect(status().textContent?.trim()).toBe('No language matches');
    expect(status().classList.contains('visually-hidden')).toBe(false);
    // Enter has nothing to choose.
    expect(await press(fixture, field, 'Enter')).toBe(false);
    expect(host.chosen).toEqual([]);
    // Escape puts the choice back.
    await press(fixture, field, 'Escape');
    expect(field.value).toBe('Deutsch');
    expect(status().textContent?.trim()).toBe('');
  });

  it('chooses with Enter, once, and keeps the focus and the choice in the field', async () => {
    const { fixture, field, list, open, host } = await create();
    await open();
    await type(fixture, field, 'japanese');
    expect(await press(fixture, field, 'Enter')).toBe(true);
    expect(host.chosen).toEqual(['ja']);
    expect(list()).toBeNull();
    expect(field.value).toBe('日本語');
    expect(field.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(field);
    // The host takes it up.
    host.value.set('ja');
    await fixture.whenStable();
    expect(field.value).toBe('日本語');
    // The one already chosen is not chosen again.
    await open();
    await type(fixture, field, 'japanese');
    await press(fixture, field, 'Enter');
    expect(host.chosen).toEqual(['ja']);
  });

  it('moves through the list with the arrow keys, round the ends, and by pages', async () => {
    const { fixture, field, active, list } = await create();
    // Closed: the down arrow opens it at the choice.
    expect(await press(fixture, field, 'ArrowDown')).toBe(true);
    expect(list()).not.toBeNull();
    expect(active()).toBe('Deutsch German');
    await press(fixture, field, 'ArrowDown');
    expect(active()).toBe('Français French');
    await press(fixture, field, 'ArrowDown');
    expect(active()).toBe('Türkçe Turkish');
    await press(fixture, field, 'ArrowDown');
    expect(active()).toBe('English');
    await press(fixture, field, 'ArrowUp');
    expect(active()).toBe('Türkçe Turkish');
    await press(fixture, field, 'PageUp');
    expect(active()).toBe('English');
    await press(fixture, field, 'PageDown');
    expect(active()).toBe('Türkçe Turkish');
    expect(field.getAttribute('aria-activedescendant')).toBe(document.querySelector('[role="option"].active')!.id);
    // Enter chooses what has the focus.
    await press(fixture, field, 'ArrowUp');
    await press(fixture, field, 'Enter');
    expect(list()).toBeNull();
    expect(field.value).toBe('Français');
  });

  it('opens on the up arrow too, and closes on Escape without choosing, keeping the key from the page', async () => {
    const { fixture, field, list, active, open, host } = await create();
    await press(fixture, field, 'ArrowUp');
    expect(active()).toBe('Deutsch German');
    await press(fixture, field, 'Escape');
    expect(list()).toBeNull();
    const page = vi.fn();
    document.addEventListener('keydown', page);
    try {
      // Typed and not chosen: Escape puts the choice back.
      await open();
      await type(fixture, field, 'fran');
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      field.dispatchEvent(event);
      await fixture.whenStable();
      expect(event.defaultPrevented).toBe(true);
      expect(list()).toBeNull();
      expect(field.value).toBe('Deutsch');
      expect(host.chosen).toEqual([]);
      // With the list closed, Escape is the page's (the phone menu closes on it).
      expect(page).not.toHaveBeenCalled();
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      expect(page).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('keydown', page);
    }
  });

  it('closes when the focus leaves, and puts the choice back for what was typed and not chosen', async () => {
    const { fixture, field, list, open, host } = await create();
    await open();
    await type(fixture, field, 'fran');
    field.blur();
    await fixture.whenStable();
    expect(list()).toBeNull();
    expect(field.value).toBe('Deutsch');
    expect(host.chosen).toEqual([]);
  });

  it('ignores the keys of a composition, which are for the input method', async () => {
    const { fixture, field, list, open, host } = await create();
    await open();
    await type(fixture, field, 'ja');
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    await fixture.whenStable();
    expect(list()).not.toBeNull();
    expect(host.chosen).toEqual([]);
  });

  it('chooses an option that is clicked, without the list taking the focus from the field', async () => {
    const { fixture, root, field, open, host } = await create();
    await open();
    const options = [...root.querySelectorAll<HTMLElement>('[role="option"]')];
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    options[1]!.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    options[1]!.click();
    await fixture.whenStable();
    expect(host.chosen).toEqual(['ja']);
    expect(field.value).toBe('日本語');
    expect(document.activeElement).toBe(field);
  });

  it('opens and closes from its button, with the focus in the field', async () => {
    const { fixture, root, field, list } = await create();
    const toggle = root.querySelector('button')!;
    toggle.click();
    await fixture.whenStable();
    expect(list()).not.toBeNull();
    expect(document.activeElement).toBe(field);
    toggle.click();
    await fixture.whenStable();
    expect(list()).toBeNull();
  });

  it('shows the item the host says is chosen, and nothing while none is', async () => {
    const { fixture, field, host } = await create();
    host.value.set('tr');
    await fixture.whenStable();
    expect(field.value).toBe('Türkçe');
    host.value.set('');
    await fixture.whenStable();
    expect(field.value).toBe('');
    expect(field.placeholder).toBe('Search languages');
  });
});
