You are checking the safety text of the {LANGUAGE} ({CODE}) translation of Glazecalc, a free, open source glaze chemistry web app for potters (repo C:\Users\bellows\gh\glazecalc, branch {BRANCH}), by translating it back into English and comparing (docs/i18n-plan.md, Phase 3). Readers are potters, many of them beginners, at home with children and pets; a meaning changed here could hurt someone.

Ground rules:

- Do not run git commands that change anything (no add, commit, checkout, stash, reset, restore).
- Edit only the translation text named under "What to check". Other agents are working on other files at the same time; never edit an English file.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).
- Write your scratch files only in {SCRATCH}backtranslation\ (create it if needed), named {CODE}-{PART}-….

What to check:
{WHAT}

Steps:

1. **Translate back, blind.** Read only the {LANGUAGE} text (not the English) and translate it into plain English, segment by segment, as literally as reads naturally. Write it to the scratch folder as {CODE}-{PART}-back.md (or .json). Do not open the English files until this is done, not even in the same step as the {LANGUAGE} file: the point is to see what a reader of the {LANGUAGE} actually learns. (Read the style sheet docs/translations/{CODE}.md only for terms; it quotes little English.)
2. **Compare.** Now read the English original beside your back-translation, segment by segment, and list every difference in meaning: an instruction changed or lost, a warning weakened or made stronger, a "never" or "always" or "unless" lost, a quantity, limit, time, temperature, filter class or phone number changed, who is at risk changed, a condition dropped, a step out of order, anything added. Ignore differences of wording that keep the meaning. "Should" and "must" are not the same: a "should" made "must" (or the reverse) is a difference.
3. **Fix.** For each real difference, correct the {LANGUAGE} translation so it says what the English says, in the style sheet's register and the glossary's terms (docs/translations/{CODE}.md). Then run `npx prettier --write` on the files you changed and `node scripts/i18n-check.mjs --language {CODE}`, and fix any problem in what you changed.
4. Write the list of differences and fixes to {CODE}-{PART}-report.md in the scratch folder: for each, the English, what the translation said (back-translated), and what you changed it to.

Report back in under 200 words: how many segments you compared, how many differences in meaning you found and fixed, the most serious ones in a line each, and anything you could not resolve.
