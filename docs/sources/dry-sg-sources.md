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

## Minerals and compounds (basis `mineral`)

| Code key (materials)                       | SG used             | Source 1                                                                                              | Source 2                                               | Source 3                                                                                            | Three? |
| ------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------ |
| quartz (Silica, Flint, Silica 200 Mesh)    | 2.65                | HoM v1.2: D(meas.) 2.65; 2.59–2.63 massive; calc 2.66                                                 | WM Quartz: 2.6–2.65, calc 2.65                         | WP Quartz: 2.65                                                                                     | yes    |
| calcite (Whiting)                          | 2.71                | HoM v1: 2.7102(2), calc 2.711                                                                         | WM Calcite: 2.71, calc 2.71                            | WP Calcite: 2.71                                                                                    | yes    |
| dolomite                                   | 2.86                | HoM v1: 2.86, calc [2.876]                                                                            | WM: 2.8–2.9 (avg 2.84), calc 2.84                      | WP: 2.84–2.86                                                                                       | yes    |
| magnesite                                  | 3.00                | HoM v1: 3.00(2), calc 3.010                                                                           | WM: 3, calc 2.98                                       | WP: 3.0–3.2                                                                                         | yes    |
| hydromagnesite (Light Magnesium Carbonate) | 2.24                | HoM v1: 2.24–2.25, calc 2.25                                                                          | WM: 2.16–2.2, calc 2.25                                | WP: 2.16–2.2                                                                                        | yes    |
| witherite (Barium Carbonate)               | 4.29                | HoM v1: 4.22–4.31, calc 4.24–4.29                                                                     | WM: 4.3, calc 4.31                                     | WP: 4.3                                                                                             | yes    |
| strontianite (Strontium Carbonate)         | 3.76                | HoM v1: 3.76(2), calc 3.780                                                                           | WM: 3.78, calc 3.78                                    | WP: 3.74–3.78                                                                                       | yes    |
| fluorite (Fluorspar)                       | 3.18                | HoM v1: 3.175–3.184, calc 3.180                                                                       | WM: 3.01–3.25, calc 3.18                               | WP: 3.175–3.184                                                                                     | yes    |
| cryolite                                   | 2.97                | HoM v1: 2.97, calc 2.973(2)                                                                           | WM: 2.95–3, calc 2.96                                  | WP: 2.95–3.0                                                                                        | yes    |
| talc                                       | 2.78                | HoM v1.2: 2.58–2.83, calc [2.78]                                                                      | WM: 2.7–2.8, calc 2.82                                 | WP: 2.58–2.83                                                                                       | yes    |
| wollastonite (Vansil W, NYAD 400)          | 2.9                 | HoM v1.2: 2.86–3.09, calc 2.90                                                                        | WP: 2.86–3.09                                          | none (WM page redirected to index)                                                                  | **no** |
| orthoclase                                 | 2.56                | HoM v1.2: 2.55–2.63, calc 2.563                                                                       | WM: 2.56, calc 2.55                                    | WP: 2.55–2.63                                                                                       | yes    |
| spodumene                                  | 3.15                | HoM v1.2: 3.03–3.23, calc 3.184                                                                       | WM: SG 3.15                                            | WP: 3.03–3.23                                                                                       | yes    |
| petalite                                   | 2.42                | HoM v1.2: 2.412–2.422, calc [2.40]                                                                    | WM: 2.39–2.46, calc 2.39                               | WP: 2.4                                                                                             | yes    |
| lepidolite                                 | 2.84                | HoM v1.2 (polylithionite): 2.58–2.82, calc 2.84                                                       | WM Lepidolite: 2.8–2.9 (avg 2.84), calc 2.79           | WP Lepidolite: 2.8–2.9                                                                              | yes    |
| niter KNO₃                                 | 2.10                | HoM v1: 2.109(2), calc 2.104                                                                          | WM: 2.1–2.11, calc 2.10                                | WP Potassium nitrate: 2.109 (16 °C)                                                                 | yes    |
| nitratine NaNO₃ (Sodium Nitrate)           | 2.26                | HoM v1: 2.24–2.29, calc 2.25                                                                          | WM: 2.24–2.29, calc 2.26                               | WP Sodium nitrate: 2.257                                                                            | yes    |
| borax                                      | 1.71                | HoM v1: 1.715(5), calc 1.70                                                                           | WM: 1.7–1.72, calc 1.65                                | PC CID 16211214: 1.73 (HSDB, CRC 94th p. 4-91); ICSC 1.7                                            | yes    |
| sassolite (Boric Acid)                     | 1.48                | HoM v1: 1.46–1.50, calc 1.562                                                                         | WP Sassolite: 1.46–1.50; LCG 1.46–1.50                 | PC CID 7628: 1.5 (CRC 91st p. 4-53); 1.435 (USCG)                                                   | yes    |
| colemanite                                 | 2.42                | HoM v1: 2.423(5), calc 2.42                                                                           | WM: 2.42, calc 2.42                                    | WP: 2.42                                                                                            | yes    |
| ulexite                                    | 1.96                | HoM v1: 1.955, calc 1.955                                                                             | WM: 1.95–1.96, calc 1.95                               | WP: 1.95–1.96                                                                                       | yes    |
| gibbsite (Alumina Hydrate)                 | 2.40                | HoM v1: 2.40, calc [2.42]                                                                             | WM: 2.3–2.4, calc 2.44                                 | PC CID 10176082: 2.42 (CRC 91st p. 4-45); ~2.4 (Hawley)                                             | yes    |
| corundum (Calcined Alumina)                | 3.98                | HoM v1: 3.98–4.10, calc 3.997                                                                         | WM: 4–4.1, calc 4.01                                   | PC CID 9989226: 3.99 (PAC); 4.0 (NIOSH)                                                             | yes    |
| zincite (Zinc Oxide)                       | 5.66                | HoM v1: 5.66(2), calc 5.6730                                                                          | WM: 5.43–5.7, calc 5.66                                | PC CID 3007857: 5.6 (CRC 94th p. 4-100); 5.61 (NIOSH)                                               | yes    |
| hydroxylapatite (Bone Ash)                 | **3.16** (was 3.08) | HoM v1: 3.14–3.21, calc 3.16                                                                          | WP Hydroxyapatite: 3.14–3.21 meas., 3.16 calc.         | PC CID 14781: 3.1–3.2 (Hawley 13th p. 88)                                                           | yes    |
| rutile                                     | 4.23                | HoM v1: 4.23(2), calc 4.25                                                                            | WM: 4.25                                               | PC CID 26042: 4.23 (CRC 81st p. 4-94); 4.26 (OSHA)                                                  | yes    |
| eskolaite / Cr₂O₃ (Chromium Oxide)         | 5.22                | PC CID 517277: 5.22 at 25 °C (HSDB; ICSC; PAC)                                                        | WP Chromium(III) oxide: 5.22                           | HoM v1 eskolaite: 5.18, calc 5.20 (mineral; WM same)                                                | yes    |
| Co₃O₄ (Cobalt Oxide)                       | 6.11                | CB CB00124507 (https://www.chemicalbook.com/ChemicalProductProperty_EN_CB00124507.htm): 6.11 at 25 °C | WP Cobalt(II,III) oxide: 6.07 (cites CRC 87th)         | none                                                                                                | **no** |
| tenorite / CuO (Copper oxide)              | **6.4** (was 6.5)   | HoM v1: 6.45 (synthetic), calc 6.515(2)                                                               | PC CID 164827: 6.315 at 14 °C (HSDB); 6.4 (PAC, NIOSH) | WM Tenorite: 6.5, calc 6.55                                                                         | yes    |
| malachite (Copper carbonate)               | 4.0                 | HoM v1: 4.05(2), calc 3.983                                                                           | WM: 3.6–4 (avg 3.8), calc 4.03                         | WP: 3.6–4                                                                                           | yes    |
| ilmenite                                   | 4.72                | HoM v1: 4.72, calc 4.789                                                                              | WM: 4.72, calc 4.79                                    | WP: 4.70–4.79                                                                                       | yes    |
| magnetite (Black iron oxide)               | 5.18                | HoM (p. 333): 5.175, calc 5.20                                                                        | WM: 5.1–5.2, calc 5.21                                 | WP: 5.17–5.18                                                                                       | yes    |
| hematite (Red iron oxide)                  | 5.26                | HoM v1: 5.26, calc 5.255                                                                              | WM: 5.3, calc 5.28                                     | PC CID 518696: 5.25 (CRC 88th); 5.24 (ICSC, NIOSH)                                                  | yes    |
| NiO (Nickel oxide, green)                  | 6.67                | WP Nickel(II) oxide: 6.67                                                                             | WM Bunsenite: 6.4–6.8 (avg 6.6), calc 6.81             | HoM v1 bunsenite: 6.898, calc 6.806 (the mineral, higher)                                           | yes    |
| V₂O₅ (Vanadium oxide)                      | 3.36                | PC CID 14814: 3.36 (OSHA, NIOSH); 3.357 (CAMEO)                                                       | WP Vanadium(V) oxide: 3.35 (cites CRC)                 | none                                                                                                | **no** |
| cassiterite (Tin oxide)                    | 6.99                | HoM v1: 6.98–7.01, calc 6.993                                                                         | WM: 6.8–7, calc 7.15                                   | PC CID 16747781: 6.95 (HSDB, ICSC, NIOSH)                                                           | yes    |
| baddeleyite (Zirconium oxide)              | 5.75                | HoM v1: 5.40–6.02, calc [5.83]                                                                        | WM: 5.5–6 (avg 5.75), calc 5.83                        | WP Zirconium dioxide: 5.68                                                                          | yes    |
| zircon                                     | 4.65                | HoM v1.2: 4.6–4.7, calc 4.714                                                                         | WM: 4.6–4.7, calc 4.85                                 | WP: 4.6–4.7                                                                                         | yes    |
| epsomite (Epsom salts)                     | 1.68                | HoM v1: 1.677(2) (synthetic)                                                                          | WM: 1.67–1.68, calc 1.68                               | PC CID 24843: 1.68 at 25 °C (PAC)                                                                   | yes    |
| rhodochrosite (Manganese carbonate)        | 3.70                | HoM v1: 3.70, calc 3.70                                                                               | WM: 3.69, calc 3.70                                    | PC CID 11726: 3.7 (CRC 79th p. 4-69)                                                                | yes    |
| chromite (Iron chromate)                   | 4.79                | HoM (p. 122): 4.5–4.8, calc [5.12]                                                                    | WM: 4.5–5.09 (avg 4.79)                                | WP: 4.5–4.8                                                                                         | yes    |
| CeO₂ (Cerium oxide)                        | 7.22                | WP Cerium(IV) oxide: 7.215                                                                            | PC CID 73963: 7.65 (PAC, disagrees)                    | none                                                                                                | **no** |
| SiC (Silicon carbide)                      | 3.21                | WP Silicon carbide: 3.16 (infobox), 3.21 (3C/4H/6H)                                                   | PC CID 9863: 3.23 (HSDB, Merck); 3.2 (ICSC)            | CB CB2431905 (https://m.chemicalbook.com/ChemicalProductProperty_EN_CB2431905.htm): 3.22; text 3.21 | yes    |
| K₂Cr₂O₇ (Potassium Bichromate)             | 2.68                | PC CID 24502: 2.676 (Merck 2013); 2.68 (PAC)                                                          | WP Potassium dichromate: 2.68                          | none                                                                                                | **no** |
| minium (Lead, Red)                         | 8.9                 | HoM v1: 8.9–9.2 (synthetic), calc [8.92]                                                              | WM: 8.2, calc 8.93                                     | LCG: 8.9–9.2 (WP Lead(II,IV) oxide gives 8.3)                                                       | yes    |
| hydrocerussite (Lead, White)               | 6.80                | HoM v1: 6.80–6.82, calc 6.873                                                                         | WM: 6.8, calc 6.84                                     | LCG: 6.8                                                                                            | yes    |
| litharge                                   | **9.35** (was 9.14) | HoM v1: 9.14 (synthetic), calc [9.35]                                                                 | WM: 9.14–9.355, calc 9.33                              | PC CID 14827: 9.53 alpha (Kirk-Othmer); 9.64 (CRC 95th); 9.5 (ICSC)                                 | yes    |
| Li₂CO₃                                     | 2.11                | PC CID 11125: 2.11 (CRC 86th p. 4-70); 2.1 (ICSC)                                                     | WM Zabuyelite: 2.09, calc 2.10                         | none                                                                                                | **no** |
| K₂CO₃ (Pearl Ash)                          | **2.29** (was 2.43) | PC CID 11430: 2.29 (HSDB, CRC 91st p. 4-82); 2.29 (ICSC); 2.29 (PAC)                                  | WP Potassium carbonate: 2.43 (disagrees)               | none                                                                                                | **no** |
| Na₂CO₃ (Soda Ash)                          | 2.54                | PC CID 10340: 2.54 (CRC 95th p. 4-89); 2.5 (ICSC)                                                     | WP Sodium carbonate: 2.54 (anhydrous)                  | none                                                                                                | **no** |

Changes in this round, and why:

- **Bone Ash 3.08 → 3.16**: 3.08 appears only on webmineral; HoM, Wikipedia and Hawley all give 3.1–3.2.
- **Copper oxide 6.5 → 6.4**: the material sold is made, not mined; HoM gives 6.45 for synthetic CuO and PubChem's
  sources 6.315–6.4. 6.5 is the mineral's rounded webmineral value.
- **Litharge 9.14 → 9.35**: 9.14 is the bottom of the measured range; HoM and webmineral calculate 9.33–9.35, and
  CRC/Kirk-Othmer give 9.53–9.64. 9.35 is the crystal-structure value.
- **Pearl Ash 2.43 → 2.29**: three compilations in PubChem (CRC via HSDB, ICSC, PAC) give 2.29; only Wikipedia
  gives 2.43. Still short of three independent sources.
- **Appen SrO 17.6 → 17.5**: AGC Table 2 gives 17.5.

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

Three sources: yes for "feldspar minerals 2.54 to 2.66" (HoM, WM, ET) and one manufacturer-level figure (DF Minspar).
**No** commercial spec sheet for Custer, G-200, nepheline syenite or Cornwall stone giving an SG was opened; Digitalfire's
pages for those give only bulk density or none.

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

Three sources: yes for kaolin/kaolinite (HoM, WM, DF, ET). **No** for ball clays and fireclays as products: only the
uncited Glazy wiki figure; 2.6 there rests on their minerals (kaolinite, quartz, mica/illite 2.6–2.9).

## Glasses (basis `glass`): Appen's factors

Formula: density = Σ xᵢMᵢ ÷ Σ xᵢVᵢ, xᵢ mole fraction, Mᵢ molar mass, Vᵢ partial molar volume. The code works from
grams per gram (moles = grams ÷ M), which is the same ratio.

- Formula sources: SRNL-R Eq. 4 and 5 (validated on 1104 glasses, RMSE 0.050 g/cm³, slope 0.9975); SRNL-M Eq. 1–5;
  AGC (Appen's coefficients "used when the physical property of glass is predicted from an additive rule"). Three:
  yes (SRNL-R and SRNL-M counted as one, plus AGC, plus SRNL-M's citation of Volf 1988 pp. 107–114, not opened).
  Strictly two independent opened sources.

| Oxide | Code | AGC (Appen) | Volf bound (SRNL-R Table 1) |
| ----- | ---- | ----------- | --------------------------- |
| SiO₂  | 26.1 | 26.1–27.25  | 26.36                       |
| B₂O₃  | 38.0 | 18.5–38     | 24.87                       |
| Al₂O₃ | 40.4 | 40.4        | 40.78                       |
| Li₂O  | 11.0 | 11          | 11.07                       |
| Na₂O  | 20.2 | 20.2        | 20.00                       |
| K₂O   | 34.1 | 34.1        | 33.64                       |
| MgO   | 12.5 | 12.5        | 12.22                       |
| CaO   | 14.4 | 14.4        | 14.38                       |
| SrO   | 17.5 | 17.5        | 17.56                       |
| BaO   | 22.0 | 22          | 21.91                       |
| ZnO   | 14.5 | 14.5        | 14.53                       |
| PbO   | 23.5 | 21–23.5     | 22.32                       |
| TiO₂  | 20.5 | 19–22.5     | 21.02                       |
| ZrO₂  | 23.0 | 23          | 23.25                       |

**Not three sources**: Appen's own values are confirmed by one opened source (AGC); Volf's related table by one
(SRNL). Appen's 1949/1970 originals, Volf, Bansal & Doremus and Scholze were not available online. Appen's rules for
where SiO₂, B₂O₃, PbO and TiO₂ fall in their ranges were not found in any opened source; the code holds them at one
value. B₂O₃ = 38 is kept (not Volf's 24.87) because 24.87 overestimates borosilicates: SRNL-R Table 4 lists PYREX
measured 2.224 against 2.366 predicted.

Check glasses:

| Glass                     | Published                                                                                          | Code                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| NIST SRM 1830 float glass | 2.490 measured (SRNL-R Table 4, citing NIST SRM 1830 certificate, 2017)                            | 2.51 for a typical float analysis (72.5 SiO₂, 13.5 Na₂O, 9 CaO, 3.5 MgO, 1.5 Al₂O₃) |
| Borofloat 33              | 2.23 at 25 °C (SCHOTT, https://www.schott.com/en-us/products/borofloat-p1000314/technical-details) | 2.26                                                                                |
| Pyrex                     | 2.224 measured (SRNL-R Table 4)                                                                    | not run (composition not printed)                                                   |
| NIST SRM 1827a lead glass | 3.594 measured (SRNL-R Table 4)                                                                    | not run                                                                             |

The soda-lime and Borofloat figures each have one opened source. **No** published frit SG with its oxide analysis was
opened (Ferro SDSs say "no data available"; Digitalfire's Ferro 3134 page gives the analysis but no SG). The
lead-bisilicate range 4.5–4.7 in the tests comes from the earlier note citing Digitalfire's Ceraflux page and was not
reopened in this round.

## Mixing rule

Dry SG of a mixture = total mass ÷ Σ(massᵢ ÷ SGᵢ), i.e. volumes add.

1. Wikipedia, "Density", section on mixtures: density of a mixture from the components' volumes "provided that there is
   no interaction between the components", https://en.wikipedia.org/wiki/Density.
2. Wikipedia, "Rule of mixtures", "Other properties": ρ̄ from (f/ρ₁ + (1−f)/ρ₂)⁻¹, https://en.wikipedia.org/wiki/Rule_of_mixtures.
3. Wikipedia, "Slurry": volume fraction of solids from mass fraction and solids SG, the same volume additivity,
   https://en.wikipedia.org/wiki/Slurry.
4. SRNL-R Eq. 4 (specific volume as the sum of parts) is the same rule for oxides in a glass.

**Not three independent sources**: three are Wikipedia pages. No textbook was opened. The rule follows directly from
mass and volume being additive for a dry powder whose particles do not dissolve in one another.

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

**Two sources clearly state the formula** (1 and 2); source 3 is unclear. Hamer's _Potter's Dictionary_ and Cardew's
_Pioneer Pottery_ were not available online.

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
