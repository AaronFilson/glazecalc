You are writing the style sheet and glossary for translating Glazecalc, a free, open source glaze chemistry web app for potters (repo C:\Users\bellows\gh\glazecalc, branch {BRANCH}), into {LANGUAGE} ({CODE}), for potters in {COUNTRY}. Translators (Claude agents) will follow your page for every message and guide, so a potter meets one {LANGUAGE} word for one thing everywhere. Nobody else checks it before they start, so where you are unsure, say so in the Notes.

Ground rules:

- Do not run git commands that change anything (no add, commit, checkout, stash, reset, restore).
- Create or edit only docs/translations/{CODE}.md. Other agents are writing other languages' pages at the same time; never touch theirs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).

Read first:

1. docs/translations/README.md: the rules every translation follows (placeholders, tags, plural forms, numbers, links, guide marks).
2. docs/translations/terms.md in full: every English term, with the sense it has in Glazecalc. Your glossary gives one {LANGUAGE} term for every row, in the same sections and order.
3. docs/translations/fi.md and docs/translations/hr.md: two finished pages of the same kind. Follow their structure exactly: an opening paragraph, "Main sources, cited below by short name", "## 1. Style sheet" with the same subsections (Register; Buttons, menus, headings, labels and tabs; Capitalisation; Punctuation; Numbers and units; Plural forms; Cones; The unity formula; Gender-neutral wording; The reader in the guides; The app's feature names; EU law; Pitfalls), "## 2. Glossary" with the nine tables (English | {LANGUAGE} | Notes), and "## 3. Never translated".
4. For context on what is translated: client/public/i18n/en.json and client/public/i18n/guides/glazing-basics/en.md (skim). The region data for {COUNTRY} is in lib/regions (suppliers.js, safety.js, workplace.js, food.js; region code {REGION}).

Research (the point of this page): the terms come from sources in {LANGUAGE}, never from a dictionary alone. Look for, in this order:

- shops that sell glaze materials, kilns and cones to potters in {COUNTRY}, in {LANGUAGE}: their category names and product names (what is printed on the bag). {SHOPS}
- {LANGUAGE} ceramics textbooks, art-school and university course material, potters' guilds and studio pages, {LANGUAGE} Wikipedia's ceramics articles;
- kiln makers' manuals in {LANGUAGE} (Nabertherm publishes many languages; also Rohde, Uhlig);
- the {LANGUAGE} texts of EU law on EUR-Lex: Regulation (EC) No 1272/2008 (CLP: hazard words, H-statements, "safety data sheet"), Directive 84/500/EEC (ceramic articles in contact with food: its name and its categories of articles, which the food-contact text must follow), Directive 2004/37/EC (carcinogens; respirable crystalline silica), and the national law on chemical agents at work and its silica limit;
- the national bodies: the labour inspectorate or occupational health institute (dust, respirators), the poison centre;
- IATE (iate.europa.eu) and the national term bank of {LANGUAGE} ({TERMBANK}), and the Microsoft {LANGUAGE} style guide for software conventions (register, buttons, punctuation, quotation marks).

Cite each source once in "Main sources" with its link and the day you read it (today), and by short name in the Notes. Where sources disagree, give the choice and why. Where you found nothing in {LANGUAGE}, say "No source" and give your best term: those rows are for a native potter to check. Note any source you could not reach. If web search runs out, keep going from what you have and say which rows rest on less.

What the glossaries of the languages before yours got wrong, or had to settle later:

- "leach test" is a test of the metals a fired piece releases. Do not narrow it to lead and cadmium; the English names those two where it means them.
- "guide" (the app's five guides) and a kiln's own "manual" must be two different words, so a reader never confuses them. Give the guide titles' word and say it is used in every link, page title and list.
- specific gravity (SG): give the word or abbreviation {COUNTRY} potters use for a glaze's density, as a key in the style sheet (guides.density.sg writes it, for example German "spez. Gewicht {value}"). Check that it means relative density, not density in kg/m³.
- A cone is "one number hotter" or "one number cooler", never higher or lower (cone 05 is cooler than 04). Give the wording.
- Ring {n} in a firing log is the reading of a pyrometric (Buller's or Holdcroft) ring, not a jewellery ring.
- "calcium borate frit" is a frit of calcium and boron, not a calcium borosilicate. "Fusion" on a Ferro data sheet is a melting point, not nuclear fusion.
- "should" and "must" in safety text: give the {LANGUAGE} forms that keep them apart (should is not must, must is not should), and that "must be tested" means the test must be done, not passed; "some" (some fine quartz) is not "a little".
- Register: the formal one. Say whether {LANGUAGE} software addresses the reader with a formal pronoun or impersonally, from the Microsoft style guide and current {LANGUAGE} software, and give examples of a button, an error and a guide sentence.
- Plural forms: list every CLDR category {LANGUAGE} has (cardinal), with the rule and an example of each with a glaze word ("1 material", "2 materials", ...), and the case a noun takes after a number. The README lists only the first wave's.
- Numbers: decimal separator, thousands separator, the space before units and %, dates, the 24-hour clock, how "8pm" and "8 to 5" are written. The check keeps every figure, so the style sheet must say how 1.5 and 1,000 are written.
- Placeholders ({name}, {region}, {library}) and trade names cannot take case endings. Say how to build a sentence around them (a generic noun in the needed case beside them), with examples. {region} is a country's name in the page's language, from the browser's own country names.
- Quotation marks, dashes, the space rules, and capitalisation of titles and headings.
- Pitfalls: false friends and words with two senses in {LANGUAGE} pottery (glaze vs enamel vs varnish, frit vs flux, kiln vs oven, earthenware vs faience, whiting vs lime, the material vs the oxide, a respirator vs a ventilator), each with the choice.
- "## 3. Never translated": formulas, cone numbers, trade names and codes, units.

Write the page in English, with the {LANGUAGE} terms, as the finished pages are. Every row of terms.md must have a row; check this with a short Node script that compares the English column of your tables with the terms.md rows, and fix any gap. Then run `npx prettier --write docs/translations/{CODE}.md`.

Report back in under 150 words: the number of rows, the sources you relied on most, what you could not reach, and the rows a native potter should check first. Do not paste the page.
