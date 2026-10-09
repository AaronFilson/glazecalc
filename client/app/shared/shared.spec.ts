import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { testProviders, text } from '../testing/test-providers';
import { localDate, optional } from './dates';
import { Notices, NoticesList } from './notices';
import { OXIDE_GROUPS } from '../../../lib/chemistry';
import { ADDITIVE_OXIDES, FIRED_OXIDES, FIRING_FIELDS, fieldsText, firingFieldLabel, firstOf } from './options';
import { TranslocoService } from '@jsverse/transloco';
import { textKey } from '../../../lib/regions/languages';
import { useCodedMessages } from '../i18n/coded';
import { standardText } from './library-info';
import { PageHeader } from './page-header';

describe('Notices', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

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

  it("replaces a topic's last message, and leaves the others", () => {
    const notices = new Notices();
    notices.error('There was an error in getting your materials.');
    notices.success('Saved "A".', 'save');
    notices.success('Removed "B".', 'remove');
    notices.success('Saved "A" again.', 'save');
    expect(notices.messages()).toEqual(['Removed "B".', 'Saved "A" again.']);
    expect(notices.errors()).toEqual(['There was an error in getting your materials.']);
    // Dismissed by hand, the next on its topic is simply added.
    notices.dismissMessage(1);
    notices.success('Saved "A" a third time.', 'save');
    expect(notices.messages()).toEqual(['Removed "B".', 'Saved "A" a third time.']);
  });

  it("replaces a calculation's warnings with the next one's, leaving other errors", () => {
    TestBed.inject(TranslocoService);
    const notices = new Notices();
    notices.error('Not saved.');
    notices.warnings(['Analysis of A totals 50.00%.']);
    expect(notices.errors()).toEqual(['Not saved.', 'Warning: Analysis of A totals 50.00%.']);
    notices.warnings(['Analysis of B totals 60.00%.']);
    expect(notices.errors()).toEqual(['Not saved.', 'Warning: Analysis of B totals 60.00%.']);
    notices.warnings([]);
    expect(notices.errors()).toEqual(['Not saved.']);
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
    // In regions that were there before the messages.
    expect(fixture.nativeElement.querySelector('[role=alert] .errors-section')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role=status] .server-msg')).not.toBeNull();

    fixture.debugElement.query(By.css('.errors-section button')).nativeElement.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.errors-section')).toBeNull();
  });
});

describe('PageHeader', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  const render = async (title: string, lead?: string) => {
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('title', title);
    if (lead) fixture.componentRef.setInput('lead', lead);
    await fixture.whenStable();
    return fixture;
  };

  it('shows the page title as the one h1, with its lead line', async () => {
    const fixture = await render('Recipes', 'Build a glaze.');
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    expect(text(fixture, 'h1')).toBe('Recipes');
    expect(text(fixture, '.lead-text')).toBe('Build a glaze.');
  });

  it('leaves the lead out when there is none', async () => {
    const fixture = await render('Trash');
    expect(fixture.nativeElement.querySelector('.lead-text')).toBeNull();
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
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    TestBed.inject(TranslocoService);
  });

  it('reads the first entry of list-or-text values', () => {
    expect(firstOf(['a', 'b'])).toBe('a');
    expect(firstOf('note')).toBe('note');
    expect(firstOf(undefined)).toBe('');
    expect(firstOf([])).toBe('');
  });

  it('offers only oxides the unity formula knows, each once', () => {
    for (const list of [FIRED_OXIDES, ADDITIVE_OXIDES]) {
      const values = list.map((option) => option.value);
      expect(values.filter((value) => !(value in OXIDE_GROUPS))).toEqual([]);
      expect(new Set(values).size).toBe(values.length);
    }
    expect(ADDITIVE_OXIDES.map((option) => option.value)).toEqual(expect.arrayContaining(['CoO', 'Sb2O3', 'P2O5']));
  });

  it('writes an analysis in percent and a formula in moles', () => {
    const fields = [
      { name: 'SiO2', amount: '68.5' },
      { name: 'Al2O3', amount: '17' }
    ];
    expect(fieldsText({ percentmole: 'percent', fields })).toBe('SiO₂ 68.5%, Al₂O₃ 17%');
    expect(fieldsText({ percentmole: 'molecular', fields })).toBe('SiO₂ : 68.5; Al₂O₃ : 17');
    expect(fieldsText({ fields })).toBe('SiO₂ : 68.5; Al₂O₃ : 17');
  });

  it('keeps all sixty firing log fields', () => {
    expect(FIRING_FIELDS).toHaveLength(60);
    expect(new Set(FIRING_FIELDS).size).toBe(60);
  });

  it('names each oxide and firing log column in the page’s language, and keeps a column it does not know', () => {
    expect(FIRED_OXIDES[0]!.label).toBe('Li₂O : Lithium oxide');
    expect(ADDITIVE_OXIDES.find((o) => o.value === 'Fe2O3')!.label).toBe('Fe₂O₃ : Iron oxide (ferric, red)');
    expect(FIRING_FIELDS.map(firingFieldLabel)).toEqual(FIRING_FIELDS);
    expect(firingFieldLabel('My own column')).toBe('My own column');
  });
});

describe('standard records’ words', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => {
    useCodedMessages(null);
    TestBed.inject(TranslocoService).setActiveLang('en');
  });

  it('shows a standard record’s notes translated, by a key made from exactly their English, and a potter’s own as written', () => {
    const transloco = TestBed.inject(TranslocoService);
    const note = 'Toxic. Almost insoluble.';
    expect(standardText({ ownedBy: 'Standard' }, note)).toBe(note);
    transloco.setTranslation({ ['records.' + textKey(note)]: 'Giftig. Fast unlöslich.' }, 'de');
    transloco.setActiveLang('de');
    useCodedMessages(transloco);
    expect(standardText({ ownedBy: 'Standard' }, note)).toBe('Giftig. Fast unlöslich.');
    expect(standardText({ ownedBy: 'someone' }, note)).toBe(note);
    // A changed note has no translation until it is translated again.
    expect(standardText({ ownedBy: 'Standard' }, 'Toxic. Almost insoluble in water.')).toBe(
      'Toxic. Almost insoluble in water.'
    );
    expect(standardText({ ownedBy: 'Standard' }, undefined)).toBe('');
  });
});
