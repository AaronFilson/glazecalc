# The Indian subcontinent and the Arab world: regions (Phase C)

The regions of the plan for the subcontinent and Arabic (round 6, 2026-10-20), added in English first by the
method of docs/asia-plan.md, Phase C: every entry has its source, its check date and a status, no unverified
safety value is shown, and what could not be read is left out and said to be unconfirmed. Languages come later
(Arabic and Hindi first, then Urdu and Bengali); the groundwork (digits, right to left, fonts, the grouped
pickers, whose region list gains an Africa group with these regions) is on its own branches.

**Done 2026-10-20** (branch r6-regions-c1, English only): India, Pakistan, Bangladesh, Egypt, the United Arab
Emirates, Morocco and Algeria. Saudi Arabia is not added (the owner's decision). Iraq, Jordan and Tunisia are
later (C3).

**Done 2026-10-21** (branch r8-regions, English only): Sri Lanka and Nepal (C3, below), and India by state:
three state poison centres and two states' silica limits (below).

## The owner's and the lead's decisions applied

- Defaults: °C, specific gravity, the US library (the UAE's too), each country's currency (INR, PKR, BDT,
  EGP, AED, MAD, DZD). India fires by Orton cones (its shops sell them and label glazes by cone); the others
  by temperature, with cones one tap away.
- Languages, the most used first: India `hi`, `en`; Pakistan `ur`, `en`; Bangladesh `bn`; Egypt `ar`; the
  UAE `ar`, `en`; Morocco and Algeria `ar`, `fr`. None of `hi`, `ur`, `bn` or `ar` is live yet, so no live
  language's pages change: French pages are still written for France, and English for no region. Once
  live, Arabic pages are written for Egypt, Hindi and Tamil for India, Urdu for Pakistan and Bengali for
  Bangladesh (`COUNTRY_OF` in client/app/core/first-render.ts, which waited for these regions). Egypt's digits
  are Arabic-Indic in Arabic and 0–9 in English (`DIGITS` in lib/regions).
- India's silica: none shown; the page says no national limit was found, each state sets its own, and
  links DGOSH. India's food contact: none shown (IS 9806 is voluntary).
- Pakistan: Rescue 1122 as one entry, its note saying each province runs its own (read for Punjab; Khyber
  Pakhtunkhwa from the state news agency); 15 for the police in Punjab only.
- Bangladesh: 999 verified as the national emergency number; its roles in the note, said to come from the
  government's entry in an ITU list. DGHS's 16263 is shown as medical advice, not as a poison line.
- Egypt: 123 for an ambulance, with 122 and 180 (ITU) in the note; not 112 or 911.
- The UAE: Abu Dhabi's 800-424 is not shown.
- Morocco: CAPM's 0801 000 180, linked as dialled in Morocco, and 05 37 68 64 64, linked as +212537686464.
- Algeria: 14, noted as civil protection; the ceramic order of 2019 verified (read again in the Journal
  officiel on 2026-10-20).
- No silica limit for Egypt, the UAE, Morocco or Algeria.

## What each region shows

From scratch/round6/research/in-pk-bd.md and eg-ae-ma-dz.md (pages read 2026-10-19). Statuses as in
lib/regions: verified (the law's own text or an official page, an archive's copy of one included), secondary
(a named non-official source; workplace facts only), unverified (not shown).

| Region                                    | Who to call                                                                                                                                                                                            | Silica and masks                                                                                                                                                                                           | Food contact                                                                                                         | Shops                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `IN`, `['hi', 'en']`, Orton, sg, US, INR  | 112 (112.gov.in and MHA, in archive copies; verified); NPIC, AIIMS, 1800 116 117, 24 hours, toll free, for the public, or 011 2658 9391 (AIIMS's own page; verified); ministry mohfw.gov.in (verified) | none shown: the OSH Code 2020, s.88, leaves limits to each state (PRS's copy of the Gazette text; secondary), said under "not confirmed"; DGOSH (verified); FFP2/FFP3 under IS 9473:2002 (scan; secondary) | none (IS 9806:2001 is voluntary)                                                                                     | Bhoomi Pottery, Clay Station (Bangalore)                                         |
| `PK`, `['ur', 'en']`, temperature, sg, US | Rescue 1122 (rescue.gov.pk; verified), each province's own, 15 for the police in Punjab; no poison line; ministry nhsrc.gov.pk (verified)                                                              | none found                                                                                                                                                                                                 | none found                                                                                                           | none found                                                                       |
| `BD`, `['bn']`, temperature, sg, US       | 999 (national portal, Fire Service; verified), roles from the ITU list; 16263 as medical advice (DGHS; verified); no poison line; ministry mohfw.gov.bd (verified)                                     | none found; DIFE (verified)                                                                                                                                                                                | none found                                                                                                           | none found                                                                       |
| `EG`, `['ar']`, temperature, sg, US       | 123 (EAO's own site; verified), 122 and 180 (ITU E.129) in the note; no poison line; ministry mohp.gov.eg (verified)                                                                                   | none shown (Decree 211/2003's formula only in a paper)                                                                                                                                                     | none shown (ES 7809-2/2022's values not read)                                                                        | none found                                                                       |
| `AE`, `['ar', 'en']`, temperature, sg, US | 998 (u.ae; verified), 999 and 997 in the note; no poison line; ministry not linked (mohap.gov.ae refused the connection; unverified)                                                                   | none found                                                                                                                                                                                                 | none shown (GSO ISO 6486-2:2013's status in the UAE not read)                                                        | Art Central Pottery, Abu Dhabi Pottery (no raw materials seen; its note says so) |
| `MA`, `['ar', 'fr']`, temperature, sg, US | 141 (ONMT, ITU E.129; verified), the others in the note; CAPM 0801 000 180 or 05 37 68 64 64, 24 hours, a local call's price, advice free (CAPM's own posters on capm-sante.ma; verified)              | none found                                                                                                                                                                                                 | none found                                                                                                           | none found                                                                       |
| `DZ`, `['ar', 'fr']`, temperature, sg, US | 14, civil protection (ITU E.129, Radio Algérie; verified), 1021, 17, 1548 and 1055 in the note; no poison line; ministry not linked (sante.gov.dz refused the connection; unverified)                  | none found                                                                                                                                                                                                 | Arrêté interministériel du 16 janvier 2019 (JO 36, 2019-06-06): the directive's limits, Art. 6's 50% rule (verified) | none found                                                                       |

## Not shown, and why

- **IN:** a national silica limit (none: each state's rules set it; only Gujarat's draft read); IS 9806's food
  limits (voluntary); Sara (Chennai), which sells no raw materials.
- **PK:** a poison line (none on any official page); 1122 on the other provinces' own sites; 15 outside
  Punjab; any silica limit, agency, mask standard, food rule or shop.
- **BD:** a poison centre (none found); 999's roles on an official page; the ambulance's charge.
- **EG:** Ain Shams's Clinical Toxicology Center (no hours, or that it advises the public by phone); 112 and
  911; Decree 211/2003's annex and ES 6528/2008; ES 7809-2's values; "Clay Supply" in Fustat, Cairo (a lead from
  the Arabic glossary work), whose own site could not be found (claysupply.com is a parked page).
- **AE:** Abu Dhabi's Poison and Drug Information Service, 800-424 (the owner's decision: one emirate's, and
  its page now says it serves health professionals); the federal ministry's site.
- **MA:** whether 0801 000 180 answers from abroad (so the other number is linked in its international form);
  any silica limit, food rule or shop; NM EN 149 (an extract only).
- **DZ:** the Centre National de Toxicologie's free number (ordered by Decree 25-237, not published); whether
  14 sends an ambulance; the health ministry's site.

## India by state (2026-10-21)

From scratch/round8/india-data/report.md (every page read 2026-10-21; gazette copies and their text in
scratch/round8/india-data/dl/), with the owner's decisions of 2026-10-21. There is no state picker: the state
data sits in India's own entries.

- **Poison lines**, after NPIC, all verified on the centre's own page: the Poisons Information Centre at CMC
  Vellore, 1800 425 1213, 24 hours, toll free, for the public, from anywhere in India (no area); JSS College of
  Pharmacy, Mysuru, 1800 425 0207, Monday to Friday 9 to 5 and Saturday 9 to 1, free (area Karnataka); and the
  24×7 centre at Pramukhswami Medical College, Karamsad, 1800 233 0232, around the clock, free, for the public in
  the Charotar region (area Charotar region, Gujarat).
- **Silica**: the national note stays (no national limit; under the OSH Code, s.88, each state sets its own).
  Under it, a table of the limits two states' new rules set, both secondary, each read only in a private firm's
  copy of the state gazette, which the note names (`noLimit.states`):

  | State          | Rules                                                                              | Respirable dust | Total dust   | Copy read                    |
  | -------------- | ---------------------------------------------------------------------------------- | --------------- | ------------ | ---------------------------- |
  | Andhra Pradesh | OSH (A.P.) Rules 2026, rule 136, G.O.Rt.No.146, A.P. Gazette No. 432 of 2026-08-07 | 10 / (Q + 2)    | 30 / (Q + 3) | Lakshmikumaran & Sridharan's |
  | Rajasthan      | Rajasthan OSH Rules 2026, rule 111, S.O.23, Rajasthan Gazette of 2026-06-30        | cut off (said)  | 30 / (Q + 3) | sgcms.com's                  |

  Q is the quartz in the dust, in %; cristobalite and tridymite are half. Rajasthan's respirable-dust cell is
  cut off at the edge of its gazette page (p. 602) in the copy read, so the table says so rather than give a
  value.

## Sri Lanka and Nepal (C3, 2026-10-21)

From the same report. English pages first: `si`, `ta` (for Sri Lanka) and `ne` are not live, so no live
language's pages change (Tamil pages are still written for India). Both in the region list's Asia group.

| Region                                               | Who to call                                                                                                                                                                                                                                              | Silica and masks                                                                | Food contact | Shops      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------ | ---------- |
| `LK`, `['si', 'ta', 'en']`, temperature, sg, US, LKR | 1990 Suwa Seriya ambulance, free, 24/7, island-wide (1990.lk; verified); 119 police and 110 fire in the note (ITU E.129, last updated 2012-04-03, said in the note; verified by the owner's decision); no poison line; ministry health.gov.lk (verified) | none found; NIOSH, niosh.gov.lk (its name only; no silica page)                 | none found   | none found |
| `NP`, `['ne', 'en']`, temperature, sg, US, NPR       | 102 ambulance and medical (ITU E.129, 2012, said in the note; verified by the owner's decision); 100 police, 101 fire in the note; no poison line; ministry mohp.gov.np (verified)                                                                       | none found; Department of Labour and Occupational Safety, dol.gov.np (verified) | none found   | none found |

## Not shown, and why (2026-10-21)

- **IN, silica by state:** Gujarat (no limit in its final OSH rules of 2025; a draft amendment of 2025-12-13
  only); Tamil Nadu (its Factories Rules point to the repealed Act's schedule); Uttar Pradesh (rules notified,
  text not found); Maharashtra, Karnataka, Kerala, Telangana, Odisha, Delhi, Punjab and West Bengal (old rules
  or drafts, not read). Rajasthan's respirable-dust formula (cut off in the copy read).
- **IN, poison lines:** Amrita, Kochi (no 24-hour number named among five); Hinduja, Mumbai (doctors only, 7 am
  to 7 pm); R. G. Kar, Kolkata (an undated list); Chennai's 1054 (a 2011 trial); ICMR-NIOH, AIIMS Bhopal, KMC
  Manipal, NIPER (no number). JSS's emergency mobile number (not asked for; the toll-free line is shown).
- **IN, shops:** Kartik Pottery & Supplies (Pune), Prajapati Studio (Delhi), Ganguli Ceramics (Kolkata): listings
  only, no own site with raw materials; 20 Microns and Bansi sell by the tonne.
- **LK:** the National Poisons Information Centre at the National Hospital (numbers only in news of 2014 and
  2016; none on the hospital's site); KidsTox (no hours or who may call); any silica limit, mask standard (a
  ministry tender's N95/FFP2 is a purchase spec), food rule or shop.
- **NP:** Tribhuvan University Teaching Hospital's poison centre (news only, near closing in 2024); the 1115
  health hotline (news only); any silica limit (DoLOS mentions exposure limit values but none were found), food
  rule, mask standard or shop.

## Model changes

- A poison line's other number may have its own link (`alsoTel`): Morocco's and India's. The guide writes it
  "or <number>" with the number linked, its spaces no-break, so it stays on one line and reads left to right
  in a right-to-left page.
- A region with no national silica limit may say what was found instead (`noLimit`: note, law, source,
  status, check date), shown under "We have not yet confirmed the limit", never in place of a limit, and its
  source listed with the others: India's.
- `noLimit.states` (2026-10-21): the limits some states set where the country has none (India's), each with
  its area, rules, source, status and check date, a `respirable` and a `total` formula (the `Formula` type) and
  `clipped` for a value cut off in the copy read, said so and never guessed. Shown as a table under the
  no-limit note, each state's rules linked below it, and only states whose status may be shown. Revisit (a
  state picker) if more states publish limits that differ.
- Nothing else: Bangladesh's call centre uses the existing medical-advice row, and the languages not yet known
  (`hi`, `ur`, `bn`) are listed by their regions as Malay and Tamil are by Singapore's.

## Tests

- `server/test/regions_tests.ts`: each region's defaults, lines, ministries, facts and shops; that no
  unverified entry is shown; that each live language is written for the same region as before; the other
  number's link dials what it shows; the check dates within a year (the stale check); the earlier regions'
  data hash unchanged, and a new one for these seven, with a check that every region is in a snapshot.
- `client/app/pages/guides/region-blocks.spec.ts` and `region-output.spec.ts`: the four guide blocks for each,
  and a frozen snapshot of their HTML; `locale.service.spec.ts`: Arabic, Hindi, Urdu and Bengali are written
  for Egypt, India, Pakistan and Bangladesh.
- `e2e/regions.spec.js`: India, Morocco (and a French page) and Algeria at phone width, with nothing wider
  than the phone and no accessibility violations.
- 2026-10-21: India's snapshot updated on purpose (the state centres and limits); Sri Lanka and Nepal frozen in
  snapshots of their own (`regions_tests.ts`, `region-output.spec.ts`) and checked in `region-blocks.spec.ts`
  and at phone width in `e2e/regions.spec.js`; `e2e/picker.spec.js` finds both under Asia.
