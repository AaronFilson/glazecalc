# Dry specific gravity: sources

Sources for `lib/recipe/density.js` (the dry SG estimate) and the guide section "Find your own glaze's dry SG while you
mix" (`client/public/i18n/guides/making-a-glaze/en.md`). All sources were opened on 2026-11-04. Search-result snippets
are not counted. Density means true particle density, g/cm³.

## Source key

- **HoM**: J. W. Anthony, R. A. Bideaux, K. W. Bladh, M. C. Nichols (eds.), _Handbook of Mineralogy_, Mineralogical
  Society of America / Mineral Data Publishing, one PDF per mineral at `https://www.handbookofmineralogy.org/pdfs/<mineral>.pdf`,
  section "Physical Properties", D(meas.) and D(calc.). Versions: "(c)2001 Mineral Data Publishing, version 1.2" (marked
  v1.2) or "(c)2001-2005 Mineral Data Publishing, version 1" (v1). Magnetite and chromite are scanned book pages (pp. 333
  and 122) with no version line.
- **WM**: D. Barthelmy, _Mineralogy Database_, webmineral.com, `https://www.webmineral.com/data/<Mineral>.shtml`,
  "Physical Properties" (Density) and "Calculated Properties" (Den(Calc)).
- **WP**: Wikipedia, `https://en.wikipedia.org/wiki/<Article>`, infobox "Specific gravity" or "Density". Used last.
- **PC**: PubChem (NCBI/NLM), "Density" section,
  `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/<CID>/JSON?heading=Density`; the original source of
  each value (HSDB citing the CRC Handbook, ICSC, PAC/DOE, NIOSH, Hawley) is named.
- **LCG**: Le Comptoir Géologique, `https://www.le-comptoir-geologique.com/<mineral>-encyclopedia.html`.
- **DF**: T. Hansen, Digitalfire Reference Library, `https://digitalfire.com/material/<name>`, "Data" / "Physical
  Properties".
- **ET**: Engineering ToolBox, "Minerals and other Materials - Specific Gravities",
  https://www.engineeringtoolbox.com/minerals-specific-gravity-d_1644.html.
- **CB**: ChemicalBook product property pages (URL given in the row).
- **SRNL-R**: C. L. Trivelpiece, _Composition-Based Density Model for High Level Waste Glasses_, SRNL-STI-2018-00599
  Rev. 1, Savannah River National Laboratory, February 2022, https://sti.srs.gov/fulltext/SRNL-STI-2018-00599.pdf,
  Table 1 (p. 3, "A re-creation of the data from Table 21-1 in Volf"), Table 5 (p. C-1), Eq. 4-5 (pp. 2, 9), Table 4
  (Appendix A).
- **SRNL-M**: C. L. Trivelpiece, T. B. Edwards, F. C. Johnson, K. P. Crapse, K. M. Fox, "Method for Estimating the
  Density of High Level Nuclear Waste Glass", author manuscript (about 2019), https://sti.srs.gov/fulltext/SRNL-STI-2020-00035.pdf,
  Table 1 and Eq. 1-6. Same group and data as SRNL-R, so the two count as one source.
- **AGC**: K. Maeda, S. Ohara, Y. Nakao (Asahi Glass Co.), US 6,268,304 B1, "Plate glass and substrate glass for
  electronics", 2001, Table 2 "Appen's coefficients", https://patents.google.com/patent/US6268304B1/en.

Added in the second pass (all opened 2026-11-04):

- **ICSC**: ILO/WHO International Chemical Safety Cards,
  `https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=<n>&p_version=2&p_lang=en`, "Physical
  properties", Density. Opened directly, so counted apart from the copy in PubChem.
- **COD**: Crystallography Open Database, `https://www.crystallography.net/cod/<id>.html` (searched by formula at
  `https://www.crystallography.net/cod/result.php?formula=<formula>`). The card gives the cell; the density is our
  arithmetic, ρ = Z·M ÷ (N_A·V), with Z the formula units per cell for the structure type (K₂CO₃ P2₁/c Z = 4; Co₃O₄
  spinel Z = 8; CeO₂ fluorite Z = 4; V₂O₅ Pmmn Z = 2). A crystal-structure density is independent of every
  handbook measurement.
- **TPU**: O. V. Kaz'mina, E. N. Belomestnova, A. A. Ditts, _Khimicheskaya tekhnologiya stekla i sitallov_ (Chemical
  technology of glass and glass-ceramics), textbook, Tomsk Polytechnic University Press, 2011, 170 pp., section
  "Raschet plotnosti stekol" pp. 47–50, eq. 2.4–2.8, Tables 2.5 and 2.6,
  https://portal.tpu.ru/SHARED/k/KAZMINA/swork/Tab1/Tab1/%D0%9F%D0%BE%D1%81%D0%BE%D0%B1%D0%B8%D0%B5%20%D0%BF%D0%BE%20%D1%81%D1%82%D0%B5%D0%BA%D0%BB%D1%83_1.pdf
  (PDF, text extracted with pdftotext). Cites Appen, _Khimiya stekla_, Leningrad: Khimiya, 1974.
- **PSUTI**: "Raschet parametrov fiziko-khimicheskikh svoistv stekol", course notes, Povolzhsky State University of
  Telecommunications and Informatics (no author named), section 2.3 "Plotnost' stekla", Tables 2.5–2.6,
  https://studfile.net/preview/9150600/page:4/. Same table as TPU, word for word in places; counted with TPU as one
  lineage (Appen 1974) but a separate opened copy.

## Minerals and compounds (basis `mineral`)

| Code key (materials)                       | SG used                       | Source 1                                                                                                                                                                             | Source 2                                                                                                                            | Source 3                                                                                                                                            | Three?                                              |
| ------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| quartz (Silica, Flint, Silica 200 Mesh)    | 2.65                          | HoM v1.2: D(meas.) 2.65; 2.59–2.63 massive; calc 2.66                                                                                                                                | WM Quartz: 2.6–2.65, calc 2.65                                                                                                      | WP Quartz: 2.65                                                                                                                                     | yes                                                 |
| calcite (Whiting)                          | 2.71                          | HoM v1: 2.7102(2), calc 2.711                                                                                                                                                        | WM Calcite: 2.71, calc 2.71                                                                                                         | WP Calcite: 2.71                                                                                                                                    | yes                                                 |
| dolomite                                   | 2.86                          | HoM v1: 2.86, calc [2.876]                                                                                                                                                           | WM: 2.8–2.9 (avg 2.84), calc 2.84                                                                                                   | WP: 2.84–2.86                                                                                                                                       | yes                                                 |
| magnesite                                  | 3.00                          | HoM v1: 3.00(2), calc 3.010                                                                                                                                                          | WM: 3, calc 2.98                                                                                                                    | WP: 3.0–3.2                                                                                                                                         | yes                                                 |
| hydromagnesite (Light Magnesium Carbonate) | 2.24                          | HoM v1: 2.24–2.25, calc 2.25                                                                                                                                                         | WM: 2.16–2.2, calc 2.25                                                                                                             | WP: 2.16–2.2                                                                                                                                        | yes                                                 |
| witherite (Barium Carbonate)               | 4.29                          | HoM v1: 4.22–4.31, calc 4.24–4.29                                                                                                                                                    | WM: 4.3, calc 4.31                                                                                                                  | WP: 4.3                                                                                                                                             | yes                                                 |
| strontianite (Strontium Carbonate)         | 3.76                          | HoM v1: 3.76(2), calc 3.780                                                                                                                                                          | WM: 3.78, calc 3.78                                                                                                                 | WP: 3.74–3.78                                                                                                                                       | yes                                                 |
| fluorite (Fluorspar)                       | 3.18                          | HoM v1: 3.175–3.184, calc 3.180                                                                                                                                                      | WM: 3.01–3.25, calc 3.18                                                                                                            | WP: 3.175–3.184                                                                                                                                     | yes                                                 |
| cryolite                                   | 2.97                          | HoM v1: 2.97, calc 2.973(2)                                                                                                                                                          | WM: 2.95–3, calc 2.96                                                                                                               | WP: 2.95–3.0                                                                                                                                        | yes                                                 |
| talc                                       | 2.78                          | HoM v1.2: 2.58–2.83, calc [2.78]                                                                                                                                                     | WM: 2.7–2.8, calc 2.82                                                                                                              | WP: 2.58–2.83                                                                                                                                       | yes                                                 |
| wollastonite (Vansil W, NYAD 400)          | 2.9                           | HoM v1.2: 2.86–3.09, calc 2.90                                                                                                                                                       | WP: 2.86–3.09                                                                                                                       | WM Wollastonite-1A (https://www.webmineral.com/data/Wollastonite-1A.shtml): 2.8–2.9 (avg 2.84), calc 2.91                                           | yes                                                 |
| orthoclase                                 | 2.56                          | HoM v1.2: 2.55–2.63, calc 2.563                                                                                                                                                      | WM: 2.56, calc 2.55                                                                                                                 | WP: 2.55–2.63                                                                                                                                       | yes                                                 |
| spodumene                                  | 3.15                          | HoM v1.2: 3.03–3.23, calc 3.184                                                                                                                                                      | WM: SG 3.15                                                                                                                         | WP: 3.03–3.23                                                                                                                                       | yes                                                 |
| petalite                                   | 2.42                          | HoM v1.2: 2.412–2.422, calc [2.40]                                                                                                                                                   | WM: 2.39–2.46, calc 2.39                                                                                                            | WP: 2.4                                                                                                                                             | yes                                                 |
| lepidolite                                 | 2.84                          | HoM v1.2 (polylithionite): 2.58–2.82, calc 2.84                                                                                                                                      | WM Lepidolite: 2.8–2.9 (avg 2.84), calc 2.79                                                                                        | WP Lepidolite: 2.8–2.9                                                                                                                              | yes                                                 |
| niter KNO₃                                 | 2.10                          | HoM v1: 2.109(2), calc 2.104                                                                                                                                                         | WM: 2.1–2.11, calc 2.10                                                                                                             | WP Potassium nitrate: 2.109 (16 °C)                                                                                                                 | yes                                                 |
| nitratine NaNO₃ (Sodium Nitrate)           | 2.26                          | HoM v1: 2.24–2.29, calc 2.25                                                                                                                                                         | WM: 2.24–2.29, calc 2.26                                                                                                            | WP Sodium nitrate: 2.257                                                                                                                            | yes                                                 |
| borax                                      | 1.71                          | HoM v1: 1.715(5), calc 1.70                                                                                                                                                          | WM: 1.7–1.72, calc 1.65                                                                                                             | PC CID 16211214: 1.73 (HSDB, CRC 94th p. 4-91); ICSC 1.7                                                                                            | yes                                                 |
| sassolite (Boric Acid)                     | 1.48                          | HoM v1: 1.46–1.50, calc 1.562                                                                                                                                                        | WP Sassolite: 1.46–1.50; LCG 1.46–1.50                                                                                              | PC CID 7628: 1.5 (CRC 91st p. 4-53); 1.435 (USCG)                                                                                                   | yes                                                 |
| colemanite                                 | 2.42                          | HoM v1: 2.423(5), calc 2.42                                                                                                                                                          | WM: 2.42, calc 2.42                                                                                                                 | WP: 2.42                                                                                                                                            | yes                                                 |
| ulexite                                    | 1.96                          | HoM v1: 1.955, calc 1.955                                                                                                                                                            | WM: 1.95–1.96, calc 1.95                                                                                                            | WP: 1.95–1.96                                                                                                                                       | yes                                                 |
| gibbsite (Alumina Hydrate)                 | 2.40                          | HoM v1: 2.40, calc [2.42]                                                                                                                                                            | WM: 2.3–2.4, calc 2.44                                                                                                              | PC CID 10176082: 2.42 (CRC 91st p. 4-45); ~2.4 (Hawley)                                                                                             | yes                                                 |
| corundum (Calcined Alumina)                | 3.98                          | HoM v1: 3.98–4.10, calc 3.997                                                                                                                                                        | WM: 4–4.1, calc 4.01                                                                                                                | PC CID 9989226: 3.99 (PAC); 4.0 (NIOSH)                                                                                                             | yes                                                 |
| zincite (Zinc Oxide)                       | 5.66                          | HoM v1: 5.66(2), calc 5.6730                                                                                                                                                         | WM: 5.43–5.7, calc 5.66                                                                                                             | PC CID 3007857: 5.6 (CRC 94th p. 4-100); 5.61 (NIOSH)                                                                                               | yes                                                 |
| hydroxylapatite (Bone Ash)                 | **3.16** (was 3.08)           | HoM v1: 3.14–3.21, calc 3.16                                                                                                                                                         | WP Hydroxyapatite: 3.14–3.21 meas., 3.16 calc.                                                                                      | PC CID 14781: 3.1–3.2 (Hawley 13th p. 88)                                                                                                           | yes                                                 |
| rutile                                     | 4.23                          | HoM v1: 4.23(2), calc 4.25                                                                                                                                                           | WM: 4.25                                                                                                                            | PC CID 26042: 4.23 (CRC 81st p. 4-94); 4.26 (OSHA)                                                                                                  | yes                                                 |
| eskolaite / Cr₂O₃ (Chromium Oxide)         | 5.22                          | PC CID 517277: 5.22 at 25 °C (HSDB; ICSC; PAC)                                                                                                                                       | WP Chromium(III) oxide: 5.22                                                                                                        | HoM v1 eskolaite: 5.18, calc 5.20 (mineral; WM same)                                                                                                | yes                                                 |
| Co₃O₄ (Cobalt Oxide)                       | **6.07** (was 6.11)           | WP Cobalt(II,III) oxide: 6.07 (cites Lide (ed.), CRC 87th, 2006)                                                                                                                     | COD 9005887 (Liu & Prewitt, Phys. Chem. Minerals 17:168, 1990, 301 K): a 8.0821 Å, V 527.926 Å³ → 6.06                              | CB CB00124507 (https://www.chemicalbook.com/ChemicalProductProperty_EN_CB00124507.htm): 6.11 at 25 °C (higher)                                      | yes (two agree)                                     |
| tenorite / CuO (Copper oxide)              | **6.4** (was 6.5)             | HoM v1: 6.45 (synthetic), calc 6.515(2)                                                                                                                                              | PC CID 164827: 6.315 at 14 °C (HSDB); 6.4 (PAC, NIOSH)                                                                              | WM Tenorite: 6.5, calc 6.55                                                                                                                         | yes                                                 |
| malachite (Copper carbonate)               | 4.0                           | HoM v1: 4.05(2), calc 3.983                                                                                                                                                          | WM: 3.6–4 (avg 3.8), calc 4.03                                                                                                      | WP: 3.6–4                                                                                                                                           | yes                                                 |
| ilmenite                                   | 4.72                          | HoM v1: 4.72, calc 4.789                                                                                                                                                             | WM: 4.72, calc 4.79                                                                                                                 | WP: 4.70–4.79                                                                                                                                       | yes                                                 |
| magnetite (Black iron oxide)               | 5.18                          | HoM (p. 333): 5.175, calc 5.20                                                                                                                                                       | WM: 5.1–5.2, calc 5.21                                                                                                              | WP: 5.17–5.18                                                                                                                                       | yes                                                 |
| hematite (Red iron oxide)                  | 5.26                          | HoM v1: 5.26, calc 5.255                                                                                                                                                             | WM: 5.3, calc 5.28                                                                                                                  | PC CID 518696: 5.25 (CRC 88th); 5.24 (ICSC, NIOSH)                                                                                                  | yes                                                 |
| NiO (Nickel oxide, green)                  | 6.67                          | WP Nickel(II) oxide: 6.67                                                                                                                                                            | WM Bunsenite: 6.4–6.8 (avg 6.6), calc 6.81                                                                                          | HoM v1 bunsenite: 6.898, calc 6.806 (the mineral, higher)                                                                                           | yes                                                 |
| V₂O₅ (Vanadium oxide)                      | 3.36                          | PC CID 14814: 3.36 (OSHA, NIOSH); 3.357 (CAMEO)                                                                                                                                      | ICSC 0596 (Oct 1999): relative density 3.4                                                                                          | WM Shcherbinaite (https://www.webmineral.com/data/Shcherbinaite.shtml): 3.2–3.36, calc 3.37; COD 2020756 (Enjalbert & Galy 1986) V 179.21 Å³ → 3.37 | yes                                                 |
| cassiterite (Tin oxide)                    | 6.99                          | HoM v1: 6.98–7.01, calc 6.993                                                                                                                                                        | WM: 6.8–7, calc 7.15                                                                                                                | PC CID 16747781: 6.95 (HSDB, ICSC, NIOSH)                                                                                                           | yes                                                 |
| baddeleyite (Zirconium oxide)              | 5.75                          | HoM v1: 5.40–6.02, calc [5.83]                                                                                                                                                       | WM: 5.5–6 (avg 5.75), calc 5.83                                                                                                     | WP Zirconium dioxide: 5.68                                                                                                                          | yes                                                 |
| zircon                                     | 4.65                          | HoM v1.2: 4.6–4.7, calc 4.714                                                                                                                                                        | WM: 4.6–4.7, calc 4.85                                                                                                              | WP: 4.6–4.7                                                                                                                                         | yes                                                 |
| epsomite (Epsom salts)                     | 1.68                          | HoM v1: 1.677(2) (synthetic)                                                                                                                                                         | WM: 1.67–1.68, calc 1.68                                                                                                            | PC CID 24843: 1.68 at 25 °C (PAC)                                                                                                                   | yes                                                 |
| rhodochrosite (Manganese carbonate)        | 3.70                          | HoM v1: 3.70, calc 3.70                                                                                                                                                              | WM: 3.69, calc 3.70                                                                                                                 | PC CID 11726: 3.7 (CRC 79th p. 4-69)                                                                                                                | yes                                                 |
| chromite (Iron chromate)                   | 4.79                          | HoM (p. 122): 4.5–4.8, calc [5.12]                                                                                                                                                   | WM: 4.5–5.09 (avg 4.79)                                                                                                             | WP: 4.5–4.8                                                                                                                                         | yes                                                 |
| CeO₂ (Cerium oxide)                        | 7.22                          | WP Cerium(IV) oxide: 7.215                                                                                                                                                           | WM Cerianite-(Ce) (https://www.webmineral.com/data/Cerianite-(Ce).shtml): 7.216 (its "calc 8.14" is inconsistent with its own cell) | COD 4343161 (Artini et al., Inorg. Chem. 2015): a 5.40972 Å, V 158.316 Å³ → 7.22; COD 9009008 (Wyckoff 1963) a 5.411 → 7.22                         | yes                                                 |
| SiC (Silicon carbide)                      | 3.21                          | WP Silicon carbide: 3.16 (infobox), 3.21 (3C/4H/6H)                                                                                                                                  | PC CID 9863: 3.23 (HSDB, Merck); 3.2 (ICSC)                                                                                         | CB CB2431905 (https://m.chemicalbook.com/ChemicalProductProperty_EN_CB2431905.htm): 3.22; text 3.21                                                 | yes                                                 |
| K₂Cr₂O₇ (Potassium Bichromate)             | 2.68                          | PC CID 24502: 2.676 (Merck 2013); 2.68 (PAC)                                                                                                                                         | WP Potassium dichromate: 2.68                                                                                                       | ICSC 1371 (Apr 2013): 2.7                                                                                                                           | yes                                                 |
| minium (Lead, Red)                         | 8.9                           | HoM v1: 8.9–9.2 (synthetic), calc [8.92]                                                                                                                                             | WM: 8.2, calc 8.93                                                                                                                  | LCG: 8.9–9.2 (WP Lead(II,IV) oxide gives 8.3)                                                                                                       | yes                                                 |
| hydrocerussite (Lead, White)               | 6.80                          | HoM v1: 6.80–6.82, calc 6.873                                                                                                                                                        | WM: 6.8, calc 6.84                                                                                                                  | LCG: 6.8                                                                                                                                            | yes                                                 |
| litharge                                   | **9.35** (was 9.14)           | HoM v1: 9.14 (synthetic), calc [9.35]                                                                                                                                                | WM: 9.14–9.355, calc 9.33                                                                                                           | PC CID 14827: 9.53 alpha (Kirk-Othmer); 9.64 (CRC 95th); 9.5 (ICSC)                                                                                 | yes                                                 |
| Li₂CO₃                                     | 2.11                          | PC CID 11125: 2.11 (CRC 86th p. 4-70)                                                                                                                                                | WM Zabuyelite: 2.09, calc 2.10                                                                                                      | ICSC 1109 (Oct 1999): 2.1                                                                                                                           | yes                                                 |
| K₂CO₃ (Pearl Ash)                          | **2.43** (2.43 → 2.29 → 2.43) | COD 9009644 (Idemoto et al., J. Phys. Chem. Solids 59:363–376, 1998, neutron powder): V 377.042 Å³, Z 4 → 2.435; COD 9009645 (same paper, X-ray single crystal) V 375.795 Å³ → 2.443 | WP Potassium carbonate: 2.43 (no footnote on the value)                                                                             | Against: PC CID 11430 2.29 (HSDB citing CRC 91st p. 4-82; PAC); ICSC 1588 (Apr 2005) 2.29, opened                                                   | **no** (two for 2.43; three compilations give 2.29) |
| Na₂CO₃ (Soda Ash)                          | 2.54                          | PC CID 10340: 2.54 (CRC 95th p. 4-89)                                                                                                                                                | WP Sodium carbonate: 2.54 (anhydrous)                                                                                               | WM Natrite (https://www.webmineral.com/data/Natrite.shtml): 2.54, calc 2.54; ICSC 1135 (Apr 2024): 2.5                                              | yes                                                 |

Changes in this round, and why:

- **Bone Ash 3.08 → 3.16**: 3.08 appears only on webmineral; HoM, Wikipedia and Hawley all give 3.1–3.2.
- **Copper oxide 6.5 → 6.4**: the material sold is made, not mined; HoM gives 6.45 for synthetic CuO and PubChem's
  sources 6.315–6.4. 6.5 is the mineral's rounded webmineral value.
- **Litharge 9.14 → 9.35**: 9.14 is the bottom of the measured range; HoM and webmineral calculate 9.33–9.35, and
  CRC/Kirk-Othmer give 9.53–9.64. 9.35 is the crystal-structure value.
- **Pearl Ash 2.43 → 2.29 (first pass), back to 2.43 (second pass)**: the crystal structure (Idemoto et al. 1998,
  two refinements) fixes the solid's density at 2.435–2.443; 2.29 is 6% below what the atoms in the cell weigh, so
  it cannot be the true particle density (likely a bulk or old measurement copied between compilations). Still
  only two sources for 2.43.
- **Cobalt Oxide 6.11 → 6.07** (second pass): CRC 87th and the crystal cell (6.06) agree; 6.11 appears only on
  ChemicalBook and supplier listings (Thermo/Alfa pages on fishersci.com timed out and were not opened).
- **Cerium oxide stays 7.22**: the cell of CeO₂ (three COD entries, a 5.407–5.411 Å) gives 7.22; PubChem's 7.65
  (PAC) is 6% too high for that cell.
- **Appen SrO 17.6 → 17.5**: AGC Table 2 gives 17.5. TPU and PSUTI give 18.0; see the Appen table below.

## Kinds (basis `kind`): 2.6

Feldspars, nepheline syenites, Cornish stones:

| Mineral or product      | Value                                             | Source                                         |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------- |
| albite                  | 2.60–2.65, calc 2.609–2.621                       | HoM v1.2                                       |
| albite                  | 2.61–2.63 (avg 2.62)                              | WM Albite                                      |
| microcline              | 2.54–2.57, calc 2.56                              | HoM v1.2; WM 2.56                              |
| orthoclase              | 2.55–2.63                                         | HoM v1.2                                       |
| nepheline               | 2.55–2.66, calc [2.64]                            | HoM v1.2; WM 2.55–2.65                         |
| Minspar (soda feldspar) | SG 2.6                                            | DF, https://digitalfire.com/material/minspar+1 |
| "Feldspar"              | 2.6 (K feldspar 2.54–2.57, Na feldspar 2.62–2.76) | ET                                             |

Commercial products (second pass; PDFs downloaded and read with pdftotext, 2026-11-04):

| Product                         | SG as stated                                            | Source                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minspar 200 (soda feldspar)     | "Specific Gravity (water = 1): ~2.6 gm/cc"              | Imerys SDS Minspar 200_GHS_001, prepared 04-Nov-2013, sec. 9, https://www.mnclay.com/sds/pdf/chem_raw/mins.pdf                                      |
| G 200 (potash feldspar)         | "Specific Gravity (water = 1): ~2.6 gm/cc"              | Euroarce/Imerys SDS G 200, revised 01-Aug-2016, sec. 9, https://cdn.shopify.com/s/files/1/0225/6247/2008/files/SDS_G_200_EU_08-01-2016_v3.pdf       |
| Feldspar FF20 (Na–K feldspar)   | Specific Gravity 2.6 g/cm³                              | Boud Minerals, Technical Data Sheet "Feldspar FF20", Issue 6, May 2018, https://www.boud.com/wp-content/uploads/2018/06/feldspar.pdf                |
| MINEX 7 (nepheline syenite)     | Specific Gravity 2.61                                   | Sibelco New Zealand SDS MINEX 7, version 1.0, issued 03/01/2014, sec. 9, https://www.ccg.co.nz/cdn/images/productdocument/SDS-MINEX-7.pdf           |
| Nepheline syenite (Covia)       | "a specific gravity of 2.61 grams per cubic centimeter" | Covia, "Nepheline Syenite", https://www.coviacorp.com/minerals/nepheline-syenite/                                                                   |
| Covia Nepheline Syenite         | "Specific Gravity ASTM C128 2.61"                       | DF, https://digitalfire.com/material/1070 (same producer as Covia: one group with the row above)                                                    |
| Cornish Stone (FCS2)            | Specific Gravity mean 2.625, range 2.60–2.65            | Valentine Clays, Technical Data Sheet "Cornish Stone", https://valentineclays.co.uk/cdn/shop/files/Cornish_Stone_Technical_Data_Sheet.pdf           |
| P3314 Cornish Stone (synthetic) | Specific Gravity 2.6 g/cm³                              | Potterycrafts, Technical Data Sheet, 13 Feb 2020, https://potterycrafts.co.uk/cdn/shop/files/Potterycrafts_Synthetic_Cornish_Stone_Mineral_Flux.pdf |
| H&G Cornwall Stone              | "Nominally 2.7 gms/cm³"                                 | Hammill & Gillespie MSDS, sec. 9, https://www.theceramicshop.com/sds/CornwallStone.pdf                                                              |

Three sources: **yes** for potash and soda feldspars (Imerys Minspar, Euroarce G 200, Boud FF20 — Imerys and
Euroarce sheets share a template, so strictly Imerys group + Boud + mineral data), **yes** for nepheline syenite
(Sibelco MINEX 7, Covia, HoM/WM nepheline 2.55–2.66), **yes** for Cornish stone (Valentine, Potterycrafts, H&G; 2.6–2.7).
Custer feldspar: no sheet with an SG was opened (Digitalfire's page returned 404).

Clays:

| Mineral or product | Value                | Source                                                                            |
| ------------------ | -------------------- | --------------------------------------------------------------------------------- |
| kaolinite          | 2.61–2.68, calc 2.63 | HoM v1.2                                                                          |
| kaolinite          | 2.6, calc 2.62       | WM Kaolinite                                                                      |
| kaolin             | 2.62                 | DF, https://digitalfire.com/material/kaolin                                       |
| kaolinite          | 2.61–2.66            | ET                                                                                |
| muscovite          | 2.77–2.88            | HoM v1.2; WM 2.77–2.88                                                            |
| illite             | 2.6–2.9              | WM Illite                                                                         |
| ball clay          | 2.5–2.6 (uncited)    | Glazy wiki, https://wiki.glazy.org/t/specific-gravity-of-glaze-materials/781.html |

Commercial clays (second pass):

| Product                                                              | SG as stated                                    | Source                                                                                                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| EPK Kaolin                                                           | "Specific Gravity / Relative Density 2.65 g/cc" | Edgar Minerals SDS (GHS US), sec. 9, https://cdn.shopify.com/s/files/1/0225/6247/2008/files/SDS_EPK_Kaolin_01-01-2018.pdf (file dated 01-01-2018) |
| Grolleg powdered china clay                                          | "Relative Density- 2.6 g/cm³"                   | Valentine Clays SDS, reviewed August 2024, sec. 9, https://valentineclays.co.uk/cdn/shop/files/Grolleg_Powdered_China_Clay_Safety_Data_Sheet.pdf  |
| Kaolin products (Old Hickory)                                        | "Specific Gravity: 2.40 - 2.65"                 | Old Hickory Clay Co. SDS, issued 03/18/2015, sec. 9, https://harwick.com/files/sds/0050101.pdf                                                    |
| OM#4, KTS Classic, Martin #5 and other Kentucky–Tennessee ball clays | "Specific Gravity (water = 1): ~2.6 gm/cc"      | Imerys SDS GLS_GHS_001, revised 29-Jan-2019, sec. 9, https://cdn.shopify.com/s/files/1/0326/8352/4229/files/KY_Stone.pdf                          |
| Ball Clay M-23                                                       | "Specific Gravity: 2.40 - 2.65"                 | Old Hickory Clay Co. SDS, issued 01-18-2018, sec. 9, https://digitalfire.com/4sight/datasheets/SDSM23.pdf                                         |
| Bandy Black, C&C, Foundry Hill ball clays                            | "Relative Density: 2.4 – 2.6 g/cm3 (apparent)"  | H.C. Spinks Clay Co. SDS, 1 May 2015, rev. 2015-1, sec. 9, https://www.theceramicshop.com/sds/BallClayCC.pdf                                      |

Three sources: **yes** for kaolins (Edgar 2.65, Valentine/Imerys Grolleg 2.6, Old Hickory 2.40–2.65, plus the
minerals) and **yes** for ball clays (Imerys/K-T ~2.6 including OM#4, Old Hickory 2.40–2.65, Spinks 2.4–2.6). The
ball clay ranges reach down to 2.4, so 2.6 is the top of their range; a 0.2 error in one ball clay at 20% of a
recipe moves the recipe's dry SG by about 1.5%. **No** fireclay sheet giving an SG was opened.

## Glasses (basis `glass`): Appen's factors

Formula: density = Σ xᵢMᵢ ÷ Σ xᵢVᵢ, xᵢ mole fraction, Mᵢ molar mass, Vᵢ partial molar volume. The code works from
grams per gram (moles = grams ÷ M), which is the same ratio.

- Formula sources: SRNL-R Eq. 4 and 5 (validated on 1104 glasses, RMSE 0.050 g/cm³, slope 0.9975); SRNL-M Eq. 1–5;
  AGC (Appen's coefficients "used when the physical property of glass is predicted from an additive rule"); TPU
  eq. 2.4, d = ΣPᵢ ÷ Σ(nᵢVᵢ), Pᵢ mass %, nᵢ moles, Vᵢ Appen's partial molar volume (p. 47), with a worked example
  (pp. 49–50). Three: **yes** (SRNL, AGC, TPU; PSUTI repeats TPU).

| Oxide | Code | AGC (Appen) | TPU / PSUTI Table 2.5 (Appen) | Volf bound (SRNL-R Table 1) |
| ----- | ---- | ----------- | ----------------------------- | --------------------------- |
| SiO₂  | 26.1 | 26.1–27.25  | 27.25–26.10 (100–45 mol%)     | 26.36                       |
| B₂O₃  | 38.0 | 18.5–38     | 13.5–38.0 (Table 2.6 rules)   | 24.87                       |
| Al₂O₃ | 40.4 | 40.4        | 40.4                          | 40.78                       |
| Li₂O  | 11.0 | 11          | 11.0 (11.9 with Na₂O)         | 11.07                       |
| Na₂O  | 20.2 | 20.2        | 20.2 (20.6)                   | 20.00                       |
| K₂O   | 34.1 | 34.1        | 34.1 (33.5 with Na₂O)         | 33.64                       |
| MgO   | 12.5 | 12.5        | 12.5                          | 12.22                       |
| CaO   | 14.4 | 14.4        | 14.4                          | 14.38                       |
| SrO   | 17.5 | 17.5        | **18.0**                      | 17.56                       |
| BaO   | 22.0 | 22          | 22.0                          | 21.91                       |
| ZnO   | 14.5 | 14.5        | 14.5                          | 14.53                       |
| PbO   | 23.5 | 21–23.5     | 21.0–23.5                     | 22.32                       |
| TiO₂  | 20.5 | 19–22.5     | 20.5                          | 21.02                       |
| ZrO₂  | 23.0 | 23          | not listed                    | 23.25                       |

Appen's values: **three opened sources** (AGC, TPU, PSUTI) for SiO₂, B₂O₃, Al₂O₃, the alkalis, MgO, CaO, BaO, ZnO, PbO,
TiO₂ (TPU and PSUTI share one lineage, Appen 1974). SrO: AGC 17.5 against TPU/PSUTI 18.0 — unsettled; the code keeps
17.5 (Volf's 17.56 is close to it), and the difference moves a glass with 5% SrO by about 0.1%. ZrO₂ 23: AGC only, with
Volf's 23.25 close.

Appen's composition rules, now found (TPU pp. 47–49, PSUTI the same):

- SiO₂: 26.1 below 67 mol% SiO₂; above, V = 26.1 + 0.035 (N_SiO₂ − 67) (eq. 2.5).
- PbO: V = 21.0 + 0.08 (ΣN_MemOn − 50), ΣN the mol% of SiO₂ + B₂O₃ + Al₂O₃, for 50–80 mol% (eq. 2.6).
- B₂O₃: by ψ = (N_R₂O + N_RO − N_Al₂O₃) ÷ N_B₂O₃ (eq. 2.7–2.8) and SiO₂ content (Table 2.6): 18.5 to 36 for 44–64
  and 71–80 mol% SiO₂; no rule for 64–71 mol%.

The code keeps single values. With the SiO₂ rule, float glass goes from 2.507 to 2.495 and borosilicate 3.3 from
2.25 to 2.22 (published 2.50 and 2.23): the error changes sign but not size, so the rule was not added. TPU's own
worked example, a borosilicate of 80.85 SiO₂, 12.00 B₂O₃, 2.20 Al₂O₃, 0.30 CaO, 4.10 Na₂O, 0.10 K₂O, uses the rules
(V_SiO₂ 26.68, ψ 0.3 so V_B₂O₃ 36) and gets 2.240; the code gives 2.263. B₂O₃ = 38 is kept (not Volf's 24.87)
because 24.87 overestimates borosilicates: SRNL-R Table 4 lists PYREX measured 2.224 against 2.366 predicted.

Check glasses:

| Glass                     | Published                                                                                          | Code                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| NIST SRM 1830 float glass | 2.490 measured (SRNL-R Table 4, citing NIST SRM 1830 certificate, 2017)                            | 2.51 for a typical float analysis (72.5 SiO₂, 13.5 Na₂O, 9 CaO, 3.5 MgO, 1.5 Al₂O₃) |
| Borofloat 33              | 2.23 at 25 °C (SCHOTT, https://www.schott.com/en-us/products/borofloat-p1000314/technical-details) | 2.26                                                                                |
| Pyrex                     | 2.224 measured (SRNL-R Table 4)                                                                    | not run (composition not printed)                                                   |
| NIST SRM 1827a lead glass | 3.594 measured (SRNL-R Table 4)                                                                    | not run                                                                             |

Published densities (second pass):

Soda-lime float glass, 2.50:

1. AGC Glass Europe, "Technical Data Sheet Planibel" (TDS_Planibel_1224_EN), Dec 2024, sec. 3.2: "Density (at 18°C):
   ρ = 2 500 kg/m³"; sec. 3.1 gives EN 572-1's composition limits by element (Si 32–35%, Ca 3.5–10.1%, Na 7.4–11.9%,
   Mg 0–3.7%, Al 0–1.6%). https://www.agc-yourglass.com/sites/default/files/2024-12/TDS_Planibel_1224_EN.pdf
2. Pilkington North America (NSG Group), Technical Bulletin ATS-129 "Properties of Soda-Lime Silica Float Glass",
   04/2025: "Density 156 lb/ft³ (2500 kg/m³)".
   https://www.pilkington.com/-/media/pilkington/site-content/usa/window-manufacturers/technical-bulletins/ats-129---properties-of-soda-lime-silica-float-glass.pdf
3. National Glass Association, Glass Technical Paper FM05-12 (2023) "Physical and Mechanical Properties of Typical
   Soda Lime Float Glass", July 2023: "~ 156 lb/ft3 (2500 kg/m3)"; composition SiO₂ 69–74, CaO 5–12, Na₂O 12–16, MgO
   0–6, Al₂O₃ 0–3%.
   https://www.glass.org/sites/default/files/2023-07/FM05-12_2023_Physical_Mechanical_Properties_Typical_Soda_Lime_Float_Glass.pdf
4. NIST SRM 1830 (via SRNL-R Table 4): 2.490 measured.

Borosilicate 3.3, 2.23:

1. ISO 3585:1976 "Glass plant, pipeline and fittings — Properties of borosilicate glass 3.3", first edition, cl. 4.2:
   "Density at 20 °C 2,23 g cm-3" (preview, https://cdn.standards.iteh.ai/samples/8993/bb194e27aa514eac8aa9c927feeed624/ISO-3585-1976.pdf).
2. SCHOTT, BOROFLOAT® 33 technical details, 2.23 g/cm³ at 25 °C,
   https://www.schott.com/en-us/products/borofloat-p1000314/technical-details.
3. Kavalier (Sázava), SIMAX catalogue 2012, p. 2, "Density ρ at 20 °C 2.23 g.cm-3", composition SiO₂ 80.6, B₂O₃ 13,
   Na₂O + K₂O 4, Al₂O₃ 2.4 wt%, https://nevareaktiv.ru/system/files/Simax_Catalogue_2012.pdf.
4. Corning PYREX 7740, 2.23 g/cm³: PGO, https://www.pgo-online.com/intl/pyrex.html, and Valley Design, "Density (at
   20 °C/68 °F): 2.23 g/cm3", https://valleydesign.com/?p=737 (resellers quoting Corning: one group).

Code against them (our arithmetic, `scratch/round14/sg-gap/tools/check.js`):

| Glass                                              | Published | Code  | Error |
| -------------------------------------------------- | --------- | ----- | ----- |
| Float, 72.5 SiO₂ 13.5 Na₂O 9 CaO 3.5 MgO 1.5 Al₂O₃ | 2.50      | 2.507 | +0.3% |
| Borofloat 33 (81 SiO₂ 13 B₂O₃ 4 Na₂O 2 Al₂O₃)      | 2.23      | 2.253 | +1.0% |
| SIMAX (catalogue composition)                      | 2.23      | 2.254 | +1.1% |
| TPU worked example                                 | 2.240     | 2.263 | +1.0% |

Frits with both an analysis and a density:

- A. Barba, J. C. Jarque, M. Orduña, M. F. Gazulla (Instituto de Tecnología Cerámica, Universitat Jaume I),
  "Influence of the Chemical Composition of Ceramic Frits on the Kinetics of their Dissolution Process", _J. Ceram.
  Sci. Tech._ 7 (1) 71–78 (2016), doi:10.4416/JCST2015-00034, Table 2 (wt%, XRF and ICP-OES) and Table 3 (density,
  g/cm³), https://www.ceramic-science.com/php/article_pdf.php?article_id=100427&hash=f170d31df1. The text says
  both that density "was calculated using the Huggins and Sun method" and that it "was determined with a Quantachrome
  ULTRAPYCNOMETER 1000 helium stereopycnometer"; which one Table 3 holds is not stated. The PDF's table text came out
  column by column; the rows were matched to oxides by the order of the row labels and checked against the text
  (FBZr "contains 3.60 % B2O3"; FCP "has 14.1 % CaO").

| Frit (Barba et al.)                         | SiO₂ | Al₂O₃ | B₂O₃ | CaO  | MgO  | Na₂O | K₂O  | ZrO₂ | BaO  | PbO  | ZnO  | Published | Code  | Error |
| ------------------------------------------- | ---- | ----- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | --------- | ----- | ----- |
| FBZr, zirconium white                       | 56.5 | 4.5   | 3.60 | 9.8  | 2.45 | 0.19 | 3.71 | 6.5  | 0.07 | 0.05 | 12.0 | 2.685     | 2.734 | +1.8% |
| FCB/Pb, lead-containing boracic crystalline | 57.2 | 7.5   | 4.41 | 9.1  | 0.50 | 2.07 | 3.53 | 0.14 | 1.51 | 4.66 | 9.0  | 2.650     | 2.692 | +1.6% |
| FCP, calcium–zinc crystalline               | 60.0 | 6.5   | 1.74 | 14.1 | 1.75 | 0.34 | 4.37 | 0.06 | 0.09 | 0.01 | 10.6 | 2.654     | 2.665 | +0.4% |
| FCB/Na, sodium boracic crystalline          | 63.1 | 8.8   | 11.4 | 5.69 | 0.06 | 6.5  | 2.40 | 1.70 | 0.02 | 0.01 | 0.05 | 2.269     | 2.379 | +4.9% |

(Fe₂O₃ 0.03–0.10% in each, outside Appen's table, passed over.) The code reads high, by 0.4–1.8% for three frits and
4.9% for the high-boron sodium frit, where B₂O₃'s volume matters most. FBZr is an opacifying frit that may hold
zircon crystals, which Appen's glass factors do not describe. This is one paper (one source), not three: **no**
frit maker's data sheet giving an SG with the analysis was found (Digitalfire's Ferro frit pages give analyses but
no SG). The lead-bisilicate range 4.5–4.7 in the tests comes from the earlier note citing Digitalfire's Ceraflux
page and was not reopened in this round.

## Mixing rule

Dry SG of a mixture = total mass ÷ Σ(massᵢ ÷ SGᵢ), i.e. volumes add.

1. Wikipedia, "Density", section on mixtures: density of a mixture from the components' volumes "provided that there is
   no interaction between the components", https://en.wikipedia.org/wiki/Density.
2. Wikipedia, "Rule of mixtures", "Other properties": ρ̄ from (f/ρ₁ + (1−f)/ρ₂)⁻¹, https://en.wikipedia.org/wiki/Rule_of_mixtures.
3. Wikipedia, "Slurry": volume fraction of solids from mass fraction and solids SG, the same volume additivity,
   https://en.wikipedia.org/wiki/Slurry.
4. SRNL-R Eq. 4 (specific volume as the sum of parts) is the same rule for oxides in a glass.
5. California Department of Transportation, _Concrete Technology Manual_, Chapter 3 "Review of Concrete Mix Designs",
   June 2013, p. 3-1 (definitions) and the example mix design: "Absolute Volume of a loose material is defined as the
   actual volume occupied by the solid particles ... computed from the known weight and specific gravity": Mass ÷
   (S.G. × Unit Weight of Water); the example adds each ingredient's absolute volume (cement 480 lb at 3.15, fly ash,
   water, aggregates) to "Total = 27.0 ft3", one cubic yard. This is the absolute-volume method of concrete mix
   design (ACI 211.1, not opened).
   https://dot.ca.gov/-/media/dot-media/programs/engineering/documents/structureconstruction/ctm/sc-ctm-chpt3-a11y.pdf
6. TPU eq. 2.4 (Appen, 1974): a glass's density as its total mass over the sum of its oxides' moles × volumes, the same
   additivity.

Three non-Wikipedia sources: **yes** (Caltrans, SRNL, TPU), though SRNL and TPU apply the rule to oxides in a glass and
Caltrans to the solids in concrete, not to a glaze powder. No ceramics textbook stating it was opened.

## Brongniart's formula

Dry weight = (slurry weight − weight of the same volume of water) × SG ÷ (SG − 1), SG of the dry material.

1. P. Mostert, "Brongniart's formula", Glazy Ceramics Wiki, 2019-03-30, https://wiki.glazy.org/t/brongniarts-formula/780.html
   (names Alexandre Brongniart of Sèvres; default dry SG 2.6; equations are images and were not read).
2. Queensberry Hunt, "Slop / Dry Weight Calculations",
   http://new.queensberryhunt.com/wp-content/uploads/2012/05/Slop-DryWeight_Final.doc: "Specific Gravity x (100cc
   weight − 100) ... ÷ Specific Gravity − 1", dry SG 2.65.
3. J. Taylor, "Specific Gravity Is Your Friend", Mt Vision Ceramics Studio, 2026-01-12,
   https://www.mtvision.studio/specific-gravity-is-your-friend/ (states the dry fraction; the form read through a
   summary did not match and is not relied on).

4. D. Michaud, "Common & Basic Formulas for Mineral Processing Calculations", 911Metallurgist, 2016-03-21,
   https://www.911metallurgist.com/blog/milling-calculations-formulas/, "Pulp Details by Weight": "%Solids = 100/R + 1 =
   100 S(P−L)/P(S−L)", P the pulp's SG, S the solids' SG, L the liquid's. With L = 1 the dry weight in a volume V is
   V·P × S(P−1)/(P(S−1)) = (W − V)·S/(S−1), W the slurry's weight: Brongniart's formula (our algebra). Mineral
   processing, an independent tradition.
5. Wikipedia, "Slurry", the solids mass fraction from slurry, solids and liquid densities (counted last).

Three sources: **yes** (Glazy wiki, Queensberry Hunt, 911Metallurgist), source 3 unclear. Hamer's _Potter's
Dictionary_ and Cardew's _Pioneer Pottery_ were not available online; Digitalfire has no Brongniart glossary page
(https://digitalfire.com/glossary/specific+gravity, by T. Hansen, gives only SG = weight ÷ volume).

## Guide text checks (making-a-glaze, "Find your own glaze's dry SG while you mix")

- Worked example: 1980 ÷ 1.45 = 1365.5 mL; 1365.5 − 980 = 385.5 mL; 1000 ÷ 385.5 = 2.594. The guide's "about 1366",
  "386" and "about 2.59" are right.
- Sensitivity: slurry volume = W ÷ S, so d(volume)/dS = −W ÷ S² = −1980 ÷ 2.1025 = −942 mL per unit SG; 0.01 moves it
  9.4 mL, which is 2.4% of the 385.5 mL powder volume, and the dry SG moves by the same share. "About 2 to 3%" holds for
  this example (our arithmetic). At thinner slurries the share is larger (about 3% at SG 1.35).
- "Most of the common materials are between about 2.5 and 2.9": true for feldspars (2.54–2.66), quartz 2.65, kaolinite
  2.61–2.68, calcite 2.71, talc 2.78, dolomite 2.86, wollastonite 2.9 (table above). Exceptions a reader may have in
  quantity: frits (about 2.4–2.6 by Appen, lead frits 4.5 and up), colemanite 2.42, petalite 2.42, zircon 4.65. The
  guide already names zircon and lead.

## "No estimate" decisions

- Titanium dioxide: rutile 4.23 (HoM) or anatase 3.79–3.97 (HoM), a 10% gap, and ceramic TiO₂ is sold as either.
  Sound.
- Lead, Yellow: litharge 9.14–9.35 or massicot 9.64 (HoM calc). The gap is small (3%); an estimate of about 9.5 would
  be defensible, but leaving it out is safe.
- UK calcined flint: quartz 2.65 against cristobalite 2.32–2.36 (HoM). Sound.
- Calcined kaolin, Molochite: Digitalfire gives Molochite SG 2.7 (https://digitalfire.com/material/molochite), one
  source; the phase mix (mullite, glass, cristobalite) varies. Leaving it out is sound; 2.7 could be used later with
  more sources.
- Gerstley borate and blends: no SG found in any opened source. Sound.
- Bentonites: montmorillonite 2–3 (HoM), 2–2.7 (WM), 2.74–2.78 (ET); the spread is the water in the layers. Sound.
