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
          <li [id]="'thing-' + thing._id">
            {{ thing.name }}
            <gc-remove-button
              [name]="thing.name"
              [note]="note"
              [busy]="removal.isPending(thing)"
              [problem]="removal.problemFor(thing)"
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
    /** A button in one record's row, by its label or its text. */
    const button = (id: string, name: string) =>
      [...root.querySelectorAll(`#thing-${id} button`)].find(
        (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name
      ) as HTMLButtonElement;
    const press = async (id: string, name: string) => {
      button(id, name).click();
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
    await press('b', 'Remove Celadon');

    expect(text(fixture, '.remove-confirm')).toContain('Remove "Celadon"? This can\'t be undone.');
    expect(document.activeElement).toBe(button('b', 'Cancel'));
    await press('b', 'Cancel');
    expect(root.querySelector('.remove-confirm')).toBeNull();
    expect(document.activeElement).toBe(button('b', 'Remove Celadon'));
    httpMock().expectNone(API + '/things/delete/b');
  });

  it('names the question for screen readers, and closes it on Escape', async () => {
    const { fixture, root, button, press } = await create();
    await press('b', 'Remove Celadon');
    const group = root.querySelector('[role=group]')!;
    const label = document.getElementById(group.getAttribute('aria-labelledby')!);
    // As a screen reader reads it, with the spaces collapsed.
    expect(label?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Remove "Celadon"? This can\'t be undone.');

    button('b', 'Cancel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(root.querySelector('.remove-confirm')).toBeNull();
  });

  it('says more when there is more to know', async () => {
    const { fixture, press } = await create("Saved recipes keep their own copy, so they won't change.");
    await press('b', 'Remove Celadon');
    expect(text(fixture, '.remove-question')).toBe(
      'Remove "Celadon"? Saved recipes keep their own copy, so they won\'t change. This can\'t be undone.'
    );
  });

  it('removes once, then moves the focus to the next record', async () => {
    const { host, button, press, afterRemoval, fixture } = await create();
    await press('b', 'Remove Celadon');
    await press('b', 'Yes, remove');
    const yes = button('b', 'Removing...');
    expect(yes.getAttribute('aria-disabled')).toBe('true');
    yes.click(); // ignored while the first is on its way
    await fixture.whenStable();

    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/things/delete/b' })
      .flush({ msg: 'Successfully deleted thing' });
    await afterRemoval();
    expect(host.things().map((t) => t.name)).toEqual(['Shino', 'Tenmoku']);
    expect(host.notices.messages()).toEqual(['Removed "Celadon".']);
    expect(document.activeElement).toBe(button('c', 'Remove Tenmoku'));
  });

  it('removes several at once, each message replacing the last', async () => {
    const { host, press, afterRemoval } = await create();
    await press('b', 'Remove Celadon');
    await press('b', 'Yes, remove');
    await press('c', 'Remove Tenmoku');
    await press('c', 'Yes, remove');
    const requests = httpMock().match((req) => req.method === 'DELETE');
    expect(requests.map((req) => req.request.url)).toEqual([API + '/things/delete/b', API + '/things/delete/c']);
    requests.forEach((req) => req.flush({}));
    await afterRemoval();
    expect(host.things().map((t) => t.name)).toEqual(['Shino']);
    expect(host.notices.messages()).toEqual(['Removed "Tenmoku".']);
  });

  it("moves the focus to a neighbour's Cancel, not its Yes, when its question is open", async () => {
    const { button, press, afterRemoval } = await create();
    await press('c', 'Remove Tenmoku');
    await press('b', 'Remove Celadon');
    await press('b', 'Yes, remove');
    httpMock()
      .expectOne(API + '/things/delete/b')
      .flush({});
    await afterRemoval();
    expect(document.activeElement).toBe(button('c', 'Cancel'));
  });

  it('moves the focus to the record before the last one, then to the heading', async () => {
    const { host, root, button, press, afterRemoval, fixture } = await create();
    host.things.set(host.things().slice(0, 2));
    await fixture.whenStable();

    await press('b', 'Remove Celadon');
    await press('b', 'Yes, remove');
    httpMock()
      .expectOne(API + '/things/delete/b')
      .flush({});
    await afterRemoval();
    expect(document.activeElement).toBe(button('a', 'Remove Shino'));

    await press('a', 'Remove Shino');
    await press('a', 'Yes, remove');
    httpMock()
      .expectOne(API + '/things/delete/a')
      .flush({});
    await afterRemoval();
    const heading = root.querySelector('#mine');
    expect(document.activeElement).toBe(heading);
    expect(heading?.getAttribute('tabindex')).toBe('-1');
  });

  it('says why, in the question, when the server cannot remove it', async () => {
    const { host, fixture, root, button, press, afterRemoval } = await create();
    await press('b', 'Remove Celadon');
    await press('b', 'Yes, remove');
    httpMock()
      .expectOne(API + '/things/delete/b')
      .flush({ msg: 'The database is not answering.' }, { status: 500, statusText: 'Server Error' });
    await afterRemoval();

    expect(text(fixture, '.remove-problem')).toBe('The database is not answering.');
    expect(host.notices.errors()).toEqual([]);
    expect(host.things().length).toBe(3);
    expect(root.querySelector('.remove-confirm')).not.toBeNull();
    expect(button('b', 'Yes, remove').getAttribute('aria-disabled')).toBeNull();
  });

  it('treats a record the server no longer has as removed', async () => {
    const { host, press, afterRemoval } = await create();
    await press('b', 'Remove Celadon');
    await press('b', 'Yes, remove');
    httpMock()
      .expectOne(API + '/things/delete/b')
      .flush({ msg: 'No thing with that id' }, { status: 404, statusText: 'Not Found' });
    await afterRemoval();
    expect(host.things().map((t) => t.name)).toEqual(['Shino', 'Tenmoku']);
    expect(host.notices.messages()).toEqual(['"Celadon" was already removed.']);
  });
});
