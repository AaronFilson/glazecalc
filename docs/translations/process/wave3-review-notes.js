// Adds the translators' flags to a language's review prompts:  node wave3-review-notes.js lt
const fs = require('fs');
const S = __dirname + '/';
const NOTES = {
  lt: {
    'app-parts': [
      'The translator wrote "Use instead:" as „Vietoj to naudokite:“ where the glossary has „Naudoti vietoj:“ (read as "use in place of"); check which reads right where it appears.',
      'The translator rendered "also called the Seger formula" by giving the English name instead; check that nothing the English says is lost.',
      "The glossary's „Parduotuvės šiose šalyse:“ is plural but labels a one-country list; and its wording for `shelf-invalid` reads like a label, not an error. Fix the translation if so.",
      '"token" is „žetonas“ in site/lt.json and „prieigos raktas“ elsewhere: make it one word in your files and say which.'
    ],
    recipe: [
      'The translator wrote `pool.oxideNames` in the genitive (kalio, aliuminio oksido) because every message that inserts them needs that case (pool.supplies*, page.shortfall, page.choicePercent, page.stillShortNote, swapReport.unreachable). Check each of those reads correctly with them, and that no other message inserts them in another case.',
      'The quotation marks around "Must use" were dropped, following the style sheet on UI labels; check the sentence still makes clear it names a label.'
    ],
    records: [
      'Entry #239: "the parent rock is quartz and cristobalite" means the rock contains them; check the translation does not say more or less.'
    ],
    'basics-making': [
      'The glossary used to ask for a temperature after the first "mid fire"; that rule is gone (the check keeps exactly the English\'s figures). Add no figures.'
    ],
    firing: [
      'The kiln-sitter steps say "trigger" and a later check says "trigger plate"; check the translation names the same part the English names in each place.',
      'Orton as a subject is „Ortonas“ (the glossary gives only the genitive „Ortono“).'
    ],
    'safety-guides': [
      '"Utah" alone means the University of Utah (written „Jutos universitetas“); HSE is glossed at its first use. Check both against the English.'
    ]
  },
  lv: {
    'app-parts': [
      'The emails capitalise „Jūs“ (the letter exception the style sheet quotes from Microsoft); the app itself writes it in lower case. Check this is what the style sheet says.',
      "The `*-choices` server messages add each setting's code in brackets („gaišs (light)“), because the English words are the codes; Polish does the same. Keep if it reads well.",
      '"token" is „marķieris“; the site\'s "also called the Seger formula" became „(angļu valodā unity molecular formula, UMF)“: check nothing the English says is lost; the date placeholders come after a colon because they arrive in the nominative.',
      'The column the English calls "Elements" lists oxides; translate what the English says unless the glossary decides otherwise.'
    ],
    recipe: [
      '`compare.balance` is „Attiecība“ (ratio), but the rows under it include loss on ignition and expansion, which are not ratios: check whether a better word fits.',
      '`pool.supplies*` read „{oxide} – viss daudzums / lielākā daļa / {percent}%“ because the oxide names cannot take case endings; `removeLine`, `takenOut`, `amountOf` and `notANumber` serve additives too, so they use a label form („Daudzums: {name}“). Check each reads naturally.'
    ],
    records: [
      'The translator made "keep only for old recipes" (Laguna Borate, the Plainsman substitute) an instruction; check against the English whether it is an instruction or a note.',
      'The halloysite hazard: "the parent rock is quartz and cristobalite" means the rock contains them; check the translation says that.'
    ],
    'basics-making': [
      'making-a-glaze, line blends: "well-mixed ends of even SG" means end glazes of the same SG as each other (so that mixing by volume matches mixing by weight). The translator wrote „vienmērīgu“ (uniform): fix it to say the ends have the same SG.',
      "People's names take Latvian form with the original in brackets at first mention (Hermanis Zēgers (Hermann Seger)); check this is done the same way in both guides.",
      'The glossary used to ask for a temperature after the first "mid fire"; that rule is gone. Add no figures.'
    ],
    firing: [
      'The cone-pack table\'s "The ware is nearing maturity" was rendered with the glossary\'s „tuvu pilnīgai izkušanai“ (near full melting), which fits glaze but not bisque: use wording that fits both.',
      '`{{en: kiln sitter}}` was left out because the Latvian term is already "Kiln-Sitter"; the Low/Medium/High switch positions stay in English, explained once. Check both read well.',
      "The English says Orton's end point is \"6 o'clock, the tip level with the base\"; that sentence will be corrected in English later (Orton's chart says a 90° bend, 5 o'clock). Translate what the English says now."
    ],
    'safety-guides': [
      'Respirable crystalline silica: the Latvian legal texts write „ieelpojamais“ (inhalable) where the English says respirable; the glossary keeps the legal term and explains once that it means dust fine enough to reach the alveoli („respiratorā frakcija“). Check that the guides make the respirable meaning plain, so nobody reads it as any inhaled dust.',
      '"spilled" is „izbēris vai izlējis“ (powder or liquid); the fire extinguisher is „ABC tipa ugunsdzēsības aparāts“; the SDS sections use the Latvian REACH headings; "Directive 2017/2398" is written in its official form (ES) 2017/2398. Check against the English.'
    ]
  },
  et: {
    'app-parts': [
      'The region pickers\' labels follow the glossary\'s plural „Poed riikides:“ (and Numbrid / Piirnorm / Reeglid riikides:), but each labels a select showing one country: the Lithuanian review made them singular for that reason. "Checked on" is „Kontrollitud veebilehtedelt“ (plural), but the food rules list a single site: check.',
      '"token" is „tõend“; "Add the oxide to the list" is „Lisa oksiid loendisse“ in et.json: the library file must use the same button name. The Notes feature is „Märkmed“, the Notes column „Märkused“; the record-* messages\' `trash` branch is „prügikasti üksus“. Check each reads right where it appears.',
      'The site\'s "also called the Seger formula" became „Segeri valem (inglise keeles unity molecular formula, UMF)“, and the clumsy English advice.saved became „Nõuanne on lisatud.“: check nothing the English says is lost.',
      'The food-contact category names: the glossary chose „Toiduvalmistamisnõud“ for cooking ware against the directive\'s own word „Toidunõud“; check `food.category.*` against the Estonian text of Directive 84/500/EEC, and that "Cooking ware of any size, and packaging and storage vessels over 3 L" cannot be read as cooking ware over 3 L only.'
    ],
    recipe: [
      "The compare page's heading uses the glossary's command form „Võrdle kaht retsepti“, the help section's heading the noun phrase „Kahe retsepti võrdlemine“ (style sheet: headings are noun phrases). Check that this split is right.",
      'Messages built around `{oxide}` give the share in brackets after it („{oxide} (suurem osa)“), because a placeholder cannot take a case ending; "match" is „vaste“; "instructions" is „juhised“ (juhend is kept for the guides). Check each reads naturally.'
    ],
    records: [
      '"silty" is „aleuriidirikas“, which may be obscure to potters: use a plainer word if one fits. "keep only for old recipes" (Laguna Borate, Boraq) means the library keeps the entry only for old recipes, a note, not an instruction: the translator read it so; check.',
      'The halloysite hazard: "the parent rock is quartz and cristobalite" means the rock contains them; check the translation says that.'
    ],
    'basics-making': [
      'glazing-basics: "limit" and "target" formula are both „sihtvalem“ in the glossary, so the translator kept the two English names where the text contrasts them; "China stone and Cornish stone are the same" keeps both English names; the "German Kreide (chalk)" contrast is lost because whiting is „kriit“. The worked example\'s "Unity" step became „Segeri valem“: check it names the scaling to unity, not the formula. Check each.',
      'making-a-glaze, line blends: "well-mixed ends of even SG" means end glazes of the same SG as each other (so mixing by volume matches mixing by weight), not of uniform SG. Check the translation says that.',
      'The glossary used to ask for a temperature after the first "mid fire"; that rule is gone. Add no figures.'
    ],
    firing: [
      'The kiln-sitter steps say "trigger" and a later check "trigger plate": Dawson\'s manual shows they are the same part, so one Estonian word for both. "soak" is „hoideaeg“; the switch positions stay as printed (Off, Low, Medium, High), explained once.',
      "The English says Orton's end point is \"6 o'clock, the tip level with the base\"; that sentence will be corrected in English later (Orton's chart says a 90° bend, 5 o'clock). Translate what the English says now."
    ],
    'safety-guides': [
      'Respirable crystalline silica: the glossary chose „respireeritav“, while Estonian law writes „sissehingatav“ (inhalable) where the English directive says respirable. Check the guides make the respirable meaning plain (dust fine enough to reach the deep lung), and that the same form is used everywhere.',
      '"ready-mixed glaze" is „kasutusvalmis glasuur“: it must mean wet glaze already mixed, not a powder; every "we suggest / in our view" became „see juhend soovitab / selle juhendi hinnangul“ (no "we"); the SDS sections use the Estonian REACH headings. Check against the English.'
    ]
  }
};
const code = process.argv[2];
if (!NOTES[code]) throw new Error('no notes for ' + code);
const anchor = 'Fix what is wrong, directly in the translation file.';
for (const [group, notes] of Object.entries(NOTES[code])) {
  const file = S + `wave3-review/${code}-${group}.md`;
  let t = fs.readFileSync(file, 'utf8');
  if (t.includes('What the translators of your files flagged')) continue;
  if (!t.includes(anchor)) throw new Error('anchor missing in ' + file);
  t = t.replace(
    anchor,
    'What the translators of your files flagged, to settle:\n' + notes.map((n) => '- ' + n).join('\n') + '\n\n' + anchor
  );
  fs.writeFileSync(file, t);
  console.log(group, notes.length);
}
