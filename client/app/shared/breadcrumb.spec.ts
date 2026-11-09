import { TestBed } from '@angular/core/testing';
import { testProviders, settle } from '../testing/test-providers';
import { Breadcrumb } from './breadcrumb';

// The trail above a page's title: a navigation landmark with an ordered list (W3C APG breadcrumb pattern).

describe('Breadcrumb', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  async function render(crumbs: { name: string; path: string }[]) {
    const fixture = TestBed.createComponent(Breadcrumb);
    fixture.componentRef.setInput('crumbs', crumbs);
    await settle(fixture);
    return fixture.nativeElement as HTMLElement;
  }

  const trail = [
    { name: 'Glazecalc', path: '/' },
    { name: 'Materials', path: '/materials' },
    { name: 'Silica', path: '/materials/silica' }
  ];

  it('is a labelled navigation with an ordered list of the trail, in order', async () => {
    const root = await render(trail);
    const nav = root.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(nav.querySelector('ol')).not.toBeNull();
    expect([...nav.querySelectorAll('li')].map((li) => li.textContent!.trim())).toEqual([
      'Glazecalc',
      'Materials',
      'Silica'
    ]);
  });

  it('links every step but the last, and marks the last as the current page', async () => {
    const root = await render(trail);
    expect([...root.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Glazecalc', '/'],
      ['Materials', '/materials']
    ]);
    const current = root.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toBe('Silica');
    expect(current[0]!.closest('a')).toBeNull();
    expect(root.querySelector('li:last-child')!.contains(current[0]!)).toBe(true);
  });

  it('has no separator characters in its text, for a screen reader', async () => {
    const root = await render(trail);
    expect(root.textContent!.replace(/\s+/g, '')).toBe('GlazecalcMaterialsSilica');
  });

  it('follows its crumbs when they change', async () => {
    const fixture = TestBed.createComponent(Breadcrumb);
    fixture.componentRef.setInput('crumbs', trail);
    await settle(fixture);
    fixture.componentRef.setInput('crumbs', trail.slice(0, 2));
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('li')).toHaveLength(2);
    expect(root.querySelector('[aria-current="page"]')!.textContent).toBe('Materials');
  });
});
