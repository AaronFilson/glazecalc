import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/page-header';
import { GuideContents, GuideSection } from './guide-contents';

/** The guide's sections, for its contents list and their headings' ids. */
const SECTIONS: GuideSection[] = [
  { id: 'the-main-hazard', label: 'The main hazard: dust' },
  { id: 'habits', label: 'Habits that matter most' },
  { id: 'respirators', label: 'Respirators' },
  { id: 'cleaning', label: 'Cleaning, clothes and hands' },
  { id: 'extraction-and-spraying', label: 'Local exhaust and spraying' },
  { id: 'kiln', label: 'Venting the kiln' },
  { id: 'materials', label: 'Materials that need most care' },
  { id: 'gloves-and-eyes', label: 'Gloves, skin and eyes' },
  { id: 'safety-data-sheets', label: 'Reading a safety data sheet' },
  { id: 'official-guidance', label: 'Official guidance by region' },
  { id: 'sources', label: 'Sources' }
];

/** Safe mixing and ventilation: dust, respirators, cleaning, hazardous materials and the kiln. */
@Component({
  selector: 'gc-safe-mixing-guide',
  imports: [GuideContents, PageHeader, RouterLink],
  template: `
    <gc-page-header
      title="Safe mixing and ventilation"
      lead="How to keep glaze dust out of your lungs and kiln fumes out of your home: the habits, equipment and materials that matter most."
    />
    <gc-guide-contents [sections]="sections" />
    <div class="guide">
      <section class="panel" aria-labelledby="the-main-hazard">
        <h2 id="the-main-hazard" tabindex="-1">The main hazard: dust</h2>
        <p>
          The main long-term hazard in glaze work is dust, above all <b>respirable crystalline silica</b>: particles of
          quartz or cristobalite (crystal forms of silica) small enough to reach deep into the lungs. Crystalline silica
          can make up about 10 to 60% of a glaze's dry weight, and most clays (except kaolin) and many feldspars also
          carry fine quartz. The UK's Health and Safety Executive (HSE) says this dust "is very fine and invisible under
          normal lighting", so a room that looks clean is not proof that the air is.
        </p>
        <p>
          Breathed in over time, it can cause <b>silicosis</b>, a lung disease that HSE describes as "serious and
          irreversible" and able to "cause permanent disablement and early death". It can also cause <b>COPD</b>
          (chronic obstructive pulmonary disease: long-term bronchitis and emphysema), which smoking makes worse. IARC,
          the World Health Organization's cancer agency, places inhaled crystalline silica in Group 1, "carcinogenic to
          humans".
        </p>
        <p>
          Silica does not turn into fumes in the kiln, and a wet glaze is not an inhalation hazard. The times to take
          care are when material is dry: opening bags, weighing, stirring powder into water, and cleaning up drips,
          overspray and slop that have dried back into dust.
        </p>
        <h3>Exposure limits</h3>
        <p>
          Workplace rules set an <b>exposure limit</b>: the most silica a worker may breathe, averaged over an 8-hour
          day, in milligrams (mg) or micrograms (µg, thousandths of a milligram) per cubic meter of air.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Silica exposure limits">
          <table class="guide-table">
            <caption>
              Workplace limits for respirable crystalline silica (8-hour average)
            </caption>
            <thead>
              <tr>
                <th scope="col">Region</th>
                <th scope="col" class="num">Limit</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">United States</th>
                <td class="num">0.05 mg/m³ (50 µg/m³)</td>
                <td>OSHA's limit. Employers must start taking action at 25 µg/m³, the "action level".</td>
              </tr>
              <tr>
                <th scope="row">United Kingdom</th>
                <td class="num">0.1 mg/m³</td>
                <td>Exposure must also be kept "as low as reasonably practicable".</td>
              </tr>
              <tr>
                <th scope="row">European Union</th>
                <td class="num">0.1 mg/m³</td>
                <td>Binding limit (Directive 2017/2398). Some member states set lower ones.</td>
              </tr>
              <tr>
                <th scope="row">Australia</th>
                <td class="num">0.05 mg/m³</td>
                <td>Since July 2020. Ministers declined a cut to 0.025 in June 2026.</td>
              </tr>
              <tr>
                <th scope="row">New Zealand</th>
                <td class="num">0.025 mg/m³</td>
                <td>Since November 2023.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Some pages quote 0.025 mg/m³ for Australia, but the official limit is still 0.05. Either way, the advice is
          the same: keep dust as low as you can.
        </p>
        <p class="guide-callout">
          These are workplace limits. They bind employers, so no one inspects a potter working alone at home, though
          community studios and schools with staff are usually covered (check your local rules). The dust is the same at
          home, and the limits show the scale of the hazard: 25 to 100 millionths of a gram in each cubic meter of air,
          averaged over a day.
        </p>
        <p>
          Almost no one has measured dust in hobby studios, so we suggest treating every dry-powder task as a dusty one.
        </p>
      </section>

      <section class="panel" aria-labelledby="habits">
        <h2 id="habits" tabindex="-1">Habits that matter most</h2>
        <p>
          Most protection comes from habits, not equipment. HSE's advice for potteries starts with avoiding powder and
          works down from there.
        </p>
        <h3>Avoid the powder where you can</h3>
        <ul>
          <li>
            <b>Buy ready-mixed glaze</b> when it suits your work. HSE's first suggestion is "Buy in glaze ready for use,
            when possible", or a granular or slurry form.
          </li>
          <li>
            <b>Choose safer recipes.</b> HSE suggests "glazes that contain less crystalline silica". Digitalfire
            suggests a <b>frit</b> (factory-made glass ground to powder, which dissolves far less than raw materials) in
            place of raw barium carbonate, and a <b>stain</b> (a manufactured ceramic color) in place of large amounts
            of manganese, cobalt or nickel for blacks.
          </li>
        </ul>
        <h3>When you do use powder</h3>
        <ul>
          <li>
            <b>Scoop gently.</b> HSE says to "Tip/scoop gently from bags" and to avoid large, deep containers, so the
            dust has less far to fall.
          </li>
          <li><b>Keep lids on</b> whenever a container is not in use, including between the scale and the bucket.</li>
          <li>
            <b>Work out of drafts.</b> Weigh away from doors, windows and walkways, and keep other people out of the
            room.
          </li>
          <li>
            <b>Add powder to water.</b> We suggest putting the water in the bucket first and adding powder gently,
            rather than pouring water onto a dry heap. This is common practice, not a rule from the sources.
          </li>
          <li><b>Stir with a stirrer,</b> not your hands, and wear gloves.</li>
          <li>
            <b>Keep it wet.</b> Clean up wet spills "so they do not dry out", and keep wet scraps in sealed containers.
          </li>
          <li>
            <b>Mind the bags.</b> Sacks carry dust on the outside. Roll empty ones up gently and bag them before
            throwing them away.
          </li>
          <li><b>Store powders</b> covered, off the floor and away from where people walk.</li>
        </ul>
        <h3>A sensible order of preference</h3>
        <ol>
          <li>Buy ready-mixed wet glaze, and skip the powder.</li>
          <li>
            Mix from powder under a ventilated hood, or outdoors in still air away from other people, wearing a
            respirator.
          </li>
          <li>Indoors without a hood: a respirator, gentle scooping, lids on, and wet cleanup straight away.</li>
        </ol>
        <p>
          This order is our suggestion, built on HSE's principle of avoiding powder first. For weighing and mixing step
          by step, see <a routerLink="/guides/making-a-glaze">How to make a glaze</a>.
        </p>
      </section>

      <section class="panel" aria-labelledby="respirators">
        <h2 id="respirators" tabindex="-1">Respirators</h2>
        <p>
          A <b>respirator</b> is a mask certified to filter fine particles from the air you breathe. It works only when
          it seals to your face, and it backs up good habits rather than replacing them.
        </p>
        <h3>Classes by region</h3>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Respirator classes">
          <table class="guide-table">
            <caption>
              Particle respirator classes by region (rough equivalents for glaze dust)
            </caption>
            <thead>
              <tr>
                <th scope="col">Region</th>
                <th scope="col">Everyday class</th>
                <th scope="col">Higher class</th>
                <th scope="col">Look for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">United States</th>
                <td>N95</td>
                <td>P100</td>
                <td>NIOSH approval on the mask or its packaging</td>
              </tr>
              <tr>
                <th scope="row">UK and EU</th>
                <td>FFP2</td>
                <td>FFP3</td>
                <td>EN 149 on disposable masks; EN 140 on reusable half masks, with P2 or P3 filters</td>
              </tr>
              <tr>
                <th scope="row">Australia and New Zealand</th>
                <td>P2</td>
                <td>P3</td>
                <td>AS/NZS 1716</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The higher class filters a larger share of fine particles. Sources disagree on what an Australian P3 filters
          (at least 99%, or at least 99.95%), so buy the certified class sold in your region. A reusable
          <b>half mask</b> (covering the nose and mouth, with replaceable filters) fitted with P100 filters (P3 outside
          the US) is a common studio choice.
        </p>
        <h3>Fit and seal</h3>
        <p>
          A mask that leaks lets dust in around its edges, whatever its class. HSE warns that stubble and beards "make
          it impossible to get a good seal".
        </p>
        <ul>
          <li>
            <b>Shave the same day.</b> Guidance differs on how recent "clean-shaven" must be: within 8 hours (a UK
            maker, citing HSE) or preferably within 12 (the Australian and New Zealand fit-test standard). Shaving on
            the day you work meets both.
          </li>
          <li>
            <b>If you keep a beard,</b> a loose-fitting <b>powered respirator</b> (PAPR: a hood or helmet with a fan
            that supplies filtered air) needs no face seal.
          </li>
          <li>
            <b>Get the size right.</b> Poor fit is a major cause of leaks. Workplaces use a <b>fit test</b>, a check
            that a particular mask seals on a particular face. At home, we suggest following the maker's instructions
            for checking the seal each time you put it on.
          </li>
        </ul>
        <p class="guide-callout">
          In our view, fit matters more than class: a well-fitted N95, FFP2 or P2 will usually do better than a loose
          P100.
        </p>
        <h3>When to wear one</h3>
        <p>
          HSE says a respirator is "normally not needed" where weighing and mixing happen in a ventilated enclosure, but
          "may be needed for maintenance and cleaning". Most home studios have no enclosure, so we suggest wearing one
          (N95, FFP2 or P2 at least; P100, FFP3 or P3 is better) whenever you:
        </p>
        <ul>
          <li>open bags or tip out powder;</li>
          <li>weigh powders and stir them into water;</li>
          <li>scrape, sand or grind dried glaze or bisque;</li>
          <li>do any dry cleanup, or empty a vacuum;</li>
          <li>spray glaze (in a booth: see below).</li>
        </ul>
        <h3>What is not a respirator</h3>
        <ul>
          <li>
            Surgical masks, cloth masks and "nuisance dust" masks without a NIOSH, EN 149 or AS/NZS 1716 marking. We
            would not rely on them for glaze dust.
          </li>
          <li>
            A dust respirator "will not protect you against gases, vapors" (OSHA), so it does nothing for kiln fumes.
          </li>
          <li>
            Look after yours: OSHA notes that a dirty or misused respirator "can become a hazard". Store it clean, away
            from dusty work clothes.
          </li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="cleaning">
        <h2 id="cleaning" tabindex="-1">Cleaning, clothes and hands</h2>
        <p>
          Dust that settles on floors, benches and clothes goes back into the air every time it is disturbed. After
          gentle handling, cleaning wet is the most useful habit you can have.
        </p>
        <h3>Clean wet</h3>
        <ul>
          <li>
            <b>Mop and wipe with water.</b> The University of Utah recommends wet mopping floors and work surfaces
            daily, and HSE asks workplaces to wash down at the end of each day. At home, we suggest wiping and mopping
            after every mixing session.
          </li>
          <li>
            <b>Never dry sweep, dry brush or use compressed air.</b> OSHA bars these where they add to exposure, and HSE
            says never to brush or blow dust off skin or clothing.
          </li>
          <li>
            <b>Vacuum only with a machine built for fine hazardous dust:</b> <b>HEPA</b> in the US (a filter that
            catches at least 99.97% of particles 0.3 µm across), or at least <b>dust Class M</b> in the UK and EU.
            Elsewhere, look for an equivalent rating. Ordinary shop and household vacuums are not rated this way, and we
            would not use them, since fine dust may pass through and out of the exhaust. Wear your respirator to empty
            one.
          </li>
        </ul>
        <h3>Clothes, food and hands</h3>
        <ul>
          <li>
            <b>Wear studio-only clothes</b> of a closely woven fabric that does not trap dust, and wash them often (Utah
            suggests weekly), apart from other laundry. HSE notes that dusty clothing keeps exposing you after the work
            is done, so we suggest changing before you go into the rest of the house.
          </li>
          <li>
            <b>No eating, drinking or smoking in the studio.</b> As Digitalfire puts it, "one should not confuse barium
            carbonate with table sugar when preparing coffee". Label every container.
          </li>
          <li>
            <b>Wash your hands</b> before eating, drinking, smoking or using the toilet, and clean under your nails. Use
            warm water and mild soap rather than an abrasive cleaner.
          </li>
        </ul>
        <p>
          For keeping dust and materials away from children and pets, see
          <a routerLink="/guides/home-safety">Don't poison your family</a>.
        </p>
      </section>

      <section class="panel" aria-labelledby="extraction-and-spraying">
        <h2 id="extraction-and-spraying" tabindex="-1">Local exhaust and spraying</h2>
        <h3>Local exhaust</h3>
        <p>
          <b>Local exhaust ventilation</b> (LEV) catches dust where it is made: a hood or enclosure over the work, with
          a fan that draws air away from your face and out of the building. Weighing is where most of the dust is made,
          so HSE describes an enclosed weighing station with a small open front, and Digitalfire a slotted hood above
          the scale. If you have one, HSE's workplace advice applies:
        </p>
        <ul>
          <li>keep it away from doors, windows and walkways, because drafts defeat it;</li>
          <li>
            let in clean <b>make-up air</b> (fresh air that replaces what the fan removes, through a door gap, window or
            inlet);
          </li>
          <li>send the exhaust outdoors, away from doors, windows and air intakes;</li>
          <li>check that it is on and working before you start.</li>
        </ul>
        <p>
          No source gives airflow figures for a hobby hood. Without one, rely on gentle handling, a respirator and wet
          cleanup.
        </p>
        <h3>Spraying</h3>
        <p>
          HSE warns that spraying "can produce mists containing RCS" (respirable crystalline silica), and that "glaze
          mists dry out swiftly and turn to dust". Every source we found says to spray only inside a ventilated booth.
        </p>
        <ul>
          <li>
            HSE wants an extracted enclosure and, "where possible, a water-backed booth", which catches overspray in
            water.
          </li>
          <li>
            Use a turntable in the booth, wear nitrile gloves and a respirator, and clean the booth and its filter
            before overspray dries.
          </li>
          <li>Dusting bisque with a brush before glazing makes dust too; we suggest a damp sponge instead.</li>
        </ul>
        <div class="guide-warning" role="note">
          <p>
            If you have no extracted booth, do not spray. Brush or dip instead: HSE names brushing and dipping as ways
            to make less airborne silica.
          </p>
        </div>
      </section>

      <section class="panel" aria-labelledby="kiln">
        <h2 id="kiln" tabindex="-1">Venting the kiln</h2>
        <h3>What a firing gives off</h3>
        <p>
          Every firing releases fumes, even with plain clay. Water and carbon dioxide come off, with "a little carbon
          monoxide" from burning organic matter, and Dave Finkelnburg, writing in Ceramics Monthly, calls the potential
          for carbon monoxide "the most immediate hazard". <b>Carbon monoxide</b> (CO) is a gas that starves the body of
          oxygen, causing fatigue, headache and dizziness. Sulfur in ball and stoneware clays gives bisque firings their
          rotten-egg smell, and sulfur fumes burn the eyes, nose and lungs.
        </p>
        <p>
          Glaze materials add more. Some metal oxides form fumes, "notably copper, zinc, manganese", which can cause
          <b>metal fume fever</b>, an illness with chills and fever. Lead "vaporizes at lower temperatures", and
          fluorspar, cryolite and lepidolite give off fluorine compounds. No one has published measurements from hobby
          kilns, so we suggest venting every firing.
        </p>
        <h3>Downdraft vents</h3>
        <p>
          A <b>downdraft vent</b> is a small fan unit fitted to the kiln. It draws a little air out of the firing
          chamber, dilutes it with room air and ducts it outdoors, catching fumes before they reach the room. Kiln maker
          Skutt says all kiln makers recommend one.
        </p>
        <ul>
          <li>
            <b>It needs make-up air.</b> Skutt's EnviroVent 2 sends 140 cubic feet (about 4 m³) of air outdoors each
            minute, and as much must come back in.
          </li>
          <li>
            <b>It removes "hazardous fumes only, not heat"</b> (Skutt), and should run independently of the building's
            heating and cooling.
          </li>
          <li>
            <b>Duct it outdoors,</b> away from windows, doors and air intakes. Finkelnburg recommends a squirrel-cage
            (centrifugal) fan, not a propeller fan.
          </li>
          <li>Some local codes require a kiln vent, so check yours.</li>
        </ul>
        <p>
          A <b>hood vent</b> (a canopy over the kiln) is the alternative. It pulls in fumes that escape along with a lot
          of room air, but draws nothing from inside the kiln, and it also needs make-up air.
        </p>
        <h3>Where to put the kiln</h3>
        <ul>
          <li>
            We suggest a garage, shed or room set aside for the kiln rather than a living space, and one you can close
            off from children and pets, as Skutt advises.
          </li>
          <li>
            <b>Clearances.</b> Sources differ: Skutt specifies at least 18 in (46 cm) from any wall or
            <b>combustible</b> material (anything that can burn), while CIRMA, a Connecticut insurer, suggests 3 ft (0.9
            m) from anything combustible. Follow your kiln's manual; without one, keep 18 in from walls and 3 ft from
            anything that can burn.
          </li>
          <li>
            <b>Floor.</b> Use a non-combustible floor such as concrete or ceramic tile, never wood, carpet or vinyl.
            Keep lumber, paper and solvents away from the kiln.
          </li>
          <li>
            <b>Electrics.</b> CIRMA recommends a dedicated circuit, no extension cords or surge protectors, unplugging
            between firings, and a fire extinguisher within 25 ft (7.6 m).
          </li>
          <li>
            <b>Room heat.</b> Skutt says to keep the room below 38 °C (100 °F), or the controller may shut the kiln off.
            As the vent removes no heat, a small room may need a fan as well. Keep sprinkler heads and heat sensors from
            sitting directly above the kiln.
          </li>
          <li>
            <b>Carbon monoxide alarm.</b> We found no rule requiring one for an electric kiln, but burning organics make
            CO, so an alarm in the kiln room and the rooms next to it is a sensible, cheap step (see
            <a routerLink="/guides/home-safety">Don't poison your family</a>).
          </li>
        </ul>
        <p>
          Raku makes large amounts of smoke and CO; Utah advises doing it outdoors, away from air intakes and windows.
          For firing itself, see <a routerLink="/guides/firing">Firing a basic kiln</a>.
        </p>
      </section>

      <section class="panel" aria-labelledby="materials">
        <h2 id="materials" tabindex="-1">Materials that need most care</h2>
        <p>
          Most glaze materials, including silica, clays, feldspars and frits, are mainly a dust hazard, which the habits
          above control. A shorter list is toxic in its own right, by breathing, swallowing or skin contact. Digitalfire
          adds that stains are generally much safer than raw oxides, and that "unbalanced glazes that release toxic
          metals can be made from any materials": food safety depends on the whole recipe, not on one ingredient.
        </p>
        <p>
          An <b>IARC group</b> is a cancer classification: Group 1 means "carcinogenic to humans", Group 2A "probably
          carcinogenic", and Groups 2B and 3 mean weaker evidence.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Materials that need most care">
          <table class="guide-table">
            <caption>
              Glaze materials that need extra care
            </caption>
            <thead>
              <tr>
                <th scope="col">Material</th>
                <th scope="col">Hazard</th>
                <th scope="col">Precaution</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Lead compounds and lead frits</th>
                <td>"Highly toxic by inhalation or ingestion"; vaporizes at lower kiln temperatures.</td>
                <td>
                  Avoid; Digitalfire says experts only. Assume any glaze not labeled "lead-free" or "leadless" contains
                  lead.
                </td>
              </tr>
              <tr>
                <th scope="row">Barium carbonate</th>
                <td>
                  Insoluble in water but dissolves in stomach acid; affects the heart and muscles (irregular heartbeat,
                  low potassium).
                </td>
                <td>A barium frit or strontium where the recipe allows; respirator; labeled container.</td>
              </tr>
              <tr>
                <th scope="row">Manganese dioxide</th>
                <td>
                  Dust or fume can cause <b>manganism</b>, a nervous-system illness like Parkinson's disease, usually
                  after 1 to 3 years of exposure. Fume can cause metal fume fever.
                </td>
                <td>Black stains at low percentages instead; vent the kiln.</td>
              </tr>
              <tr>
                <th scope="row">Potassium dichromate and chrome oxide</th>
                <td>
                  Chromium(VI), as in dichromate, is IARC Group 1. That listing does not cover chromium(III), as in
                  chrome oxide.
                </td>
                <td>Avoid dichromate. We treat chrome oxide as far less hazardous, but keep its dust down.</td>
              </tr>
              <tr>
                <th scope="row">Cobalt</th>
                <td>Soluble cobalt(II) salts IARC 2A; cobalt(II) oxide 2B; black Co₃O₄ Group 3.</td>
                <td>Keep dust down; stains for blacks.</td>
              </tr>
              <tr>
                <th scope="row">Nickel compounds</th>
                <td>Among the University of Utah's known or probable human carcinogens.</td>
                <td>Stains rather than high percentages.</td>
              </tr>
              <tr>
                <th scope="row">Cadmium and selenium, raw or in stains</th>
                <td>Cadmium compounds are among Utah's known or probable human carcinogens.</td>
                <td>"Only by experts" (Digitalfire); read any stain's SDS.</td>
              </tr>
              <tr>
                <th scope="row">Antimony and vanadium</th>
                <td>Trivalent antimony (as in antimony trioxide) IARC 2A; vanadium "highly toxic by inhalation".</td>
                <td>Vanadium for experts only; keep antimony dust down.</td>
              </tr>
              <tr>
                <th scope="row">Copper and zinc</th>
                <td>Kiln fume can cause metal fume fever; raw zinc oxide is "generally not considered hazardous".</td>
                <td>Vent the kiln.</td>
              </tr>
              <tr>
                <th scope="row">Lithium carbonate</th>
                <td>
                  "Highly toxic by inhalation". An EU expert committee concluded it may harm fertility and the unborn
                  child; formal adoption was not confirmed when we checked.
                </td>
                <td>Gloves and respirator; keep from children. We suggest extra care in pregnancy.</td>
              </tr>
              <tr>
                <th scope="row">Borax and boric acid</th>
                <td>Classified in the EU as "may damage fertility; may damage the unborn child".</td>
                <td>Gloves; boron from a frit where you can.</td>
              </tr>
              <tr>
                <th scope="row">Soda ash, potash, alkaline feldspars</th>
                <td>Skin irritants.</td>
                <td>Gloves.</td>
              </tr>
              <tr>
                <th scope="row">Fluorspar, cryolite, lepidolite</th>
                <td>Release fluorine gases in firing; fluorspar also irritates skin.</td>
                <td>Vent the kiln outdoors; gloves.</td>
              </tr>
              <tr>
                <th scope="row">Talc</th>
                <td>IARC 2A since July 2024; talc contaminated with asbestos counts as asbestos, Group 1.</td>
                <td>Platy (not fibrous), asbestos-free talc; check its SDS.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Borax, boric acid, soda ash and potash dissolve in water, so we treat them as the likeliest to be absorbed
          through broken skin or swallowed from unwashed hands.
        </p>
        <p class="guide-callout">
          If a recipe calls for raw barium carbonate, a lot of manganese, or any lead or cadmium material, look for a
          version that uses a frit or a stain instead. Glazecalc can compare the chemistry of the original and the swap;
          then test the new glaze.
        </p>
      </section>

      <section class="panel" aria-labelledby="gloves-and-eyes">
        <h2 id="gloves-and-eyes" tabindex="-1">Gloves, skin and eyes</h2>
        <h3>Skin</h3>
        <ul>
          <li>
            <b>Wear gloves</b> for wet or dry glaze; Utah says they "must be worn". HSE names nitrile for spraying. No
            source compared glove materials, so we suggest nitrile for all glaze work.
          </li>
          <li><b>Barrier creams are not gloves.</b> HSE: "'Barrier creams' are not 'liquid gloves'".</li>
          <li>
            Silica dust and wet work both cause <b>contact dermatitis</b> (red, sore, cracked skin), and cracked skin
            lets materials in. Wash with warm water and mild soap, and use an after-work cream.
          </li>
          <li>
            <b>Cover cuts.</b> Barium compounds, for example, are not thought to pass through intact skin, but can
            through broken skin.
          </li>
        </ul>
        <h3>Eyes</h3>
        <ul>
          <li>Wear safety glasses when grinding glazed pieces. We also suggest them when tipping powders.</li>
          <li>
            <b>Looking into a hot kiln.</b> Kilns give off <b>infrared</b> radiation (heat you cannot see) that "may
            cause cataracts". Recommended shades of IR-rated glasses differ: 1.7 to 3.0 (University of Utah) and 2.0 to
            5.0 (University of Calgary). Shade 3 falls within both; go darker if spots appear in your vision.
          </li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="safety-data-sheets">
        <h2 id="safety-data-sheets" tabindex="-1">Reading a safety data sheet</h2>
        <p>
          A <b>safety data sheet</b> (SDS; older ones say MSDS) is the supplier's document on a product's contents,
          hazards and handling. Every raw material and commercial glaze should have one; look on the product page or ask
          the supplier. It has 16 sections, and two matter most:
        </p>
        <ul>
          <li>
            <b>Section 2, Hazard identification:</b> the classification, a <b>signal word</b> such as "Danger",
            <b>pictograms</b> (small warning symbols) and hazard statements.
          </li>
          <li>
            <b>Section 8, Exposure controls and personal protection:</b> exposure limits, the
            <b>engineering controls</b> needed (ventilation and extraction) and the protective equipment to wear.
          </li>
        </ul>
        <p>
          Pictograms and hazard statements come from the <b>GHS</b> (Globally Harmonized System), the international
          scheme for labeling chemicals. Borax, for example, carries the GHS08 health-hazard pictogram, the signal word
          "Danger" and the hazard statement H360FD, "may damage fertility; may damage the unborn child". As far as we
          know, SDSs in the UK, EU, Australia and New Zealand use the same 16 sections.
        </p>
        <ul>
          <li>
            <b>Check the form of silica.</b> HSE warns that crystalline silica "can be wrongly labelled as 'amorphous
            silica'".
          </li>
          <li>
            <b>"Not classified" is not "harmless".</b> A finished glaze with no pictograms still makes silica dust when
            dry.
          </li>
        </ul>
        <p class="guide-callout">
          This guide gathers published advice, but it is not a substitute for a material's safety data sheet, your
          kiln's manual or your local rules. Where they differ from what you read here, follow them.
        </p>
      </section>

      <section class="panel" aria-labelledby="official-guidance">
        <h2 id="official-guidance" tabindex="-1">Official guidance by region</h2>
        <p>
          These are the primary sources most worth reading. Most are written for workplaces, but their advice carries
          over well to a home studio.
        </p>
        <ul>
          <li>
            <b>United States:</b> OSHA's
            <a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1053">silica standard</a>
            (29 CFR 1910.1053) and its
            <a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.134AppD"
              >advice for people who choose to wear a respirator</a
            >; NIOSH's <a href="https://www.cdc.gov/niosh/docs/92-107">silicosis alert</a>.
          </li>
          <li>
            <b>United Kingdom:</b> HSE's COSHH essentials sheets for ceramics (COSHH is the Control of Substances
            Hazardous to Health regulations), especially
            <a href="https://www.hse.gov.uk/PUBNS/guidance/cr1.pdf">CR1 on preparing glazes and colors</a> and
            <a href="https://www.hse.gov.uk/PUBNS/guidance/cr5.pdf">CR5 on spraying them</a>, and HSE's
            <a href="https://www.hse.gov.uk/respiratory-protective-equipment/fit-testing-basics.htm"
              >fit testing basics</a
            >.
          </li>
          <li>
            <b>European Union:</b> Directive (EU) 2017/2398 sets the binding silica limit; NEPSI's
            <a href="https://nepsi.eu/wp-content/uploads/2022/10/oel_full_table_september_2020_europe.pdf"
              >table of exposure limits</a
            >
            gives each country's. ECHA, the European Chemicals Agency, publishes classifications such as those for
            borates.
          </li>
          <li>
            <b>Australia:</b> Safe Work Australia's
            <a
              href="https://www.safeworkaustralia.gov.au/safety-topic/hazards/crystalline-silica-and-silicosis/research-lower-workplace-exposure-standard-respirable-crystalline-silica-0"
              >crystalline silica and silicosis pages</a
            >.
          </li>
          <li>
            <b>New Zealand:</b> WorkSafe New Zealand sets the workplace exposure standards; MBIE's
            <a
              href="https://mbie.govt.nz/building-and-energy/building/building-and-construction-consultations/work-with-engineered-stone-and-materials-containing-crystalline-silica/annex-iii"
              >history of the silica standard</a
            >
            gives the dates.
          </li>
          <li>
            <b>Kilns:</b> Skutt's
            <a href="https://cdn.shopify.com/s/files/1/0889/3726/7497/files/Designing-A-Kiln-Room-1.pdf"
              >kiln room guide</a
            >, the
            <a href="https://assets.noviams.com/novi-file-uploads/ccsa/Product_Safety/Fumes.pdf"
              >Orton and CCSA sheet on kiln fumes</a
            >, and above all your own kiln's manual.
          </li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="sources">
        <h2 id="sources" tabindex="-1">Sources</h2>
        <ul class="guide-sources">
          <li>
            <a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1053"
              >OSHA: 29 CFR 1910.1053, Respirable crystalline silica</a
            >
          </li>
          <li>
            <a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.134AppD"
              >OSHA: 29 CFR 1910.134 Appendix D, Information for employees using respirators when not required</a
            >
          </li>
          <li>
            <a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200AppD"
              >OSHA: 29 CFR 1910.1200 Appendix D, Safety data sheets</a
            >
          </li>
          <li><a href="https://www.cdc.gov/niosh/docs/92-107">NIOSH: Silicosis alert (publication 92-107)</a></li>
          <li>
            <a href="https://www.hse.gov.uk/PUBNS/guidance/cr1.pdf"
              >HSE: COSHH essentials CR1, Glaze and colour preparation</a
            >
          </li>
          <li>
            <a href="https://www.hse.gov.uk/PUBNS/guidance/cr5.pdf"
              >HSE: COSHH essentials CR5, Spraying glazes and colours</a
            >
          </li>
          <li>
            <a href="https://www.hse.gov.uk/respiratory-protective-equipment/fit-testing-basics.htm"
              >HSE: Fit testing basics</a
            >
          </li>
          <li>
            <a href="https://nepsi.eu/wp-content/uploads/2022/10/oel_full_table_september_2020_europe.pdf"
              >NEPSI: Occupational exposure limits for respirable crystalline silica in Europe</a
            >
          </li>
          <li>
            <a
              href="https://www.safeworkaustralia.gov.au/safety-topic/hazards/crystalline-silica-and-silicosis/research-lower-workplace-exposure-standard-respirable-crystalline-silica-0"
              >Safe Work Australia: Research on a lower workplace exposure standard for respirable crystalline silica</a
            >
          </li>
          <li>
            <a href="https://enviliance.com/regions/oceania/au/report_16612"
              >Enviliance: Report 16612, Australia's June 2026 decision on the silica exposure standard</a
            >
          </li>
          <li>
            <a
              href="https://mbie.govt.nz/building-and-energy/building/building-and-construction-consultations/work-with-engineered-stone-and-materials-containing-crystalline-silica/annex-iii"
              >MBIE (New Zealand): Work with engineered stone and materials containing crystalline silica, Annex III</a
            >
          </li>
          <li><a href="https://publications.iarc.who.int/120">IARC: Monographs Volume 100C</a></li>
          <li>
            <a
              href="https://monographs.iarc.who.int/news-events/volume-131-cobalt-antimony-compounds-and-weapons-grade-tungsten-alloy"
              >IARC: Volume 131, Cobalt, antimony compounds and weapons-grade tungsten alloy</a
            >
          </li>
          <li>
            <a href="https://sciencemediacentre.es/en/node/3775"
              >Science Media Centre Spain: IARC classifies talc (2024)</a
            >
          </li>
          <li>
            <a href="https://echa.europa.eu/documents/10162/7d740d8c-5cd5-872b-5da2-e549983a9ff9"
              >ECHA: Risk Assessment Committee document on boric acid and borates</a
            >
          </li>
          <li>
            <a href="https://coslaw.eu/eu-introduces-new-cmr-classifications-under-the-24th-atp-to-the-clp-regulation/"
              >Coslaw: EU introduces new CMR classifications under the 24th ATP to the CLP Regulation</a
            >
          </li>
          <li>
            <a href="https://www.ehs.utah.edu/guidelines/arts-safety-ceramics/"
              >University of Utah EHS: Arts safety: ceramics</a
            >
          </li>
          <li>
            <a href="https://arts.ucalgary.ca/sites/default/files/teams/36/Ceramics%20PDF.pdf"
              >University of Calgary: Ceramics health hazards</a
            >
          </li>
          <li><a href="https://digitalfire.com/glossary/toxicity">Digitalfire: Toxicity</a></li>
          <li><a href="https://digitalfire.com/glossary/kiln+fumes">Digitalfire: Kiln fumes</a></li>
          <li>
            <a href="https://digitalfire.com/hazard/barium+and+compounds+toxicology"
              >Digitalfire: Barium and compounds toxicology</a
            >
          </li>
          <li>
            <a href="https://digitalfire.com/hazard/manganese+inorganic+compounds+toxicology"
              >Digitalfire: Manganese inorganic compounds toxicology</a
            >
          </li>
          <li>
            <a
              href="https://jspsafety.helpjuice.com/en_GB/why-is-a-clean-shave-essential-for-a-proper-tight-fitting-respirator-seal-can-i-have-a-beard"
              >JSP: Why is a clean shave essential for a proper tight-fitting respirator seal?</a
            >
          </li>
          <li>
            <a href="https://cdn.shopify.com/s/files/1/0889/3726/7497/files/Designing-A-Kiln-Room-1.pdf"
              >Skutt: Kiln room design and product specifications</a
            >
          </li>
          <li>
            <a href="https://downloads.ccm-ct.org/pdf/Media-Library-Bulletins/KilnSafety-Bulletin-052825.pdf"
              >CIRMA: Kiln safety bulletin (2025)</a
            >
          </li>
          <li>
            <a href="https://ceramicartsnetwork.org/daily/article/How-and-Why-to-Use-a-Kiln-Vent"
              >Ceramic Arts Network: Dave Finkelnburg, How and why to use a kiln vent</a
            >
          </li>
          <li>
            <a href="https://assets.noviams.com/novi-file-uploads/ccsa/Product_Safety/Fumes.pdf"
              >CCSA and Orton: What is so bad about fumes?</a
            >
          </li>
        </ul>
      </section>
    </div>
  `
})
export class SafeMixingGuide {
  protected readonly sections = SECTIONS;
}
