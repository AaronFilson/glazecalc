import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService } from '../core/auth.service';
import { testProviders, text } from '../testing/test-providers';
import { localDate, optional } from './dates';
import { Notices, NoticesList } from './notices';
import { ADDITIVE_COMPONENTS, FIRING_FIELDS, firstOf, subscript } from './options';
import { PageNav } from './page-nav';

describe('Notices', () => {
  it('collects and dismisses errors and messages by position', () => {
    const notices = new Notices();
    notices.error('one');
    notices.error('two');
    notices.success('saved');
    notices.dismissError(0);
    expect(notices.errors()).toEqual(['two']);
    notices.dismissMessage(0);
    expect(notices.messages()).toEqual([]);
  });

  it('renders the lists and dismisses from the page', async () => {
    const notices = new Notices();
    notices.error('Missing required information');
    notices.success('Saved');
    const fixture = TestBed.createComponent(NoticesList);
    fixture.componentRef.setInput('notices', notices);
    await fixture.whenStable();

    expect(text(fixture, '.errors-section')).toBe('Missing required information Dismiss');
    expect(text(fixture, '.server-msg')).toBe('Saved Dismiss');

    fixture.debugElement.query(By.css('.errors-section button')).nativeElement.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.errors-section')).toBeNull();
  });
});

describe('PageNav', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  const render = async (current: string) => {
    const fixture = TestBed.createComponent(PageNav);
    fixture.componentRef.setInput('current', current);
    await fixture.whenStable();
    return fixture;
  };

  it('links to every other page', async () => {
    const fixture = await render('recipe');
    const links = [...fixture.nativeElement.querySelectorAll('nav a')].map((a: HTMLAnchorElement) => a.textContent?.trim());
    expect(links).toEqual(['additive', 'advice', 'firing', 'home', 'material', 'notes']);
    expect(text(fixture, 'nav h3')).toBe('You are on the Recipe page.');
  });

  it('warns only when nobody is signed in', async () => {
    const fixture = await render('home');
    expect(text(fixture, 'header')).toContain('not signed in');

    TestBed.inject(AuthService).email.set('a@b.com');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('header')).toBeNull();
  });
});

describe('dates', () => {
  it('uses the local calendar date, not the UTC one', () => {
    // 11:30pm local on Oct 4 is already Oct 5 in UTC for zones west of Greenwich.
    expect(localDate(new Date(2026, 9, 4, 23, 30))).toBe('2026-10-04');
    expect(localDate(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02');
  });

  it('drops blank optional text', () => {
    expect(optional('  ')).toBeUndefined();
    expect(optional('Electric')).toBe('Electric');
  });
});

describe('options', () => {
  it('writes formula digits as subscripts', () => {
    expect(subscript('Al2O3')).toBe('Al₂O₃');
    expect(subscript('CaO')).toBe('CaO');
  });

  it('reads the first entry of list-or-text values', () => {
    expect(firstOf(['a', 'b'])).toBe('a');
    expect(firstOf('note')).toBe('note');
    expect(firstOf(undefined)).toBe('');
    expect(firstOf([])).toBe('');
  });

  it('stores real oxide formulas for the additive picker', () => {
    const values = ADDITIVE_COMPONENTS.map((c) => c.value);
    expect(values).toContain('Sb2O3');
    expect(values).toContain('P2O5');
    expect(new Set(values).size).toBe(values.length);
  });

  it('keeps all sixty firing log fields', () => {
    expect(FIRING_FIELDS).toHaveLength(60);
    expect(new Set(FIRING_FIELDS).size).toBe(60);
  });
});
