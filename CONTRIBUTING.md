# Contributing

Thank you for helping. Glazecalc is a free, open source glaze chemistry app; issues and pull requests are welcome on
[GitHub](https://github.com/AaronFilson/glazecalc).

## Code

- Run `npm test`, `npm run test:client`, `npm run lint`, `npm run typecheck`, `npm run check:i18n` and
  `npm run format:check` before a pull request (`npm run format -- .` fixes the formatting). The [README](README.md)
  explains how to run the app and its browser tests.
- Text the app shows lives in messages files, never in the code: [docs/translating.md](docs/translating.md) says how
  to add or change it.
- Decisions that shaped the app are recorded in [docs/adr](docs/adr). The research behind them and behind the
  region data (the `reports/` and `research_notes/` some comments name) is kept outside the repository; each fact
  in `lib/regions` and `data/` carries its own source.

## Translations

Glazecalc is translated from English by AI, and every translated page says so. If something reads wrong in your
language, or a potter would say it differently:

- **The quickest way:** the notice at the top of a translated page links to a form, with the language and page filled
  in. Copy the words that read wrong and, if you know it, how a potter would say it. You can write in your own
  language. Tell us if it could mislead someone about safety; those are fixed first.
- **A pull request:** translations are plain JSON and Markdown beside the English
  (`client/public/i18n/<part>/<language>.json`, `client/public/i18n/guides/<guide>/<language>.md`).
  [docs/translations/README.md](docs/translations/README.md) gives the rules, and each language's glossary and style
  sheet is in `docs/translations/<language>.md`. `npm run check:i18n` checks a translation keeps the English's
  placeholders, numbers and links.

Each suggestion is checked against the English before it is merged, so the meaning stays the same in every language.
A correction to a term goes in the glossary too, so it is used everywhere.

Native potters' corrections are the best thing that can happen to these translations: thank you.
