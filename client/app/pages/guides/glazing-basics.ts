import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/page-header';
import { GuideContents, GuideSection } from './guide-contents';

/** The guide's sections, for its contents list and their headings' ids. */
const SECTIONS: GuideSection[] = [
  { id: 'what-a-glaze-is', label: 'What a glaze is' },
  { id: 'clay-and-firings', label: 'Clay, coatings and the two firings' },
  { id: 'cones', label: 'Cones and heatwork' },
  { id: 'unity-formula', label: 'From recipe to unity formula' },
  { id: 'materials', label: 'Frits and raw materials' },
  { id: 'color', label: 'Colorants and opacifiers' },
  { id: 'fit-and-defects', label: 'Glaze fit and defects' },
  { id: 'food-safety', label: 'Food safety' },
  { id: 'application', label: 'Specific gravity and application' },
  { id: 'atmosphere', label: 'Oxidation and reduction' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'sources', label: 'Sources' }
];

/** Glazing from first principles: what a glaze is, and every word a new potter meets. */
@Component({
  selector: 'gc-glazing-basics-guide',
  imports: [GuideContents, PageHeader, RouterLink],
  template: `
    <gc-page-header
      title="Glazing from first principles"
      lead="What a glaze is made of, how the kiln turns it to glass, and every word you will meet on a recipe, a bag or a cone chart, explained."
    />
    <gc-guide-contents [sections]="sections" />
    <div class="guide">
      <section class="panel" aria-labelledby="what-a-glaze-is">
        <h2 id="what-a-glaze-is" tabindex="-1">What a glaze is</h2>
        <p>
          A <b>glaze</b> is a thin coat of glass fused to a pot. Glazy, the open glaze-recipe database, calls it "a
          glass formula tuned to melt and fuse onto clay at certain temperatures". It goes on as a layer of powder and
          melts in the kiln into a glassy coat that seals the clay, so the pot is less likely to leak, stain or wear. At
          the top of the firing the melt also reacts with the clay, often forming a layer between them that locks the
          glaze on. On earthenware the glaze sits on top as a separate layer; on stoneware it melts into the body.
        </p>
        <p>
          A recipe lists raw materials, such as feldspar, whiting and kaolin. In the kiln, part of each leaves as gas
          (water or carbon dioxide) and the rest becomes <b>oxides</b>: compounds of an element with oxygen, such as
          silica (SiO₂) or calcium oxide (CaO). The fired glass is made of oxides, so potters describe a glaze by them.
          Each oxide does one of three jobs.
        </p>
        <ul>
          <li>
            <b>Silica</b> (SiO₂) is the <b>glass former</b>: it builds the glass. Pure silica melts above 3,100 °F
            (1,700 °C), far hotter than a pottery kiln, and a glaze high in silica is generally more durable.
          </li>
          <li>
            <b>Fluxes</b> lower the melting point to one a kiln can reach. The <b>alkalis</b>, written <b>R₂O</b>, are
            the oxides of sodium, potassium and lithium (Na₂O, K₂O, Li₂O); they work from cone 06 up through mid and
            high fire. The <b>alkaline earths</b>, written <b>RO</b>, are the oxides of calcium, magnesium, barium and
            strontium (CaO, MgO, BaO, SrO), with zinc oxide (ZnO) grouped alongside; they work best from cone 5 to cone
            10. The R stands for any metal in the family.
          </li>
          <li>
            <b>Alumina</b> (Al₂O₃) is the <b>stabilizer</b>. It stiffens the melt so it stays on upright walls, and adds
            hardness and durability. Glazy's warning: with too little alumina "your glaze may run; too much can stiffen
            the melt into a matte". Alumina comes mostly from clay and feldspar.
          </li>
        </ul>
        <p>
          <b>Boron</b> (B₂O₃) blurs the line. Chemists class it as a glass former, but at studio temperatures it acts as
          a flux, and potters treat it as one. It is critical at cone 5–6 and not needed at high fire. (Cones, the way
          potters name a firing, are explained below.)
        </p>
        <p class="guide-callout">
          One way to hold it in mind: silica is the glass, the fluxes let it melt at a temperature your kiln can reach,
          and alumina thickens it so it stays where you put it.
        </p>
      </section>

      <section class="panel" aria-labelledby="clay-and-firings">
        <h2 id="clay-and-firings" tabindex="-1">Clay, coatings and the two firings</h2>
        <h3>Clay bodies</h3>
        <p>The <b>clay body</b> is the clay a pot is made of. There are three main kinds.</p>
        <ul>
          <li>
            <b>Earthenware</b>: a low-fire body, about cone 06–02, that stays porous. Often red or buff, it needs a
            glaze to hold water.
          </li>
          <li><b>Stoneware</b>: a mid- to high-fire body, about cone 5–10, that becomes vitreous or nearly so.</li>
          <li><b>Porcelain</b>: a white, high-fire body rich in kaolin, often translucent.</li>
        </ul>
        <p>
          <b>Vitreous</b> means glassy and non-porous; <b>vitrification</b> is a body becoming so as it fires. UK
          potters often draw the line by temperature instead: stoneware is fired above 2,192 °F (1,200 °C), earthenware
          below. Mid fire, cone 5–6, falls just either side of that line.
        </p>

        <h3>Coatings and drying</h3>
        <p>
          <b>Slip</b> is clay suspended in water, for casting, joining or decorating. An <b>engobe</b> is a slip-like
          coating, often colored, with more non-clay materials. An <b>underglaze</b> is colored slip or oxide
          decoration, usually covered with a clear glaze.
        </p>
        <p>
          Unfired ware is <b>greenware</b> (sources disagree on whether the word covers all unfired ware or only dry
          ware). As it dries it becomes <b>leather-hard</b>, stiff but slightly damp, the stage for trimming and
          handles; then <b>bone dry</b>, with no free water left, very fragile and ready to fire.
        </p>

        <h3>The two firings</h3>
        <p>
          The first, lower firing is the <b>bisque</b> (UK: <b>biscuit</b>), usually cone 08–04, about 1,740–1,940 °F
          (950–1,060 °C). It leaves ware strong but porous. Digitalfire, a glaze reference site, suggests generally more
          than 15% porosity, so the bisque draws water out of the glaze as it goes on. A soft bisque (cone 08–06) is
          more porous; a hard bisque (often cone 04) is sturdier but takes glaze less readily.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="How the bisque changes glazing">
          <table class="guide-table">
            <caption>
              How the bisque changes glazing (Digitalfire)
            </caption>
            <thead>
              <tr>
                <th scope="col">Bisque</th>
                <th scope="col">What happens</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Under-fired, very absorbent</th>
                <td>Glaze goes on too thick, then cracks and crawls</td>
              </tr>
              <tr>
                <th scope="row">Over-fired, dense</th>
                <td>Dipping and drying take longer</td>
              </tr>
              <tr>
                <th scope="row">Fired hotter, or held longer at the top</th>
                <td>More gas burns off now, so less bubbles through the glaze later</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Potclays, a UK supplier, describes biscuit firing to around 1,000 °C (1,832 °F), about cone 06. Reading these
          sources together, we suggest cone 06–04 for a first bisque: 1,828–1,945 °F (998–1,063 °C) at Orton's medium
          rate.
        </p>
        <p>
          The <b>glaze firing</b> (British potters may say <b>glost</b> firing) melts the glaze and, for stoneware,
          matures the clay too. <b>Once-firing</b> glazes unfired ware and fires it just once. Digitalfire reports a
          production case where raw-glazed ware crawled on its rims until a bisque firing cured it, so begin with two
          firings. <a routerLink="/guides/firing">Firing a basic kiln</a> gives schedules for both.
        </p>
      </section>

      <section class="panel" aria-labelledby="cones">
        <h2 id="cones" tabindex="-1">Cones and heatwork</h2>
        <p>
          Potters name a firing by a <b>cone</b>: a slender ceramic pyramid that bends when it has had a set amount of
          heat. Orton, which makes them, puts it this way: "Cones do not measure temperature alone. They measure
          heatwork, the combined effect of time and temperature."
        </p>
        <p>
          <b>Heatwork</b> is the reason: glaze, clay and cone all respond to how long they are hot as well as how hot. A
          slow firing bends a cone at a lower temperature, a fast one at a higher. Orton's chart has cone 6 bending at
          2,165 °F (1,185 °C) when the firing ends climbing 27 °F (15 °C) per hour, at 2,232 °F (1,222 °C) at 108 °F (60
          °C) per hour, and at 2,269 °F (1,243 °C) at 270 °F (150 °C) per hour, the rate taken over the last 180 °F (100
          °C). A cone is done when its tip has bent through 90°, which Orton calls the 5 o'clock position.
        </p>
        <p>
          Cone numbers run from 022 to 42. A leading zero marks the cooler series, where a bigger number is cooler: cone
          06 is cooler than cone 04, and cone 01 cooler than cone 1.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Firing ranges">
          <table class="guide-table">
            <caption>
              Firing ranges: Orton self-supporting cones at 108 °F (60 °C) per hour
            </caption>
            <thead>
              <tr>
                <th scope="col">Range</th>
                <th scope="col">Cones</th>
                <th scope="col">°F</th>
                <th scope="col">°C</th>
                <th scope="col">Used for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Low fire</th>
                <td>06–04</td>
                <td class="num">1,828–1,945</td>
                <td class="num">998–1,063</td>
                <td>Earthenware glazes; bisque</td>
              </tr>
              <tr>
                <th scope="row">Mid fire</th>
                <td>5–6</td>
                <td class="num">2,167–2,232</td>
                <td class="num">1,186–1,222</td>
                <td>Stoneware and porcelain</td>
              </tr>
              <tr>
                <th scope="row">High fire</th>
                <td>9–10</td>
                <td class="num">2,300–2,345</td>
                <td class="num">1,260–1,285</td>
                <td>Stoneware and porcelain</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="guide-callout">
          Name and program your firings by cone, and treat the temperatures as approximate. A <b>witness cone</b> on a
          shelf among the pots, or a <b>cone pack</b> of three (guide, firing and guard cones), shows the heatwork your
          pots really received.
        </p>
        <p>
          Published temperatures vary. Glazy gives high fire, cone 9–11, as about 2,336–2,390 °F (1,280–1,310 °C), which
          matches Orton's fast column, and Digitalfire reports that most kilns reach cone 6 at about 2,200 °F (1,204
          °C). Our advice: use Orton's medium-rate figures, as this guide does, program by cone, and let a witness cone
          settle it.
        </p>
        <p>
          Outside North America, suppliers often give °C rather than a cone. Hermann Seger developed the modern cone,
          first used in Berlin in 1886, and the UK has had its own Staffordshire cones; their numbers should not be
          assumed to match Orton's, and we found no table to convert them.
          <a routerLink="/guides/firing">Firing a basic kiln</a> covers cones in more detail.
        </p>
      </section>

      <section class="panel" aria-labelledby="unity-formula">
        <h2 id="unity-formula" tabindex="-1">From recipe to unity formula</h2>
        <p>
          A <b>batch recipe</b> lists raw materials by weight, usually scaled so the base adds up to 100.
          <b>Additives</b> (colorants, opacifiers and suspenders) go on top of the 100, usually as a percent of the
          base. To see what the glaze is, potters turn the recipe into a <b>unity molecular formula</b> (<b>UMF</b>, or
          <b>Seger formula</b>, after Hermann Seger, who first used its three-column layout).
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="From recipe to unity formula">
          <table class="guide-table">
            <caption>
              From recipe to unity formula: Glazy's worked example
            </caption>
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">What happens</th>
                <th scope="col">In the example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1. Batch recipe</th>
                <td>Raw materials by weight, scaled to 100</td>
                <td>Feldspar 40%, among others</td>
              </tr>
              <tr>
                <th scope="row">2. Oxide analysis</th>
                <td>
                  Like a nutrition label: each material's oxides are added up as weight percent, and the gases dropped
                </td>
                <td>
                  The feldspar is 64.8% silica, so its 40% brings 25.9% SiO₂. The fired glaze is 67.4% SiO₂, 12.6%
                  Al₂O₃, 7.5% K₂O, 12.5% CaO
                </td>
              </tr>
              <tr>
                <th scope="row">3. Moles</th>
                <td>
                  Weights become <b>moles</b>, counts of molecules, because "Grams can be misleading because some oxides
                  are heavier than others"
                </td>
                <td>60.1 g of SiO₂ is one mole, so 67.4 g is about 1.12 moles</td>
              </tr>
              <tr>
                <th scope="row">4. Unity</th>
                <td>Everything is divided by the total of the fluxes, so the fluxes add up to 1</td>
                <td>The fluxes total 0.303; dividing gives K₂O 0.26, CaO 0.74, Al₂O₃ 0.41, SiO₂ 3.70</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Glazecalc's <a routerLink="/recipe">recipe page</a> does all four steps as you type, and shows the result in
          three columns: fluxes (R₂O and RO) adding up to 1; stabilizers (R₂O₃: alumina, with boron often placed here);
          and glass formers (RO₂: silica). "Unification is just a scaling tool," Glazy says: two recipes made from
          different materials but with the same unity formula "behave almost identically once fired". So the 1 is a
          shared yardstick, not an amount you weigh. Digitalfire adds that the method "does not work as well at lower
          temperatures", where boron is not a plain flux, and that unity formulas are "comparative and best viewed in
          context". <b>Compare</b> lines up two recipes' formulas oxide by oxide.
        </p>

        <h3>The silica to alumina ratio</h3>
        <p>
          The most useful single number is the <b>silica to alumina ratio</b>: silica divided by alumina. In the
          example, 3.70 ÷ 0.41 is about 9.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Silica to alumina ratio">
          <table class="guide-table">
            <caption>
              What the silica to alumina ratio suggests (Glazy)
            </caption>
            <thead>
              <tr>
                <th scope="col">Ratio</th>
                <th scope="col">Glazy's reading</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" class="num">About 9</th>
                <td>Suggests a glossy melt, given enough heat</td>
              </tr>
              <tr>
                <th scope="row" class="num">5–7</th>
                <td>Typical of many stable stoneware glazes</td>
              </tr>
              <tr>
                <th scope="row" class="num">3–5</th>
                <td>May be matte or underfired</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          A ratio of 5–7 predicts neither gloss nor matte on its own: the fluxes, the boron and the cone all move the
          line. Glazy gives a typical flux balance for stable glazes of 0.2 R₂O with 0.8 RO, up to 0.3 R₂O with 0.7 RO.
          More alkali makes the melt more fluid and raises its expansion, and so the risk of crazing.
        </p>

        <h3>Loss on ignition</h3>
        <p>
          <b>Loss on ignition</b> (<b>LOI</b>) is the weight a material loses in the kiln as water, carbon dioxide,
          organic matter or sulfur leave as gas. A fired glaze has none, so the unity formula leaves it out.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Loss on ignition">
          <table class="guide-table">
            <caption>
              Typical loss on ignition (Digitalfire)
            </caption>
            <thead>
              <tr>
                <th scope="col">Material</th>
                <th scope="col">Typical LOI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Whiting (calcium carbonate), dolomite</th>
                <td>Over 40%, mostly carbon dioxide: 100 g of calcium carbonate gives off about 45 g</td>
              </tr>
              <tr>
                <th scope="row">Lithium carbonate</th>
                <td>About 60%</td>
              </tr>
              <tr>
                <th scope="row">Barium carbonate, Gerstley Borate</th>
                <td>Over 20%</td>
              </tr>
              <tr>
                <th scope="row">Kaolin</th>
                <td>About 12%, mainly water bound in its crystals</td>
              </tr>
              <tr>
                <th scope="row">Feldspars</th>
                <td>Under 1%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Gas that leaves after the glaze starts to melt must bubble through it, causing, in Digitalfire's words,
          "bubbles, blisters, pinholes, crawling". Talc keeps giving off gas until about 1,650 °F (899 °C). Frits,
          <b>calcined</b> materials (heated beforehand to drive their gases off) and changes to the firing all help.
        </p>
        <p>
          Older books do this arithmetic by hand, with <b>molecular weight</b> (the weight of one mole of a material or
          oxide) and <b>equivalent weight</b> (the weight of a material that supplies one mole of an oxide). By our
          arithmetic, about 100 g of whiting supplies one mole, 56 g, of calcium oxide. A calculator handles both.
        </p>
      </section>

      <section class="panel" aria-labelledby="materials">
        <h2 id="materials" tabindex="-1">Frits and raw materials</h2>
        <h3>Frits</h3>
        <p>
          A <b>frit</b> is glass made in a factory: minerals melted, quenched in water and ground. Fritting makes
          soluble materials such as borax insoluble, locks toxic oxides such as lead and barium into a stable glass,
          gives a more consistent material than raw minerals, and drives off gases, so fritted glazes are "much more
          defect-free" (Digitalfire). Frits also melt early: a soda frit is active at cone 06, while feldspar "is only
          beginning to soften at cone 6". They cost more, they need clay to stay suspended (Digitalfire's example is 85%
          frit with 15% clay), and they are "theoretically insoluble, but in practice, they are not".
        </p>
        <p>
          North American frits go by maker and number: Ferro Frit 3134 (Ferro is now Vibrantz) is in about 22% of
          Glazy's public recipes. UK recipes more often name generic frits, such as standard borax frit.
        </p>

        <h3>The common raw materials</h3>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Common glaze materials">
          <table class="guide-table">
            <caption>
              Common glaze materials and what they supply
            </caption>
            <thead>
              <tr>
                <th scope="col">Material (other names)</th>
                <th scope="col">Supplies</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Silica (flint, quartz)</th>
                <td>SiO₂</td>
                <td>Use 325 mesh, a very fine grind, in glazes</td>
              </tr>
              <tr>
                <th scope="row">Kaolin (UK: china clay; Australia: Eckalite)</th>
                <td>Al₂O₃, SiO₂</td>
                <td>The main alumina source; also keeps glaze suspended</td>
              </tr>
              <tr>
                <th scope="row">Ball clay</th>
                <td>Al₂O₃, SiO₂</td>
                <td>More plastic than kaolin, with more iron and organic matter</td>
              </tr>
              <tr>
                <th scope="row">Potash feldspar, soda feldspar, nepheline syenite</th>
                <td>K₂O, Na₂O, Al₂O₃, SiO₂</td>
                <td>
                  Fluxes with their own alumina and silica. Nepheline syenite is a strong low- and mid-fire flux. An old
                  recipe's plain "feldspar" may mean any of them
                </td>
              </tr>
              <tr>
                <th scope="row">Whiting (calcium carbonate)</th>
                <td>CaO</td>
                <td>The main calcium flux; gives off carbon dioxide</td>
              </tr>
              <tr>
                <th scope="row">Wollastonite</th>
                <td>CaO, SiO₂</td>
                <td>Calcium without the carbon dioxide</td>
              </tr>
              <tr>
                <th scope="row">Dolomite, talc</th>
                <td>MgO, with CaO or SiO₂</td>
                <td>Silky matte surfaces; lower expansion</td>
              </tr>
              <tr>
                <th scope="row">Zinc oxide</th>
                <td>ZnO</td>
                <td>Gloss and crystals; too much can cause crawling</td>
              </tr>
              <tr>
                <th scope="row">Boron frits, Gerstley Borate, colemanite</th>
                <td>B₂O₃</td>
                <td>Essential from cone 06 to cone 6; frits are "more consistent and less soluble than raw borates"</td>
              </tr>
              <tr>
                <th scope="row">Lithium carbonate</th>
                <td>Li₂O</td>
                <td>Low-expansion flux; expensive, so used sparingly</td>
              </tr>
              <tr>
                <th scope="row">Strontium carbonate</th>
                <td>SrO</td>
                <td>The less toxic stand-in for barium</td>
              </tr>
              <tr>
                <th scope="row">Barium carbonate</th>
                <td>BaO</td>
                <td>Toxic in raw form; high-barium glazes can leach</td>
              </tr>
              <tr>
                <th scope="row">Bentonite</th>
                <td>Suspension</td>
                <td>A very fine clay, usually 1–3%, to stop settling</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="guide-warning" role="note">
          <p>
            Glaze materials are fine powders. Silica dust harms the lungs without symptoms at first, and some materials,
            such as barium carbonate and lithium carbonate, are poisonous if swallowed. Handle powders gently, clean up
            wet, and wear a fitted respirator when working dry.
            <a routerLink="/guides/safe-mixing">Safe mixing and ventilation</a> and
            <a routerLink="/guides/home-safety">Don't poison your family</a> explain how.
          </p>
        </div>

        <h3>Regional names</h3>
        <ul>
          <li><b>Kaolin</b> is <b>china clay</b> in the UK; Australian suppliers sell it as Eckalite.</li>
          <li>
            <b>Flint</b> is an older UK name for silica. UK suppliers still sell <b>calcined flint</b> as its own
            product, so "flint" in a British recipe probably means calcined flint, and in an American one probably
            ground quartz. Both are sold as sources of silica; check the analysis.
          </li>
          <li>
            <b>China stone</b> and <b>Cornish stone</b> (Cornwall stone) are the same material, related to feldspar.
          </li>
          <li><b>Whiting</b> is calcium carbonate; German suppliers call it Kreide (chalk).</li>
        </ul>
        <p class="guide-callout">
          Judge a material by the oxides it supplies, not by its name. Glazecalc works that way: you can enter your
          supplier's analysis on the <a routerLink="/material">Materials page</a>, and
          <b>Try modern materials and compare</b>, <b>Suggest amounts and compare</b> and
          <b>Match with what I have</b> all match fired oxides, not names.
        </p>
        <p>
          Materials change, too. Custer feldspar ended in 2023. The original Gerstley Borate mine closed around
          1999–2000; Laguna still sells a product under that name, and Gillespie Borate is the main substitute. Sources
          disagree on whether Gillespie replaces Gerstley Borate pound for pound (its maker and Potclays say yes,
          Digitalfire and others no), so compare the two in Glazecalc, then test a small batch.
        </p>
      </section>

      <section class="panel" aria-labelledby="color">
        <h2 id="color" tabindex="-1">Colorants and opacifiers</h2>
        <p>
          A <b>colorant</b> is a metal oxide or carbonate that colors a glaze; a <b>stain</b> is a factory-made
          colorant, more stable and consistent than raw oxides. Colorants are usually under 5% of the base, many under
          1%, and a carbonate is about half the strength of the matching oxide.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Common colorants">
          <table class="guide-table">
            <caption>
              Common colorants, as a percent of the base
            </caption>
            <thead>
              <tr>
                <th scope="col">Colorant</th>
                <th scope="col">Usual starting amount</th>
                <th scope="col">Colors and notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Cobalt</th>
                <td>0.1–2% (sources disagree)</td>
                <td>Blue, and very strong; toward purple when the base has magnesium</td>
              </tr>
              <tr>
                <th scope="row">Iron</th>
                <td>0.5–10%</td>
                <td>
                  Browns, tans and reds in oxidation; in reduction, ½–2% gives celadon and 5–6% tenmoku. A flux, so a
                  lot makes a glaze run
                </td>
              </tr>
              <tr>
                <th scope="row">Copper</th>
                <td>1–3%</td>
                <td>Green or turquoise in oxidation, red in reduction. It can make a glaze leach</td>
              </tr>
              <tr>
                <th scope="row">Chrome</th>
                <td>Under 0.5% to 2% (sources disagree)</td>
                <td>Green; brown if the base has zinc, pink with tin</td>
              </tr>
              <tr>
                <th scope="row">Manganese</th>
                <td>2–10%</td>
                <td>Browns and purples</td>
              </tr>
              <tr>
                <th scope="row">Rutile</th>
                <td>About 2–5%</td>
                <td>Mottled, variegated color; rough or matte above about 5%</td>
              </tr>
              <tr>
                <th scope="row">Commercial stains</th>
                <td>2–12%</td>
                <td>2–4% for tints, 5–8% for tones, 10–12% for strong colors</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Cobalt and chrome amounts are genuinely disputed. Glazy says 0.1% cobalt is enough for a blue; Glendale
          Community College gives ½–2% or ½–3% depending on the atmosphere; Birdie Boone, in Pottery Making Illustrated,
          says 3% or less. For chrome, Boone says under 0.5% and Glendale 2–3%. The safe course is to start low and run
          a <b>line blend</b>: a row of test tiles stepping one ingredient from a little to a lot.
        </p>
        <p>
          The base glaze changes the color. A glossy, transparent base gives the brightest color; satin and matte bases,
          usually higher in alumina, mute it. Magnesium pushes cobalt toward purple, zinc turns chrome brown, and chrome
          with tin gives pink.
        </p>

        <h3>Opacifiers</h3>
        <p>
          An <b>opacifier</b> makes a glaze <b>opaque</b>, hiding the clay; a <b>transparent</b> glaze lets it show.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Opacifiers">
          <table class="guide-table">
            <caption>
              Opacifiers
            </caption>
            <thead>
              <tr>
                <th scope="col">Opacifier</th>
                <th scope="col">Usual amount</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Zircon (Zircopax, Superpax, Ultrox, Zircosil)</th>
                <td>8–12% for full opacity</td>
                <td>The cheaper choice; the brands are the same material ground to different sizes</td>
              </tr>
              <tr>
                <th scope="row">Tin oxide</th>
                <td>About 5–7% (our estimate)</td>
                <td>Expensive; opacifies poorly in reduction</td>
              </tr>
              <tr>
                <th scope="row">Titanium dioxide</th>
                <td>Above 2%</td>
                <td>Silky, translucent opacity; at 10% or more, a matte, textured surface with visible crystals</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel" aria-labelledby="fit-and-defects">
        <h2 id="fit-and-defects" tabindex="-1">Glaze fit and defects</h2>
        <p>
          Clay and glaze both grow as they heat and shrink as they cool, each by its own amount: its
          <b>thermal expansion</b>. <b>Glaze fit</b> is how well the two match. A good fit leaves the glaze slightly
          compressed by the clay; Digitalfire says a little compression strengthens ware, while too much can weaken and
          even crack it.
        </p>

        <h3>Crazing and shivering</h3>
        <p>
          <b>Crazing</b> is a network of fine cracks. The glaze's expansion is higher than the body's, so on cooling it
          shrinks more, is stretched and cracks, usually because of too much sodium and potassium (Na₂O, K₂O). It can
          also appear later, in use, after repeated sudden cooling such as contact with cold liquids. When it is wanted,
          as in raku, it is called <b>crackle</b>. Digitalfire says "95% of the time the solution is to adjust the
          thermal expansion of the glaze"; slow cooling only delays crazing. Its test: heat the ware to about 300 °F
          (149 °C), plunge it into ice water, and rub felt pen over it to show cracks.
        </p>
        <p>
          Sources differ on the first fix. Glazy suggests adding silica or alumina; Digitalfire answers that extra
          silica "only dilutes the KNaO" (the sodium and potassium); Linda Bloomfield adds boron or cuts feldspar, one
          material at a time. Our advice: in the <a routerLink="/recipe">recipe calculator</a>, swap some sodium and
          potassium for lower-expansion fluxes (boron, lithium, magnesium, calcium), check the change with
          <b>Compare</b>, and confirm with the ice-water test.
        </p>
        <p>
          <b>Shivering</b> is the reverse: the glaze's expansion is far lower than the body's, so it is over-compressed
          and flakes off rims and edges. Digitalfire warns that the flakes can be razor-sharp and could be swallowed,
          and Glazy calls shivering "even more hazardous than crazing on functional ware". The fix is a higher-expansion
          glaze or a lower-expansion body.
        </p>
        <div class="guide-warning" role="note">
          <p>
            Do not use crazed or shivered ware for food or drink. Sources disagree on whether crazed pots can be cleaned
            well enough (one says a dishwasher will do; another calls crazed functional ware defective), so we take the
            cautious side.
          </p>
        </div>

        <h3>Gloss and matte</h3>
        <p>
          A <b>gloss</b> surface is reflective and smooth, <b>satin</b> has a subdued sheen, and <b>matte</b> is dull.
          Gloss needs a fully melted glass. Matte can come from a lot of alumina (a low silica to alumina ratio), from
          fluxes such as calcium, magnesium, barium or strontium forming tiny crystals as the glaze cools, or from
          underfiring.
        </p>

        <h3>Common defects</h3>
        <p>Change one thing at a time, and keep your test tiles.</p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Common glaze defects">
          <table class="guide-table">
            <caption>
              Common glaze defects, their usual causes and first fixes
            </caption>
            <thead>
              <tr>
                <th scope="col">Defect</th>
                <th scope="col">Looks like</th>
                <th scope="col">Common causes</th>
                <th scope="col">First fixes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Crawling</th>
                <td>Glaze pulls back into beads, leaving bare clay</td>
                <td>Dusty or greasy bisque; a thick, clay-rich coat that cracked drying; zinc, zircon or tin</td>
                <td>Clean the bisque; coat thinner; calcine some of the clay; add a binder such as CMC gum</td>
              </tr>
              <tr>
                <th scope="row">Pinholing</th>
                <td>Small holes or pits</td>
                <td>Gas from body or glaze that did not heal over; an underfired or stiff glaze</td>
                <td>Hold at top temperature for about half an hour; coat thinner; less zinc or rutile</td>
              </tr>
              <tr>
                <th scope="row">Blistering</th>
                <td>Sharp-edged craters</td>
                <td>Usually overfiring; very thick coats; volatile fluxes above about 2,192 °F (1,200 °C)</td>
                <td>Fire lower; coat thinner. Sharp edges make functional ware unsafe</td>
              </tr>
              <tr>
                <th scope="row">Running</th>
                <td>Glaze flows onto the shelf</td>
                <td>Too little alumina; too thick, as where pours overlap; a lot of iron</td>
                <td>Coat thinner; add alumina; keep glaze well above the foot</td>
              </tr>
              <tr>
                <th scope="row">Dunting</th>
                <td>Cracks in the pot from cooling or heating</td>
                <td>Fast cooling through quartz inversion, 1,063 °F (573 °C); uneven walls; poor fit</td>
                <td>Fire slowly through 1,063 °F (573 °C), up and down; even walls</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel" aria-labelledby="food-safety">
        <h2 id="food-safety" tabindex="-1">Food safety</h2>
        <p>
          <b>Leaching</b> is metal dissolving out of a fired glaze into food or drink, and a glaze can look perfect and
          still do it. The legal tests soak the fired piece in an acid solution and measure the lead and cadmium that
          come out.
        </p>

        <h3>Lead-free is not the same as food-safe</h3>
        <p>
          The rules in the US, EU, UK, Australia and New Zealand limit the lead and cadmium a fired piece releases, not
          what the glaze contains. "Lead-free" removes one hazard; it is not a food-safety rating. Other oxides leach
          too: Glazy warns that high-barium glazes "can leach and are generally not food-safe", Digitalfire says copper
          "can make a glaze leachable; test it", and Glazy no longer advises lead glazes for functional ware.
        </p>
        <p>
          A <b>liner glaze</b> is a stable, usually clear or white glaze for surfaces that touch food. In our view, one
          with no colorant, barium, lead or lithium, that melts fully, does not craze and wears well, is the lower-risk
          choice. Lower risk is not proof.
        </p>
        <p>
          <b>Limit formulas</b> (Digitalfire prefers <b>target formulas</b>) give typical unity-formula ranges for
          stable glazes at a cone: Digitalfire's cone 6 targets put alumina at 0.285–0.64 and silica at 2.4–4.7. They
          guide you toward sound chemistry but prove nothing; Digitalfire avoids the word "limit" because it suggests
          glazes inside the ranges "are somehow safe". Glazecalc's tools for changing a recipe say when the new one goes
          past a recommended limit, such as a lot of boron at cone 6, and what the glaze will likely do.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="FDA lead limits">
          <table class="guide-table">
            <caption>
              US FDA limits for lead released by pottery (CPG Sec. 545.450), in micrograms per milliliter of test
              solution
            </caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Lead (µg/mL)</th>
                <th scope="col">Judged on</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Flatware (no deeper than 25 mm)</th>
                <td class="num">3.0</td>
                <td>Average of 6 pieces</td>
              </tr>
              <tr>
                <th scope="row">Small hollowware (under 1.1 L)</th>
                <td class="num">2.0</td>
                <td>Any one of 6</td>
              </tr>
              <tr>
                <th scope="row">Large hollowware (1.1 L or more)</th>
                <td class="num">1.0</td>
                <td>Any one of 6</td>
              </tr>
              <tr>
                <th scope="row">Cups, mugs and pitchers</th>
                <td class="num">0.5</td>
                <td>Any one of 6</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          In the US, ware not meant for food must carry a permanent, fired-on "Not for Food Use" notice or have a hole
          through the food surface. The EU sets lead and cadmium limits in Directive 84/500/EEC, which England keeps in
          its own law. The Netherlands and Luxembourg cut their lead limits roughly 130–150 times from 29 May 2026, with
          Belgium following. Australia and New Zealand use AS 4371, whose figures are behind a paywall.
        </p>

        <h3>Testing</h3>
        <p>
          The FDA says home swab kits can show leachable lead, but Ceramics New Zealand warns that test pens are not
          designed for ceramics and give false positives. Treat a positive as a reason to stop using the piece, and a
          negative as proving nothing. A laboratory leach test of the fired piece (ASTM C738 in the US; EN 1388 or ISO
          6486 in Europe) is the real answer.
        </p>
        <div class="guide-warning" role="note">
          <p>
            "Food safe" means this glaze, on this clay, fired to this cone in this kiln and applied this way, releases
            less than the legal limits. Glazecalc can help you build a stable glaze, and <b>Replace lead</b> can rebuild
            an old lead recipe without lead, but no calculator can certify a pot. Only a test of the fired piece can.
          </p>
        </div>
      </section>

      <section class="panel" aria-labelledby="application">
        <h2 id="application" tabindex="-1">Specific gravity and application</h2>
        <h3>Specific gravity</h3>
        <p>
          Glaze powder mixed with water is a <b>slurry</b>. Its <b>specific gravity</b> (<b>SG</b>) is its weight
          compared with the same volume of water, which has an SG of 1.0: the higher it is, the more powder in the
          bucket. Older UK books say <b>pint weight</b>. Glazy calls 1.4–1.5 "a good starting point for most glazes". To
          measure it, weigh exactly 100 mL of slurry (Glazy suggests a syringe) and divide by 100: 145 g means SG 1.45.
          Hydrometers are unreliable in gelled glazes, and water evaporates, so check again before you glaze.
        </p>
        <p>
          Targets differ by source. Digitalfire puts dipping glazes at 1.40–1.50 and commercial brushing glazes at
          1.25–1.55, while Potclays gives 1.71–1.81 for brushing and 1.71 for spraying. Our advice: dip at about 1.45
          with the glaze slightly gelled, follow the label for a brushing glaze, and write down what works.
        </p>
        <p>
          A <b>flocculant</b> (Epsom salts, vinegar or calcium chloride) gels a slurry slightly, making it
          <b>thixotropic</b>: it flows when stirred and sets when still, for "even, drip-free glaze coverage". A
          <b>deflocculant</b> (sodium silicate or Darvan) thins it.
          <a routerLink="/guides/making-a-glaze">How to make a glaze</a> covers mixing and adjusting.
        </p>

        <h3>Putting glaze on</h3>
        <p>
          Clean dust and grease off the bisque first. Digitalfire prefers compressed air, a soft brush or a barely damp
          sponge to washing.
        </p>
        <ul>
          <li>
            <b>Dipping</b> "generally gives a coating of even thickness" (Robin Hopper). The dip time sets the
            thickness: Digitalfire notes that commercial dipping glazes are made at about 1.4 for a 5-second dip and 1.5
            for a 1-second dip.
          </li>
          <li>
            <b>Pouring</b> glaze should be "a little thinner than when used for dipping"; where pours overlap, the coat
            doubles and may run.
          </li>
          <li>
            <b>Brushing</b> glazes contain a gum such as <b>CMC gum</b>, which helps the glaze flow and stick, then
            burns away. Most need several coats, often two or three; follow the label.
          </li>
          <li>
            <b>Spraying</b> uses a much thinner glaze, put on in "several thin coatings, gradually building up the
            thickness".
          </li>
        </ul>
        <div class="guide-warning" role="note">
          <p>
            Spray only in a ventilated spray booth, wearing a properly fitted respirator. See
            <a routerLink="/guides/safe-mixing">Safe mixing and ventilation</a>.
          </p>
        </div>
        <p>
          Too thick a coat can crawl, blister or run. Suppliers' rules of thumb run from the thickness of a credit card
          to that of a US dime, by our estimate about 1 mm of dry glaze; test tiles at a few thicknesses are the
          reliable check. <b>Wax resist</b> on the foot repels glaze, so the pot cannot stick to the shelf, and
          <b>kiln wash</b>, a heat-resisting coating often of kaolin and silica, protects shelves from drips.
        </p>
      </section>

      <section class="panel" aria-labelledby="atmosphere">
        <h2 id="atmosphere" tabindex="-1">Oxidation and reduction</h2>
        <p>
          The gases in the kiln, its <b>atmosphere</b>, change how glazes come out. <b>Oxidation</b> means plenty of
          oxygen. "Electric kilns are synonymous with oxidation firing," Digitalfire says, and oxidation glazes are
          typically brighter than reduction ones, especially at lower temperatures. In oxidation, copper gives greens
          and turquoise, and iron browns, tans and reds. A poorly vented electric kiln full of ware giving off gases can
          run more neutral than intended; a vent connected directly to the kiln helps.
        </p>
        <p>
          <b>Reduction</b> deliberately restricts the oxygen, usually in a gas, wood or specialized kiln. Copper turns
          red, and iron becomes a stronger flux and gives <b>celadon</b> (blue-green to gray-green, from about ½–2%
          iron) and <b>tenmoku</b> (temmoku: brown-black, about 5–6% iron). Glazy says celadons and copper reds "rely on
          reduction". The clay changes too: in one Digitalfire comparison, a stoneware body fired gray in reduction and
          yellowish in oxidation. Silicon carbide in a glaze can make small areas of reduction even in an electric kiln.
          For reduction from cone 010 to cone 3, Orton recommends its iron-free cones.
        </p>
        <p class="guide-callout">
          Expect a recipe written for a gas reduction kiln to come out differently in an electric kiln: a celadon or
          copper red that relies on reduction will not look the same in oxidation. Check which atmosphere a recipe was
          made for, and note your own, with the cone, in the recipe's notes in Glazecalc.
        </p>
        <p>
          Every kiln, electric ones included, gives off fumes, so vent it.
          <a routerLink="/guides/safe-mixing">Safe mixing and ventilation</a> explains how.
        </p>
      </section>

      <section class="panel" aria-labelledby="glossary">
        <h2 id="glossary" tabindex="-1">Glossary</h2>
        <dl>
          <dt>Additive</dt>
          <dd>A colorant, opacifier or suspender added on top of a recipe's 100.</dd>
          <dt>Alumina (Al₂O₃)</dt>
          <dd>The main stabilizer: stops running and adds hardness. From clays and feldspars.</dd>
          <dt>Ball clay</dt>
          <dd>A plastic clay with more iron and organic matter than kaolin.</dd>
          <dt>Batch recipe</dt>
          <dd>A glaze's raw materials by weight, usually adding up to 100.</dd>
          <dt>Bentonite</dt>
          <dd>A very fine clay added at 1–3% to keep glaze from settling.</dd>
          <dt>Bisque (UK: biscuit)</dt>
          <dd>The first, lower firing, usually cone 08–04, leaving ware strong but porous.</dd>
          <dt>Boron (B₂O₃)</dt>
          <dd>Formally a glass former but used as a flux; essential from cone 06 to cone 6.</dd>
          <dt>CMC gum</dt>
          <dd>A cellulose gum that helps glaze brush on and stick; it burns away.</dd>
          <dt>Colorant and stain</dt>
          <dd>A metal oxide or carbonate that colors glaze; a stain is a factory-made, more stable colorant.</dd>
          <dt>Cone</dt>
          <dd>
            A calibrated ceramic pyramid that bends at a set heatwork. A witness cone shows what the pots received.
          </dd>
          <dt>Crawling</dt>
          <dd>Glaze pulling back into beads in firing, leaving bare clay.</dd>
          <dt>Crazing</dt>
          <dd>Fine cracks in a glaze that shrinks more than its body; crackle when wanted.</dd>
          <dt>Devitrification</dt>
          <dd>Crystals growing out of the glass early in cooling, where they are not wanted.</dd>
          <dt>Dunting</dt>
          <dd>Cracks in a pot from cooling or heating stress, often at quartz inversion, 1,063 °F (573 °C).</dd>
          <dt>Earthenware</dt>
          <dd>A low-fire body (about cone 06–02) that stays porous.</dd>
          <dt>Feldspar</dt>
          <dd>A mineral supplying alkali flux with alumina and silica: potash, soda or nepheline syenite.</dd>
          <dt>Flocculant and deflocculant</dt>
          <dd>Additives that gel a slurry (Epsom salts, vinegar) or thin it (sodium silicate, Darvan).</dd>
          <dt>Flux</dt>
          <dd>An oxide that lowers the melting temperature of silica.</dd>
          <dt>Food safe</dt>
          <dd>In law, releasing less lead and cadmium than the limits in an acid test. Not the same as lead-free.</dd>
          <dt>Frit</dt>
          <dd>Factory-made glass, melted, quenched and ground, that makes soluble or toxic oxides insoluble.</dd>
          <dt>Glass former</dt>
          <dd>The oxide that builds the glass, usually silica.</dd>
          <dt>Glaze</dt>
          <dd>A coat of glass that melts in firing to seal and decorate a pot.</dd>
          <dt>Glaze firing (UK: glost firing)</dt>
          <dd>The firing that melts the glaze.</dd>
          <dt>Glaze fit</dt>
          <dd>How well glaze and body expansion match; a good fit leaves the glaze slightly compressed.</dd>
          <dt>Gloss, satin and matte</dt>
          <dd>Reflective and smooth; a subdued sheen; dull.</dd>
          <dt>Greenware</dt>
          <dd>Unfired ware: leather-hard when stiff but damp, bone dry when no free water is left.</dd>
          <dt>Heatwork</dt>
          <dd>The combined effect of temperature and time in a kiln; what cones measure.</dd>
          <dt>Kaolin (UK: china clay)</dt>
          <dd>A pure white clay supplying alumina and silica; keeps glaze suspended. Australia: Eckalite.</dd>
          <dt>Kiln wash</dt>
          <dd>A heat-resisting coating that protects kiln shelves from drips.</dd>
          <dt>Leaching</dt>
          <dd>Metals dissolving out of a fired glaze into food or drink.</dd>
          <dt>Limit formula (target formula)</dt>
          <dd>Typical unity-formula ranges for stable glazes at a cone; a guide, not a guarantee.</dd>
          <dt>Line blend</dt>
          <dd>Tests stepping one ingredient between two amounts. A triaxial blend varies three on a grid.</dd>
          <dt>Liner glaze</dt>
          <dd>A stable, usually clear or white glaze for surfaces that touch food.</dd>
          <dt>LOI (loss on ignition)</dt>
          <dd>Weight lost in firing as water, carbon dioxide, organic matter or sulfur.</dd>
          <dt>Once-firing (single firing)</dt>
          <dd>Glazing unfired ware and firing it only once.</dd>
          <dt>Opacifier</dt>
          <dd>A material, such as zircon, tin oxide or titanium dioxide, that makes glaze opaque.</dd>
          <dt>Oxidation and reduction</dt>
          <dd>Firing with plenty of oxygen (electric kilns), or with oxygen restricted (usually gas or wood).</dd>
          <dt>Oxide</dt>
          <dd>A compound of an element with oxygen; an oxide analysis lists them by weight percent.</dd>
          <dt>Pinholing and blistering</dt>
          <dd>Small holes, or sharp-edged craters, where gas escaped through the melt.</dd>
          <dt>Porcelain</dt>
          <dd>A white, kaolin-rich, high-fire body, often translucent.</dd>
          <dt>R₂O and RO</dt>
          <dd>The alkali fluxes (Na₂O, K₂O, Li₂O) and alkaline-earth fluxes (CaO, MgO, BaO, SrO, with ZnO).</dd>
          <dt>Shivering</dt>
          <dd>Glaze flaking off edges because it is over-compressed; a hazard on functional ware.</dd>
          <dt>Silica (SiO₂)</dt>
          <dd>The glass former; also called flint or quartz.</dd>
          <dt>Silica to alumina ratio</dt>
          <dd>Silica divided by alumina in the unity formula: higher tends to gloss, lower to matte.</dd>
          <dt>Slip and engobe</dt>
          <dd>Clay in water; an engobe is a slip-like coating with more non-clay material.</dd>
          <dt>Specific gravity (SG)</dt>
          <dd>A slurry's weight compared with the same volume of water. Older UK: pint weight.</dd>
          <dt>Stabilizer</dt>
          <dd>An oxide, mainly alumina, that stiffens the melt and adds durability.</dd>
          <dt>Stoneware</dt>
          <dd>A mid- to high-fire body (about cone 5–10) that becomes vitreous or nearly so.</dd>
          <dt>Thixotropy</dt>
          <dd>Flowing when stirred, setting into a soft gel when still.</dd>
          <dt>Underglaze</dt>
          <dd>Colored slip or oxide decoration, usually under a clear glaze.</dd>
          <dt>Unity molecular formula (UMF, Seger formula)</dt>
          <dd>A glaze's oxides as molecule counts, scaled so the fluxes add up to 1.</dd>
          <dt>Vitrification</dt>
          <dd>A body becoming glassy and non-porous in firing.</dd>
          <dt>Wax resist</dt>
          <dd>Wax painted where glaze must not go, usually the foot.</dd>
          <dt>Whiting</dt>
          <dd>Calcium carbonate, the main calcium flux; loses over 40% of its weight in firing. German: Kreide.</dd>
        </dl>
      </section>

      <section class="panel" aria-labelledby="sources">
        <h2 id="sources" tabindex="-1">Sources</h2>
        <ul class="guide-sources">
          <li><a href="https://help.glazy.org/concepts/glaze">Glazy Help: Glaze</a></li>
          <li><a href="https://help.glazy.org/concepts/oxides">Glazy Help: Oxides</a></li>
          <li><a href="https://help.glazy.org/concepts/materials">Glazy Help: Raw materials</a></li>
          <li><a href="https://help.glazy.org/concepts/glossary">Glazy Help: Glossary</a></li>
          <li><a href="https://help.glazy.org/concepts/analyses">Glazy Help: Analyses</a></li>
          <li><a href="https://help.glazy.org/concepts/firing">Glazy Help: Firing</a></li>
          <li><a href="https://help.glazy.org/concepts/defects">Glazy Help: Defects</a></li>
          <li><a href="https://help.glazy.org/testing/specific-gravity">Glazy Help: Specific gravity</a></li>
          <li>
            <a href="https://www.theceramicshop.com/technical_info/Cones/Orton-Cone-Chart-F-022-14.pdf"
              >Orton Ceramic Foundation: Pyrometric cone chart, °F (via The Ceramic Shop)</a
            >
          </li>
          <li><a href="https://digitalfire.com/glossary/bisque">Digitalfire: Bisque</a></li>
          <li>
            <a href="https://digitalfire.com/glossary/unity+molecular+formula">Digitalfire: Unity molecular formula</a>
          </li>
          <li><a href="https://digitalfire.com/glossary/loi">Digitalfire: LOI</a></li>
          <li><a href="https://digitalfire.com/glossary/frit">Digitalfire: Frit</a></li>
          <li><a href="https://digitalfire.com/glossary/limit+formula">Digitalfire: Limit formula</a></li>
          <li><a href="https://digitalfire.com/glossary/glaze+crazing">Digitalfire: Glaze crazing</a></li>
          <li><a href="https://digitalfire.com/glossary/glaze+shivering">Digitalfire: Glaze shivering</a></li>
          <li><a href="https://digitalfire.com/glossary/specific+gravity">Digitalfire: Specific gravity</a></li>
          <li><a href="https://digitalfire.com/glossary/oxidation+firing">Digitalfire: Oxidation firing</a></li>
          <li>
            <a href="https://ceramicartsnetwork.org/daily/article/common-glaze-faults-and-how-to-correct-them"
              >Ceramic Arts Network: Common glaze faults and how to correct them (Linda Bloomfield)</a
            >
          </li>
          <li>
            <a
              href="https://ceramicartsnetwork.org/pottery-making-illustrated/pottery-making-illustrated-article/An-Introduction-to-Color"
              >Ceramic Arts Network: An introduction to color (Birdie Boone)</a
            >
          </li>
          <li>
            <a
              href="https://ceramicartsnetwork.org/pottery-making-illustrated/pottery-making-illustrated-article/8-Ways-to-Apply-Glaze"
              >Ceramic Arts Network: 8 ways to apply glaze (Robin Hopper)</a
            >
          </li>
          <li>
            <a href="https://gcc.glendale.edu/ceramics/glazecolor.html">Glendale Community College: Glaze color</a>
          </li>
          <li>
            <a href="https://www.potclays.co.uk/clay-questions/difference-stoneware-earthenware"
              >Potclays: The difference between stoneware and earthenware</a
            >
          </li>
          <li>
            <a href="https://www.fda.gov/media/71764/download"
              >US FDA: Compliance Policy Guide Sec. 545.450, Pottery (ceramics), lead contamination</a
            >
          </li>
          <li>
            <a href="https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:31984L0500"
              >EUR-Lex: Council Directive 84/500/EEC on ceramic articles in contact with food</a
            >
          </li>
        </ul>
      </section>
    </div>
  `
})
export class GlazingBasicsGuide {
  protected readonly sections = SECTIONS;
}
