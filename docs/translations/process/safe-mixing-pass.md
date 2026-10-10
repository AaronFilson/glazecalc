You are correcting one sentence and checking three wordings in the "Safe mixing and ventilation" guide of Glazecalc, a free, open source glaze chemistry web app for potters (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave2), in these languages: {LANGS}.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine.
- Edit only client/public/i18n/guides/safe-mixing/<code>.md for each of your languages. Never an English file, never another file.
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Follow each language's style sheet and glossary, docs/translations/<code>.md, for register and terms.

The English is client/public/i18n/guides/safe-mixing/en.md. For each of your languages:

1. **The shaving advice was wrong, and the English has been corrected** (section "Respirators", {#respirators}). It said:
   "- **Shave the same day.** Guidance differs on how recent "clean-shaven" must be: within 8 hours (a UK maker, citing HSE) or preferably within 12 (the Australian and New Zealand fit-test standard). Shaving on the day you work meets both."
   It now says:
   "- **Shave shortly before you work.** Guidance differs on how recent "clean-shaven" must be: within 8 hours (a UK maker, citing HSE) or preferably within 12 (the Australian and New Zealand fit-test standard). Shaving shortly before you work meets both."
   (Shaving in the morning does not meet an 8- or 12-hour limit for work in the evening.) Change the bold lead and the last sentence of that bullet in the translation to say what the new English says; leave the rest of the bullet as it is.
2. **"keep wet scraps in sealed containers"** ("Habits that matter most", "Keep it wet"): the translation must say sealed or tightly closed, not merely closed; the point is that the scraps cannot dry back into dust.
3. **"Buy ready-mixed glaze"** (the "Avoid powder" habit) and **"Buy ready-mixed wet glaze, and skip the powder"** (the order of preference): the translation must mean glaze already mixed with water. A word for "ready-made" glaze can mean a bought dry powder in some countries, which is the opposite of the advice.
4. **"powder"** in this guide means any dry powder: raw materials and bought powdered glazes alike. Where a translation narrowed it to "raw materials in powder form" (or similar), make it the plain word for powder(s), so that someone mixing a bought powdered glaze sees that the advice applies to them.

Change only what is wrong; most of these will already be right. Then run `npx prettier --write` on each file you changed, and `node scripts/i18n-check.mjs --language <code>` for each language; fix any problem in what you changed.

Report back in under 150 words: for each language, which of points 1–4 you changed (1 always), and anything you were unsure of.
