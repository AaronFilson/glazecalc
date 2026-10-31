# Português do Brasil: guia de estilo e glossário (style sheet and glossary)

The rules and terms for translating Glazecalc into Brazilian Portuguese (`pt-BR`), for potters in Brazil (the 1990
spelling agreement as Brazil applies it, VOLP of the Academia Brasileira de Letras). Read [README.md](README.md) first;
[terms.md](terms.md) gives the meaning of every English term. Every pt-BR message and guide follows this page: one
Brazilian word for one thing. Brazil's region (BR) fires to Orton cones.

This sheet was made from [pt-PT.md](pt-PT.md): same sections, with every place Brazil differs settled below. **Translate
from the English.** The pt-PT files are a reference for meaning and for terms that both countries share, never for
register, vocabulary or spelling: nearly every pt-PT line differs from Brazilian usage somewhere.

**What the sources could and could not give** (research 2026-10-31). The web search reached few Brazilian pages: no
Brazilian shop catalogue was read, and Microsoft's pt-BR style guide was found but its PDF could not be read by the
tools. The ceramics rows rest on the UFRGS distance-learning ceramics laboratory (LACAD), which was read, and on usage.
Rows with no source read today are marked **Native check**; a Brazilian potter should read those first. The rows that
matter most: _esmalte_ vs _vidrado_ (glaze), _queima de biscoito_ (bisque), _cone_, _prateleira_ (kiln shelf),
_fórmula de Seger_, _densidade_ (specific gravity), _escorrimento_, _gretamento_ (crazing), _descascamento_ (shivering),
_esmalte de revestimento interno_ (liner glaze) and the kiln-sitter parts.

Main sources, cited below by short name:

- **LACAD**: Laboratório de Cerâmica Artística a Distância, Universidade Federal do Rio Grande do Sul (UFRGS):
  [Engobe](https://www.ufrgs.br/lacad/revestengobe.html) (read 2026-10-31): "engobe é argila líquida (_slip_, em
  inglês)", "peças biscoitadas", "peças cruas", "temperatura de queima", "forno elétrico", "ponto de couro", "ponto de
  osso", "frita alcalina", "faiança", "monoqueima"; also "vidrado azul transparente" (academic prose uses _vidrado_
  too). [Como queimar](https://www.ufrgs.br/lacad/fornoscomoqueimar.html) (read 2026-10-31): "queimas cerâmicas",
  "utilize cones pirométricos", "fornos elétricos", "queimas a gás e lenha", "Patamar final", "Resfriamento", "proteja
  as prateleiras" (with kaolin), "superfícies engobadas e/ou esmaltadas". Its
  [matérias-primas](https://www.ufrgs.br/lacad/materiasprimas.html) section sorts materials as fundentes,
  refratários, colorantes, opacificantes, fritas, estabilizantes (from its link names; the labels are images).
- **LACAD suppliers**: [Mural de fornecedores](https://www.ufrgs.br/lacad/muralfornecedores.html) (seen through search
  only, 2026-10-31; the page did not load): a São Paulo shop listing "matérias-primas, vidrados da Ferro Enamel …,
  corantes minerais, óxidos, cones pirométricos". An old list; not a current catalogue.
- **MS**: [Microsoft Localization Style Guide, Portuguese (Brazil)](https://download.microsoft.com/download/8/e/3/8e349e32-9eb9-4b63-9909-7586b94a24dd/por-bra-StyleGuide.pdf)
  (found 2026-10-31, **not read**: the PDF did not extract). The register and button rules below are the usage of
  Brazilian Windows, Google and Apple interfaces (Salvar, Excluir, Cancelar, Configurações); the lead should hold them
  against the guide.
- **NR-15**: Norma Regulamentadora 15, Anexo 12, "Limites de tolerância para poeiras minerais" (sílica livre
  cristalizada). The official text sits with the Ministério do Trabalho e Emprego on gov.br; this research read only
  secondary pages (for example [São Paulo state's NR-15 PDF](https://saude.sp.gov.br/resources/crh/qualidade-de-vida/saude-e-seguranca/normas-regulamentadoras/nr15_-atividades_e_operacoes_insalubres.pdf),
  listed by search, not opened). The wording "limite de tolerância" and "sílica livre cristalizada" is the norm's own
  title text.
- **Anvisa ceramics rule**: Resolução nº 27/1996 (SVS/MS), limits for the migration of lead and cadmium from ceramic
  ware, as cited by a [FAPESP record](https://bv.fapesp.br/en/auxilios/82233/URL) and an
  [Embrapa study](https://www.cnpm.embrapa.br/projetos/ciic2016/resumo2015/RS15241.pdf) (search results, 2026-10-31).
  **Not confirmed current**: the lead must check on gov.br/anvisa whether a newer RDC replaced it before any guide names
  a number.
- **Disque-Intoxicação**: 0800 722 6001, Anvisa's free line routed to the nearest CIATox (Renaciat), per
  [CFM](https://portal.cfm.org.br/noticias/anvisa-cria-disque-intoxicacao/) and the
  [CVS-SP CIATox list](https://cvs.saude.sp.gov.br/up/CIATOX_RESUMIDO_ESTADO_SP_atualizado_04-07-2024.pdf). The numbers
  the app shows come from the region data, read on official pages in L0 (scratch/round10/c-africa-latam/emergency-sources.md);
  the translation copies them, never adds them.
- **CLDR**: the app's `Intl` for pt-BR (Node 24), checked 2026-10-31 with scratch/round10/c-l1/plurals.mjs:
  "1.222", "12.500,5", "14 de outubro de 2026 às 20:00"; plural categories one, many, other with **0 → one**.

Not reached: VOLP (the spelling below is standard Brazilian usage, not re-read), ABNT's catalogue (NBR 14725 is named
from the standard's known title, not read), NR-6's text, Fundacentro, any Brazilian shop's live catalogue, Senai or
UNESP course pages.

## Differences from pt-PT

Read this table before the rest. Left: what pt-PT.md says; right: what pt-BR writes.

| Topic                  | pt-PT                                                          | pt-BR                                                                                                                  |
| ---------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Address                | 3rd-person verb, no pronoun; never _você_                      | **você** with 3rd-person verbs, often left out where the verb is clear; possessive _seu/sua_ (no article: "sua conta") |
| Buttons                | infinitive (Guardar)                                           | infinitive too: **Salvar**, Excluir, Cancelar, Imprimir                                                                |
| Ongoing action         | _a_ + infinitive (A guardar…)                                  | **gerund**: Salvando…, Carregando…, Removendo…                                                                         |
| Pronoun place          | enclisis (Inscreva-se)                                         | Brazilian norm: enclisis in a sentence start ("Inscreva-se"), proclisis allowed elsewhere ("Não se esqueça")           |
| "have to"              | tem de                                                         | **tem que** / precisa                                                                                                  |
| Quotation marks        | «…»                                                            | **“…”** (with ‘…’ inside)                                                                                              |
| Thousands              | 1240 (no grouping)                                             | **1.240** (CLDR pt-BR groups four digits with a point; the app prints 1.222)                                           |
| Spelling               | facto, contacto, receção, económico, crónico, António, registo | **fato, contato, recepção, econômico, crônico, Antônio, registro**                                                     |
| file, screen, user     | ficheiro, ecrã, utilizador                                     | **arquivo, tela, usuário**                                                                                             |
| Settings               | Definições                                                     | **Configurações**                                                                                                      |
| password, download     | palavra-passe, transferir                                      | **senha, baixar** (button "Baixar meus dados")                                                                         |
| delete, undo           | eliminar, anular                                               | **excluir, desfazer**                                                                                                  |
| sign in / out          | iniciar / terminar sessão                                      | **entrar / sair** ("Entrar com o Google")                                                                              |
| sign up                | registar-se                                                    | **criar conta** (cadastro for the form: "Cadastro")                                                                    |
| mobile phone           | telemóvel                                                      | **celular**                                                                                                            |
| share (with people)    | partilhar                                                      | **compartilhar**                                                                                                       |
| glaze                  | vidrado                                                        | **esmalte** (see 2.1)                                                                                                  |
| firing, fire           | cozedura, cozer                                                | **queima, queimar**                                                                                                    |
| bisque                 | chacota                                                        | **biscoito**; bisque firing → **queima de biscoito**                                                                   |
| clay body              | pasta                                                          | **massa**                                                                                                              |
| once-firing            | monocozedura                                                   | **monoqueima** (LACAD)                                                                                                 |
| cooling                | arrefecimento                                                  | **resfriamento** (LACAD)                                                                                               |
| kiln shelf             | placa                                                          | **placa** in the app; _prateleira_ is the potters' word (LACAD) — see 2.4                                              |
| the materials "shelf"  | prateleira                                                     | **estoque** (see 2.8: _prateleira_ is the kiln shelf in Brazil)                                                        |
| matte                  | mate                                                           | **fosco**                                                                                                              |
| kaolin                 | caulino                                                        | **caulim**                                                                                                             |
| minerals in -ite       | dolomite, bentonite, colemanite                                | **dolomita, bentonita, colemanita, petalita, wollastonita**                                                            |
| chrome, zircon         | crómio, zircónio                                               | **cromo, zircônio**                                                                                                    |
| percent                | percentagem                                                    | **porcentagem**                                                                                                        |
| sieve                  | peneiro                                                        | **peneira**                                                                                                            |
| sawdust                | serradura                                                      | **serragem**                                                                                                           |
| cancer                 | cancro                                                         | **câncer**                                                                                                             |
| mole                   | a mole                                                         | **o mol**                                                                                                              |
| leather-hard, bone dry | consistência de couro                                          | **ponto de couro, ponto de osso** (LACAD)                                                                              |
| leaching               | libertação                                                     | **liberação** (migração in Anvisa's sense)                                                                             |
| contact                | contacto                                                       | **contato** ("em contato com alimentos")                                                                               |
| respirator class       | FFP2, FFP3                                                     | **PFF2, PFF3** (Brazil's names, NR-6 / ABNT); FFP2/FFP3 kept where the English names EU classes                        |
| exposure limit         | valor-limite de exposição profissional                         | **limite de tolerância** (NR-15)                                                                                       |
| SDS                    | ficha de dados de segurança (FDS)                              | **FDS** (ficha com dados de segurança, ABNT NBR 14725); older _FISPQ_ in brackets once                                 |
| poison centre          | centro antivenenos (CIAV)                                      | **centro de informação e assistência toxicológica (CIATox)**; Disque-Intoxicação                                       |
| wet cleaning           | limpeza a húmido, esfregona                                    | **limpeza úmida, pano úmido, esfregão / rodo com pano**                                                                |
| welding                | soldadura                                                      | **solda**                                                                                                              |
| guide titles           | see 1                                                          | see the title row below                                                                                                |

## 1. Style sheet

**Register.** _Você_, the Brazilian software norm: friendly and respectful, never _tu_ (regional) and never _o senhor_.
Write the verb in the third person and drop _você_ where the verb already says who acts: "Escolha a matéria-prima.",
"Peneire o esmalte duas vezes.", "Use uma máscara PFF3.", "Você precisa entrar para salvar." Possessives without the
article: "sua conta", "seu forno" ("a sua" reads Portuguese). _Por favor_ only where the English says "please"
("Please try again." → "Tente novamente."). "We" stays where the English has it ("Recomendamos…").

**Buttons, menu items, headings, field labels and tab names.**

- Buttons and menu commands: the **infinitive**, as Brazilian interfaces do: "Salvar", "Salvar como cópia", "Imprimir",
  "Comparar", "Adicionar matérias-primas", "Descartar o teste", "Sim, remover". No full stop.
- Instructions in sentences, hints and guides: the **imperative** (você form): "Digite uma quantidade (0 vale).",
  "Abra as configurações."
- Headings, page titles, tabs and menus: a noun phrase ("Receitas", "Configurações", "Registros de queima", "Cones e
  trabalho térmico"), or the infinitive where the English heading is an action. A question stays a question.
- Field labels: a noun, with the colon where the English has one: "Nome da matéria-prima:".
- Ongoing actions: the **gerund**: "Removing..." → "Removendo…", "Loading..." → "Carregando…".
- Errors: "Could not discard the trial." → "Não foi possível descartar o teste."

**Capitalisation.** Sentence case everywhere ("Salvar como cópia", "Peso equivalente", "Fórmula de Seger"), even where
the English uses Title Case. Months, days, _cone_, _grês_, _faiança_ lower case. Trade names keep their form (Orton,
Seger, Ferro, Kiln-Sitter, Glazecalc).

**Punctuation and spacing.**

- Quotation marks: **“…”**, with ‘…’ inside. For words the UI quotes ("boron blue" → “azul de boro”) and named UI
  items in running text the English does not tag.
- Apostrophe: the typographic ’ if ever needed; `''` only where the README asks (before `{`, `}` or `#`, and in
  `safety` and `records`).
- No space before ; : ! ?. Ranges: en dash, no spaces, unit once: "1.222–1.240 °C", "cones 06–04", "1–3%".
- Hyphens as VOLP: _matéria-prima_, _fórmula-limite_, _pré-aquecimento_, _autossuportado_, _infravermelho_,
  _semimáscara_.

**Numbers.**

- Decimal comma: "1,5%", "0,01 g", "1,45". (`{{SG 1.45}}` stays as written; the app renders it.)
- Thousands: a **point**, from four digits, as CLDR pt-BR and the app print: "1.240 °C", "1.000 g", "12.500 g". The
  numbers check reads the decimal mark from CLDR (pt-BR → ","), so "1.240" is read as 1240 and matches the English's
  1240 (confirmed 2026-10-31 with scratch/round10/c-l1/figures.mjs). Unseparated "1240 °C" also passes. A point before
  one or two digits ("1.24") is read as a decimal point in every language, so never shorten a group.
- A space before °C, °F and unit symbols ("1.240 °C", "100 °C/h", "250 g", "80 mesh"); **no space before %** ("15%").
- Dates: "14 de outubro de 2026" (months lower case). Times: 24-hour, **20:00** as the app prints ("às 20:00"); not
  "20h", which the check reads differently from the English figure.
- Ordinals: "1º", "2ª". Digits stay digits, words stay words.

**Plural forms.** CLDR gives pt-BR `one`, `many`, `other` (checked 2026-10-31):

| Category | Numbers                             | Example                        |
| -------- | ----------------------------------- | ------------------------------ |
| `one`    | **0**, 1, and 0,5, 1,5 (i = 0 or 1) | 1 matéria-prima, 1,5 grama     |
| `many`   | compact millions (1 mi, …)          | as `other`                     |
| `other`  | 2, 3, 21, 100, …                    | 2 matérias-primas, 21 receitas |

pt-PT differs (`one` only for 1). So **pt-BR's `one` is also used for 0 and for 1,5**, and must read right for them:

- `one` always keeps `#` ("# matéria-prima"), never the bare word "uma" or "Uma receita", which would print for 0.
- Where the English `one` has no `#` ("one {One material}"), add `=1 {Uma matéria-prima}` and keep `one {# matéria-prima}`.
- Where the English has `=0`, keep it; where it has none and "0 matéria-prima" reads badly, `=0` may be added only if the
  English means the same ("Nenhuma matéria-prima").
- `many` takes the same text as `other`.

```
{count, plural, =0 {Nenhuma receita} =1 {Uma receita} one {# receita} other {# receitas}}
```

**Cones.** Orton's (Brazil sells and teaches Orton; LACAD "utilize cones pirométricos"). Seger and Staffordshire cones
are different series, never converted; "SK" only for the Japanese cones (JIS R 8101).

- "cone 6" → "cone 6"; "cone 06" → "cone 06" (said "zero seis"); "cone 5–6" → "cones 5–6"; "fire to cone 6" →
  "queimar no cone 6"; "a cone 6 glaze" → "um esmalte para cone 6"; "mid fire, cone 5–6" → "média temperatura, cones
  5–6".
- "cone 04 bisque" → "biscoito no cone 04"; "bisque to cone 04" → "queimar o biscoito no cone 04".
- "Orton cone" → "cone Orton"; "Orton's chart" → "a tabela de cones Orton". **Native check** (queimar _no_ vs _ao_ cone 6).

**The unity formula.** **Fórmula de Seger** (as in Portugal; Brazilian ceramics courses use it: **Native check**).
"fórmula de Seger (UMF)" at first use on a page, then "fórmula de Seger"; "New to unity formulas?" → "Nunca usou a
fórmula de Seger?"; inline "Unity:" → "Seger:"; the scaling → _unitário_ ("Molecular / Unitária"). "a UMF".

**Gender-neutral wording.** Nothing agrees with the reader: "Bem-vindo!" → "Boas-vindas!"; "Are you sure you want to…?"
→ "Quer mesmo…?"; "Tem certeza?" is neutral. People in general: _ceramista_ or the plural ("quem está começando");
never "o(a)", "@" or "x" endings.

**The reader in the guides.** _Você_ forms, plain and kind: "Peneire o esmalte", "Pese cada matéria-prima",
"Recomendamos começar com duas queimas". "seu forno", "sua massa" where the English says "your"; drop where not needed.

**Feature names in running text.** The exact label, with its capital, inside the tag or bold the English uses; else in
“ ”.

| English                       | pt-BR label                      |
| ----------------------------- | -------------------------------- |
| Compare                       | Comparar                         |
| Suggest amounts (and compare) | Sugerir quantidades (e comparar) |
| Match with what I have        | Fazer com o que eu tenho         |
| Replace lead                  | Substituir o chumbo              |
| Settings                      | Configurações                    |
| Notebook (studio notebook)    | Caderno (caderno do ateliê)      |
| Library                       | Biblioteca                       |
| Standard                      | Padrão                           |
| My materials                  | Minhas matérias-primas           |
| Trial                         | Teste (período de teste)         |

"Under Settings" → "em <settings>Configurações</settings>"; "click **Compare**" → "clique em **Comparar**".

**The guides' titles** (title row), one each, the same in the guide's `title:`, `titles`, `guides/pt-BR.json` and every
link that names a guide:

| English                                   | pt-BR                                                  |
| ----------------------------------------- | ------------------------------------------------------ |
| Glazing basics                            | Esmaltes desde o básico                                |
| Making a glaze                            | Como fazer um esmalte                                  |
| Safe mixing and ventilation               | Mistura segura e ventilação                            |
| Firing a basic kiln                       | Queima em um forno simples                             |
| Don't poison your family                  | **Não envenene sua família**                           |
| Learn with John Britt's free glaze course | Aprenda com o curso gratuito de esmaltes de John Britt |

The home-safety title is the owner's blunt form: keep it as written, never softened ("Proteja sua família").

**Pitfalls of pt-BR in this field.**

- **European words to avoid**: vidrado (as the main word; see 2.1), chacota, cozedura/cozer, pasta (clay body),
  arrefecimento, peneiro, serradura, registo, percentagem, contacto, facto, mate, caulino, crómio, -ite minerals,
  ficheiro, ecrã, utilizador, guardar, definições, palavra-passe, eliminar, anular, transferir, iniciar sessão,
  telemóvel, partilhar, cancro, bebé, "a + infinitive", "tem de", «…».
- **queimar** (fire) also means to burn: "burnt" (scorched) → queimado is fine in context, but "the fired piece" →
  **a peça queimada** is the Brazilian potters' usage; where it could read as "burnt", write "depois da queima".
- **False friends**: _soda_ is sodium carbonate or caustic soda: write the oxide as **sódio**, **potássio** (not
  _potassa_). _sílica_ ≠ _silício_ ≠ _silicone_. _respirador_ also means a hospital ventilator: say **máscara de
  proteção respiratória** / **respirador purificador de ar** only where the English names a device class. _grês_
  also names floor tiles (_porcelanato_ is the tile body, never studio porcelain). _cristalino_ for crystalline glazes,
  never for "clear" (**transparente**). _tempo_: "Time" → "Horário", "Weather" → "Clima".
- **Spanish interference**: horno, bizcocho, quema, barniz: never.

## 2. Glossary

Gender: (o) masculine, (a) feminine. **show English** marks terms whose English a reader can ask to see. Rows not shown
here follow pt-PT.md with the Brazilian spelling and the words of the Differences table (for example: fundente,
estabilizante, alumina, boro, lítio, frita, rutilo, opacificante, engobe, raku, termopar, choque térmico,
desvitrificação). A row is listed when the Brazilian word differs or needs a note.

### 2.1 Glaze and its chemistry

| English                                        | pt-BR                                                 | Notes                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| glaze **show English**                         | esmalte (o); esmaltar; esmaltação (a)                 | LACAD "superfícies … esmaltadas"; the everyday Brazilian word for studio glaze. LACAD's prose also says _vidrado_, and an old supplier list reads "vidrados da Ferro": keep _vidrado_ out of the app for one word per thing. **Native check**. Never "enamel" senses (nail polish, metal) in context. |
| glass former                                   | formador de vidro (o)                                 |                                                                                                                                                                                                                                                                                                       |
| unity molecular formula (UMF) **show English** | fórmula de Seger (UMF) (a)                            | See the style sheet. **Native check**.                                                                                                                                                                                                                                                                |
| loss on ignition (LOI) **show English**        | perda ao fogo (a) (PF)                                | Brazilian technical sheets write PF. **Native check**.                                                                                                                                                                                                                                                |
| mole                                           | mol (o)                                               | Brazilian chemistry.                                                                                                                                                                                                                                                                                  |
| thermal expansion **show English**             | expansão térmica (a); coeficiente de expansão térmica | Brazilian usage prefers _expansão_ (pt-PT _dilatação_; both understood). **Native check**.                                                                                                                                                                                                            |
| raw, fired                                     | cru, queimado                                         | "fired oxides" → óxidos após a queima; "raw-glazed" → esmaltado cru (monoqueima).                                                                                                                                                                                                                     |
| gloss, satin, matte                            | brilhante, acetinado, fosco                           | _fosco_ is Brazilian. **Native check** (acetinado).                                                                                                                                                                                                                                                   |
| crystalline glazes                             | esmaltes cristalinos (de cristalização)               |                                                                                                                                                                                                                                                                                                       |
| boron blue                                     | “azul de boro”                                        | Brazilian quotes.                                                                                                                                                                                                                                                                                     |

### 2.2 Materials and oxides

| English                                                                                 | pt-BR                                                                                     | Notes                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| potash, soda (oxides)                                                                   | potássio, sódio                                                                           | As pt-PT.                                                                                                                                                                                                                   |
| raw materials                                                                           | matérias-primas (as)                                                                      | LACAD section "Matérias-primas". "Materials" → "Matérias-primas".                                                                                                                                                           |
| feldspar, potash/soda feldspar                                                          | feldspato; feldspato potássico, feldspato sódico                                          | Albite → albita; orthoclase → ortoclásio. **Native check** (mineral forms).                                                                                                                                                 |
| nepheline syenite                                                                       | nefelina sienito (o)                                                                      | Brazilian geology writes _nefelina sienito_. **Native check**.                                                                                                                                                              |
| kaolin                                                                                  | caulim (o)                                                                                | Brazilian standard form (UNESP thesis title "Caracterização comparativa de caulins para formulações de engobes e esmaltes cerâmicos", [repositório UNESP](https://repositorio.unesp.br/handle/11449/92900), search result). |
| ball clay                                                                               | argila plástica (a) (ball clay)                                                           | **Native check**; "ball clay" in brackets at first use.                                                                                                                                                                     |
| bentonite, dolomite, wollastonite, colemanite, ulexite, petalite, lepidolite, spodumene | bentonita, dolomita, wollastonita, colemanita, ulexita, petalita, lepidolita, espodumênio | Brazilian -ita forms. **Native check** (espodumênio).                                                                                                                                                                       |
| whiting                                                                                 | carbonato de cálcio (o)                                                                   | Also "calcita" on bags. **Native check**.                                                                                                                                                                                   |
| flint                                                                                   | sílex (o); in US recipes: quartzo moído                                                   |                                                                                                                                                                                                                             |
| frit                                                                                    | frita (a)                                                                                 | LACAD "frita alcalina", "fritas".                                                                                                                                                                                           |
| colorant, stain                                                                         | corante (o); pigmento cerâmico (o)                                                        | LACAD category "colorantes" (link name); app uses _corante_. **Native check**.                                                                                                                                              |
| chrome, zircon, zirconia                                                                | cromo (óxido de cromo); silicato de zircônio; óxido de zircônio (zircônia)                |                                                                                                                                                                                                                             |
| iron oxide red/black                                                                    | óxido de ferro vermelho / preto                                                           | _preto_, not _negro_.                                                                                                                                                                                                       |
| titania                                                                                 | dióxido de titânio                                                                        |                                                                                                                                                                                                                             |
| suspender                                                                               | agente de suspensão (o)                                                                   |                                                                                                                                                                                                                             |
| refractory                                                                              | refratário                                                                                | LACAD category "refratários".                                                                                                                                                                                               |

### 2.3 Clay, ware and firing stages

| English                       | pt-BR                                            | Notes                                                                                                   |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| clay body **show English**    | massa (a) (massa cerâmica)                       | Old supplier list "massas do Pascoal"; academic "massas cerâmicas". "body stain" → pigmento para massa. |
| ware, piece                   | peças (as)                                       | greenware → peças cruas (LACAD); glazed ware → peças esmaltadas.                                        |
| functional ware               | peças utilitárias                                |                                                                                                         |
| earthenware **show English**  | faiança (a); barro vermelho (terracota)          | LACAD "faiança". **Native check** (studio usage also says "baixa temperatura").                         |
| stoneware **show English**    | grês (o)                                         | Brazilian spelling with ê (pt-PT _grés_). **Native check**.                                             |
| greenware                     | peças cruas                                      | LACAD.                                                                                                  |
| leather-hard, bone dry        | ponto de couro; ponto de osso                    | LACAD.                                                                                                  |
| bisque **show English**       | biscoito (o); queima de biscoito (a); biscoitado | LACAD "peças biscoitadas". "soft/hard bisque" → biscoito mole / biscoito duro (**Native check**).       |
| glaze firing **show English** | queima de esmalte (a)                            | Also "segunda queima". **Native check**.                                                                |
| once-firing **show English**  | monoqueima (a)                                   | LACAD.                                                                                                  |
| slip                          | barbotina (a)                                    | Casting slip; LACAD glosses engobe as "argila líquida (_slip_)": keep engobe for decorating slip.       |
| engobe                        | engobe (o)                                       | LACAD.                                                                                                  |
| underglaze                    | tinta sob esmalte (a); pigmento de baixo-esmalte | **Native check**.                                                                                       |
| low/mid/high fire             | baixa, média, alta temperatura                   |                                                                                                         |

### 2.4 Kilns, cones and firing

| English                             | pt-BR                                                | Notes                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| electric kiln, gas kiln             | forno elétrico, forno a gás                          | LACAD.                                                                                                                                                            |
| firing, fire, load                  | queima (a), queimar; fornada (a); carga (a)          | LACAD "queimas cerâmicas". loading → enfornar, unloading → desenfornar.                                                                                           |
| kiln shelf                          | placa (a) (placa refratária); prateleira             | LACAD "proteja as prateleiras". Write **placa** in the app (unambiguous), _prateleira_ acceptable in guides' prose; posts → colunas / pilares (**Native check**). |
| element                             | resistência (a)                                      |                                                                                                                                                                   |
| cone (pyrometric) **show English**  | cone (o) (cone pirométrico)                          | LACAD "cones pirométricos".                                                                                                                                       |
| witness cone, cone pack, guard cone | cone testemunho; conjunto de cones; cone de proteção | **Native check**.                                                                                                                                                 |
| heatwork                            | trabalho térmico (o)                                 | Explain at first use. **Native check**.                                                                                                                           |
| ramp, hold                          | rampa (a); patamar (o)                               | LACAD "Patamar final". Field "Hold" → "Patamar".                                                                                                                  |
| schedule                            | curva de queima (a); programa (o)                    | **Native check**.                                                                                                                                                 |
| kiln sitter                         | kiln sitter (o) (desligador de cone)                 | No Brazilian name found. Parts as pt-PT, Brazilian spelling. **Native check**.                                                                                    |
| pyrometer, thermocouple             | pirômetro, termopar                                  | ô.                                                                                                                                                                |
| peephole                            | visor (o) (orifício de observação)                   | **Native check**.                                                                                                                                                 |
| candling                            | pré-aquecimento (o) (secagem no forno)               |                                                                                                                                                                   |
| burnout                             | queima da matéria orgânica (a)                       | Same verb as firing; context is clear.                                                                                                                            |
| oxidation, reduction                | oxidação, redução (atmosfera oxidante, redutora)     |                                                                                                                                                                   |
| slow cooling                        | resfriamento lento (o)                               | LACAD "Resfriamento".                                                                                                                                             |
| kiln wash                           | protetor de placas (o)                               | LACAD protects shelves with kaolin. **Native check**.                                                                                                             |
| stilt                               | trempe (a) (pé de galinha)                           | **Native check**.                                                                                                                                                 |
| Damper, Sawdust                     | Registro, Serragem                                   | Brazilian spelling.                                                                                                                                               |

### 2.5 Defects and glaze fit

| English                    | pt-BR                                          | Notes                                                                                         |
| -------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| glaze fit                  | acordo massa-esmalte (o)                       | **Native check**.                                                                             |
| crazing **show English**   | gretamento (o); gretar                         | Brazilian tile-industry word. **Native check**. _craquelê_ for the decorative crackle.        |
| shivering **show English** | descascamento do esmalte (o)                   | Sharp flakes: "lascas cortantes". **Native check**.                                           |
| crawling **show English**  | encolhimento do esmalte (o); o esmalte recolhe | Explain at first use. Home-safety's crawling babies → bebês que engatinham. **Native check**. |
| pinholing                  | furinhos (os); _pinholes_                      | **Native check**.                                                                             |
| blistering                 | bolhas (as)                                    |                                                                                               |
| running                    | escorrimento (o); escorrer                     |                                                                                               |
| dunting                    | trinca de resfriamento (a)                     | _trinca_ is Brazilian for crack. **Native check**.                                            |
| leaching **show English**  | liberação de metais (a); migração (Anvisa)     | "leachable" → que libera metais.                                                              |
| specks                     | pintas (as)                                    |                                                                                               |

### 2.6 Making and applying glaze

| English                              | pt-BR                                                      | Notes                                                       |
| ------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------- |
| batch                                | lote (o)                                                   | As pt-PT; "batch list" → lista de pesagem.                  |
| percent                              | porcentagem (a)                                            |                                                             |
| scale (weighing)                     | balança (a)                                                |                                                             |
| sieve, mesh                          | peneira (a), peneirar; malha (a) ("80 mesh")               |                                                             |
| specific gravity **show English**    | densidade (a)                                              | Setting "Specific gravity" → "Densidade". **Native check**. |
| hydrometer                           | densímetro (o)                                             |                                                             |
| slurry                               | esmalte líquido (o) (suspensão)                            | **Native check**.                                           |
| dipping, pouring, brushing, spraying | imersão (banho), derramamento, pincel, pistola (aerógrafo) | **Native check**.                                           |
| coat                                 | camada (a); demão (a)                                      |                                                             |
| wax resist                           | cera de reserva (a)                                        | **Native check**.                                           |
| test tile                            | prova (a); placa de teste                                  | **Native check**.                                           |
| technical data sheet                 | ficha técnica (a)                                          |                                                             |

### 2.7 Health and safety

| English                       | pt-BR                                                                        | Notes                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| dust                          | poeira (a); pó (o)                                                           |                                                                                                                                          |
| respirable crystalline silica | sílica cristalina respirável (a)                                             | NR-15 Anexo 12 says "sílica livre cristalizada"; use it only where the guide names the Brazilian norm.                                   |
| silicosis, COPD               | silicose; DPOC (doença pulmonar obstrutiva crônica)                          |                                                                                                                                          |
| exposure limit, action level  | limite de tolerância (o) (NR-15); nível de ação (o)                          | For other countries' limits keep the English's sense: "limite de exposição ocupacional".                                                 |
| respirator                    | máscara de proteção respiratória (a); peça semifacial filtrante (PFF2, PFF3) | Brazil's PFF classes (NR-6, EPI with CA). Where the English names EU FFP or US N95, keep those codes; never convert.                     |
| PPE                           | EPI (equipamento de proteção individual)                                     | NR-6.                                                                                                                                    |
| HEPA vacuum                   | aspirador HEPA (classe M)                                                    |                                                                                                                                          |
| wet cleaning                  | limpeza úmida (pano úmido)                                                   |                                                                                                                                          |
| local exhaust ventilation     | ventilação local exaustora (a) (exaustão localizada)                         | **Native check**.                                                                                                                        |
| SDS                           | FDS (ficha com dados de segurança)                                           | ABNT NBR 14725's current name; older FISPQ in brackets at first use.                                                                     |
| GHS, signal word              | GHS; palavra de advertência (“Perigo”, “Atenção”)                            | ABNT NBR 14725 words. H-statements: Brazilian SDS wording (e.g. H350 "Pode provocar câncer"). **Native check** against an NBR 14725 SDS. |
| carcinogenic                  | carcinogênico                                                                |                                                                                                                                          |
| chronic                       | crônico                                                                      |                                                                                                                                          |
| poison centre                 | centro de informação e assistência toxicológica (CIATox)                     | Disque-Intoxicação 0800 722 6001; SAMU 192 — copy only as the region data prints.                                                        |
| food safe **show English**    | adequado para contato com alimentos                                          | "em contato com alimentos" (Anvisa wording).                                                                                             |
| lead-free                     | sem chumbo; isento de chumbo                                                 |                                                                                                                                          |
| leach test                    | ensaio de migração de chumbo e cádmio (o)                                    |                                                                                                                                          |
| liner glaze                   | esmalte para o interior (o)                                                  | **Native check**.                                                                                                                        |
| IR welding glasses            | óculos de solda com proteção IV                                              |                                                                                                                                          |
| crawling (babies)             | engatinhar                                                                   | bebê (not bebé).                                                                                                                         |

### 2.8 The app's own words

| English                       | pt-BR                                       | Notes                                                                                          |
| ----------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| recipe                        | receita (a)                                 | "Saved recipe" → "Receita salva"; "My saved recipes" → "Minhas receitas salvas".               |
| studio notebook               | caderno do ateliê (o)                       | _ateliê_ (Brazilian spelling).                                                                 |
| My materials                  | Minhas matérias-primas                      |                                                                                                |
| Save, Save as a copy, Print   | Salvar, Salvar como cópia, Imprimir         |                                                                                                |
| Remove, Delete my account     | Remover, Excluir minha conta                | "This can't be undone." → "Essa ação não pode ser desfeita."                                   |
| swap, Undo the swap           | troca; Desfazer a troca                     |                                                                                                |
| materials on hand (the shelf) | as matérias-primas que você tem (o estoque) | _prateleira_ is the kiln shelf in Brazil (LACAD). **Native check**.                            |
| Firing logs                   | Registros de queima                         | "Record the Firing" → "Registrar a queima".                                                    |
| trial                         | teste (o) (período de teste)                | 14 days without an account. Not "experiência".                                                 |
| Typing amounts                | Digitação de quantidades                    | "A comma for decimals" → "Vírgula para decimais".                                              |
| Settings                      | Configurações                               |                                                                                                |
| Sign in, Sign out everywhere  | Entrar; Sair de todos os dispositivos       | "Keep me signed in on this device" → "Manter conectado neste dispositivo".                     |
| Download my data              | Baixar meus dados                           |                                                                                                |
| Share (material's percent)    | Proporção                                   |                                                                                                |
| Sold in, Where you work       | À venda em, Onde você trabalha              | US → EUA; UK → Reino Unido.                                                                    |
| link (in an email)            | link (o)                                    | Brazilian usage.                                                                               |
| Trash                         | Lixeira                                     |                                                                                                |
| Translation notice            | Aviso de tradução                           | "This page was translated from English by AI." → "Esta página foi traduzida do inglês por IA." |

**Two-step sign-in** (Google, Apple, Microsoft as their Brazilian pages word it; **Native check** against each
provider's live pt-BR screens):

| English                | pt-BR                      |
| ---------------------- | -------------------------- |
| Sign in with Google    | Fazer login com o Google   |
| Sign in with Apple     | Iniciar sessão com a Apple |
| Sign in with Microsoft | Entrar com a Microsoft     |
| two-step verification  | verificação em duas etapas |
| authenticator app      | app autenticador           |
| verification code      | código de verificação      |
| recovery codes         | códigos de recuperação     |

### 2.9 Where the potter works

As pt-PT 2.9 with Brazilian words: "Lojas em", "matérias-primas para esmaltes", "esmaltes prontos", "Embalagens
encontradas", "Um limite obrigatório.", "Um limite indicativo: um valor de referência, não um teto legal.", "Nível de
ação", "Quartzo e cristobalita", "Tipo de peça", "Peças que não podem ser enchidas, ou com até 25 mm de profundidade",
"Utensílios para cozinhar", "Onde você compra", "difere em {grams} g por 100 g". EU law: the Portuguese EUR-Lex title
with the number kept ("Diretiva 84/500/CEE"). Brazilian bodies keep their names: Anvisa, MTE, Fundacentro, ABNT.

## 3. Never translated

As pt-PT.md section 3 (formulas, cone numbers, mesh numbers, units, codes and standards, kiln makers, trade-name
materials, sources and agencies, placeholders and tags), plus: **PFF2, PFF3, NR-15, NR-6, ABNT NBR 14725, CA (Certificado
de Aprovação), Anvisa, SAMU 192, Disque-Intoxicação, CIATox**. Glazecalc is masculine ("o Glazecalc"); "a UMF".
English kept: kiln sitter (with the gloss), ball clay (in brackets), pinholes (in brackets, if used), mesh, raku,
tenmoku, celadon, HEPA, the controller presets.

## 4. Search terms

What Brazilian potters likely type (**Native check**, not researched with a Brazilian search tool): **esmalte
cerâmico**, **receitas de esmaltes cerâmicos**, **calculadora de esmaltes**, **fórmula de Seger**. Landing title
proposal: "Glazecalc: calculadora gratuita de esmaltes cerâmicos". Descriptions about 160 characters, nothing the
English lacks.

## 5. Catch-up terms

| English                       | pt-BR                        | Notes                          |
| ----------------------------- | ---------------------------- | ------------------------------ |
| SK cones, Kyoto cones         | cones SK, cones de Quioto    |                                |
| control concentration (Japan) | concentração de controle     | _controle_ (pt-PT _controlo_). |
| controller (GDPR)             | controlador                  | LGPD's word ("controlador").   |
| Standard Contractual Clauses  | cláusulas contratuais padrão | **Native check**.              |
| logs (server)                 | registros (logs)             |                                |
| prefecture (Japan)            | província / prefeitura       | **Native check**.              |
| sake warmer                   | aquecedor de saquê           |                                |

## 6. Choices for the owner and a native potter

1. **esmalte vs vidrado**: Brazilian studios and shops say _esmalte_; LACAD's prose and an old supplier list also say
   _vidrado_. Sheet picks _esmalte_. Confirm.
2. **Kiln shelf _placa_ vs _prateleira_**, and the materials "shelf" as _estoque_.
3. **Thousands point "1.240 °C"** in text, if the numbers check accepts it.
4. **Microsoft's pt-BR guide** was not read: hold the register and button rules against it.
5. **Anvisa Resolução 27/1996**: confirm it is still the rule before any guide names it.
