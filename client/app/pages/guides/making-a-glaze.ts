import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/page-header';
import { GuideContents, GuideSection } from './guide-contents';

/** The guide's sections, for its contents list and their headings' ids. */
const SECTIONS: GuideSection[] = [
  { id: 'before-you-start', label: 'Before you start' },
  { id: 'buying-materials', label: 'Buying materials' },
  { id: 'storing', label: 'Storing materials and glazes' },
  { id: 'weighing', label: 'Weighing' },
  { id: 'mixing', label: 'Mixing and sieving' },
  { id: 'specific-gravity', label: 'Specific gravity' },
  { id: 'testing', label: 'Test tiles and line blends' },
  { id: 'records', label: 'Keeping records' },
  { id: 'sources', label: 'Sources' }
];

/** How to make a glaze: buying, storing, weighing, mixing, testing and recording. */
@Component({
  selector: 'gc-making-a-glaze-guide',
  imports: [GuideContents, PageHeader, RouterLink],
  template: `
    <gc-page-header
      title="How to make a glaze"
      lead="How to buy, store, weigh and mix a glaze, get its thickness right, test it on your own clay, and write down enough to make it again."
    />
    <gc-guide-contents [sections]="sections" />
    <div class="guide">
      <section class="panel" aria-labelledby="before-you-start">
        <h2 id="before-you-start" tabindex="-1">Before you start</h2>
        <p>
          Making a glaze means weighing powdered <b>raw materials</b> (ground minerals, clays and <b>frits</b>, which
          are glass made in a factory and ground to powder) from a recipe, and mixing them with water into a
          <b>slurry</b>, a thick liquid of powder held in water. Then you sieve it, adjust its thickness, and test it on
          your own clay before you trust it on a pot. Every number in this guide is a starting point: the right water,
          thickness and sieve for your glaze are the ones your tests show, so write down what you do and what you get.
        </p>
        <h3>What you need</h3>
        <ul>
          <li><b>A scale</b> that reads to 0.01 g for tests and colorants, and a larger one for kilogram batches.</li>
          <li>
            <b>Containers with lids</b>: low ones for dry materials, buckets for glaze. Derek Au keeps test glazes in
            lidded soup containers.
          </li>
          <li><b>A clean scoop for each material</b>, so one powder never carries into another.</li>
          <li>
            <b>A mixing tool</b>: a drill with a mixing paddle, or for small tests a blender kept only for glaze. A
            whisk will do if you have nothing else.
          </li>
          <li>
            <b>Sieves</b>, sold in the UK as sieves and <b>lawns</b>: 80 mesh, plus 100 or 120 mesh for glazes with
            colorants.
          </li>
          <li><b>A 100 mL graduated cylinder or syringe</b>, for measuring specific gravity.</li>
          <li>
            <b>Labels, a waterproof marker and a notebook</b>, or Glazecalc's <a routerLink="/notes">notes</a> and
            <a routerLink="/firing">firing logs</a>.
          </li>
          <li><b>Test tiles</b> made from the clay you will glaze.</li>
          <li><b>A respirator, rubber gloves, a sponge and a mop.</b></li>
        </ul>
        <div class="guide-warning" role="note">
          <p>
            <b>Dry glaze powder is a dust hazard.</b> Crystalline silica can make up 10 to 60% of a dry glaze, and the
            UK's Health and Safety Executive (HSE) warns that its dust is invisible in normal light. Scoop gently from a
            low height, keep lids on, wet the powder as soon as you can, and clean up wet, never with a broom. Wear a
            fitted respirator while powders are dry (N95 or P100 in the US, FFP2 or FFP3 in the UK and EU, P2 or P3 in
            Australia and New Zealand). The <a routerLink="/guides/safe-mixing">safe mixing guide</a> covers dust,
            respirators and cleaning in full.
          </p>
        </div>
      </section>

      <section class="panel" aria-labelledby="buying-materials">
        <h2 id="buying-materials" tabindex="-1">Buying materials</h2>
        <h3>Where to buy</h3>
        <p>
          Potters buy from ceramic suppliers, which sell clay, glaze materials and tools. The table lists some confirmed
          in the research for this guide. Stock changes, so check before you order. The ceramics reference site
          Digitalfire keeps a directory of supplier stores for other places.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Suppliers by region">
          <table class="guide-table">
            <caption>
              Some suppliers of glaze materials, by region
            </caption>
            <thead>
              <tr>
                <th scope="col">Region</th>
                <th scope="col">Suppliers</th>
                <th scope="col">Pack sizes seen</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">US</th>
                <td>Laguna Clay; Clay Art Center; The Ceramic Shop; New Mexico Clay; Seattle Pottery Supply</td>
                <td>50 lb (22.7 kg)</td>
              </tr>
              <tr>
                <th scope="row">UK</th>
                <td>Potterycrafts; Bath Potters; Potclays; Valentine Clays</td>
                <td>1, 5 and 25 kg</td>
              </tr>
              <tr>
                <th scope="row">EU</th>
                <td>Mondré &amp; Manz (Germany); Goerg &amp; Schneider (Germany, mainly clays); Ceradel (France)</td>
                <td>Ask the supplier</td>
              </tr>
              <tr>
                <th scope="row">Australia</th>
                <td>
                  Walker Ceramics (trading as Ozclay, with Feeneys and Cesco); Northcote Pottery Supplies, through
                  Bunnings; Oxerra for frits and stains
                </td>
                <td>10 to 25 kg</td>
              </tr>
              <tr>
                <th scope="row">New Zealand</th>
                <td>CCG; Decopot</td>
                <td>2.5, 5 and 25 kg</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3>How much to buy</h3>
        <p>
          The standard sack is <b>50 lb (22.7 kg)</b> in the US and <b>25 kg (55 lb)</b> elsewhere, so the two are
          nearly the same. Many suppliers also sell 1, 2.5 or 5 kg packs (about 2.2, 5.5 or 11 lb) for tests. Glazy, the
          open recipe database, advises buying the materials you use steadily (feldspar, silica, kaolin, whiting, and
          frit for mid-fire) in full sacks, which are often 20 to 30% cheaper. Buy <b>colorants</b>, the metal oxides
          and stains that color a glaze, in small amounts: most are used at under 5%. Glazy's sample shopping lists came
          to about $515 for mid-fire and $397 for high-fire, at US prices.
        </p>
        <h3>A starter set</h3>
        <p>
          Glazy's core list for any temperature is silica, kaolin, feldspar, whiting, zinc oxide, and dolomite or talc.
          Most mid-fire (cone 5 to 6) glazes also need boron, usually from a frit, which Glazy calls "consistent and
          less soluble than raw borates". The set below is our suggestion, drawn from Glazy's list and a forum list. The
          <a routerLink="/guides/glazing-basics">glazing basics guide</a> explains what each material does.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Starter set">
          <table class="guide-table">
            <caption>
              A starter set of materials (our suggestion)
            </caption>
            <thead>
              <tr>
                <th scope="col">Material</th>
                <th scope="col">What to buy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Silica (also called flint; see below)</th>
                <td>325 mesh, the finer grade Glazy prefers for glazes</td>
              </tr>
              <tr>
                <th scope="row">Kaolin (china clay in the UK)</th>
                <td>EPK in the US; Grolleg or another china clay in the UK; NZ kaolin in New Zealand</td>
              </tr>
              <tr>
                <th scope="row">Potash feldspar</th>
                <td>Whichever is current where you live, such as Mahavir in the US</td>
              </tr>
              <tr>
                <th scope="row">Nepheline syenite</th>
                <td>Any; Glazy notes its stronger fluxing power, often used at low and mid-fire</td>
              </tr>
              <tr>
                <th scope="row">Whiting</th>
                <td>Any</td>
              </tr>
              <tr>
                <th scope="row">Talc</th>
                <td>Any</td>
              </tr>
              <tr>
                <th scope="row">A boron frit, for mid-fire</th>
                <td>Ferro 3134, 3124 or 3195; in the UK, Potterycrafts P3124 or P3195</td>
              </tr>
              <tr>
                <th scope="row">Bentonite and colorants</th>
                <td>Small amounts</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3>Data sheets and safety data sheets</h3>
        <p>
          Ask for two documents for each material. A <b>technical data sheet</b> (TDS) gives its
          <b>chemical analysis</b>: the share of each oxide in the powder, by weight. Glazecalc works from these, and
          you can add a material from a supplier's analysis on the <a routerLink="/material">Materials page</a>. A
          <b>safety data sheet</b> (SDS) says how to handle the raw powder. Keep each SDS, and read it before you mix.
        </p>
        <p>
          Analyses are averages, not promises. Valentine Clays prints "MEAN VALUES. THESE DO NOT REPRESENT A
          SPECIFICATION" on its flint data sheet, and Glazy's analyses of Custer feldspar from different years run from
          about 68.5% to 72.4% silica. We suggest writing each sack's <b>lot number</b> (its batch code) in your
          records, so you can tell whether a change in a trusted glaze came from the material.
        </p>
        <p>
          HSE warns that crystalline silica "can be wrongly labelled as 'amorphous silica'". And an SDS is about the
          powder, not the pot: it says nothing about whether a fired glaze is safe for food. Only a laboratory leach
          test of the fired pot can show that.
        </p>
        <h3>Names change, so buy by chemistry</h3>
        <p>
          Brand names come and go as mines close. Custer feldspar, mined in South Dakota for more than 75 years, ran out
          in late 2023. When Clay Art Center switched to G-200 AU and Mahavir, about half its glazes needed adjusting.
          G-200 and G-200 HP are gone too, and Laguna now imports Mahavir, whose chemistry is close to G-200.
        </p>
        <p>
          <b>Gerstley Borate</b>, a natural boron mineral in many older recipes, has been scarce since its mine closed
          in 2000, though New Mexico Clay reported in November 2025 that Laguna was supplying "Gerstley Borate
          Original". Sources disagree about <b>Gillespie Borate</b> as a replacement. Its maker sells it as
          pound-for-pound. Berkeley Potters Studio says it "is not a direct substitute", and Digitalfire found it
          changed a glaze's color. The safe course is to compare the two by their oxides, then test.
        </p>
        <p>
          Regional names differ too. In North America, <b>flint</b>, quartz and silica mean the same ground silica, and
          Digitalfire says you probably won't find true flint powder from suppliers. In the UK, flint is its own
          product: Valentine's is calcined (heated) silica. Both are nearly pure silica, so we expect them to be close,
          but check the analysis. For kaolin, Glazy says one-for-one swaps, such as EPK for a china clay, "often work
          just fine, especially when amounts are &lt;10%".
        </p>
        <p class="guide-callout">
          Glazecalc compares materials by what they bring to the fired glaze, not by name. A
          <a routerLink="/recipe">recipe</a> with a material no longer made says what is used now.
          <b>Suggest amounts and compare</b> works the amounts out again for a substitute, and
          <b>Match with what I have</b> makes the recipe again from the materials on your shelf. Both match the fired
          oxides only, so test a small batch first.
        </p>
      </section>

      <section class="panel" aria-labelledby="storing">
        <h2 id="storing" tabindex="-1">Storing materials and glazes</h2>
        <h3>Dry materials</h3>
        <p>
          Keep powders dry, in lidded containers that stay closed when you are not scooping; Glazy advises airtight
          ones. Choose low containers over deep bins: HSE notes that a deep bin makes you lean in, and dust has further
          to fall. Keep them on a shelf, so you can mop underneath. Soda ash and Cornish stone take up moisture from the
          air. One forum potter dries them on a baking sheet at about 50 °C (122 °F), and warns that thin paint buckets
          can crack in a freezing garage. We suggest keeping soluble materials (soda ash, borax, lithium carbonate, and
          raw borates such as Gerstley Borate) airtight and indoors.
        </p>
        <h3>Mixed glazes</h3>
        <p>
          A glaze in a bucket keeps changing. Slightly soluble materials (nepheline syenite, lithium carbonate, Gerstley
          Borate, colemanite, strontium carbonate, and frits in general) change how it flows over time and can grow
          small crystals, more so in a hot room. Gerstley Borate gels a slurry, "even in smaller percentages". Brownish
          water on a settled glaze is dissolved iron: pour it off and replace it with clean water. Also expect:
        </p>
        <ul>
          <li>
            <b>Hard-panning</b>: a glaze mixed thick enough to need no additives often settles into a hard layer.
            Thinning and gelling it helps (see Specific gravity).
          </li>
          <li>
            <b>Smells</b>, from microbes feeding on gums such as CMC. A smelly glaze can still be used if it applies
            well.
          </li>
          <li>
            <b>Freezing</b>: keep buckets from it. Thaw a frozen one at room temperature, and check it for cracks.
          </li>
        </ul>
        <p>
          Don't pour used glaze back into the stock bucket, or dip brushes into it. Before using a stored glaze, stir
          it, measure its specific gravity again, and sieve it if it has lumps or crystals.
        </p>
        <h3>Labels</h3>
        <p>
          Label every bucket with a waterproof marker. Zakin, writing for Ceramic Arts Network, gives the glaze's name,
          its full recipe including colorants, the cone, the date and, in a shared studio, your initials. We suggest
          adding the target specific gravity and any Epsom salts or CMC. UT Austin color-codes too: orange buckets for
          low-fire, white for mid-fire. Treat a glaze with no label as one that might contain lead, and don't use it on
          pots for food.
        </p>
      </section>

      <section class="panel" aria-labelledby="weighing">
        <h2 id="weighing" tabindex="-1">Weighing</h2>
        <h3>Percentages and batches</h3>
        <p>
          A recipe gives each material as a percentage of the dry weight. The main materials usually add up to 100, with
          colorants often added on top. To make a <b>batch</b>, the amount you mix at once, multiply every number by the
          batch size divided by 100. For 5000 g, UT Austin multiplies by 50, so a material at 4% becomes 200 g.
        </p>
        <p class="guide-callout">
          On a <a routerLink="/recipe">recipe page</a>, <b>Scale to a batch</b> does the multiplying: enter 500 g, say,
          and every amount becomes grams to weigh, or pounds and ounces if you choose them under Settings.
          <b>Print</b> can give just a batch list, with a running total for weighing into one bucket and a box to tick
          beside each material.
        </p>
        <h3>Choose a scale for your smallest amount</h3>
        <p>
          A scale's <b>resolution</b>, the smallest step it shows, limits how small an amount you can weigh well. In a
          100 g test, a colorant at 0.5% is 0.5 g. A scale that reads to 0.1 g may be off by 0.05 g, about 10% of it;
          for 0.15 g, the error is about a third. That is our arithmetic, but it shows why colorants need a finer scale.
        </p>
        <p>
          Advice differs on how fine a scale you need. Derek Au found a cheap 200 g digital scale consistently
          inaccurate. He recommends a 200 g scale reading to 0.01 g if you buy only one, and rates a good triple-beam
          balance as "much more trustworthy than a cheap digital scale". The safe choice, in our view, is 0.01 g for
          tests (50 to 200 g) and colorants, and a bench scale reading to 0.1 g or 1 g for batches of 1 kg (about 2 lb)
          and up. Check both now and then with a calibration weight.
        </p>
        <h3>Weigh in order, and tick each one off</h3>
        <ol>
          <li>Check that you have enough of every material.</li>
          <li>Put on your respirator. Check that the scale is clean and level.</li>
          <li>
            Put the empty container on the scale and press <b>tare</b>, which sets the reading to zero so you weigh only
            what you add.
          </li>
          <li>
            Weigh each material in turn with its own clean scoop, close each container before you open the next, and
            tick each material off as soon as it is in.
          </li>
        </ol>
        <p>
          Derek Au weighs into one bowl in separate piles, so a mistake can be scooped back out. If you weigh into one
          bucket without taring between materials, Glazecalc's running total tells you what the scale should read after
          each one.
        </p>
      </section>

      <section class="panel" aria-labelledby="mixing">
        <h2 id="mixing" tabindex="-1">Mixing and sieving</h2>
        <h3>How much water</h3>
        <p>
          Sources disagree. Derek Au starts thick, at 50 mL of water per 100 g of powder, and adds more later.
          Potterycrafts gives 65 mL per 100 g for one powder glaze. UT Austin uses equal weights of water and powder,
          and when Digitalfire put 20 kg of powder into 20 kg of water, it measured a specific gravity of 1.46.
        </p>
        <p>
          Water is quick to add and slow to take out, so start low. Our estimate: begin with
          <b>about 70 to 80 mL per 100 g</b> (700 to 800 mL per kilogram, or about 11 to 12 US fl oz per pound). Slake,
          mix and sieve at that thickness, then add water a little at a time until the specific gravity is right. 1 mL
          of water weighs 1 g, so you can weigh it. If you overshoot, let the glaze settle, then sponge or pour clear
          water off the top.
        </p>
        <h3>Tools and water</h3>
        <ul>
          <li>
            <b>Propeller mixer.</b> Digitalfire calls a good one "essential". A corded drill with a mixing paddle does
            the job in a bucket. UT Austin runs it at least 4 to 5 minutes after the glaze looks mixed, and keeps the
            blade off the bucket, which it can scrape plastic from.
          </li>
          <li>
            <b>Blender.</b> It "works extremely well for small batches" (Digitalfire). Keep it for glaze only: it must
            never go back to the kitchen.
          </li>
          <li><b>Whisk or stick.</b> Zakin's choice when there is no mixer.</li>
        </ul>
        <p>
          Water varies too, and Digitalfire notes that it changes how a slurry behaves. Derek Au uses reverse-osmosis
          water because his tap water is hard. Whatever you use, note it.
        </p>
        <h3>Step by step</h3>
        <ol>
          <li>
            Put on your respirator, and rubber gloves if your hands will go in. Zakin wears a mask from the start of
            weighing until the glaze is wet.
          </li>
          <li>Measure about 70 to 80 mL of water per 100 g of powder into the bucket.</li>
          <li>
            Add the weighed powder gently, from a low height. UT Austin adds powder to warm water; Zakin and Au add
            water to powder. We suggest powder into water, which puffs up less dust, except for a recipe with a lot of
            bentonite: stir its dry powders together first.
          </li>
          <li>
            <b>Slake</b> it: let the powder soak without stirring. Digitalfire waits about 20 minutes. Powders with a
            gum or binder need to stand overnight.
          </li>
          <li>Mix until there are no dry pockets or lumps.</li>
          <li>Sieve it twice (see below).</li>
          <li>Cover it and let it rest overnight, then mix again and check the bottom for a hard layer.</li>
          <li>Measure the specific gravity, and add water a little at a time to reach your target.</li>
          <li>Label the bucket, and write down what you did.</li>
          <li>Clean up wet: mop the floor and wipe every surface, including the outside of the material containers.</li>
        </ol>
        <h3>Sieving</h3>
        <p>
          A <b>sieve</b> is a mesh screen in a frame. Pushing glaze through it with a brush breaks up lumps that mixing
          leaves and catches particles that would fire as specks. The higher the <b>mesh</b> number, the finer the
          screen: 80 mesh has openings of about 0.18 mm, and 100 mesh about 0.15 mm.
        </p>
        <p>
          Sources recommend different meshes. Zakin sieves twice through 50 or 80 mesh. Derek Au uses 120 mesh for most
          glazes, especially those with cobalt or iron: three passes through 80 mesh still left iron specks in one
          celadon, and one pass through 120 mesh cured it. He keeps 60 to 80 mesh for ash glazes and others with coarse
          materials. Potterycrafts, in the UK, suggests 60 to 80 mesh. A safe default:
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Sieve mesh">
          <table class="guide-table">
            <caption>
              Which sieve to use
            </caption>
            <thead>
              <tr>
                <th scope="col">Glaze</th>
                <th scope="col">Sieve</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Most glazes</th>
                <td>Two passes through 80 mesh</td>
              </tr>
              <tr>
                <th scope="row">Glazes with colorants such as cobalt or iron</th>
                <td>100 to 120 mesh</td>
              </tr>
              <tr>
                <th scope="row">Ash glazes, and others with coarse materials</th>
                <td>60 to 80 mesh</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel" aria-labelledby="specific-gravity">
        <h2 id="specific-gravity" tabindex="-1">Specific gravity</h2>
        <p>
          <b>Specific gravity</b> (SG) tells you how much powder is in your slurry. It is the weight of a volume of
          glaze divided by the weight of the same volume of water. Water is 1.00, and a glaze at SG 1.45 weighs 145 g
          per 100 mL. Mixing to a measured SG is how you get the same thickness, and the same coat, every time. It has
          no units, so it is the same in grams or ounces.
        </p>
        <h3>Measure it by weighing 100 mL</h3>
        <ol>
          <li>Stir the glaze so nothing has settled.</li>
          <li>
            Put a 100 mL <b>graduated cylinder</b> (a tall, marked measuring tube) or a 100 mL syringe on the scale, and
            tare it.
          </li>
          <li>Fill it with glaze to exactly 100 mL, reading the mark at eye level.</li>
          <li>Weigh it and divide the grams by 100: 145 g is SG 1.45.</li>
        </ol>
        <p>
          Digitalfire also marks a cup at the level of 500 g of water, fills it to the mark with glaze, and divides the
          weight by 500; a bigger, fuller measure is more accurate. A <b>hydrometer</b>, a float read where it sits in
          the glaze, is quick but can misread thick or gelled glazes. UK hydrometers, such as Potclays', read in degrees
          Baumé (°Bé). By our arithmetic, SG = 145 ÷ (145 − °Bé), so 46 °Bé is about 1.46. Older UK books give a
          <b>pint weight</b>, the ounces in an imperial pint of glaze: divide it by 20, so 29 oz is about SG 1.45 (also
          our arithmetic).
        </p>
        <h3>What to aim for</h3>
        <p>
          Sources disagree, most of all on brushing and spraying, where the UK supplier Potclays gives much higher
          figures (its own are "for guidance only"). Treat every number as a starting point. Digitalfire's core advice
          is to find the SG and gelling that work for each glaze, then repeat them and write them down.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Specific gravity targets">
          <table class="guide-table">
            <caption>
              Specific gravity targets, where sources disagree
            </caption>
            <thead>
              <tr>
                <th scope="col">Use</th>
                <th scope="col">Digitalfire and Glazy</th>
                <th scope="col">Potclays (UK)</th>
                <th scope="col">Safe starting point</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Dipping</th>
                <td>
                  1.40 (for a 5-second dip) to 1.50 (for a 1-second dip); home-mixed glazes that are gelled do best at
                  1.43 to 1.45
                </td>
                <td>Clear 1.46 to 1.48; colored 1.61</td>
                <td>1.45; thin to 1.43 and gel it if it drips</td>
              </tr>
              <tr>
                <th scope="row">Brushing</th>
                <td>1.25 (thin clear) to 1.55 (dark detail)</td>
                <td>1.71 to 1.81</td>
                <td>Follow the product; use CMC gum or a brushing medium</td>
              </tr>
              <tr>
                <th scope="row">Spraying</th>
                <td>
                  No figure; Hopper, writing for Ceramic Arts Network, says much thinner, with a deflocculant (an
                  additive that makes a slurry runnier)
                </td>
                <td>1.71</td>
                <td>No reliable number; spray only in a spray booth</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          To check a dipping glaze by eye, AMACO dips for 5 seconds and looks for a coat about as thick as a US dime.
          Digitalfire fires tiles dipped for 5 seconds to check.
        </p>
        <h3>Water for a target SG: our estimate</h3>
        <p>
          The table below is our own arithmetic, not a source's. It assumes the powder's particles have a density of 2.6
          g per cm³, which is an assumption, not a measurement. Clay, soluble materials and gelling all change a real
          glaze, so use it to start, then measure. As a check, it predicts SG 1.44 for equal weights of powder and
          water, close to Digitalfire's measured 1.46. It also shows that 70 to 80 mL per 100 g starts you above SG 1.5,
          thicker than you need.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Water for a target specific gravity">
          <table class="guide-table">
            <caption>
              Water for a target specific gravity (our estimate)
            </caption>
            <thead>
              <tr>
                <th scope="col">Target SG</th>
                <th scope="col" class="num">Per 100 g of powder</th>
                <th scope="col" class="num">Per kilogram</th>
                <th scope="col" class="num">Per pound</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1.40</th>
                <td class="num">about 115 mL</td>
                <td class="num">about 1150 mL</td>
                <td class="num">about 18 US fl oz</td>
              </tr>
              <tr>
                <th scope="row">1.45</th>
                <td class="num">about 98 mL</td>
                <td class="num">about 980 mL</td>
                <td class="num">about 15 US fl oz</td>
              </tr>
              <tr>
                <th scope="row">1.50</th>
                <td class="num">about 85 mL</td>
                <td class="num">about 850 mL</td>
                <td class="num">about 13 US fl oz</td>
              </tr>
              <tr>
                <th scope="row">1.60</th>
                <td class="num">about 64 mL</td>
                <td class="num">about 640 mL</td>
                <td class="num">about 10 US fl oz</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3>Epsom salts, CMC gum and bentonite</h3>
        <p>
          <b>Epsom salts</b> make a glaze gel slightly when it stands still and flow again when it is stirred. This is
          called <b>flocculating</b> it, and a glaze that behaves this way is <b>thixotropic</b>: it goes on more
          evenly, drips less and settles less. Digitalfire suggests starting at about 2 g per gallon once the SG is
          right (roughly 0.5 g per liter, our conversion) and tuning the amount each time you mix, since no recipe
          should fix the dose. We suggest dissolving it in a little hot water first. In a Digitalfire example, a glaze
          at 1.45 dripped, so water brought it down to 1.43 and Epsom salts gelled it back to creamy, and it went on
          evenly. A rough check: stir, stop and watch. A gelled glaze moves on for about 2 or 3 seconds, then stops and
          springs back a little.
        </p>
        <p>
          <b>CMC gum</b> (carboxymethyl cellulose) makes a slurry stickier and slower to dry, and leaves a harder coat
          that holds to the pot. It matters most for brushing glazes and glazes high in frit. Digitalfire's example
          blends 3.75 g into 1000 g of slurry, and it has to go in with a blender. A glaze with CMC will not gel with
          Epsom salts, and since microbes feed on the gum, it can change in the bucket and start to smell.
        </p>
        <p>
          <b>Bentonite</b>, a very fine clay, helps hold the other particles in suspension. Dipping glazes usually rely
          on 15 to 25% raw clay for this. For a recipe short of clay, about 1 to 2% bentonite helps.
        </p>
      </section>

      <section class="panel" aria-labelledby="testing">
        <h2 id="testing" tabindex="-1">Test tiles and line blends</h2>
        <h3>Start small</h3>
        <p>
          Derek Au works up in three steps: a 50 or 100 g test, a 1 to 2 kg trial if it works, then a 5 to 10 kg studio
          batch. By our estimate, a 100 g test at SG 1.45 makes about 135 mL (about 4½ US fl oz) of slurry, enough to
          dip a few small tiles in a narrow cup.
        </p>
        <h3>Test on your own clay</h3>
        <p>
          A glaze can look quite different on another clay or in another kiln: Clay Art Center tested each of its
          reformulated glazes on four clay bodies, at cone 6 and at cone 10. Potclays' beginner's guide to glaze testing
          suggests:
        </p>
        <ul>
          <li>
            6 to 10 <b>test tiles</b> (small pieces for trying a glaze) of the clay you will actually use, noting
            whether they are bisqued or bone-dry
          </li>
          <li>one change at a time</li>
          <li>a single dip and a double dip, to see the glaze thin and thick</li>
          <li>every tile in the same kiln load</li>
          <li>a mark on each tile before firing, with a stamp, carving or underglaze pencil.</li>
        </ul>
        <p>
          We suggest tiles that stand upright, since a flat tile hides how far a glaze runs, with a textured band to
          show how the glaze breaks over edges, and a bare foot. Set each on a small dish, a scrap of bisque or kiln
          wash to catch drips. Put a <b>witness cone</b>, a small ceramic cone that bends when it has had enough heat,
          near the tiles to show what they received; the <a routerLink="/guides/firing">firing guide</a> explains cones.
          Give each tile a short code, and write it against the recipe in your records. Willers, writing for Ceramic
          Arts Network, uses numbers and letters, and writes the system itself in the front of the notebook.
        </p>
        <h3>Line blends</h3>
        <p>
          A <b>line blend</b> is a row of tests that steps evenly from one mix to another: from one glaze to a second,
          or from a base glaze to the same glaze with more colorant. Derek Au, for example, steps iron oxide through a
          clear base in 1% increments. A volumetric method associated with Ian Currie saves time, because you mix only
          the two ends:
        </p>
        <ol>
          <li>Mix the two end glazes, A and B, as batches of the same size, and sieve both.</li>
          <li>Add water to the one with less volume until both have exactly the same wet volume.</li>
          <li>Stir both, then draw each mix with a syringe into its own numbered cup.</li>
          <li>Stir each cup and dip a tile.</li>
        </ol>
        <p>
          In our worked example, A is 100 g of a clear base, and B is the same with 4 g of red iron oxide added (a 4%
          addition). Each milliliter of B holds the same share of base as a milliliter of A, plus its iron, so the cups
          step from no iron to 4% in 1% steps. Each end gives 100 mL to the blend, which a 100 g batch covers by our
          estimate.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Line blend example">
          <table class="guide-table">
            <caption>
              A five-step iron line blend, 40 mL per cup (our worked example)
            </caption>
            <thead>
              <tr>
                <th scope="col">Cup</th>
                <th scope="col" class="num">Clear base (A)</th>
                <th scope="col" class="num">Base with 4% iron (B)</th>
                <th scope="col" class="num">Iron oxide, % of base</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1</th>
                <td class="num">40 mL</td>
                <td class="num">0 mL</td>
                <td class="num">0</td>
              </tr>
              <tr>
                <th scope="row">2</th>
                <td class="num">30 mL</td>
                <td class="num">10 mL</td>
                <td class="num">1</td>
              </tr>
              <tr>
                <th scope="row">3</th>
                <td class="num">20 mL</td>
                <td class="num">20 mL</td>
                <td class="num">2</td>
              </tr>
              <tr>
                <th scope="row">4</th>
                <td class="num">10 mL</td>
                <td class="num">30 mL</td>
                <td class="num">3</td>
              </tr>
              <tr>
                <th scope="row">5</th>
                <td class="num">0 mL</td>
                <td class="num">40 mL</td>
                <td class="num">4</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The method needs careful arithmetic, well-mixed ends of even SG, and an accurate scale. Derek Au also blends
          by weight instead of volume. A <b>triaxial blend</b> does the same with three ends, laid out on a triangle.
        </p>
        <p class="guide-callout">
          When a step looks promising, <b>Save as a copy</b> on the <a routerLink="/recipe">recipe page</a> keeps it as
          a recipe of its own and leaves the original as it was.
        </p>
      </section>

      <section class="panel" aria-labelledby="records">
        <h2 id="records" tabindex="-1">Keeping records</h2>
        <p>
          Willers puts the goal well: "enough information to be able to repeat, or avoid, the results you discovered".
          Write down what you plan to test before you start, and the results when you unload. Potclays adds the
          application, thickness, clay body and full firing, including ramps, holds and cooling. A <b>ramp</b> is a rate
          of heating or cooling, such as 60 °C (108 °F) an hour, and a <b>hold</b> keeps the kiln at one temperature for
          a set time. Note lot numbers, the water you used and any substitution: Clay Art Center's feldspar swap meant
          adjusting about half its glazes.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Record template">
          <table class="guide-table">
            <caption>
              What to record for each glaze batch (our template)
            </caption>
            <thead>
              <tr>
                <th scope="col">Part</th>
                <th scope="col">What to write down</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Recipe</th>
                <td>The recipe and its version; material brands and lot numbers; any substitutions</td>
              </tr>
              <tr>
                <th scope="row">Mixing</th>
                <td>
                  Date; batch size; water added, and its type (tap, reverse osmosis or distilled); SG after mixing and
                  final SG; Epsom salts, CMC and bentonite added; sieve mesh and number of passes
                </td>
              </tr>
              <tr>
                <th scope="row">Application</th>
                <td>
                  Clay body; bisque cone; dipping, brushing or pouring; dip time or number of coats; dry thickness
                </td>
              </tr>
              <tr>
                <th scope="row">Firing</th>
                <td>
                  Kiln and shelf position; the firing schedule, with its ramps, holds and cooling; atmosphere (oxidation
                  or reduction); what the witness cone showed, not only what the kiln was set to
                </td>
              </tr>
              <tr>
                <th scope="row">Result</th>
                <td>
                  Surface and color; any running, crazing or pinholes; photos of the front, back and side; the tile code
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="guide-callout">
          In Glazecalc, a saved <a routerLink="/recipe">recipe</a> holds the recipe itself. A
          <a routerLink="/firing">firing log</a> records each firing: the kiln, the date, times, temperatures, cones and
          notes. <a routerLink="/notes">Notes</a> hold everything else, such as the batch record above and what each
          tile showed.
        </p>
      </section>

      <section class="panel" aria-labelledby="sources">
        <h2 id="sources" tabindex="-1">Sources</h2>
        <ul class="guide-sources">
          <li><a href="https://help.glazy.org/concepts/materials">Glazy: Raw materials</a></li>
          <li><a href="https://help.glazy.org/testing/specific-gravity">Glazy: Specific gravity</a></li>
          <li><a href="https://digitalfire.com/glossary/specific+gravity">Digitalfire: Specific gravity</a></li>
          <li><a href="https://digitalfire.com/material/epsom+salts">Digitalfire: Epsom salts</a></li>
          <li><a href="https://digitalfire.com/material/cmc%2Bgum">Digitalfire: CMC gum</a></li>
          <li><a href="https://digitalfire.com/glossary/dipping+glaze">Digitalfire: Dipping glaze</a></li>
          <li><a href="https://digitalfire.com/glossary/water+solubility">Digitalfire: Water solubility</a></li>
          <li><a href="https://digitalfire.com/material/gerstley+borate">Digitalfire: Gerstley Borate</a></li>
          <li>
            <a href="https://digitalfire.com/material/mahavir+potash+feldspar">Digitalfire: Mahavir potash feldspar</a>
          </li>
          <li><a href="https://digitalfire.com/material/flint">Digitalfire: Flint</a></li>
          <li>
            <a
              href="https://www.clayartcenter.org/clay-art-center-blog/2025/4/the-end-of-an-era-the-extinction-of-custer-feldspar"
              >Clay Art Center: The end of an era, the extinction of Custer feldspar</a
            >
          </li>
          <li>
            <a href="https://www.berkeleypottersstudio.com/what-the-flux-nov-2023"
              >Berkeley Potters Studio: What the flux, November 2023</a
            >
          </li>
          <li><a href="https://nmclay.com/gerstley-borate-original">New Mexico Clay: Gerstley Borate Original</a></li>
          <li>
            <a
              href="https://ceramicartsnetwork.org/daily/article/Glaze-Chemistry-101-A-Quick-Course-on-Mixing-Ceramic-Glazes"
              >Ceramic Arts Network: Glaze chemistry 101, a quick course on mixing ceramic glazes (Zakin)</a
            >
          </li>
          <li>
            <a
              href="https://ceramicartsnetwork.org/daily/article/how-to-keep-good-records-when-testing-ceramic-glazes-(and-improve-your-results!)"
              >Ceramic Arts Network: How to keep good records when testing ceramic glazes (Willers)</a
            >
          </li>
          <li>
            <a
              href="https://ceramicartsnetwork.org/pottery-making-illustrated/pottery-making-illustrated-article/8-Ways-to-Apply-Glaze"
              >Ceramic Arts Network: 8 ways to apply glaze (Hopper)</a
            >
          </li>
          <li><a href="https://www.derekau.net/blog/2016/02/24/mixing-test-glazes">Derek Au: Mixing test glazes</a></li>
          <li>
            <a href="https://derekau.net/blog/digital-scales-for-weighing-glazes/"
              >Derek Au: Digital scales for weighing glazes</a
            >
          </li>
          <li><a href="https://derekau.net/blog/triaxial-testing/">Derek Au: Triaxial testing</a></li>
          <li>
            <a href="https://cloud.wikis.utexas.edu/wiki/display/ceramics/How+To+Mix+Glazes"
              >UT Austin ceramics wiki: How to mix glazes</a
            >
          </li>
          <li>
            <a href="https://www.potclays.co.uk/the-beginners-guide-to-glaze-testing/"
              >Potclays: The beginner's guide to glaze testing</a
            >
          </li>
          <li><a href="https://www.potclays.co.uk/glaze-hydrometer">Potclays: Glaze hydrometer</a></li>
          <li>
            <a href="https://potterycrafts.co.uk/products/potterycrafts-nordic-blue-mist-powder-glaze"
              >Potterycrafts: Nordic Blue Mist powder glaze</a
            >
          </li>
          <li>
            <a href="https://www.hse.gov.uk/PUBNS/guidance/cr1.pdf">HSE: Glaze and colour preparation (CR1)</a>
          </li>
          <li>
            <a href="https://valentineclays.co.uk/cdn/shop/files/Flint_Damp_Dry_Technical_Data_Sheet.pdf"
              >Valentine Clays: Flint technical data sheet</a
            >
          </li>
          <li>
            <a href="https://community.ceramicartsdaily.org/topic/7974-ian-currie-test-tiles-forums/page/16/"
              >Ceramic Arts Daily forum: Ian Currie test tiles</a
            >
          </li>
        </ul>
      </section>
    </div>
  `
})
export class MakingAGlazeGuide {
  protected readonly sections = SECTIONS;
}
