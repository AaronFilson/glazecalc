/** A choice in a picker (shared/picker.ts). */
export interface PickerItem {
  readonly value: string;
  /** What is shown, and what the field holds once it is chosen. */
  readonly label: string;
  /** The language of the label, where it is not the page's: a language is named in itself. */
  readonly lang?: string;
  /** Shown after the label, muted: the English name of a language, which the search finds too. */
  readonly note?: string;
  /** More words that find it: the English name, the code. */
  readonly words?: readonly string[];
  /** The heading it is listed under; empty for none (listed first). The items of a group are together. */
  readonly group: string;
}

/**
 * Text as searched: without accents or case, so "turkce" finds Türkçe and "francais" Français. Decomposed, so
 * the Korean typed so far (한 as ᄒ and ᅡ) is the start of the name it will be; marks are dropped on both sides,
 * so they never get in the way of a match.
 */
export const fold = (text: string): string => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

/** The words of a folded text, each of which a typed word may be the start of. */
const wordsOf = (folded: string): string[] => folded.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * A search of the items: each word typed must be the start of a word of the label, its note, or its other words
 * ("deu" and "german" both find Deutsch; "pt" finds Português); where nothing matches that way, the middle of a
 * word will do ("rman" finds German). The items come back as they were given, so their groups stay together.
 */
export function searcher(items: readonly PickerItem[]): (query: string) => PickerItem[] {
  const index = items.map((item) => {
    const text = fold([item.label, item.note ?? '', ...(item.words ?? [])].join(' '));
    return { item, text, words: wordsOf(text) };
  });
  return (query) => {
    const typed = wordsOf(fold(query));
    if (!typed.length) return [...items];
    const starts = index.filter(({ words }) => typed.every((t) => words.some((w) => w.startsWith(t))));
    const found = starts.length ? starts : index.filter(({ text }) => typed.every((t) => text.includes(t)));
    return found.map(({ item }) => item);
  };
}

/** The items as the listbox draws them: runs of one group, each with its heading (none for no group). */
export interface PickerSection {
  readonly heading: string;
  readonly items: readonly PickerItem[];
}

export function sectionsOf(items: readonly PickerItem[]): PickerSection[] {
  const sections: { heading: string; items: PickerItem[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.heading === item.group) last.items.push(item);
    else sections.push({ heading: item.group, items: [item] });
  }
  return sections;
}
