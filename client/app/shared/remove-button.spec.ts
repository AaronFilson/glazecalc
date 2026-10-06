import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiResourceFactory } from '../core/api-resource.service';
import { Owned } from '../core/models';
import { API, httpMock, settle, testProviders, text } from '../testing/test-providers';
import { Notices } from './notices';
import { Removal, RemoveButton } from './remove-button';

interface Thing extends Owned {
  name: string;
}

@Component({
  imports: [RemoveButton],
  template: `
    <h1>Things</h1>
    <section>
      <h2 id="mine">My things</h2>
      <ul>
        @for (thing of things(); track thing._id) {
          <li>
            {{ thing.name }}
            <gc-remove-button
              [name]="thing.name"
              [note]="note"
              [busy]="removal.isPending(thing)"
              (confirmed)="removal.remove(thing)"
            />
          </li>
        }
      </ul>
    </section>
  `
})
class Host {
  readonly notices = new Notices();
  readonly things = signal<Thing[]>([
    { _id: 'a', name: 'Shino' },
    { _id: 'b', name: 'Celadon' },
    { _id: 'c', name: 'Tenmoku' }
  ]);
  note = '';
  readonly removal = new Removal(
    inject(ApiResourceFactory).for<Thing>('things'),
    this.things,
    this.notices,
    (t) => t.name
  );
}

describe('RemoveButton', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async (note = '') => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.note = note;
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const button = (name: string) =>
      [...root.querySelectorAll('button')].find(
        (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name
      ) as HTMLButtonElement;
    const press = async (name: string) => {
      button(name).click();
      await fixture.whenStable();
    };
    // The list re-renders without the record, then the focus moves.
    const afterRemoval = async () => {
      await settle(fixture);
      await settle();
    };
    return { fixture, host: fixture.componentInstance, root, button, press, afterRemoval };
  };

  it('asks first, starting on Cancel, and Cancel keeps the record', async () => {
    const { fixture, root, button, press } = await create();
    expect(root.querySelector('.remove-confirm')).toBeNull();
    await press('Remove Celadon');

    expect(text(fixture, '.remove-confirm')).toContain('Remove "Celadon"? This can\'t be undone.');
    expect(document.activeElement).toBe(button('Cancel'));
    await press('Cancel');
    expect(root.querySelector('.remove-confirm')).toBeNull();
    expect(document.activeElement).toBe(button('Remove Celadon'));
    httpMock().expectNone(API + '/things/delete/b');
  });

  it('closes the question on Escape', async () => {
    const { root, button, press, fixture } = await create();
    await press('Remove Celadon');
    button('Cancel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(root.querySelector('.remove-confirm')).toBeNull();
  });

  it('says more when there is more to know', async () => {
    const { fixture, press } = await create("Saved recipes keep their own copy, so they won't change.");
    await press('Remove Celadon');
    expect(text(fixture, '.remove-question')).toBe(
      'Remove "Celadon"? Saved recipes keep their own copy, so they won\'t change. This can\'t be undone.'
    );
  });

  it('removes once, then moves the focus to the next record', async () => {
    const { host, button, press, afterRemoval, fixture } = await create();
    await press('Remove Celadon');
    await press('Yes, remove');
    const yes = button('Removing...');
    expect(yes.getAttribute('aria-disabled')).toBe('true');
    yes.click(); // ignored while the first is on its way
    await fixture.whenStable();

    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/things/delete/b' })
      .flush({ msg: 'Successfully deleted thing' });
    await fixture.whenStable();
    await afterRemoval();
    expect(host.things().map((t) => t.name)).toEqual(['Shino', 'Tenmoku']);
    expect(host.notices.messages()).toEqual(['Removed "Celadon".']);
    expect(document.activeElement).toBe(button('Remove Tenmoku'));
  });

  it('moves the focus to the record before the last one, then to the heading', async () => {
    const { host, root, button, press, afterRemoval, fixture } = await create();
    host.things.set(host.things().slice(0, 2));
    await fixture.whenStable();

    await press('Remove Celadon');
    await press('Yes, remove');
    httpMock()
      .expectOne(API + '/things/delete/b')
      .flush({});
    await fixture.whenStable();
    await afterRemoval();
    expect(document.activeElement).toBe(button('Remove Shino'));

    await press('Remove Shino');
    await press('Yes, remove');
    httpMock()
      .expectOne(API + '/things/delete/a')
      .flush({});
    await fixture.whenStable();
    await afterRemoval();
    const heading = root.querySelector('#mine');
    expect(document.activeElement).toBe(heading);
    expect(heading?.getAttribute('tabindex')).toBe('-1');
  });

  it('keeps the record and the question when the server says no', async () => {
    const { host, root, button, press, afterRemoval, fixture } = await create();
    await press('Remove Celadon');
    await press('Yes, remove');
    httpMock()
      .expectOne(API + '/things/delete/b')
      .flush({ msg: 'Not found' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    await afterRemoval();

    expect(host.notices.errors()).toEqual(['Not found']);
    expect(host.things().length).toBe(3);
    expect(root.querySelector('.remove-confirm')).not.toBeNull();
    expect(button('Yes, remove').getAttribute('aria-disabled')).toBeNull();
  });
});
