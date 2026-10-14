# 日本語: スタイルシートと用語集 (style sheet and glossary)

For translating Glazecalc into Japanese (`ja`), in standard written Japanese (常用漢字, 現代仮名遣い), for potters in
Japan. Read [README.md](README.md) first; [terms.md](terms.md) gives the meaning of every English term below. Every
Japanese message and guide follows this page: one Japanese word for one thing. Japan's region shows SK cones (JIS R 8101)
and Baumé by default, with Orton cones and temperatures one tap away, so the Japanese pages must keep the three apart
everywhere. The terms come from the shops that sell glaze materials in Japan (the names printed on the bag), from the
prefectural ceramics research institutes, from Japanese law as e-Gov and the ministries publish it, and from the JIS
standards and the Microsoft Japanese style guide, not from a dictionary alone. Where sources disagree or none was read,
the Notes say so: those rows are for a Japanese potter to check.

**What the sources could and could not give.** Japanese has a full ceramics vocabulary, used by shops, makers,
textbooks and the prefectural institutes (三重県工業研究所 窯業研究室, 茨城県産業技術イノベーションセンター, 京都市産業技術研究所),
so most rows rest on usage. This page was written in one session with limited web reading: the shops' material lists,
the Microsoft style guide, the law's silica formula and food-contact table, and the dust-mask classes were read today;
many pottery words (あぶり, ねらし, 色見, トチン, ハマ, 撥水剤, 縮れ, 外割) are the ones Japanese potters' books and shops use, but
no single page listing them was read, and they are marked **Usage** for a native potter to confirm. Rows marked **No
source** are best choices with no Japanese source at all (mostly the kiln-sitter parts and the firing-log column labels,
which belong to American kilns).

Main sources, cited below by short name:

- **陶芸百貨店**: [釉薬用原料](https://www.tougei-dept.com/yuyaku-genryo) (埼玉県上尾市; read 14 October 2026): its
  categories 長石系材料, 硅石系材料, 石粉（熔解系材料）, 粘土系材料, 乳濁鉱化系材料, 金属顔料, 灰系材料（天然・合成）, 中低温度熔融材料,
  and products such as 福島長石, 釜戸長石, ソーダ長石, 霞石閃長石（ネヘリンサイアナイト）, ペタライト, 福島硅石, 天草陶石, 白石灰, ねずみ石灰,
  ドロマイト, タルク滑石, 亜鉛華, 炭酸ストロンチウム, 炭酸リチウム, カオリン, ベントナイト, 珪酸ジルコニウム（ジルコン）, 骨灰, 酸化チタン, 酸化ルチル,
  酸化錫, 第二酸化鉄, 四三酸化鉄（鉄黒）, 二酸化マンガン, 酸化コバルト, 酸化銅, 合成土灰, 硼砂, ソーダ灰, 無鉛フリット.
- **ヤマニ**: ヤマニファーストセラミック, [釉薬用原料](https://www.yamani-fc.jp/products/list.php?category_id=12) (島根県松江市; read
  14 October 2026): categories 長石, 石灰, カオリン, 珪石, 陶石, 土石, 含鉄土石, 天然灰, 合成灰, 金属, 薬品, フリット; products 特級福島長石,
  特級釜戸長石, 三雲長石, 霞石閃長石(ネフェリン長石), 中国ソーダ長石; stains as 陶磁器用顔料 under 絵具類.
- **丸二陶料**: [釉薬原料](http://02-maruni.sun.bindcloud.jp/cn8/yuuyakugenryou.html): not reached (its site has no https
  address, and the fetch was refused); its product names (三雲長石, 特級釜戸長石, 極上福島長石) are from `lib/regions/suppliers.js`.
- **有恒商事**: Yuko Trading, [標準溶倒温度表](http://www.yukotrading.co.jp/pdf/segercone_table.pdf), the SK cone table the
  firing guide cites (checked by the firing guide's author on 14 October 2026; not re-read here).
- **JIS R 8101**: [JIS R 8101:1999 耐火度試験用標準コーン](https://webdesk.jsa.or.jp/books/W11M0090/index/?bunsyo_id=JIS+R+8101:1999)
  (JSA listing), as the firing guide quotes it: 大型コーン, 小型コーン, 焼度測定.
- **京都市産技研**: Kyoto Municipal Institute of Industrial Technology and Culture,
  [京都ゼーゲルからオルトンコーンへの移行](https://tc-kyoto.or.jp/app/uploads/2025/07/OrtonCorn.pdf) (as the firing guide cites
  it), and its research reports using 外割 for additions ([h28s-p101](https://tc-kyoto.or.jp/app/uploads/2023/08/h28s-p101-uwa.pdf)).
- **三重県**: 三重県工業研究所 窯業研究室's reports ([000172024.pdf](https://www.pref.mie.lg.jp/common/content/000172024.pdf),
  [000417086.pdf](https://www.pref.mie.lg.jp/common/content/000417086.pdf)): ゼーゲル式 with 塩基性成分 (KNaO, CaO, MgO), 中性成分
  (Al₂O₃) and 酸性成分 (SiO₂); Ig.loss beside the analyses (search summaries, read 14 October 2026).
- **茨城県**: 茨城県産業技術イノベーションセンター's reports ([vol41_10](https://www.itic.pref.ibaraki.jp/publication/doc/research/h24/vol41_10.pdf),
  [vol37-21](https://www.itic.pref.ibaraki.jp/publication/doc/research/h20/vol37-21.pdf)): 外割 for a stain addition (顔料を外割3%),
  灼熱減量 for loss on ignition beside the chemical analyses (search summaries).
- **作業環境評価基準**: 作業環境評価基準（昭和63年労働省告示第79号）別表, as [JAISH](https://www.jaish.gr.jp/horei/hor1-18/hor1-18-2-1-2.html)
  and MHLW's [管理濃度 tables](https://www.mhlw.go.jp/content/11201000/0000210065.pdf) give it: 土石、岩石、鉱物、金属又は炭素の粉じん,
  E = 3.0/(1.19Q + 1), "E は、管理濃度（単位 mg/m³）", "Q は、当該粉じんの遊離けい酸含有率（単位 %）" (read through search, 14 October 2026).
- **規格基準**: 食品、添加物等の規格基準（昭和34年厚生省告示第370号）第3 D, [CAA's text](https://www.caa.go.jp/policies/policy/standards_evaluation/appliance/assets/standards_cms101_250530_001.pdf)
  (as `lib/regions/food.js` cites it): 陶磁器製の器具又は容器包装; 液体を満たすことのできない試料若しくは液体を満たしたときにその深さが 2.5 cm
  未満である試料; 容量 1.1 L 未満, 1.1 L 以上 3 L 未満, 3 L 以上; 加熱調理用器具; limits written "… 以下". Read through MHLW's and
  Gifu's summaries ([岐阜県セラミックス研究所](https://www.ceram.rd.pref.gifu.lg.jp/img/gci56.pdf)) on 14 October 2026.
- **防じんマスクの規格**: 防じんマスクの規格（昭和63年労働省告示第19号） as the makers print it: 取替え式 (RS, RL) and 使い捨て式 (DS, DL),
  区分1, 区分2, 区分3 (粒子捕集効率 80.0%, 95.0%, 99.9% 以上), 国家検定合格 (MISUMI and 3M product pages, read through search, 14
  October 2026).
- **JIS Z 7253**: JIS Z 7253 (GHS に基づく化学品の危険有害性情報の伝達方法－ラベル，作業場内の表示及び安全データシート（SDS）): 注意喚起語 危険 and
  警告, 絵表示, 危険有害性情報, 安全データシート; Japanese H-statements (H301 飲み込むと有毒, H302 飲み込むと有害). From the standard's
  usage on Japanese SDSs; the standard itself was not re-read.
- **JSOH**: 日本産業衛生学会, 許容濃度等の勧告 (2025年度), as `lib/regions/workplace.js` cites it: 結晶質シリカ（吸入性粉じん）0.03 mg/m³.
- **中毒110番**: 公益財団法人日本中毒情報センター: 大阪中毒110番 and つくば中毒110番, as `lib/regions/safety.js` and the English
  `safety` file name them; 子ども医療電話相談（#8000）, the children's line run by each prefecture (who answers it was not checked).
- **MS**: [Microsoft Japanese Localization Style Guide](https://download.microsoft.com/download/a/8/2/a822a118-18d4-4429-b857-1b65ab388315/jpn-jpn-StyleGuide.pdf)
  (read 14 October 2026): 4.1.7 Numbers, 4.1.9 Punctuation, 4.1.11 Symbols & spaces, 4.2 (Desu-masu), and the 2008
  long-vowel rule (コンピューター).
- **外来語の表記**: 平成3年内閣告示第2号, as MS cites it, with 常用漢字表 (平成22年) and 送り仮名の付け方.

Not reached: 丸二陶料 (certificate refused), JIS's own pages on jisc.go.jp and the 学術用語集 (no search was made: the
terms below that the 学術用語集 settles, ケイ素 and ホウ素, are the forms of school chemistry), e-Gov's law pages (the
law's words come through MHLW, JAISH, CAA and the makers), the JTF style guide, and any Japanese kiln maker's manual.
The kiln, controller and firing-log rows rest on usage only.

## 1. Style sheet

### Register

**です/ます** (polite style) in every sentence: messages, help, errors, emails and the guides. MS 4.2: "In general,
sentences should be translated in Desu-masu … When the sentence prompts users to take an action, use '…してください。'". No
である style in running text, and no mixing of the two within a file.

- **Instructions** (guides and help): 「…してください。」: 「釉薬を2回ふるいに通してください。」「防じんマスクを着用してください。」
- **Prohibitions**: 「…しないでください。」 for "do not", 「絶対に…しないでください。」 for "never": 「圧縮空気は絶対に使わないでください。」 A "never"
  is always 絶対に…ない (or 決して…ない); it must not weaken to 「…しないほうがよい」.
- **Statements**: 「…です。」「…ます。」: 「この釉は SK 8 で溶けます。」
- **Errors**: a short です/ます sentence: 「調合が見つかりません。」「保存できませんでした。」
- **Questions and confirmations**: 「…しますか?」: 「この調合を削除しますか?」
- **The reader** is not named: no あなた, no 君. Japanese leaves the subject out; where it must be said, use 「ご自身の」
  or name the thing (「お使いの粘土」「お使いの窯」). The app's own advice may say 「…をおすすめします。」.
- **Keigo**: plain polite, not honorific. No お/ご on the app's own actions; ご is fine on the reader's (ご確認ください, ご注意ください).

### Buttons, menus, headings, labels and tabs

- **Buttons and menu commands**: a noun or a する-verb without する (体言止め; MS: "Use noun phrase (体言止め) when translating a
  title of the box and command buttons"): 「保存」「印刷」「比較」「削除」「コピーとして保存」「原料を追加」. Not 「保存する」, not
  「保存してください」.
- **Headings, tabs, page titles**: a noun phrase: 「調合」「設定」「焼成記録」「コーンと焼度」. A heading that names an activity takes the
  noun form: "Mixing the glaze" → 「釉薬の調合」, "Typing amounts" → 「数値の入力」. A heading that is a question stays one:
  「釉はなぜ溶けるのか」.
- **Field labels**: a noun; keep the colon where the English has one, as a half-width colon with no space before it
  (MS): 「原料名:」.
- **Confirmations**: "Saved: {name}" → 「保存しました: {name}」.
- **Feature names in running text**: in half-width square brackets with a space outside them, as MS writes UI names
  (「[比較] をクリックします。」); see The app's feature names.

### Capitalisation

Japanese has none. Latin words keep the English's case where they are names, codes or units (Orton, SK, UMF, LOI,
Ferro 3134, N95, mg/m³); the English's Title Case means nothing in Japanese and is dropped with the English words.
Katakana loanwords are written as one word, without the English's capitals or hyphens.

### Script and characters

- Kanji within 常用漢字 where the law and the shops allow; kana where they write kana. The law writes **けい** in 遊離けい酸,
  けい肺 and **じん** in 粉じん, 防じんマスク, じん肺: write these as the law does in every safety and region text. Chemistry
  writes **ケイ素** and **ホウ素** (school and 学術用語集 forms) for the elements. The shops write 硅石 and 珪石 for the silica
  material; this page uses **珪石** in running text (the commoner form in textbooks) and keeps 硅石 inside product names
  (福島硅石).
- **No simplified hanzi**: the check rejects 铁, 设 and the like. Japanese forms only: 鉄, 設, 焼, 窯, 釉.
- **Katakana long vowels** (MS, after 外来語の表記): words from English -er, -or, -ar end in ー: フィルター, コントローラー,
  ヒーター, ドライヤー, スプレーヤー; shorter words keep it too (コーン, ルーペ). Material names follow the bag where it differs: タルク,
  ベントナイト, カオリン, ネフェリンサイアナイト (陶芸百貨店 writes ネヘリンサイアナイト; this page uses ネフェリン, as ヤマニ does).
- **Full-width and half-width**: Japanese punctuation and brackets full-width (。、「」（）), digits, Latin letters, units and
  the signs that go with them half-width (1222 °C, 5%, SK 6a, 3.0/(1.19Q + 1)). Never full-width digits or letters
  (１２, ＳＫ); the check reads them, but they are not this page's style.

### Spaces

- No space between Japanese words, ever, and never a full-width space (U+3000).
- **A half-width space between Japanese and a Latin word, a trade name, a code or a figure**, as MS 4.1.11 says ("Word を
  使用するときは"): 「Ferro 3134 を加えます」「SK 8 で焼成します」「Orton のコーン」「N95 マスク」「1222 °C まで」. Exceptions, as MS
  gives them: no space next to 。 、 or any full-width bracket (「Gerstley Borate」, （UMF）), and none before a half-width
  colon, ?, ! or %.
- **Digits with Japanese counters and date words take no space** (this page's choice, against MS's 「1 つ」, because the
  dates and counts are read as one word and every Japanese shop and textbook writes them so): 2026年10月14日, 3回, 2種類, 10分,
  24時間, 20時. A unit symbol keeps the English's space: 10 g, 1222 °C, 100 °C/h, 80 mesh; % takes none (5%).
- Inside Latin text the English's spaces stay (Orton cone 6, SK 015a, Gerstley Borate).
- Katakana compounds are written solid, as the shops write them (ボールクレー, エプソムソルト), not with MS's space; use 中黒 ・ only
  where two loanwords would misread run together (ドロップ・アンド・ホールド).

### Japanese and Markdown

In the guides, `**…**` and `*…*` do not render when a bracket or stop sits just inside the marks and a Japanese
character just outside them (CommonMark's flanking rule): `**「素焼き」**は` shows the asterisks. Keep 「」, （）, 。 and 、
**outside** the emphasis: `「**素焼き**」は`, `**素焼き**は`. Check every bold term in the preview.

### Punctuation

- 。 and 、 (MS). Never ．or ，. A sentence ends in 。 even after a half-width figure or a closing bracket: 「1222 °C です。」
- **Quotations and terms quoted**: 「…」; a quotation inside one, 『…』; titles of books and standards in 『…』 when given in
  running text (the Sources lists keep the titles as they are). The English's “…” around a quotation becomes 「…」.
- **UI names** (buttons, tabs, settings, pages) in running text: half-width `[ ]` with a space outside them (MS):
  「[鉛を置き換え] を選んでください。」 The five guide titles in running text: 「…」.
- **Brackets**: full-width （） around Japanese text, half-width () around Latin text or figures alone: 「ゼーゲル式（UMF）」,
  「長石 (feldspar)」 is not used: the English after a term comes from `<en>` and `{{en: …}}`, not from brackets.
- **Ranges**: the wave dash 〜 (U+301C) between figures, the unit once where the English has it once: "10 to 60%" →
  「10〜60%」, "cone 06–04" → 「コーン 06〜04」, "1222–1240 °C" → 「1222〜1240 °C」. Never 「10%〜60%」 where the English has one unit (the
  check would find a figure with a unit the English lacks). Not the full-width tilde ～.
- **Lists in a sentence**: 、; between items that themselves contain 、, use ・ or rewrite.
- **Colon**: half-width, no space before it, one after (MS: 「フォント: その他」).
- No ! in the app's own voice.

### Numbers and units

- **Half-width Arabic digits** wherever the English has digits (MS 4.1.7: "Arabic numerals should be half-width"). Never
  kanji numerals (十二), never 万 or 億 (12,500 stays 12,500), never circled numbers (①), never full-width digits.
- **Decimal point** and **thousands comma**, as English and CLDR's ja: 1.5, 0.025, 1,000, 12,500. The app prints
  four-digit temperatures ungrouped (1222 °C), and so do the guides' `{{…}}` values; write 1222 °C, 1000 g as the English
  does.
- **A number the English writes as a word** ("two coats", "three tiles", "once") has no figure in the English, so a digit
  here would be a figure the English lacks and the check rejects it. Write it in kana or kanji as Japanese does for such
  words: 「2回塗り」 is not allowed, 「二度塗り」「二回」「三つのテストピース」「一度」 are. MS: 「もう一度」, 「一時的に」 are kanji anyway.
  Where the English has the digit, the digit stays: "3 coats" → 「3回」.
- **Units**: half-width symbols, as the English writes them: g, kg, mg, µg, mL, L, mm, cm, °C, °F, °Bé, %, mg/m³,
  µg/cm². Not ℃, not グラム, not センチ. "per 100 g" → 「100 g あたり」 (the symbol stays). Inches and feet are the words
  **インチ** and **フィート** (README), with the metric figure in brackets as the English gives it: "12 inches (30 cm)" →
  「12 インチ（30 cm）」.
- **Dates**: the Western calendar, 年月日, digits without spaces: 2026年10月14日, 2026年10月. Never the era (令和8年): the era
  year is a figure the English lacks. The check reads 10月 as the English's "October". Days of the week, where any, in
  （月）form.
- **Clock times**: the 24-hour clock: 20時, 20時30分 or 20:30; "8pm" → 「20時」, "8am to 5pm" → 「8時から17時まで」. Never 午前 or 午後
  (the check reports them). "24 hours" → 「24時間」.
- **Temperatures and rates**: 「1222 °C」「100 °C/h」 (or 「1時間に100 °C」 where the English writes it as words with the figure).
- **Percent additions**: "3% on top of the base" → 「外割で3%」 (see 2.6).

### Plural forms

CLDR gives Japanese one category:
`node -e "console.log(new Intl.PluralRules('ja').resolvedOptions().pluralCategories)"` prints `[ 'other' ]`.

| Category | Numbers               | Example                                                           |
| -------- | --------------------- | ----------------------------------------------------------------- |
| `other`  | every number, 0, 1.5… | 1種類の原料, 2種類の原料, 1件の調合, 21件の調合, 1.5 g, 3回の焼成 |

So every plural message is written with `other` only, and the English's `one` is dropped:
`{count, plural, one {# material} other {# materials}}` → `{count, plural, other {#種類の原料}}`. The check rejects `one`
in Japanese. `=0 {…}` stays where the English has it (`=0 {原料はありません}`). The noun does not change with the number;
the **counter goes inside `other`**, next to `#`, with no space:

| Counted thing                         | Counter                | Example                    |
| ------------------------------------- | ---------------------- | -------------------------- |
| materials (kinds)                     | 種類                   | #種類の原料                |
| recipes, records, logs, results       | 件                     | #件の調合, 焼成記録 #件    |
| firings, coats, times                 | 回                     | #回の焼成, #回             |
| tiles, sheets, plates, pieces of ware | 枚 (flat), 点 (pieces) | テストピース #枚, 作品 #点 |
| cones                                 | 本                     | コーン #本                 |
| minutes, hours, days                  | 分, 時間, 日           | #分, #時間, #日            |
| characters (password length)          | 文字                   | #文字以上                  |
| oxides                                | 種類                   | 酸化物 #種類               |

Where the English counts with a bare number and a noun that needs no counter (a weight, a temperature), there is no
counter: `{n} g`.

### Cones

Japan's cones are **SK cones** to **JIS R 8101** (large cones, 大型コーン, SK 022 to SK 20 in the guide), sold through
有恒商事. Japanese potters often call them ゼーゲル or ゼーゲルコーン after the German original, and older recipes say "SK 8"
without saying whose cone; the app never does either. The app also has **Orton cones** and **temperatures**, and a
recipe's cone is an Orton number, never turned into an SK number.

- **SK cones** are always written **SK**, a half-width space, and the number exactly as printed: 「SK 8」「SK 6a」「SK 015a」
  「SK 022」. The noun is **コーン**: 「SK コーン」, 「SK 8 のコーン」, "fire to SK 8" → 「SK 8 まで焼成します」. The setting "To SK cones
  (JIS R 8101)" → 「SK コーン（JIS R 8101）で」.
- **Never** label an SK cone ゼーゲル, 「ゼーゲル 8 番」 or 「SK8番」. **ゼーゲル** appears only where the English says Seger: the
  Seger formula (ゼーゲル式, below), the older European "Seger cones" of the firing guide's cone section (→
  「ドイツのゼーゲルコーン」, with Seger kept in its English sense: a different series from Orton, and say nothing that makes them SK
  cones), "Kyoto cones (京都ゼーゲル)" as written, and 立つゼーゲル, the trade name Orton self-supporting cones are sold under in
  Japan, kept in quotes: 「『立つゼーゲル』」.
- **Orton cones**: 「オルトンコーン」, and their numbers always with the name wherever an SK number could be meant, which in Japanese
  is everywhere: "cone 6" → 「オルトンコーン 6」 at the first mention in each section and in every table, label and setting;
  「コーン 6」 after that within the same paragraph. "cone 06" → 「オルトンコーン 06」 (the zero stays; it is far cooler than 6).
  "cone 6 glazes" → 「オルトンコーン 6 の釉薬」. The setting "To Orton cones" → 「オルトンコーンで」.
- **Never** give an SK number for an Orton number or the reverse, never write ≈, 相当, 同じ or 対応 between them, and never add
  a conversion the English lacks. The two charts are separate tables.
- **One number hotter, one number cooler**: 「1つ高温側のコーン」「1つ低温側のコーン」. Not 番号が上/下, 大きい/小さい: in the 0-series
  (SK 022 to SK 01a, Orton 022 to 01) a larger number is cooler. Where the English says "the next number below it in the
  table" (the SK cone pack), keep the table's order: 「温度表で1つ前（低温側）のコーン」「1つ後（高温側）のコーン」.
- Witness cone: 「確認用コーン」; cone pack: 「3本組のコーン」; guide, firing and guard cones: 「ガイドコーン」「焼成コーン」「ガードコーン」 (2.4).
- Not 円錐 (the geometric cone) and not パイロメトリックコーン in running text.

### The unity formula

**ゼーゲル式** (the established Japanese name, 三重県, and every Japanese glaze text), with 「（UMF）」 after it at the first
mention on each page: 「ゼーゲル式（UMF）」. The app's short forms "unity formula", "Unity formula" and "Unity:" are all
「ゼーゲル式」/「ゼーゲル式:」. The three columns, as Japanese glaze chemistry names them: 塩基性成分 (RO・R₂O, the fluxes), 中性成分
(R₂O₃) and 酸性成分 (RO₂); the app's own column names are given in 2.1. "in unity" → 「ゼーゲル式で」; "scaled so the fluxes
add up to 1" → 「塩基性成分の合計を1とする」.

### Gender-neutral wording

Japanese has no grammatical gender and leaves pronouns out; 彼, 彼女 never appear. A potter is 「陶芸家」 or, for a
beginner or hobbyist, 「陶芸をする人」; avoid 職人 (a craftsman, gendered in use) and gendered job words (女工, 窯元の主人). Children are
「子ども」 (the government's spelling, as in 子ども医療電話相談).

### The reader in the guides

です/ます throughout, short sentences as the English. Instructions end in 「…してください。」; explanations are statements in
です/ます with the subject left out: 「釉が厚すぎると流れます。」「素焼きした器はすぐに施釉できます。」 Where the English says "you", leave
it out or name the thing (「お使いの窯」). No である, no 体言止め in running prose, no nominal chains (「…の実施を行う」).
Quotations from sources are translated into 「…」 and keep their figures as the English writes them.

### The app's feature names

Written as on the button or tab, in half-width square brackets with a space outside them when named in running text (MS
4.1.9): 「[比較] を選ぶと…」, 「[設定] で」. Where the English wraps the name in `<b>` or another tag, keep the tag and
put the brackets outside it only if the English has none: inside a tag, the tag is enough. "Settings" in running text
is the ordinary noun 「設定」; inside `<settings>…</settings>` write 「<settings>設定</settings>」.

| English                       | Japanese (button, label) | In running text              |
| ----------------------------- | ------------------------ | ---------------------------- |
| Compare                       | 比較                     | 比較; [比較] 機能            |
| Suggest amounts (and compare) | 量を提案（して比較）     | [量を提案] 機能              |
| Match with what I have        | 手持ちの原料で作る       | [手持ちの原料で作る] 機能    |
| Replace lead                  | 鉛を置き換え             | [鉛を置き換え] 機能          |
| Settings                      | 設定                     | 設定                         |
| Notebook                      | ノート                   | 工房ノート                   |
| Library                       | ライブラリ               | ライブラリ（標準原料の一覧） |
| Standard                      | 標準                     | 標準原料                     |
| My materials                  | マイ原料                 | マイ原料; [マイ原料] タブ    |
| Trial                         | お試し                   | お試し利用                   |

(ライブラリ without the final ー, as Japanese software writes it: MS keeps ライブラリ, an -ary word.)

### Law in Japan

As the law writes it, never paraphrased: the words below are fixed, and the region texts must use them.

- **Food contact**: 食品衛生法; 食品、添加物等の規格基準（昭和34年厚生省告示第370号）第3 D; 「陶磁器製の器具又は容器包装」. The kinds of piece,
  as the English categories give them (`guides.food.category.jp*`): "Pieces that cannot be filled, or less than 2.5 cm deep"
  → 「液体を満たすことのできないもの、又は深さ2.5 cm未満のもの」; "Other pieces under 1.1 L, not for cooking" → 「その他の容量1.1 L未満のもの（加熱調理用器具を除く）」;
  "Other pieces from 1.1 L to under 3 L, not for cooking" → 「その他の容量1.1 L以上3 L未満のもの（加熱調理用器具を除く）」; "Other pieces of 3 L
  or more, not for cooking" → 「その他の容量3 L以上のもの（加熱調理用器具を除く）」; "Cooking ware, 2.5 cm deep or more" →
  「加熱調理用器具（深さ2.5 cm以上）」. The law's limits are "… 以下": `food.atMost` says so, and "at most" is **以下**.
- **以下, 未満, 以上, 超える**: "at most", "no more than", "or less", "up to" → **以下** (the limit itself passes); "less than",
  "under", "below" → **未満** (it does not); "at least", "or more", "from" → **以上**; "more than", "over", "above" →
  **を超える** (超). Never 未満 for "at most" and never 以下 for "less than": a slip moves a legal limit. Check each one in the
  food-contact, silica and dust-mask texts.
- **Silica**: 労働安全衛生法; 粉じん障害防止規則; 作業環境評価基準. "control concentration" → **管理濃度** (an area yardstick:
  `silica.kind.control` explains it, and the translation must keep "not a limit on what one person breathes" →
  「一人ひとりが吸い込む量の上限ではありません」); "free silica" → **遊離けい酸**; the formula as the law writes it, half-width, keeping
  the message's placeholders: `{numerator} / ({factor}Q + 1) mg/m³` (3.0 / (1.19Q + 1) mg/m³); "Q is the free silica in the
  dust, in %" → 「Q は粉じん中の遊離けい酸含有率（%）」. The personal limits of 2024 are **濃度基準値**; none exists yet for crystalline
  silica, so the word appears only if the English names it.
- **JSOH** is **日本産業衛生学会**; its list is 「許容濃度等の勧告」; "recommends this value … It is not law." → 「…でこの値を勧告して
  います。法令ではありません。」 Its value is a 許容濃度 (勧告値), never a 基準値.
- **Dust masks**: 防じんマスク; 国家検定 (as the English already gives it); 使い捨て式 (DS), 取替え式 (RS); "class 2", "class 3" →
  **区分2**, **区分3**; 「粒子捕集効率95.0%以上」. 電動ファン付き呼吸用保護具 (PAPR).
- **GHS**: JIS Z 7253 and JIS Z 7252: 絵表示, 注意喚起語 (**危険**, **警告**), 危険有害性情報 (hazard statement), 注意書き
  (precautionary statement), 安全データシート（SDS）. Japanese H-statements as JIS Z 7253 words them (H301 飲み込むと有毒, H302
  飲み込むと有害, H350 発がんのおそれ, H360 生殖能又は胎児への悪影響のおそれ, H372 長期にわたる、又は反復ばく露による臓器の障害); codes kept.
- **Who to call**: **大阪中毒110番**, **つくば中毒110番** (公益財団法人日本中毒情報センター), **子ども医療電話相談（#8000）**, 119 (救急).
  As written, never translated or shortened.
- **EU law**, where the English names it (Directive 84/500/EEC, Directive (EU) 2017/2398, Regulation (EC) No 1272/2008):
  there is no official Japanese text, so write the EU's number with a plain Japanese name: 「EU 指令 84/500/EEC（食品に接触する
  陶磁器製品）」, 「EU 指令 (EU) 2017/2398」, 「CLP 規則（EC）No 1272/2008」. The EU food categories must still read so that the 3 L applies only
  to packaging and storage vessels: "Cooking ware of any size, and packaging and storage vessels over 3 L" →
  「加熱調理用器具（容量を問わない）、及び容量3 Lを超える包装容器・保存容器」.
- **US and UK law** names stay in English with a Japanese gloss once: OSHA（米国労働安全衛生局）, HSE（英国安全衛生庁）. "HSE" is the
  UK's: 「英国の HSE」 at the first mention in each section.

### Pitfalls

- **釉薬, 釉, うわぐすり**: 釉薬 (ゆうやく) is the glaze, material and coat, in every message; 釉 (ゆう) only in compounds the
  shops and textbooks fix (透明釉, 天目釉, 灰釉, 石灰釉, 釉層, 施釉); うわぐすり is not used. Not エナメル, ほうろう (enamel on metal), or
  ニス (varnish).
- **フリット and 媒溶剤**: a frit is フリット; a flux is 媒溶剤 (the oxide's role). Never "フラックス" alone in the app (the shops'
  product "Uフラックス" is a trade name).
- **窯, 炉, オーブン**: a potter's kiln is **窯** (電気窯, ガス窯); 炉 is industrial (電気炉) and 窯 is used in the app; オーブン is an
  oven, used only for "in an oven" in the cooking-ware note.
- **焼成 and 焼く**: "firing" is 焼成; "fire to" is 「…まで焼成する」 or 「…で焼く」. A fire as a hazard is 火災, flames 炎.
- **陶器, 炻器, 磁器, 土器**: earthenware is **陶器**, stoneware **炻器**, porcelain **磁器**; 土器 is unglazed low-fired ware and is
  not used for earthenware. In Japan 陶器 also covers much ware fired high and the potter's sense of 陶器/磁器 is by body,
  not temperature: where the English means a firing range ("low-fire earthenware"), say so (「低火度の陶器」). **show English**
  helps here.
- **石灰, 石灰石, 炭酸カルシウム**: the shops sell whiting as 石灰 (白石灰, ねずみ石灰); 石灰 also means lime. In the app, whiting
  is **石灰石** and CaO is **カルシウム (CaO)** / **酸化カルシウム**; "lime" in a frit's name ("soda-potash-lime frit") is 石灰.
- **珪石, シリカ, ケイ素, シリコーン**: the material is 珪石; the oxide シリカ (SiO₂) or 二酸化ケイ素; the element ケイ素; silicone rubber
  シリコーン. "silica" in the app's categories and the unity formula is シリカ.
- **ホウ酸, 酸化ホウ素, ホウ砂**: B₂O₃ is **ホウ素 (B₂O₃)** as potters name it, formally 酸化ホウ素; ホウ酸 is boric acid (H₃BO₃,
  a reproductive toxin in the safety guide), ホウ砂 is borax. Do not write ホウ酸 for B₂O₃.
- **ソーダ, ソーダ灰, カリ**: "soda" (Na₂O) is **ソーダ (Na₂O)**, formally 酸化ナトリウム; soda ash (Na₂CO₃) is **ソーダ灰**; "potash"
  (K₂O) is **カリ (K₂O)**, formally 酸化カリウム; potassium carbonate (the safety guide's "potash") is 炭酸カリウム.
- **顔料 and 着色剤**: a stain (factory-made) is **顔料** (陶磁器用顔料, as ヤマニ sells it); a colorant (any oxide that colours) is
  **着色剤**. "colorant and additive" → 「着色剤・添加物」.
- **防じんマスク, 呼吸用保護具, 人工呼吸器, 換気扇**: a respirator is **防じんマスク** (呼吸用保護具 in the general sense); a hospital
  ventilator is 人工呼吸器, never meant here; a kitchen fan is 換気扇. "nuisance dust mask" → 「簡易マスク（国家検定品でないもの）」.
- **ガイド and 取扱説明書**: the app's five guides are **ガイド**; a kiln's or controller's manual is **取扱説明書**. Never the same word.
- **素焼き and 本焼き**: bisque (the firing and the ware) is 素焼き; the glaze firing is 本焼き. "biscuit" (UK) is also 素焼き.
- **貫入 and 冷め割れ**: crazing is 貫入 (a glaze defect, or wanted: crackle); a crack through the pot from cooling is 冷め割れ
  (dunting). See 2.5.
- **should and must** in safety text: "must" → 「…しなければなりません」「必ず…してください」; "should" → 「…するべきです」「…することをおすすめします」;
  "should not" → 「…するべきではありません」. "must be tested" → 「試験を受ける必要があります」 (the test is done, not passed); never
  「合格しなければなりません」. "some" (some fine quartz) → 「ある程度」「いくらか」, never 「少し」「少量」. "may" → 「…ことがあります」「…おそれがあります」
  (hazards, as the GHS statements write おそれ).
- **Placeholders** take particles directly, with no space: 「{region}では」「{name}を」「{count}件」. {region} is a country name from the
  browser (日本, ドイツ), so write each sentence so it reads with any country: 「{region}の規則」, not 「{region}国の」. A trade
  name before a particle takes a space (Latin): 「Ferro 3134 を」; a placeholder holding a Latin name does too in effect, but the
  message cannot know: write 「{name} を」 with the space where the value is usually Latin (material names), and no space where it is
  Japanese (region names).

## 2. Glossary

"show English" marks the terms whose English a reader can ask to see after them (`<en>…</en>`, `{{en: …}}`). **Usage**
in the Notes: the word Japanese potters, shops and textbooks use, not read on a page in this session; **No source**: a
best choice with no Japanese source.

### 2.1 Glaze and its chemistry

| English                                      | Japanese                                            | Notes                                                                                                                                                                                                                                      |
| -------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| glaze                                        | 釉薬 (ゆうやく); to glaze 施釉する; glazed 施釉した | **show English**. 陶芸百貨店, ヤマニ (釉薬用原料). Compounds: 透明釉, 天目釉, 施釉, 釉層. "glazed ware" → 「施釉した器」. Not エナメル, ニス (Pitfalls).                                                                                   |
| glass former                                 | ガラス形成成分                                      | **show English**. ゼーゲル式's 酸性成分 (三重県). UI "Glass Formers - RO₂" → 「ガラス形成成分 – RO₂」. Usage; a native potter may prefer 酸性成分 in the column.                                                                           |
| flux                                         | 媒溶剤 (ばいようざい)                               | **show English**. ゼーゲル式's 塩基性成分. Category "Fluxes" → 「媒溶剤」; "fluxing power" → 「媒溶作用」; "a strong flux" → 「強い媒溶剤」. Textbooks also write 媒熔剤 (熔 is outside 常用漢字) and 融剤. Not ハンダ用フラックス. Usage. |
| stabilizer                                   | 安定剤                                              | **show English**. ゼーゲル式's 中性成分 (Al₂O₃, 三重県). UI "Stabilizers - R₂O₃" → 「安定剤 – R₂O₃」. Not a food or plastics 安定剤 in context. Usage.                                                                                     |
| oxide                                        | 酸化物                                              | Two names, as the app's: formal "Calcium oxide" → 「酸化カルシウム」; potters' "calcium" → 「カルシウム」. Formulas unchanged.                                                                                                             |
| R₂O and RO                                   | R₂O と RO; アルカリ (R₂O), アルカリ土類 (RO)        | UI "Fluxes - RO" → 「媒溶剤 – RO」.                                                                                                                                                                                                        |
| alkali, alkaline                             | アルカリ; アルカリ性の, アルカリ成分の多い          | "alkaline frit" → 「アルカリフリット」; "alkaline copper blues" → 「アルカリ釉の銅の青（トルコ青）」; "a lot of alkali" → 「アルカリが多い」. Not the pH sense (アルカリ性 in water).                                                      |
| unity molecular formula (UMF)                | ゼーゲル式（UMF）                                   | **show English**. 三重県. See Style sheet, The unity formula.                                                                                                                                                                              |
| unity                                        | ゼーゲル式（合計1）                                 | "in unity" → 「ゼーゲル式で」; "Molecular / Unity" → 「モル / ゼーゲル式」. Not 統一, 一致.                                                                                                                                                |
| limit formula (target formula)               | 限界式（目安の式）                                  | **show English**. Usage: Japanese texts give 釉の限界式 or 「安定釉の範囲」. A guide, not a legal 限度: keep it apart from 規格 and 許容濃度.                                                                                              |
| silica to alumina ratio                      | シリカ・アルミナ比                                  | **show English**. UI "Ratio of Silica to Alumina : {ratio}" → 「シリカ・アルミナ比: {ratio}」; "silica to alumina {ratio}:1" → 「シリカ・アルミナ比 {ratio}:1」. 三重県 (Al₂O₃ : SiO₂ ≈ 1:10 as a typical clear glaze).                    |
| flux balance                                 | 媒溶剤のバランス                                    | "Flux balance" → 「媒溶剤のバランス」; "0.2 R₂O to 0.8 RO" → 「R₂O 0.2 : RO 0.8」. No source.                                                                                                                                              |
| oxide analysis (analysis, chemical analysis) | 化学分析値（分析値）                                | UI "Analysis" → 「分析値」; "Oxide analysis, fired, by weight" → 「酸化物の分析値（焼成後、重量%）」. 茨城県, 三重県 (化学分析値).                                                                                                         |
| formula (raw formula, fired)                 | 化学式（焼成前、焼成後）                            | "Raw formula:" → 「焼成前の化学式:」; "Enter the formula (fired):" → 「化学式（焼成後）を入力:」; "Formula, as sold:" → 「化学式（販売時）:」.                                                                                             |
| loss on ignition (LOI)                       | 強熱減量（Ig.loss）                                 | **show English**. JIS analysis standards write 強熱減量; 茨城県 writes 灼熱減量; analyses print "Ig.loss". The UI's "LOI" alone → 「Ig.loss」.                                                                                             |
| mole                                         | モル                                                |                                                                                                                                                                                                                                            |
| molecular weight                             | 分子量                                              | UI "Raw molecular weight of the formula" → 「化学式の分子量（焼成前）」.                                                                                                                                                                   |
| equivalent weight, fired weight              | 当量, 焼成後の重量                                  | UI columns "Equivalent Weight" → 「当量」, "Fired Weight" → 「焼成後重量」. Usage.                                                                                                                                                         |
| melt (noun)                                  | 融液（溶けた釉）                                    | "stiffens the melt" → 「溶けた釉を粘くする」; "gas bubbling out of the melt" → 「溶けた釉から泡となって抜けるガス」. Plain 溶けた釉 in the guides.                                                                                         |
| thermal expansion (expansion)                | 熱膨張（熱膨張係数）                                | **show English**. UI "Expansion, ×10⁻⁶/°C" → 「熱膨張係数, ×10⁻⁶/°C」; figures and units kept.                                                                                                                                             |
| stiff, fluid, runny (viscosity)              | 粘い, 流動性が高い, 流れやすい（粘性）              | "runny" of a slurry → 「薄い（水分が多い）」. Usage.                                                                                                                                                                                       |
| raw, fired                                   | 生の・未焼成の, 焼成後の                            | "raw whiting" → 「（仮焼していない）石灰石」; "raw clay" → 「生の粘土」; "raw lead" → 「生鉛（フリット化していない鉛）」; "fired oxides" → 「焼成後の酸化物」. "Raw-glazed" → 「生掛け」 (Usage).                                          |
| gloss, satin, matte                          | 光沢, 半光沢（サテン）, マット                      | 「光沢釉」「マット釉」 (Usage, shops' glaze lists). "satin" → 「半光沢」, not the fabric.                                                                                                                                                  |
| opaque, transparent, translucent, clear      | 不透明, 透明, 半透明（透光性）, 透明釉              | "clear" (glaze type) → 「透明釉」. "translucent porcelain" → 「透光性のある磁器」.                                                                                                                                                         |
| stable, durable                              | 安定した, 耐久性のある                              | "a stable glaze" → 「安定した釉薬」. Not 一定の.                                                                                                                                                                                           |
| crystals, crystalline                        | 結晶, 結晶質の; 結晶釉                              | "crystalline glazes" → 「結晶釉」; "crystalline silica" (section 7) → 「結晶質シリカ」.                                                                                                                                                    |
| boron blue                                   | ホウ素の青（「ボロンブルー」）                      | In quotes in the UI: 「『ボロンブルー』」 with the sense once: 「カルシウムとホウ素の多い釉がたまった所に出る乳白がかった青」. No source.                                                                                                  |
| celadon                                      | 青磁 (せいじ); 青磁釉                               | Palette "Celadon green" → 「青磁グリーン」.                                                                                                                                                                                                |
| tenmoku (temmoku)                            | 天目 (てんもく); 天目釉                             | A Japanese word: no loanword note needed. Palette "Tenmoku rust" → 「天目の錆色」.                                                                                                                                                         |

### 2.2 Materials and oxides

| English                                           | Japanese                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| silica (SiO₂)                                     | シリカ (SiO₂); the material 珪石                   | **show English**. The oxide シリカ or 二酸化ケイ素; the material as sold 珪石 (ヤマニ category 珪石; 陶芸百貨店 硅石系材料, 福島硅石). Category "Silica" → 「シリカ」. Not ケイ素 (element), シリコーン.                                                                                                                                                                                                                       |
| alumina (Al₂O₃)                                   | アルミナ (Al₂O₃)                                   | Category "Alumina" → 「アルミナ」; formal "Aluminum oxide" → 「酸化アルミニウム」; calcined alumina 酸化アルミナ / 仮焼アルミナ, alumina hydrate 水酸化アルミナ (陶芸百貨店 writes 酸化アルミナ, 水酸化アルミナ).                                                                                                                                                                                                              |
| boron (B₂O₃)                                      | ホウ素 (B₂O₃)                                      | Formal "Boric oxide" → 「酸化ホウ素」. Category "Boron sources" → 「ホウ素原料」. Not ホウ酸 (Pitfalls).                                                                                                                                                                                                                                                                                                                       |
| potash (K₂O)                                      | カリ (K₂O)                                         | **show English**. Formal 酸化カリウム. "KNaO" → 「KNaO（カリとソーダ）」. Safety guide "potash" = potassium carbonate → 「炭酸カリウム」.                                                                                                                                                                                                                                                                                      |
| soda (Na₂O)                                       | ソーダ (Na₂O)                                      | **show English**. Formal 酸化ナトリウム. Firing-log "Soda" → 「ソーダ焼成」 (2.4). Not ソーダ灰.                                                                                                                                                                                                                                                                                                                               |
| lithium (Li₂O)                                    | リチウム (Li₂O)                                    | "lithia" → 「酸化リチウム」. 炭酸リチウム (陶芸百貨店).                                                                                                                                                                                                                                                                                                                                                                        |
| calcium, lime (CaO)                               | カルシウム (CaO); 石灰                             | Formal 酸化カルシウム. "lime" in frit names → 「石灰」 ("soda-potash-lime frit" → 「ソーダ・カリ・石灰フリット」). "lime green" → 「ライムグリーン」.                                                                                                                                                                                                                                                                          |
| magnesium, magnesia (MgO)                         | マグネシウム, マグネシア (MgO)                     | Formal 酸化マグネシウム.                                                                                                                                                                                                                                                                                                                                                                                                       |
| barium (BaO), barium carbonate                    | バリウム (BaO), 炭酸バリウム                       | 陶芸百貨店 sells 硫酸バリウム（重晶石）, a different material. "rat poison" → 「殺鼠剤」.                                                                                                                                                                                                                                                                                                                                      |
| strontium (SrO)                                   | ストロンチウム (SrO)                               | 炭酸ストロンチウム (陶芸百貨店).                                                                                                                                                                                                                                                                                                                                                                                               |
| zinc (ZnO), zinc oxide                            | 亜鉛 (ZnO), 亜鉛華                                 | The material is 亜鉛華 (陶芸百貨店); formal 酸化亜鉛. "calcined zinc" → 「仮焼亜鉛華」.                                                                                                                                                                                                                                                                                                                                        |
| lead (PbO)                                        | 鉛 (PbO)                                           | The metal: 鉛. Setting "Lead" → 「鉛」.                                                                                                                                                                                                                                                                                                                                                                                        |
| iron (red iron oxide, black iron oxide)           | 鉄; 第二酸化鉄（弁柄）, 四三酸化鉄（鉄黒）         | 陶芸百貨店: 第二酸化鉄, 四三酸化鉄（鉄黒）. 弁柄 (べんがら) is the potters' name for red iron oxide (京都市産技研). "Crocus martis" kept.                                                                                                                                                                                                                                                                                      |
| titanium, titania (TiO₂)                          | チタン, 酸化チタン (TiO₂)                          | 陶芸百貨店 酸化チタン.                                                                                                                                                                                                                                                                                                                                                                                                         |
| raw materials (materials)                         | 原料（釉薬原料）                                   | Shops: 釉薬用原料. "Materials" page → 「原料」.                                                                                                                                                                                                                                                                                                                                                                                |
| feldspar (spar)                                   | 長石 (ちょうせき)                                  | **show English**. Shops' first category. "spar" in names stays in the name ("Custer Spar"). Category "Feldspars and stones" → 「長石・陶石」 (ヤマニ: 長石, 陶石).                                                                                                                                                                                                                                                             |
| potash feldspar, soda feldspar                    | カリ長石, ソーダ長石                               | ソーダ長石 (陶芸百貨店, ヤマニ 中国ソーダ長石). Japanese named feldspars (福島長石, 釜戸長石, 三雲長石) are product names: never a translation of "potash feldspar".                                                                                                                                                                                                                                                           |
| nepheline syenite                                 | ネフェリンサイアナイト（霞石閃長石）               | **show English**. ヤマニ 霞石閃長石(ネフェリン長石); 陶芸百貨店 霞石閃長石（ネヘリンサイアナイト）.                                                                                                                                                                                                                                                                                                                            |
| Cornish stone (Cornwall stone, china stone)       | コーニッシュストーン                               | One name for all three. Not 陶石 in general (天草陶石 is Japanese, a different material); "stone" is a material.                                                                                                                                                                                                                                                                                                               |
| kaolin (UK: china clay)                           | カオリン                                           | **show English**. Shops' category. "china" is porcelain. Australia's Eckalite kept.                                                                                                                                                                                                                                                                                                                                            |
| calcined                                          | 仮焼（かしょう）した                               | "calcined kaolin" → 「仮焼カオリン」; "calcined flint" → 「仮焼フリント」; "calcined zinc" → 「仮焼亜鉛華」. Usage.                                                                                                                                                                                                                                                                                                            |
| ball clay                                         | ボールクレー                                       | **show English**. "ball" is part of the name. 木節粘土 is the Japanese ball-clay-like clay, not the same material: do not substitute.                                                                                                                                                                                                                                                                                          |
| bentonite                                         | ベントナイト                                       | 陶芸百貨店.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| slip clay                                         | スリップクレー（それだけで釉になる粘土）           | Not 泥漿 (slip). Gloss once per section. No source.                                                                                                                                                                                                                                                                                                                                                                            |
| whiting                                           | 石灰石（炭酸カルシウム）                           | **show English**. Shops sell it as 石灰 (白石灰, ねずみ石灰; ヤマニ category 石灰). See Pitfalls.                                                                                                                                                                                                                                                                                                                              |
| dolomite, talc                                    | ドロマイト, タルク（滑石）                         | 陶芸百貨店 ドロマイト, タルク滑石.                                                                                                                                                                                                                                                                                                                                                                                             |
| wollastonite                                      | ウォラストナイト（珪灰石）                         | Usage.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| flint                                             | フリント                                           | **show English**. Explain where the English does: UK 仮焼フリント, US recipes 石英粉.                                                                                                                                                                                                                                                                                                                                          |
| quartz (free quartz, free silica)                 | 石英; 遊離石英, 遊離けい酸                         | "free silica" in the law → 「遊離けい酸」 (作業環境評価基準).                                                                                                                                                                                                                                                                                                                                                                  |
| frit                                              | フリット                                           | **show English**. "fritted" → 「フリット化した」. Kinds: base frit 基礎フリット, boron frit ホウ素フリット, standard borax frit (UK) ホウ砂フリット, calcium borate frit カルシウム・ホウ素フリット (not a ホウケイ酸塩), high-alkaline frit 高アルカリフリット, low-expansion frit 低膨張フリット, leadless frit 無鉛フリット (陶芸百貨店), lead frit 鉛フリット (lead bisilicate 珪酸鉛, 陶芸百貨店 ミズカレット（珪酸鉛）). |
| raw borates (borax, colemanite, ulexite)          | 天然ホウ酸塩（ホウ砂, コレマナイト, ウレキサイト） | ホウ砂 (陶芸百貨店 硼砂; 硼 is outside 常用漢字). Gerstley Borate kept. "boric acid" → 「ホウ酸」.                                                                                                                                                                                                                                                                                                                             |
| soda ash, bone ash, wood ash                      | ソーダ灰, 骨灰, 木灰（土灰）                       | 陶芸百貨店 ソーダ灰（軽灰）, 骨灰, 天然木灰, 土灰. "ash glazes" → 「灰釉」. Only wood ash is 灰 in that sense.                                                                                                                                                                                                                                                                                                                 |
| colorant                                          | 着色剤                                             | **show English**. Category "Colorants" → 「着色剤」; "Colorants and additives" → 「着色剤・添加物」. Shops: 金属 / 金属顔料 for the oxides.                                                                                                                                                                                                                                                                                    |
| stain                                             | 顔料（陶磁器用顔料）                               | **show English**. ヤマニ 陶磁器用顔料. "body stain" → 「素地用顔料」. The verb sense ("staining") → 「しみ」.                                                                                                                                                                                                                                                                                                                  |
| cobalt, copper, chrome, manganese, nickel         | コバルト, 銅, クロム, マンガン, ニッケル           | 陶芸百貨店 酸化コバルト, 酸化銅, 酸化クロム, 二酸化マンガン, 酸化ニッケル. "chrome" → 「クロム」, not メッキ.                                                                                                                                                                                                                                                                                                                  |
| rutile                                            | ルチル                                             | 陶芸百貨店 writes 酸化ルチル; ルチル is the mineral. Usage.                                                                                                                                                                                                                                                                                                                                                                    |
| opacifier                                         | 乳濁剤                                             | Category "Opacifiers" → 「乳濁剤」 (陶芸百貨店 乳濁鉱化系材料).                                                                                                                                                                                                                                                                                                                                                                |
| zircon                                            | ジルコン（珪酸ジルコニウム）                       | 陶芸百貨店. Not ジルコニア (ZrO₂).                                                                                                                                                                                                                                                                                                                                                                                             |
| suspender                                         | 沈殿防止剤                                         | Category "Suspenders" → 「沈殿防止剤」. Usage.                                                                                                                                                                                                                                                                                                                                                                                 |
| refractory                                        | 耐火性の; 耐火物                                   | "refractory kiln parts" → 「耐火物の窯道具」.                                                                                                                                                                                                                                                                                                                                                                                  |
| softening point, half-sphere point (fusion, flow) | 軟化点, 半球点（溶融点）, 流動点                   | Frit makers' sheets; "Fusion" on a Ferro sheet → 「溶融点」 (not 核融合). Usage.                                                                                                                                                                                                                                                                                                                                               |
| substitute (stand-in, replacement)                | 代替原料（代わり）                                 | "a stand-in for barium" → 「バリウムの代わり」.                                                                                                                                                                                                                                                                                                                                                                                |

### 2.3 Clay, ware and firing stages

| English                         | Japanese                                  | Notes                                                                                                                                                                     |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| clay body (body)                | 素地（きじ）                              | **show English**. "the glaze melts into the body" → 「釉が素地に溶け込む」; "body stain" → 「素地用顔料」. Not 坏土 (the prepared clay before forming) in the app. Usage. |
| ware (pot, piece)               | 器, 作品; やきもの                        | "greenware, bisque ware, glazed ware" → 「生の素地、素焼きの器、施釉した器」; "a piece" → 「作品」 or 「器」 by context.                                                  |
| functional ware                 | 実用の器（食器）                          | Pots used for food and drink: 「食器として使う器」.                                                                                                                       |
| hollowware, flatware            | 深物（袋物）, 平物                        | The FDA classes: flatware 平物 (plates), hollowware 深物 (cups, bowls). Not カトラリー. Usage.                                                                            |
| earthenware                     | 陶器                                      | **show English**. See Pitfalls: "low-fire earthenware" → 「低火度の陶器」.                                                                                                |
| stoneware                       | 炻器（せっき）                            | **show English**. Usage; most Japanese hobby potters call their high-fired ware 陶器, so the **show English** setting and the guides' explanation matter here.            |
| porcelain                       | 磁器                                      |                                                                                                                                                                           |
| vitreous, vitrification         | ガラス質の, ガラス化（焼き締まり）        | "a vitreous body" → 「焼き締まった素地」.                                                                                                                                 |
| porous, porosity                | 吸水性のある（多孔質の）, 吸水率          | "Bisque should stay porous" → 「素焼きは吸水性を残すべきです」.                                                                                                           |
| mature, maturity                | 焼き上がる, 焼成の完了（適正焼成）        | "matures the clay" → 「粘土を適正に焼き上げる」. Not 熟成 (ageing). Usage.                                                                                                |
| plastic, plasticity             | 可塑性のある, 可塑性                      | Not プラスチック.                                                                                                                                                         |
| greenware                       | 未焼成の素地（生素地）                    | **show English**. Not 緑色. Usage.                                                                                                                                        |
| leather-hard                    | 生乾き（半乾き）                          | Usage.                                                                                                                                                                    |
| bone dry                        | 完全乾燥                                  | Usage.                                                                                                                                                                    |
| bisque (UK: biscuit)            | 素焼き（すやき）                          | **show English**. "bisque firing" → 「素焼き」; "bisqued" → 「素焼きした」; "soft/hard bisque" → 「低めの／高めの素焼き」.                                                |
| glaze firing (UK: glost firing) | 本焼き（ほんやき）                        | **show English**.                                                                                                                                                         |
| once-firing (single firing)     | 一度焼き（生掛け）                        | **show English**. 生掛け is glazing unfired ware; the firing is 一度焼き. Usage.                                                                                          |
| slip                            | 泥漿（でいしょう）; 化粧土 for decoration | Casting and joining slip 泥漿; decorating slip 化粧土. Not 滑る.                                                                                                          |
| engobe                          | エンゴーベ（化粧土）                      | Usage.                                                                                                                                                                    |
| underglaze                      | 下絵付け; 下絵具                          | "underglaze pencil" → 「下絵付け用の鉛筆（下絵鉛筆）」.                                                                                                                   |
| foot                            | 高台（こうだい）                          | "dry-footing" → 「高台に釉を掛けないこと（高台の釉を拭き取る）」; "leave a wider foot" → 「高台まわりの釉を広めに拭き取る」.                                              |
| low fire, mid fire, high fire   | 低火度, 中火度, 高火度                    | Nouns and adjectives: 「中火度の釉薬」. Usage. Never add a temperature or SK range the English lacks.                                                                     |
| raku                            | 楽焼（らくやき）                          | A Japanese word; Western raku (pulled red-hot, reduced in sawdust) differs from Kyoto's 楽焼: where the guide means the Western firing, 「西洋式の楽焼（ラク）」 once.    |

### 2.4 Kilns, cones and firing

| English                                                                     | Japanese                                                                                           | Notes                                                                                                                                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| electric kiln, gas kiln, manual kiln                                        | 電気窯, ガス窯, 手動の窯                                                                           | 手動の窯: switched by hand, without a コントローラー. Usage.                                                                                                              |
| firing, fire (verb), load                                                   | 焼成, 焼成する（焼く）, 窯詰め                                                                     | "a firing" → 「1回の焼成」 only where the English has the figure; "fire to cone 6" → 「オルトンコーン 6 まで焼成する」; "loading" → 「窯詰め」, "unloading" → 「窯出し」. |
| kiln shelf (shelf)                                                          | 棚板（たないた）                                                                                   | "shelf" for materials on hand is different (2.8).                                                                                                                         |
| element                                                                     | ヒーター（発熱体）                                                                                 | The Materials form's "Elements" (chemical) → 「元素」.                                                                                                                    |
| cone (pyrometric cone)                                                      | コーン                                                                                             | **show English**. See Style sheet, Cones. Not 円錐.                                                                                                                       |
| cone number, cone chart                                                     | コーンの番号, 温度表                                                                               | "cone chart" → 「コーンの温度表」 (有恒商事 標準溶倒温度表). Never change digits or zeros.                                                                                |
| self-supporting, large and small (junior) cones, bars                       | 自立型, 大型・小型コーン, バー                                                                     | JIS R 8101 大型コーン, 小型コーン. Orton's "self-supporting" → 「自立型」 (sold as 立つゼーゲル).                                                                         |
| witness cone                                                                | 確認用コーン                                                                                       | **show English**. No source.                                                                                                                                              |
| cone pack                                                                   | 3本組のコーン                                                                                      | **show English**. No source.                                                                                                                                              |
| guide cone, firing cone, guard cone                                         | ガイドコーン, 焼成コーン, ガードコーン                                                             | One cooler, the target, one hotter (Style sheet, Cones). No source.                                                                                                       |
| heatwork                                                                    | 焼度（しょうど）                                                                                   | **show English**. JIS R 8101's 焼度測定 ("measuring the degree of firing"), quoted by the firing guide. "what cones measure" → 「コーンが測るのは焼度」.                  |
| heating rate (rate, climb), peak                                            | 昇温速度, 最高温度                                                                                 | Cone chart columns "Slow", "Medium", "Fast" → 「遅い」「中間」「速い」; firing-log "Rate" → 「昇温速度」.                                                                 |
| ramp                                                                        | 昇温・降温（ランプ）                                                                               | **show English**. Firing-log "Ramp" → 「ランプ」. Usage.                                                                                                                  |
| hold (soak)                                                                 | 保持（ねらし）                                                                                     | **show English**. 保持 for any hold; ねらし is the potters' word for a hold at the top (Usage). Firing-log "Hold" → 「保持」.                                             |
| schedule (firing schedule, program, preset, segment)                        | 焼成スケジュール（プログラム）, プリセット, セグメント                                             | Presets stay as on the controller ("Slow Bisque"). Firing-log "Segment" → 「セグメント」.                                                                                 |
| controller                                                                  | コントローラー（温度調節器）                                                                       | Setting "By temperature, as a kiln controller's program" → 「温度で（窯のコントローラーのプログラムのように）」.                                                          |
| cone offset (offset)                                                        | コーンオフセット                                                                                   | No source.                                                                                                                                                                |
| kiln sitter (Kiln-Sitter, sitter)                                           | キルンシッター                                                                                     | **show English**. Dawson's trademark, kept as a name; not sold in Japan as far as found. No source.                                                                       |
| sensing rod, claw, weight, trigger plate, cone supports, tube, firing gauge | センサーロッド, クロー, ウェイト, トリガープレート, コーンサポート, チューブ, ファイアリングゲージ | Kiln-sitter parts, in katakana as the US manual names them. No source.                                                                                                    |
| limit timer                                                                 | リミットタイマー                                                                                   | No source.                                                                                                                                                                |
| infinite switch (Off, Low, Medium, High)                                    | 無段階スイッチ（切, 弱, 中, 強）                                                                   | Switch positions: "Off" 切, "Low" 弱, "Medium" 中, "High" 強; "1 to 11" stays. No source.                                                                                 |
| pyrometer, thermocouple                                                     | 温度計（パイロメーター）, 熱電対                                                                   | "type K" → 「K 熱電対」. Firing-log "Probe {n}" → 「温度センサー {n}」.                                                                                                   |
| peephole (spy hole)                                                         | のぞき穴（色見穴）                                                                                 | Firing-log "Spy" → 「のぞき穴」. Usage.                                                                                                                                   |
| vent, downdraft vent, hood vent                                             | 排気装置, 下引き排気装置（ダウンドラフト）, 排気フード                                             | "vent the kiln" → 「窯の排気をする」. No source for ダウンドラフト.                                                                                                       |
| candling (preheat)                                                          | あぶり（予熱）                                                                                     | **show English**. Usage: Japanese potters' early slow stage. "mirror test" → 「鏡テスト」.                                                                                |
| burnout                                                                     | 炭素の燃焼（有機物の焼き抜き）                                                                     | "insufficient burnout" → 「炭素の焼き抜き不足」. Usage.                                                                                                                   |
| red heat, dull red                                                          | 赤熱, 暗赤色                                                                                       |                                                                                                                                                                           |
| quartz inversion                                                            | 石英転移                                                                                           | **show English**. 573 °C as the English.                                                                                                                                  |
| oxidation                                                                   | 酸化焼成                                                                                           | **show English**.                                                                                                                                                         |
| reduction                                                                   | 還元焼成                                                                                           | **show English**. Not 削減, 割引.                                                                                                                                         |
| atmosphere                                                                  | 雰囲気（焼成雰囲気）                                                                               | Firing-log "Atmosphere" → 「雰囲気」.                                                                                                                                     |
| drop-and-hold                                                               | ドロップ・アンド・ホールド（降温保持）                                                             | **show English**. No source.                                                                                                                                              |
| slow cooling (slow cool)                                                    | 徐冷（じょれい）                                                                                   | Usage.                                                                                                                                                                    |
| underfired, overfired                                                       | 焼成不足（生焼け）, 焼きすぎ（過焼成）                                                             | Usage.                                                                                                                                                                    |
| kiln wash                                                                   | 棚板用アルミナ塗料（棚板の剥離材）                                                                 | Not 洗浄. Usage.                                                                                                                                                          |
| stilt                                                                       | トチン                                                                                             | Usage (Seto calls the piece トチ).                                                                                                                                        |
| cookie                                                                      | ハマ                                                                                               | A disc of bisque under a pot. Usage.                                                                                                                                      |
| Seger cones, Staffordshire cones, Bullers rings, Holdcroft bars             | ゼーゲルコーン（ドイツ）, スタッフォードシャーコーン, ブラーズリング, ホールドクロフトバー         | Names transliterated; "rings" リング, "bars" バー. Where Seger cones are named, say they are the German series and not SK cones (Style sheet, Cones).                     |
| Damper, Primary Air, Secondary Air, Burner, Pilots, Blower                  | ダンパー, 一次空気, 二次空気, バーナー, 口火, ブロワー                                             | Short column labels. "Pilots" → 「口火」 (pilot flames). Usage.                                                                                                           |
| Ox Probe                                                                    | 酸素センサー                                                                                       | No source.                                                                                                                                                                |
| Draw Tile                                                                   | 色見（いろみ）                                                                                     | Usage: the test piece pulled from the kiln.                                                                                                                               |
| Delta, Temp Diff, Cones Top, Cones Bottom                                   | 温度差 (Δ), 温度差, 上段コーン, 下段コーン                                                         | "Delta" → 「Δ」 where it is a column head, 「温度差」 in text. No source.                                                                                                 |
| Salt, Soda, Sawdust                                                         | 塩, ソーダ, おがくず                                                                               | Firing-log fields: what is added (塩釉焼成, ソーダ焼成, おがくず焼成).                                                                                                    |
| Ring {n}                                                                    | リング {n}                                                                                         | The sources do not say what it is: keep 「リング」 with the number.                                                                                                       |

### 2.5 Defects and glaze fit

| English                     | Japanese                         | Notes                                                                                                                                                  |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| glaze fit (fit)             | 釉と素地の適合（相性）           | **show English**. "a good fit leaves the glaze slightly compressed" → 「適合が良いと釉にわずかな圧縮がかかった状態になる」. Not 体型, 発作. No source. |
| defect                      | 欠点（欠陥）                     | 焼成欠点 in textbooks. Usage.                                                                                                                          |
| crazing (craze)             | 貫入（かんにゅう）               | **show English**. 三重県 (貫入 as the glaze cracking from expansion). As a defect: 「貫入（欠点）」 where crackle is also near.                        |
| crackle                     | 装飾としての貫入                 | Crazing made on purpose: 「意図的な貫入」.                                                                                                             |
| shivering                   | 釉はがれ（シバリング）           | **show English**. Flakes are sharp: 「鋭い破片」. No source.                                                                                           |
| crawling (crawl)            | 縮れ（ちぢれ）                   | **show English**. Usage. The home-safety guide's babies crawling → 「はいはい」.                                                                       |
| pinholing (pinholes)        | ピンホール                       | **show English**. Usage.                                                                                                                               |
| blistering (blisters)       | ブク（泡）                       | Usage.                                                                                                                                                 |
| running (run, runny)        | 釉流れ（流れる）                 | Not 運転 ("the vent runs" → 「排気装置が作動する」).                                                                                                   |
| devitrification             | 失透（しっとう）                 | **show English**. Usage.                                                                                                                               |
| dunting                     | 冷め割れ（さめわれ）             | **show English**. Usage.                                                                                                                               |
| leaching (leach, leachable) | 溶出（溶出する, 溶出しやすい）   | **show English**. The law's word (規格基準: 溶出試験).                                                                                                 |
| specks                      | 斑点（鉄粉）                     | Usage.                                                                                                                                                 |
| milky, clouding             | 乳白, 白濁                       |                                                                                                                                                        |
| dry, chalky                 | かさついた, 粉っぽい             | Usage.                                                                                                                                                 |
| breaks (over edges)         | 縁で釉が薄くなって色が変わること | No single term; describe. No source.                                                                                                                   |
| flashing (flash)            | 色移り（緋色）                   | Volatile copper or chrome colour on nearby ware → 「色移り」. Not a camera flash. No source.                                                           |
| thermal shock               | 熱衝撃                           |                                                                                                                                                        |

### 2.6 Making and applying glaze

| English                                | Japanese                                                     | Notes                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| batch                                  | 仕込み量（1回に作る量）; ロット                              | An amount mixed at once → 「1回に作る量」; a supplier's run ("batch to batch") → 「ロットごとに」. UI "Scale to a batch" → 「仕込み量に換算」; "Batch weight" → 「仕込み重量」; "Batch size" → 「仕込み量」; "batch list" → 「計量リスト」; "Batch weights" → 「計量の単位」. No source for 仕込み. |
| batch recipe                           | 調合（調合割合）                                             | A glaze's materials by weight, usually to 100.                                                                                                                                                                                                                                                      |
| base (base glaze), on top              | 基礎釉（ベース釉）, 外割                                     | Additions "on top of the base" → 「外割で」 (京都市産技研, 茨城県); "% of base" → 「外割%」. "base frit" → 「基礎フリット」. Not 塩基.                                                                                                                                                              |
| percent, parts (parts by weight)       | パーセント（%）, 部（重量部）                                | UI units "% of base" → 「外割%」, "parts" → 「部」, "grams" → 「g」; "Parts" column → 「部」.                                                                                                                                                                                                       |
| scale (weighing)                       | はかり（秤）                                                 | "a scale that reads to 0.01 g" → 「0.01 g まで量れるはかり」. Not the scaling of a recipe (2.8: 換算).                                                                                                                                                                                              |
| tare                                   | 風袋引き（ふうたいびき）                                     | Usage.                                                                                                                                                                                                                                                                                              |
| slurry                                 | 釉液（水で溶いた釉薬）                                       | **show English**. Usage. "ready-mixed glaze" → 「調合済みの液状釉薬」; "powder" → 「粉末（粉末の釉薬も含む）」.                                                                                                                                                                                     |
| slake                                  | 水になじませる                                               | Let powder soak without stirring. No source.                                                                                                                                                                                                                                                        |
| sieve (UK also: lawn)                  | ふるい（篩）                                                 | "lawn" (UK) → 「ふるい」.                                                                                                                                                                                                                                                                           |
| mesh                                   | メッシュ（目）                                               | Numbers never translated: 「80 メッシュ」 or "80 mesh" kept as the English writes it (the check reads the figure).                                                                                                                                                                                  |
| specific gravity (SG)                  | 比重                                                         | **show English**. A ratio to water, unitless (not 密度 in g/cm³). `guides.density.sg` → 「比重 {value}」. Setting "Specific gravity" → 「比重」.                                                                                                                                                    |
| pint weight                            | パイント重量（英パイントあたりのオンス）                     | An imperial pint (568 ml). Setting "Pint weight, the ounces in an imperial pint" → 「パイント重量（英パイント（568 mL）あたりのオンス数）」. No source.                                                                                                                                             |
| degrees Baumé (°Bé), hydrometer        | ボーメ度 (°Bé), 比重計（ボーメ比重計）                       | Setting "Degrees Baumé, from a hydrometer" → 「ボーメ度（比重計で測る）」. Japan's default density. Usage (the meters sold as ボーメ比重計).                                                                                                                                                        |
| density (glaze density)                | 濃度（釉の濃さ）                                             | Setting "Glaze density" → 「釉の濃度」.                                                                                                                                                                                                                                                             |
| thixotropy (thixotropic, gelled)       | チキソトロピー（チキソ性, ゲル状になった）                   | **show English**.                                                                                                                                                                                                                                                                                   |
| flocculant (flocculate)                | 凝集剤（凝集させる）                                         | **show English**. Japanese potters use にがり as one: give it only where the English names a flocculant generally.                                                                                                                                                                                  |
| deflocculant                           | 解膠剤（かいこうざい）                                       | **show English**. Usage.                                                                                                                                                                                                                                                                            |
| Epsom salts                            | エプソムソルト（硫酸マグネシウム）                           |                                                                                                                                                                                                                                                                                                     |
| CMC gum (gum, binder, brushing medium) | CMC（糊剤）                                                  | "CMC" kept; "brushing medium" → 「筆塗り用の糊剤」.                                                                                                                                                                                                                                                 |
| suspension, settle, hard-panning       | 懸濁, 沈殿する, 底で固く沈殿する                             |                                                                                                                                                                                                                                                                                                     |
| dipping, pouring, brushing, spraying   | 浸し掛け（ずぶ掛け）, 流し掛け, 筆塗り（刷毛塗り）, 吹き掛け | "dipping glaze" → 「浸し掛け用の釉薬」; "dip time" → 「浸す時間」; "single dip", "double dip" → 「一度掛け」「二度掛け」 (words: the English has no figure). Usage.                                                                                                                                 |
| coat (coating)                         | 釉層（掛け）                                                 | "coat thinner" → 「薄く掛ける」; "two or three coats" → 「二、三度掛け」 (kanji: no figure in the English).                                                                                                                                                                                         |
| wax resist                             | 撥水剤（はっすいざい）                                       | **show English**. Usage.                                                                                                                                                                                                                                                                            |
| test tile                              | テストピース                                                 | **show English**. Usage.                                                                                                                                                                                                                                                                            |
| line blend                             | ラインブレンド（直線配合）                                   | **show English**. No source.                                                                                                                                                                                                                                                                        |
| triaxial blend                         | 三角座標                                                     | Usage: 三角座標による調合試験.                                                                                                                                                                                                                                                                      |
| lot number                             | ロット番号                                                   |                                                                                                                                                                                                                                                                                                     |
| technical data sheet (TDS)             | 技術資料（成分表）                                           | Not the 安全データシート. Usage.                                                                                                                                                                                                                                                                    |

### 2.7 Health and safety

| English                                                | Japanese                                                         | Notes                                                                                                                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| dust                                                   | 粉じん                                                           | The law's spelling (粉じん障害防止規則).                                                                                                                                                                                 |
| respirable crystalline silica (RCS)                    | 吸入性結晶質シリカ                                               | **show English**. JSOH: 結晶質シリカ（吸入性粉じん）.                                                                                                                                                                    |
| crystalline silica, amorphous silica, cristobalite     | 結晶質シリカ, 非晶質シリカ, クリストバライト                     |                                                                                                                                                                                                                          |
| silicosis, COPD                                        | けい肺（じん肺）, 慢性閉塞性肺疾患（COPD）                       | The law: じん肺法. けい肺 is the silica form.                                                                                                                                                                            |
| exposure limit, action level                           | 許容濃度（ばく露限界）, アクションレベル                         | Japan's own: 管理濃度 (area), 濃度基準値 (personal), JSOH's 許容濃度 (Law in Japan). "action level" (US) → 「アクションレベル（米国）」.                                                                                 |
| respirator                                             | 防じんマスク（呼吸用保護具）                                     | Not 人工呼吸器 (Pitfalls).                                                                                                                                                                                               |
| N95, P100, FFP2, FFP3, P2, P3                          | (kept)                                                           | Never translated. Japan's DS2, RS2, DS3, RS3 kept as codes.                                                                                                                                                              |
| half mask, powered respirator (PAPR)                   | 半面形の取替え式防じんマスク, 電動ファン付き呼吸用保護具（PAPR） | The law's names.                                                                                                                                                                                                         |
| fit test                                               | フィットテスト                                                   | MHLW's word.                                                                                                                                                                                                             |
| HEPA vacuum (dust Class M)                             | HEPA フィルター付き掃除機（Class M）                             | "HEPA", "Class M" kept.                                                                                                                                                                                                  |
| wet cleaning (wet mop, wet-wipe), dry sweeping         | 湿式清掃（モップの水拭き, 水拭き）, 乾いたままの掃き掃除         |                                                                                                                                                                                                                          |
| local exhaust ventilation (LEV)                        | 局所排気装置                                                     | **show English**. The law's word. "extraction" → 「局所排気」.                                                                                                                                                           |
| make-up air                                            | 給気（補給空気）                                                 | No source.                                                                                                                                                                                                               |
| spray booth (water-backed booth), overspray            | 吹付けブース（水洗式）, 器に付かなかった吹付けの釉               | Usage.                                                                                                                                                                                                                   |
| fumes (kiln fumes)                                     | 窯から出るガス（煙）                                             |                                                                                                                                                                                                                          |
| carbon monoxide (CO), CO alarm                         | 一酸化炭素（CO）, 一酸化炭素警報器                               |                                                                                                                                                                                                                          |
| metal fume fever, manganism                            | 金属熱（金属ヒューム熱）, マンガン中毒                           |                                                                                                                                                                                                                          |
| safety data sheet (SDS; older: MSDS)                   | 安全データシート（SDS）                                          | JIS Z 7253. "MSDS" → 「MSDS（旧称）」.                                                                                                                                                                                   |
| GHS, pictogram, signal word, hazard statement          | GHS, 絵表示, 注意喚起語, 危険有害性情報                          | JIS Z 7253: 危険, 警告. Codes kept.                                                                                                                                                                                      |
| Not classified                                         | 区分に該当しない                                                 | JIS Z 7253 SDS usage; not 無害.                                                                                                                                                                                          |
| IARC Group 1, 2A, 2B, 3 (carcinogenic)                 | IARC グループ1, 2A, 2B, 3（発がん性）                            | Group 1 「ヒトに対して発がん性がある」, 2A 「おそらくヒトに対して発がん性がある」, 2B 「ヒトに対して発がん性がある可能性がある」, 3 「ヒトに対する発がん性について分類できない」. Usage (Japanese agencies' renderings). |
| toxic, harmful                                         | 有毒, 有害                                                       | As the GHS statements: H301 飲み込むと有毒, H302 飲み込むと有害. Keep them apart.                                                                                                                                        |
| soluble, insoluble, slightly soluble                   | 水溶性（溶けやすい）, 不溶性, 難溶性                             |                                                                                                                                                                                                                          |
| swallow (ingestion), breathe in (inhalation)           | 飲み込む（経口摂取）, 吸い込む（吸入）                           | Plain words in the guides.                                                                                                                                                                                               |
| acute, chronic                                         | 急性, 慢性                                                       |                                                                                                                                                                                                                          |
| poison centre (poison line, poison control)            | 中毒110番（日本中毒情報センター）                                | Japan's lines by name: 大阪中毒110番, つくば中毒110番; emergency 119. Other countries' services keep their names.                                                                                                        |
| blood lead test, blood lead reference value            | 血中鉛検査, 血中鉛の参照値                                       | CDC's 3.5 µg/dL kept.                                                                                                                                                                                                    |
| lead-free (leadless)                                   | 無鉛                                                             | 陶芸百貨店 無鉛フリット. Not the same as food safe.                                                                                                                                                                      |
| food safe (food-safe)                                  | 食器として安全（溶出基準に適合）                                 | **show English**. In law: passes the 溶出試験 of 規格基準. No single shop term.                                                                                                                                          |
| leach test (laboratory leach test, metal release test) | 溶出試験                                                         | Metals released in general: not narrowed to 鉛・カドミウム unless the English names them.                                                                                                                                |
| liner glaze                                            | 内側用の安定した釉                                               | **show English**. No source.                                                                                                                                                                                             |
| contact dermatitis, barrier cream                      | 接触皮膚炎, 保護クリーム（手袋の代わりにはならない）             |                                                                                                                                                                                                                          |
| infrared (IR), IR-rated welding glasses, shade 3       | 赤外線（IR）, 赤外線を遮る溶接用遮光メガネ, 遮光度番号3          | JIS T 8141's 遮光度番号. Sunglasses → 「サングラス」, didymium glasses → 「ジジム（ディディミウム）ガラスのメガネ」.                                                                                                     |
| combustible, clearance, dedicated circuit              | 可燃物, 離隔距離, 専用回路                                       |                                                                                                                                                                                                                          |
| manual (a kiln's, controller's or sitter's)            | 取扱説明書                                                       | Never ガイド (Pitfalls).                                                                                                                                                                                                 |
| oxidiser (H272)                                        | 酸化性物質                                                       | GHS 酸化性固体; H272 「火災助長のおそれ；酸化性物質」.                                                                                                                                                                   |
| nuisance dust                                          | 簡易マスク（国家検定品でないもの）                               | "a nuisance dust mask" is not a respirator.                                                                                                                                                                              |

### 2.8 The app's own words

| English                                                                                | Japanese                                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| recipe (Recipes)                                                                       | 調合                                                               | "New recipe" → 「新しい調合」; "Saved recipe" → 「保存した調合」; "My saved recipes" → 「保存した調合」; "the recipe calculator" → 「調合計算」. 調合 is the potters' word for a glaze recipe; レシピ is not used.                                                                                                                                                                   |
| studio notebook (notebook)                                                             | 工房ノート                                                         | "Your studio notebook" → 「あなたの工房ノート」 is avoided: 「工房ノート」.                                                                                                                                                                                                                                                                                                          |
| material (Materials)                                                                   | 原料                                                               | "Name of Material:" → 「原料名:」; "Add materials" → 「原料を追加」.                                                                                                                                                                                                                                                                                                                 |
| My materials                                                                           | マイ原料                                                           | Tab. "My server materials:" → 「サーバーに保存したマイ原料:」.                                                                                                                                                                                                                                                                                                                       |
| Standard (standard materials)                                                          | 標準; 標準原料                                                     | Tab "Standard ({count})" → 「標準（{count}）」. Not 普通.                                                                                                                                                                                                                                                                                                                            |
| library                                                                                | ライブラリ（標準原料の一覧）                                       | Not 図書館.                                                                                                                                                                                                                                                                                                                                                                          |
| additive (Additives)                                                                   | 添加物                                                             | Nav "Additives" → 「添加物」; "Additives and colorants" → 「添加物と着色剤」.                                                                                                                                                                                                                                                                                                        |
| amount (Amount)                                                                        | 量                                                                 | Column "Amount" → 「量」; "Enter an amount (0 is fine)." → 「量を入力してください（0 でもかまいません）。」                                                                                                                                                                                                                                                                          |
| Share                                                                                  | 割合                                                               | Not 共有.                                                                                                                                                                                                                                                                                                                                                                            |
| To percent, To parts, Scale to a batch, Scale                                          | %に換算, 部に換算, 仕込み量に換算, 換算                            | "Change the scale:" → 「換算:」.                                                                                                                                                                                                                                                                                                                                                     |
| Batch size, batch list, Weigh in, Weigh, Weighed, Running total, All together          | 仕込み量, 計量リスト, 計量する原料, 計量, 計量済み, 累計, 合計     | Print page. No source.                                                                                                                                                                                                                                                                                                                                                               |
| Unity formula (Unity)                                                                  | ゼーゲル式                                                         | "Count colorants and additives in it" → 「着色剤・添加物も含める」.                                                                                                                                                                                                                                                                                                                  |
| Wildcards                                                                              | その他の酸化物                                                     | Not ワイルドカード.                                                                                                                                                                                                                                                                                                                                                                  |
| Compare                                                                                | 比較                                                               | "Compare two recipes" → 「二つの調合を比較」 (the English writes "two" as a word, so no digit); "First recipe" → 「一つ目の調合」, "Second recipe" → 「二つ目の調合」; "same" → 「同じ」.                                                                                                                                                                                            |
| Save, Save and add next recipe, Save as a copy, Print                                  | 保存, 保存して次の調合を追加, コピーとして保存, 印刷               |                                                                                                                                                                                                                                                                                                                                                                                      |
| swap (Try modern materials and compare, Undo the swap)                                 | 置き換え（今の原料で試して比較, 置き換えを元に戻す）               | "Swapped for modern materials" → 「今の原料に置き換えました」.                                                                                                                                                                                                                                                                                                                       |
| like for like, gram for gram, one for one, pound for pound                             | 同量で置き換え（グラム単位で同量）                                 | Translate the sense: 「量を変えずに置き換えられる」.                                                                                                                                                                                                                                                                                                                                 |
| Suggest amounts and compare                                                            | 量を提案して比較                                                   |                                                                                                                                                                                                                                                                                                                                                                                      |
| Replace lead (Replace lead and compare)                                                | 鉛を置き換え（鉛を置き換えて比較）                                 | "Rebuild the glaze" → 「釉を作り直す」; "Keep the colour on a lead-free base" → 「無鉛の基礎釉で色を残す」.                                                                                                                                                                                                                                                                          |
| Match with what I have (Match and compare)                                             | 手持ちの原料で作る（手持ちの原料で作って比較）                     |                                                                                                                                                                                                                                                                                                                                                                                      |
| materials on hand (the shelf)                                                          | 手持ちの原料                                                       | "the shelf" → 「手持ちの原料」, not 棚板.                                                                                                                                                                                                                                                                                                                                            |
| Materials to try, Must use                                                             | 試す原料, 必ず使う                                                 |                                                                                                                                                                                                                                                                                                                                                                                      |
| Leave it out, Allow more, Add it, Use it instead, Work it out again, What to watch for | 使わない, 増やしてもよい, 追加, 代わりに使う, 再計算, 注意すること |                                                                                                                                                                                                                                                                                                                                                                                      |
| Discontinued, Hard to get, Historical                                                  | 製造中止, 入手困難, 過去の原料                                     | "Discontinued {year}" → 「{year}年に製造中止」.                                                                                                                                                                                                                                                                                                                                      |
| Use instead, Similar, Replaces, Also called, Made by, Hazards                          | 代わりに, 類似, 置き換え対象, 別名, メーカー, 危険有害性           | "Counted as {name}" → 「{name} として計算」.                                                                                                                                                                                                                                                                                                                                         |
| Kind (All kinds)                                                                       | 種類（すべての種類）                                               | Categories: 長石・陶石, 粘土, フリット, ホウ素原料, 媒溶剤, シリカ, アルミナ, 乳濁剤, 着色剤, 沈殿防止剤, その他.                                                                                                                                                                                                                                                                    |
| Sold in, Where you work                                                                | 販売地域, 地域                                                     | "All regions" → 「すべての地域」.                                                                                                                                                                                                                                                                                                                                                    |
| Firing logs (firing record)                                                            | 焼成記録                                                           | "Title of Firing:" → 「焼成の名前:」; "Record the Firing" → 「焼成を記録」.                                                                                                                                                                                                                                                                                                          |
| field, row                                                                             | 項目, 行                                                           | "Add the field" → 「項目を追加」.                                                                                                                                                                                                                                                                                                                                                    |
| trial (Your trial, Try it now, Discard trial)                                          | お試し（お試し利用中, 今すぐ試す, お試しを破棄）                   | Never ゲスト. "14 days" → 「14日間」.                                                                                                                                                                                                                                                                                                                                                |
| Typing amounts                                                                         | 数値の入力                                                         | "A comma or a point for decimals" → 「小数点はカンマかピリオド」. Server "decimal mark" → 「小数点の記号」.                                                                                                                                                                                                                                                                          |
| Firing (To Orton cones, By temperature, as a kiln controller's program)                | 焼成（オルトンコーンで, 温度で）                                   | Also "To SK cones (JIS R 8101)" → 「SK コーン（JIS R 8101）で」. Guides: "Show it for firing to SK cones (JIS R 8101)" → 「SK コーン（JIS R 8101）で焼成する場合を表示」.                                                                                                                                                                                                            |
| Glaze density (Specific gravity, Degrees Baumé, Pint weight)                           | 釉の濃度（比重, ボーメ度, パイント重量）                           |                                                                                                                                                                                                                                                                                                                                                                                      |
| Light or dark, Colors                                                                  | ライト／ダーク, 色                                                 | Palette: Tenmoku rust 天目の錆色, Celadon green 青磁グリーン, Cobalt blue コバルトブルー, Oxblood red 辰砂の赤, Shino orange 志野のオレンジ, Wood ash olive 灰釉のオリーブ.                                                                                                                                                                                                          |
| Batch weights (Grams, Pounds and ounces), Grams on printed batches                     | 計量の単位（グラム, ポンドとオンス）, 印刷時のグラム表示           | "To a tenth of a gram" → 「十分の一グラム単位」 (the English has no figure, so no digits); "Full precision" → 「すべての桁」.                                                                                                                                                                                                                                                        |
| Lead (Off, On, Turn lead on, Keep it off)                                              | 鉛（オフ, オン, 鉛を使う, オフのまま）                             |                                                                                                                                                                                                                                                                                                                                                                                      |
| English terms (Show the English after key terms)                                       | 英語の用語（主な用語の後に英語を表示）                             |                                                                                                                                                                                                                                                                                                                                                                                      |
| Translation notice (About this translation, Suggest a correction, Read the English)    | 翻訳についてのお知らせ（この翻訳について, 修正を提案, 英語で読む） | The standard notice (not the plainer one).                                                                                                                                                                                                                                                                                                                                           |
| Trash                                                                                  | ごみ箱                                                             |                                                                                                                                                                                                                                                                                                                                                                                      |
| Remove (Yes, remove), Delete my account                                                | 削除（はい、削除します）, アカウントを削除                         | "This can't be undone." → 「元に戻すことはできません。」                                                                                                                                                                                                                                                                                                                             |
| guide (Guides)                                                                         | ガイド                                                             | The five titles, the same in each guide's front matter, every link, the page titles (`titles`) and the list (`list`): "Glazing from first principles" 「基礎から学ぶ釉薬」, "How to make a glaze" 「釉薬の作り方」, "Safe mixing and ventilation" 「安全な調合と換気」, "Don't poison your family" 「家族を中毒から守る」, "Firing a basic kiln" 「基本の窯焚き」. Never 取扱説明書. |
| reset (a password), change (a password)                                                | 再設定, 変更                                                       | "Reset your password" → 「パスワードの再設定」; "Send reset link" → 「再設定リンクを送信」; "Change password" → 「パスワードを変更」.                                                                                                                                                                                                                                                |

### 2.9 Where the potter works

| English                                                                       | Japanese                                                                                                                                     | Where                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Shops in (the label before a list of countries)                               | 販売店のある国:                                                                                                                              | guides: shops.shopsIn                                     |
| raw glaze materials (what a shop sells)                                       | 釉薬原料                                                                                                                                     | guides: shops.what.materials                              |
| ready-made glazes                                                             | 調合済みの釉薬                                                                                                                               | guides: shops.what.glazes                                 |
| Packs seen                                                                    | 確認した容量                                                                                                                                 | guides: shops.packs                                       |
| A binding limit.                                                              | 法的拘束力のある限度値です。                                                                                                                 | guides: silica.kind.binding                               |
| An indicative limit: a guide value, not a legal ceiling.                      | 指標値です。目安の値であり、法的な上限ではありません。                                                                                       | guides: silica.kind.indicative                            |
| An assessment criterion, not a binding limit. (Germany)                       | 評価基準です。法的拘束力のある限度値ではありません。                                                                                         | guides: silica.kind.assessment                            |
| A control concentration (管理濃度) …                                          | 管理濃度です。作業場の測定値から作業環境を評価するための基準であり、一人ひとりが吸い込む量の上限ではありません。                             | guides: silica.kind.control                               |
| action level (US)                                                             | アクションレベル                                                                                                                             | guides: silica.actionLevel                                |
| quartz and cristobalite                                                       | 石英とクリストバライト                                                                                                                       | guides: silica.both                                       |
| Control concentration, where Q is the free silica in the dust, in %           | 管理濃度（Q は粉じん中の遊離けい酸含有率（%））                                                                                              | guides: silica.formula                                    |
| {numerator} / ({factor}Q + 1) mg/m³                                           | {numerator} / ({factor}Q + 1) mg/m³                                                                                                          | guides: silica.formulaValue (unchanged)                   |
| Recommended by {abbr}                                                         | {abbr} の勧告値                                                                                                                              | guides: silica.recommended                                |
| The national body for safety at work: <link>{name}</link>.                    | 国の労働安全衛生機関: <link>{name}</link>                                                                                                    | guides: silica.agency                                     |
| Kind of piece (food-contact rules)                                            | 器の種類                                                                                                                                     | guides: food.article                                      |
| pieces that cannot be filled, or no deeper than 25 mm                         | 液体を満たすことのできないもの、又は深さ25 mm以下のもの                                                                                      | guides: food.category.flat (EU: "no deeper than" is 以下) |
| other pieces that can be filled                                               | その他の液体を満たすことのできるもの                                                                                                         | guides: food.category.fillable                            |
| cooking ware                                                                  | 加熱調理用器具                                                                                                                               | guides: food.category.auCooking, jpCooking                |
| The rim of a piece for drinking from: a 2 cm band, inside and out             | 飲み口の縁: 内側と外側の幅2 cmの帯状部分                                                                                                     | guides: food.category.rimBand                             |
| Flatware, no deeper than 25 mm (US)                                           | 平物（深さ25 mm以下）                                                                                                                        | guides: food.category.flatware                            |
| Small hollowware, under 1.1 L, other than cups and mugs (US)                  | 小型の深物（1.1 L未満、カップとマグを除く）                                                                                                  | guides: food.category.smallHollow                         |
| Large hollowware, 1.1 L or more, other than pitchers (US)                     | 大型の深物（1.1 L以上、ピッチャーを除く）                                                                                                    | guides: food.category.largeHollow                         |
| average of 6 pieces / any one of 6                                            | 6個の平均 / 6個のいずれも                                                                                                                    | guides: food.judged.average, food.judged.each             |
| A piece passes if it releases no more than the limit: the law says “at most”. | 溶出量が限度値以下であれば適合です。法令の表記は「以下」です。                                                                               | guides: food.atMost                                       |
| Buying in (the label before a list of countries)                              | 購入する国:                                                                                                                                  | guides: equivalents.buyingIn                              |
| differs by {grams} g per 100 g                                                | 100 g あたり {grams} g の差                                                                                                                  | guides: equivalents.apart                                 |
| Directive 84/500/EEC (its official name)                                      | EU 指令 84/500/EEC（2005/31/EC により改正）                                                                                                  | regions: the directive (no official Japanese text)        |
| Dust masks in Japan pass a national test (国家検定). …                        | 日本の防じんマスクは国家検定に合格したものです。DS は使い捨て式、RS は取替え式で、区分2は試験粒子の95.0%以上、区分3は99.9%以上を捕集します。 | regions: Japan's masks                                    |

The law's word for a piece is 試料 (a test piece) and 器具又は容器包装; the guides use the plainer 器 and もの. "per 100 g"
keeps the symbol (「100 g あたり」), so the check finds the same figure and unit.

## 3. Never translated

From terms.md, unchanged:

- **Formulas and symbols:** SiO₂, Al₂O₃, B₂O₃, K₂O, Na₂O, Li₂O, CaO, MgO, BaO, SrO, ZnO, PbO, Fe₂O₃, FeO, Fe₃O₄, TiO₂,
  ZrO₂, ZrSiO₄, CoO, Co₃O₄, CuO, MnO₂, Cr₂O₃, SnO₂, P₂O₅, V₂O₅, CaCO₃, CO, CO₂ and the rest; R₂O, RO, R₂O₃, RO₂; KNaO;
  "×10⁻⁶/°C" and "x 10^-7/K".
- **Cone numbers:** 022 to 42 with their leading zeros (010, 08, 06, 04, 03, 01, 1, 5, 6, 10), SK numbers as printed
  (SK 022, SK 015a, SK 6a, SK 20), and the "o'clock" bend positions (「4時の位置」: the words around them change; the clock
  figure stays).
- **Mesh numbers:** 50, 60, 80, 100, 120, 200, 325 mesh, -325 mesh, "200#".
- **Units:** °C, °F, K, °Bé, °C/h, °F/h, g, kg, mg, µg, ml/mL, L, lb, oz, fl oz, %, mm, cm, m³, mg/m³, µg/m³,
  µg/dL, µg/mL, µg/cm², µm (Inches and feet take the language’s word: インチ, フィート; see the README.)
- **Codes and standards:** N95, P100, FFP2, FFP3, P2, P3, DS2, RS2, DS3, RS3, EN 149, EN 140, AS/NZS 1716, HEPA, Class
  M, ASTM C738, ASTM D-4236, EN 1388, ISO 6486, AS 4371, JIS R 8101, JIS Z 7253, the numbers of Directives 84/500/EEC and
  (EU) 2017/2398 (no official Japanese form: see Law in Japan), CPG Sec. 545.450, 29 CFR 1910.1053, H-codes (H302,
  H360FD), GHS08, CAS numbers, IARC group numbers.
- **Names:** Glazecalc; "UMF" as an abbreviation, beside ゼーゲル式; Seger (ゼーゲル only as Style sheet, Cones allows), Orton
  (Orton Ceramic Foundation; オルトン in running text), Staffordshire, Bullers, Holdcroft.
- **Kiln and equipment makers and products:** Skutt (EnviroVent 2, KilnMaster), L&L (DynaTrol), Bartlett, Dawson
  (Kiln-Sitter, LT-3), Bracker's; controller presets (Slow Bisque, Fast Bisque, Slow Glaze, Fast Glaze, "User 6");
  Digitalfire schedules (BQ1000, PLC6DS, C6DHSC).
- **Materials by trade name:** Ferro and Vibrantz frits (3110, 3124, 3134, 3195, 3249), Fusion frits (F-19 and others),
  Potterycrafts P3124 and P3195, Custer feldspar (Custer Spar), G-200, G-200 EU, G-200 HP, Mahavir, Minspar 200, Kona
  F-4, Norflux, FFF, Gerstley Borate, Gillespie Borate, Laguna Borate, Portabor, EPK, Grolleg, Eckalite, Eckaglas,
  TWVA, HVAR, Zircopax, Superpax, Excelopax, Ultrox, Zircosil, Darvan, Volclay, Bentone, Vansil, NYAD, Alberta Slip,
  Albany slip, Bayferrox, Mason stains, AMACO.
- **Sources, agencies and suppliers:** Glazy, Digitalfire, Ceramic Arts Network, Ceramics Monthly, HSE, OSHA, NIOSH,
  IARC, ECHA, FDA, CDC, EPA, NHS, COSHH, NEPSI, Safe Work Australia, WorkSafe New Zealand; Laguna, Potclays,
  Potterycrafts, Valentine Clays, Sibelco, Imerys, Walker Ceramics and the other suppliers named; the poison services
  in `safety/en.json`.
- **Placeholders and tags:** `{name}`, `{count}` and the rest, and `<b>`, `<settings>` and other tags.

Added for Japanese:

- **Japanese names, as written**: 有恒商事, 京都ゼーゲル, 立つゼーゲル, 大型コーン, 焼度測定, 国家検定, 管理濃度 and every Japanese word the
  English already quotes in Japanese: copy it exactly, never re-translate it or add its reading.
- **Japanese product names** as on the bag: 福島長石, 特級福島長石, 釜戸長石, 特級釜戸長石, 三雲長石, 平津長石, 福島硅石, 天草陶石, 合成土灰,
  白石灰, ねずみ石灰, 霞石閃長石, Uフラックス, 無鉛フリット T20 and the rest. Never "corrected" to this page's spelling (硅 stays in 福島硅石).
- **Japanese bodies and services**: 厚生労働省, 消費者庁, 日本中毒情報センター, 大阪中毒110番, つくば中毒110番, 子ども医療電話相談（#8000）,
  日本産業衛生学会 (JSOH), 中央労働災害防止協会 (JAISH).
- **Shops**: 陶芸百貨店, 丸二陶料, ヤマニファーストセラミック.
- **The law's names**: 食品衛生法, 食品、添加物等の規格基準, 労働安全衛生法, 粉じん障害防止規則, 作業環境評価基準, 防じんマスクの規格, じん肺法.
