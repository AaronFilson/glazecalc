import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/page-header';
import { GuideContents, GuideSection } from './guide-contents';

/** The guide's sections, for its contents list and their headings' ids. */
const SECTIONS: GuideSection[] = [
  { id: 'cones', label: 'Cones: what they measure' },
  { id: 'cone-chart', label: 'The cone chart' },
  { id: 'cone-pack', label: 'Setting up a cone pack' },
  { id: 'kiln-sitter', label: 'The kiln sitter' },
  { id: 'reading-cones', label: 'Reading cones' },
  { id: 'bisque', label: 'Bisque firing' },
  { id: 'glaze', label: 'Glaze firing' },
  { id: 'manual-kilns', label: 'Manual kilns in detail' },
  { id: 'venting', label: 'Venting, peeking and safety' },
  { id: 'cooling', label: 'Cooling and unloading' },
  { id: 'after', label: 'After the firing' },
  { id: 'rings', label: 'Rings and bars' },
  { id: 'sources', label: 'Sources' }
];

/** Firing a basic kiln: cones, kiln sitters and manual switches, with schedules for bisque and glaze. */
@Component({
  selector: 'gc-firing-guide',
  imports: [GuideContents, PageHeader, RouterLink],
  template: `
    <gc-page-header
      title="Firing a basic kiln"
      lead="How to fire an electric kiln with a kiln sitter or manual switches: choosing, placing and reading cones, with published schedules for bisque and glaze firings."
    />
    <gc-guide-contents [sections]="sections" />
    <div class="guide">
      <section class="panel" aria-labelledby="cones">
        <h2 id="cones" tabindex="-1">Cones: what they measure</h2>
        <p class="guide-callout">
          Follow your kiln's own manual first. This guide gathers what cone and kiln makers publish about basic electric
          kilns; it does not replace the instructions for your model, and where the two differ, the manual wins.
        </p>
        <p>
          A <b>pyrometric cone</b> is a small, slender pyramid made from a standardized ceramic powder. When it has had
          enough heat, it softens and bends over in a repeatable way. You set cones in the kiln beside the ware and read
          how far they bent.
        </p>
        <p>
          Cones measure <b>heatwork</b>, the combined effect of temperature and time. In the words of Orton, the main US
          cone maker, "Cones do not measure temperature alone." A cone heated slowly bends at a lower temperature than
          one heated fast, and a glaze behaves the same way. So Orton gives each cone's temperature for a stated heating
          rate over the last 180 °F (100 °C) of the firing. Once a cone starts to move, it bends over a narrow range,
          "usually less than 40° F" (22 °C).
        </p>

        <h3>Cone numbers</h3>
        <p>
          Cone numbers run from 022, the coolest, up to 42. A leading zero marks the cooler series and is read as "oh":
          cone 06 ("oh-six") is cooler than cone 04, and cone 01 needs less heat than cone 1. Orton warns that it is
          important not to mix the two series up. The gap is large: cone 06 bends more than 400 °F (220 °C) cooler than
          cone 6.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Firing ranges">
          <table class="guide-table">
            <caption>
              Common firing ranges (self-supporting cones at 108 °F/h, 60 °C/h)
            </caption>
            <thead>
              <tr>
                <th scope="col">Range</th>
                <th scope="col">Cones</th>
                <th scope="col">Temperature</th>
                <th scope="col">Typical use</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Low fire</th>
                <td>06–04</td>
                <td class="num">1,828–1,945 °F (998–1,063 °C)</td>
                <td>Earthenware glazes; bisque</td>
              </tr>
              <tr>
                <th scope="row">Mid fire</th>
                <td>5–6</td>
                <td class="num">2,167–2,232 °F (1,186–1,222 °C)</td>
                <td>Electric-kiln stoneware and porcelain</td>
              </tr>
              <tr>
                <th scope="row">High fire</th>
                <td>9–10</td>
                <td class="num">2,300–2,345 °F (1,260–1,285 °C)</td>
                <td>Mostly gas-fired stoneware and porcelain</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Suppliers in the UK, Europe, Australia and New Zealand often give a temperature in °C rather than a cone: find
          the nearest cone in the chart below and confirm it with a witness cone. Seger and Staffordshire cones, the
          older European series, should not be assumed to share Orton's numbers, so this guide uses Orton cones.
        </p>

        <h3>Holding adds heatwork</h3>
        <p>
          A <b>hold</b> (also called a <b>soak</b>) keeps the kiln at one temperature for a while. Because cones measure
          heatwork, a hold at the top can stand in for a hotter peak. Orton gives these rough equivalents:
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Holds and heatwork">
          <table class="guide-table">
            <caption>
              What a hold at the peak is worth
            </caption>
            <thead>
              <tr>
                <th scope="col">Hold</th>
                <th scope="col">Roughly the same heatwork as</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">About 20 minutes</th>
                <td>A peak 18 °F (10 °C) hotter</td>
              </tr>
              <tr>
                <th scope="row">40–60 minutes</th>
                <td>A peak 36 °F (20 °C) hotter</td>
              </tr>
              <tr>
                <th scope="row">About 2 hours</th>
                <td>A peak 54 °F (30 °C) hotter</td>
              </tr>
              <tr>
                <th scope="row">1–2 hours</th>
                <td>"may be sufficient to deform the next higher cone number"</td>
              </tr>
              <tr>
                <th scope="row">4–6 hours</th>
                <td>Enough to bend a cone two numbers hotter</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>So a hold is never free: if you add one, expect the cones to bend further, and lower the peak to match.</p>

        <h3>Kinds of cone</h3>
        <p>
          Orton makes four kinds. Two stand on the shelf to show what the ware received; two are for the kiln sitter.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Kinds of cone">
          <table class="guide-table">
            <caption>
              Orton's four kinds of cone
            </caption>
            <thead>
              <tr>
                <th scope="col">Kind</th>
                <th scope="col">Used for</th>
                <th scope="col">How it stands</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Self-supporting</th>
                <td>Witness cone on the shelf</td>
                <td>A built-in base sets the height, 1¾ in (44 mm), and the 8° lean; no holder needed</td>
              </tr>
              <tr>
                <th scope="row">Large</th>
                <td>Witness cone on the shelf</td>
                <td>Set in a plaque or a pat of clay with exactly 2 in (51 mm) showing, leaning 8° from upright</td>
              </tr>
              <tr>
                <th scope="row">Small (junior)</th>
                <td>Kiln sitter</td>
                <td>Lies across the sitter's supports; 15/16 in (24 mm) showing if stood on a shelf</td>
              </tr>
              <tr>
                <th scope="row">Bar</th>
                <td>Kiln sitter</td>
                <td>The same powder as small cones, in an even bar shape</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Height matters: a ¼ in (6 mm) difference in the height of a large cone "can cause more than a half cone
          difference in bending". Cones do not go bad or age, and damp storage does not affect them.
        </p>

        <h3>What "cone 6" means in practice</h3>
        <p>
          The chart gives a self-supporting cone 6 as 2,232 °F (1,222 °C), but only when the last 180 °F (100 °C) climbs
          at 108 °F/h (60 °C/h). Climbing at 270 °F/h (150 °C/h), the same cone bends at 2,269 °F (1,243 °C). Real kilns
          differ again: Digitalfire reports that "Most kilns reach cone 6 at 2200°F, not 2232°F". So "cone 6" means the
          ware received the heatwork that bends a cone 6, whatever a thermometer read at the time.
        </p>
        <p class="guide-callout">
          Fire by the cone, not the clock or the dial. Set a controller by cone number, and let a witness cone on the
          shelf confirm every firing.
        </p>
      </section>

      <section class="panel" aria-labelledby="cone-chart">
        <h2 id="cone-chart" tabindex="-1">The cone chart</h2>
        <p>
          These figures are from Orton's cone chart (©2001) for self-supporting cones. Choose the column that matches
          how fast your kiln climbed over the last 180 °F (100 °C). Orton's rule of thumb is the 270 column for a fast
          firing, the 108 column for a medium one and the 27 column for a slow one. To work out a rate, divide the
          temperature climbed by the hours it took: a kiln that reaches 900 °F (482 °C) in 3 hours is heating at about
          300 °F/h (167 °C/h).
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Orton cone chart">
          <table class="guide-table">
            <caption>
              Orton self-supporting cones: the temperature at which each bends, by heating rate over the last 180 °F
              (100 °C)
            </caption>
            <thead>
              <tr>
                <th scope="col">Cone</th>
                <th scope="col">Slow, 27 °F/h (15 °C/h)</th>
                <th scope="col">Medium, 108 °F/h (60 °C/h)</th>
                <th scope="col">Fast, 270 °F/h (150 °C/h)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">022</th>
                <td class="num">–</td>
                <td class="num">1,087 °F (586 °C)</td>
                <td class="num">1,094 °F (590 °C)</td>
              </tr>
              <tr>
                <th scope="row">018</th>
                <td class="num">–</td>
                <td class="num">1,319 °F (715 °C)</td>
                <td class="num">1,353 °F (734 °C)</td>
              </tr>
              <tr>
                <th scope="row">015</th>
                <td class="num">–</td>
                <td class="num">1,456 °F (791 °C)</td>
                <td class="num">1,504 °F (818 °C)</td>
              </tr>
              <tr>
                <th scope="row">010</th>
                <td class="num">1,636 °F (891 °C)</td>
                <td class="num">1,657 °F (903 °C)</td>
                <td class="num">1,679 °F (915 °C)</td>
              </tr>
              <tr>
                <th scope="row">08</th>
                <td class="num">1,692 °F (922 °C)</td>
                <td class="num">1,728 °F (942 °C)</td>
                <td class="num">1,753 °F (956 °C)</td>
              </tr>
              <tr>
                <th scope="row">07</th>
                <td class="num">–</td>
                <td class="num">1,789 °F (976 °C)</td>
                <td class="num">1,809 °F (987 °C)</td>
              </tr>
              <tr>
                <th scope="row">06</th>
                <td class="num">1,798 °F (981 °C)</td>
                <td class="num">1,828 °F (998 °C)</td>
                <td class="num">1,855 °F (1,013 °C)</td>
              </tr>
              <tr>
                <th scope="row">05</th>
                <td class="num">1,870 °F (1,021 °C)</td>
                <td class="num">1,888 °F (1,031 °C)</td>
                <td class="num">1,911 °F (1,044 °C)</td>
              </tr>
              <tr>
                <th scope="row">04</th>
                <td class="num">1,915 °F (1,046 °C)</td>
                <td class="num">1,945 °F (1,063 °C)</td>
                <td class="num">1,971 °F (1,077 °C)</td>
              </tr>
              <tr>
                <th scope="row">03</th>
                <td class="num">1,960 °F (1,071 °C)</td>
                <td class="num">1,987 °F (1,086 °C)</td>
                <td class="num">2,019 °F (1,104 °C)</td>
              </tr>
              <tr>
                <th scope="row">02</th>
                <td class="num">–</td>
                <td class="num">2,016 °F (1,102 °C)</td>
                <td class="num">2,052 °F (1,122 °C)</td>
              </tr>
              <tr>
                <th scope="row">01</th>
                <td class="num">1,999 °F (1,093 °C)</td>
                <td class="num">2,046 °F (1,119 °C)</td>
                <td class="num">2,080 °F (1,138 °C)</td>
              </tr>
              <tr>
                <th scope="row">1</th>
                <td class="num">2,028 °F (1,109 °C)</td>
                <td class="num">2,079 °F (1,137 °C)</td>
                <td class="num">2,109 °F (1,154 °C)</td>
              </tr>
              <tr>
                <th scope="row">4</th>
                <td class="num">2,086 °F (1,141 °C)</td>
                <td class="num">2,124 °F (1,162 °C)</td>
                <td class="num">2,161 °F (1,183 °C)</td>
              </tr>
              <tr>
                <th scope="row">5</th>
                <td class="num">2,118 °F (1,159 °C)</td>
                <td class="num">2,167 °F (1,186 °C)</td>
                <td class="num">2,205 °F (1,207 °C)</td>
              </tr>
              <tr>
                <th scope="row">6</th>
                <td class="num">2,165 °F (1,185 °C)</td>
                <td class="num">2,232 °F (1,222 °C)</td>
                <td class="num">2,269 °F (1,243 °C)</td>
              </tr>
              <tr>
                <th scope="row">7</th>
                <td class="num">2,194 °F (1,201 °C)</td>
                <td class="num">2,262 °F (1,239 °C)</td>
                <td class="num">2,295 °F (1,257 °C)</td>
              </tr>
              <tr>
                <th scope="row">8</th>
                <td class="num">2,212 °F (1,211 °C)</td>
                <td class="num">2,280 °F (1,249 °C)</td>
                <td class="num">2,320 °F (1,271 °C)</td>
              </tr>
              <tr>
                <th scope="row">9</th>
                <td class="num">2,235 °F (1,224 °C)</td>
                <td class="num">2,300 °F (1,260 °C)</td>
                <td class="num">2,336 °F (1,280 °C)</td>
              </tr>
              <tr>
                <th scope="row">10</th>
                <td class="num">2,284 °F (1,251 °C)</td>
                <td class="num">2,345 °F (1,285 °C)</td>
                <td class="num">2,381 °F (1,305 °C)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>A dash marks a figure not copied here; see Orton's full chart for it.</p>
        <p>
          Large cones read within a few degrees of these figures: a large cone 6 at 108 °F/h (60 °C/h) is 2,228 °F
          (1,220 °C). Small cones, the kind used in a kiln sitter, are listed only at 540 °F/h (300 °C/h), so the chart
          gives a small cone 6 as 2,291 °F (1,255 °C). That is not the temperature at which a sitter turns the kiln off.
          The sitter cone's job is to match the shelf cone, and the shelf cone has the final say.
        </p>
        <p>
          Two cautions. Orton's 2019 booklet gives cone 06 at the fast rate as 1,875 °F, but the chart and Orton's FAQ
          both give 1,855 °F (1,013 °C), used here. And the large-cone table at the back of the Dawson kiln sitter
          manual has copying errors (cone 5 hotter than cone 6), so do not use it.
        </p>
      </section>

      <section class="panel" aria-labelledby="cone-pack">
        <h2 id="cone-pack" tabindex="-1">Setting up a cone pack</h2>
        <p>
          A <b>witness cone</b> is a cone set on a shelf beside the ware, where it gets the same heat. Orton is plain
          about its role: "The only true measurement of heatwork is from a Large or Self-supporting cone placed on the
          shelf next to the ware." A kiln sitter sits near the wall, and a controller's or pyrometer's probe reads the
          temperature near the wall; a witness cone reads where the pots are.
        </p>
        <p>A <b>cone pack</b> is three witness cones set together, one number apart:</p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Three-cone pack">
          <table class="guide-table">
            <caption>
              The three-cone pack
            </caption>
            <thead>
              <tr>
                <th scope="col">Cone</th>
                <th scope="col">Which number</th>
                <th scope="col">Cone 04 bisque</th>
                <th scope="col">Cone 6 glaze</th>
                <th scope="col">When it bends</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Guide</th>
                <td>One number cooler than the target</td>
                <td>05</td>
                <td>5</td>
                <td>The ware is nearing maturity</td>
              </tr>
              <tr>
                <th scope="row">Firing</th>
                <td>The target</td>
                <td>04</td>
                <td>6</td>
                <td>The firing is at the right point</td>
              </tr>
              <tr>
                <th scope="row">Guard</th>
                <td>One number hotter</td>
                <td>03</td>
                <td>7</td>
                <td>The firing has gone too far</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Self-supporting cones or a plaque</h3>
        <p>
          L&amp;L, a US kiln maker, recommends self-supporting cones for the pack "because they are the easiest to use
          and provide the most consistent results": their height and lean are built in.
        </p>
        <p>
          Large cones need a <b>plaque</b> (a ready-made holder) or a <b>pat</b> of soft, porous clay pricked with
          pencil holes. Set each with exactly 2 in (51 mm) showing, leaning 8° from upright toward its
          <b>bending face</b>. To find that face, stand the cone on its base on a flat surface, hold it by the tip and
          let go: it falls toward the bending face.
        </p>

        <h3>Where to put the packs</h3>
        <ol>
          <li>
            Put the pack "deep in the kiln, yet... visible through a peephole" (Orton), near the center of the load and
            away from drafts (L&amp;L). Not right at the peephole: the cones should feel the heat the ware feels.
          </li>
          <li>Before you close the lid, look through the peephole and check that you can see all three cones.</li>
          <li>
            In a kiln with a sitter, keep the pack's shelf at least 1 in (25 mm) above or below the sitter tube, so a
            tilting shelf cannot jam the sitter.
          </li>
          <li>
            For your first firings, put a pack on the top, middle and bottom shelves. L&amp;L's calibration test goes
            further: two packs of cones 07, 06 and 05 on every shelf, one at the edge and one in the center.
          </li>
        </ol>
        <p>
          Expect differences: Orton says "Typically, you will see at least a one cone difference from top to bottom in
          the kiln", and densely packed areas fire cooler. Packs you cannot see during the firing still give a record
          afterward.
        </p>
      </section>

      <section class="panel" aria-labelledby="kiln-sitter">
        <h2 id="kiln-sitter" tabindex="-1">The kiln sitter</h2>
        <p>
          A <b>kiln sitter</b> is the mechanical switch, on the outside of many basic and older kilns, that turns the
          kiln off when a small cone bends. The best known is the Dawson Kiln-Sitter. It makes firing easier, but it is
          a convenience, not a safety device.
        </p>

        <h3>How it works</h3>
        <p>
          A porcelain tube reaches into the kiln. At its end, a small cone or a bar lies across two metal supports,
          under a <b>sensing rod</b> that pivots like a seesaw. Outside the kiln, the other end of the rod holds up a
          weight by a small claw. When the cone softens and bends to about 90°, the rod drops far enough to release the
          weight, the weight falls, and the power to the elements is cut.
        </p>
        <p>
          Small cones and bars "give equivalent heat treatment". Orton notes that many beginners choose bars, because
          their even shape makes it easy to place them the same way every time. A small cone tapers, so where it sits
          matters: with its thin part under the rod the kiln shuts off cooler, and with its thick part hotter, a shift
          of "as much as 1/2 cone".
        </p>

        <h3>Which cone goes in the sitter</h3>
        <p>
          Sources disagree. Dawson, who made the sitter, says to use the same number as the firing cone on the shelf,
          and to go one number hotter only if the shelf cone stays unbent. L&amp;L says to use one number hotter than
          the shelf cones, because the sitter sits near the wall and the elements, gets more heat, and tends to shut off
          early. Orton settles the principle: "The shelf cone is the final judge of the firing process, not the
          Kiln-Sitter cone or bar."
        </p>
        <p class="guide-callout">
          Our starting point: put a small cone of the same number as your target in the sitter, with a cone pack on the
          shelf. If the shelf firing cone is under-bent when the kiln shuts off, go one number hotter in the sitter next
          time, or set the thicker part of the cone under the rod. If it is over-bent, do the opposite.
        </p>

        <h3>Setting it up, and checks before every firing</h3>
        <p>Dawson's procedure, which doubles as a check before every firing:</p>
        <ol>
          <li>
            Turn all the switches off. Check that the sensing rod moves freely, sits centered in the tube and is not
            bent or corroded. If it is sluggish, Dawson says to replace the tube assembly.
          </li>
          <li>
            Brush a thin coat of high-fire <b>kiln wash</b> (a coating that stops melted material sticking) onto the
            cone supports and the rod where it touches the cone. Never put wash on the cone or the porcelain tube.
          </li>
          <li>
            Load shelves and ware at least 1 in (25 mm) above or below the tube, so nothing can touch, fall against or
            block it.
          </li>
          <li>
            Lift the weight, press the claw down onto the trigger, and lay the cone or bar flat on the supports against
            the metal step, as your sitter's manual shows, the same way every time. Check it again before closing the
            lid: "AN IMPROPERLY PLACED CONE OR BAR COULD CAUSE AN OVERFIRING."
          </li>
          <li>
            Set the limit timer and push in the plunger until it locks. Keep the kiln level and the space under the
            weight clear, so the weight can fall.
          </li>
        </ol>

        <h3>The limit timer</h3>
        <p>
          Many sitters, including Dawson's LT models, have a <b>limit timer</b>: a clock that turns the kiln off after a
          set time, as a backup "in case the KILN-SITTER fails". It should always be set longer than the firing is
          expected to take. Sources set the margin differently:
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Limit timer settings">
          <table class="guide-table">
            <caption>
              How long to set the limit timer
            </caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Setting</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Dawson</th>
                <td>
                  ½ hour longer than the expected firing time until you know the kiln, later as little as ¼ hour; never
                  beyond 20 hours
                </td>
              </tr>
              <tr>
                <th scope="row">L&amp;L</th>
                <td>Very high the first time, noting how long the firing takes; after that, about 1 hour longer</td>
              </tr>
              <tr>
                <th scope="row">Bracker's</th>
                <td>30 minutes to 1 hour longer than the firing time</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="guide-callout">
          Our starting point: generous the first time (within the dial's 20 hours), then ½ to 1 hour longer than the
          time you recorded. The timer also tells you how long a firing took: set at 7 and ending at 1 means 6 hours.
        </p>

        <h3>When it shuts off early or late</h3>
        <p>After each firing, read the sitter cone beside the shelf cones.</p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Kiln sitter problems">
          <table class="guide-table">
            <caption>
              Reading the sitter after a firing
            </caption>
            <thead>
              <tr>
                <th scope="col">What you see</th>
                <th scope="col">Likely cause</th>
                <th scope="col">What to do</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Sitter tripped, shelf firing cone under-bent</th>
                <td>The sitter ran hotter than the shelf (it sits near the wall)</td>
                <td>One cone hotter in the sitter, or the thicker part under the rod</td>
              </tr>
              <tr>
                <th scope="row">Sitter cone sagged well past 90°</th>
                <td>The kiln climbed too fast near the end</td>
                <td>Lower the switch settings, so the climb is slower (Dawson)</td>
              </tr>
              <tr>
                <th scope="row">Sitter cone did not bend, or melted into a blob</th>
                <td>
                  The sitter itself: poor adjustment, a bent or corroded rod, or something lodged in or against the tube
                </td>
                <td>Check and adjust the sitter by its manual before firing again</td>
              </tr>
              <tr>
                <th scope="row">Early or late every time</th>
                <td>Out of adjustment, or a worn rod</td>
                <td>Check with the firing gauge; move the trigger plate</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          To check the adjustment, Dawson uses a <b>firing gauge</b> that holds the rod where a fully bent cone would
          leave it; there should then be "1/16th-inch clearance" (about 1.6 mm) at the claw. Check it every 30 firings.
          Ceramics Monthly's rule: if the kiln shuts off early, move the trigger plate up slightly; if late, move it
          down slightly. Whatever the sitter does, "Always trust large witness cones over small sitter cones."
        </p>
        <div class="guide-warning" role="note">
          <p>
            <b>A kiln sitter is not a safety device.</b> Dawson's manual says it "is NOT intended to perform as a
            fail-safe shut-off device and your kiln should NOT be left unattended beyond the estimated firing time."
            Something as simple as greenware falling against the tube "might cause an over-firing". Be there to check
            the kiln when it should be finishing, and never fire it over or near anything that burns, such as a wood
            floor or carpet.
          </p>
        </div>
        <p>
          The sitter is built for firings "up to and including Cone 8". It cannot hold a temperature or cool slowly by
          itself. With practice and a log, though, you can "become the controller", as Digitalfire puts it: watch the
          cones and turn the switches by hand.
        </p>
      </section>

      <section class="panel" aria-labelledby="reading-cones">
        <h2 id="reading-cones" tabindex="-1">Reading cones</h2>
        <p>Cones are read twice: through the peephole while the kiln fires, and in your hand once it has cooled.</p>

        <h3>During the firing</h3>
        <p>
          A <b>peephole</b> is a small hole through the kiln wall, closed with a removable plug. Never look in without
          eye protection. Orton says "Welders glasses should be used to avoid possible eye injury. Sunglasses are not
          recommended." Shade 3 welding glasses, rated for infrared, are the most often recommended; go darker if you
          see spots afterward.
        </p>
        <ul>
          <li>The <b>guide cone</b> starting to bend means the end is near: watch closely from here.</li>
          <li>
            Once a cone starts, it takes 15 to 25 minutes to bend (Orton's newer booklet says 15 to 22), slowly at
            first, then quickly once it passes halfway, at 3 o'clock.
          </li>
          <li>The <b>firing cone</b> is done when its tip is level with its base.</li>
        </ul>
        <p>
          On a manual kiln, the peephole is your only real-time signal, which is why the pack must sit where you can see
          it.
        </p>

        <h3>After the firing</h3>
        <p>
          Orton reads the bend as a clock face. An unbent cone points up, at 12 o'clock. The end point is 6 o'clock, the
          tip level with the base: the point the chart's temperatures are measured at. Between 4 o'clock and touching
          the shelf the difference is small, "usually 1 or 2 degrees".
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Reading a cone pack">
          <table class="guide-table">
            <caption>
              Reading a cone pack after the firing (example: cones 5, 6 and 7 for a cone 6 glaze)
            </caption>
            <thead>
              <tr>
                <th scope="col">What you see</th>
                <th scope="col">What it means</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Cone 5 down; cone 6 tip level with its base or a little lower; cone 7 upright or just leaning
                </th>
                <td>On target: cone 6 reached</td>
              </tr>
              <tr>
                <th scope="row">Cone 5 bent; cone 6 only part way, at 2 or 3 o'clock, or upright</th>
                <td>Under-fired: the firing stopped too soon</td>
              </tr>
              <tr>
                <th scope="row">Even cone 5 barely moved</th>
                <td>Well under-fired, by a cone or more</td>
              </tr>
              <tr>
                <th scope="row">Cones 5 and 6 flat; cone 7 bent</th>
                <td>Over-fired: "you have exceeded the best time-temperature relationship"</td>
              </tr>
              <tr>
                <th scope="row">All three slumped flat or melted onto the plaque</th>
                <td>Badly over-fired; check the sitter and timer before firing again</td>
              </tr>
              <tr>
                <th scope="row">Greenish cones, or gray bisque</th>
                <td>Poor venting, or firing too fast</td>
              </tr>
              <tr>
                <th scope="row">Top pack bent more than the bottom</th>
                <td>An uneven kiln; a one-cone difference is typical</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Adjusting next time</h3>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Adjusting the next firing">
          <table class="guide-table">
            <caption>
              What to change next time
            </caption>
            <thead>
              <tr>
                <th scope="col">The cones said</th>
                <th scope="col">Kiln sitter</th>
                <th scope="col">Controller</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Under-fired</th>
                <td>One cone hotter in the sitter, or the thicker part under the rod</td>
                <td>
                  Use the cone offset to fire a little hotter, or add a short hold (about 20 minutes is worth 18 °F, 10
                  °C, of peak)
                </td>
              </tr>
              <tr>
                <th scope="row">Over-fired</th>
                <td>
                  One cone cooler, or the thinner part under the rod; if the sitter cone sagged far past 90°, lower the
                  switch settings
                </td>
                <td>Use the cone offset to fire a little cooler, or shorten or remove the hold</td>
              </tr>
              <tr>
                <th scope="row">Top and bottom differ by more than a cone</th>
                <td>Change the switch pattern (see Manual kilns in detail)</td>
                <td>Load the cooler area more lightly; follow your manual</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          A <b>cone offset</b> is a controller setting that moves its temperature for a cone up or down to match what
          your witness cones show. Keep every fired pack and write down how each one bent (see After the firing, below).
        </p>
      </section>

      <section class="panel" aria-labelledby="bisque">
        <h2 id="bisque" tabindex="-1">Bisque firing</h2>
        <p>
          The <b>bisque</b> firing (biscuit in the UK) is the first, lower firing that turns dry clay into hard, porous
          ware ready to glaze. It is usually fired to cone 06–04, 1,828–1,945 °F (998–1,063 °C) on Orton's chart; UK
          potters often fire to around 1,000 °C (1,832 °F), near cone 06. The bisque should stay porous, "generally more
          than 15%" (Digitalfire), so it soaks water out of the glaze. Too soft a bisque takes glaze on too thick, which
          then cracks and <b>crawls</b> (pulls back into islands, leaving bare clay). Under-fired bisque also "continues
          to shrink during glaze firing", which spoils the glaze fit. Loading is forgiving: pieces may touch, lids can
          be fired on their pots, and bowls go rim to rim rather than nested.
        </p>

        <h3>Why the early part goes slowly</h3>
        <p>
          Water turning to steam "expands 1,170 times", Bracker's notes, so damp ware has to be dried slowly. L&amp;L
          and Orton advise that "Special care should be taken below 1500°F (815°C) to heat the body evenly", and that
          carbon must be burned out before about 1,200 °F (650 °C). Above 1,500 °F the kiln can climb faster.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="What happens in a bisque">
          <table class="guide-table">
            <caption>
              What happens as a bisque heats
            </caption>
            <thead>
              <tr>
                <th scope="col">Temperature</th>
                <th scope="col">What happens</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" class="num">300–500 °F (149–260 °C)</th>
                <td>Binders burn off</td>
              </tr>
              <tr>
                <th scope="row" class="num">About 450 °F (232 °C)</th>
                <td>Organic matter starts to burn</td>
              </tr>
              <tr>
                <th scope="row" class="num">Up to 700 °F (371 °C)</th>
                <td>Water keeps leaving the clay until above this temperature</td>
              </tr>
              <tr>
                <th scope="row" class="num">842–1,022 °F (450–550 °C)</th>
                <td>Chemically bound water leaves the clay</td>
              </tr>
              <tr>
                <th scope="row" class="num">1,063 °F (573 °C)</th>
                <td>Quartz inversion: silica in the clay expands suddenly</td>
              </tr>
              <tr>
                <th scope="row" class="num">Above 1,112 °F (600 °C)</th>
                <td>Sulfur burns out</td>
              </tr>
              <tr>
                <th scope="row" class="num">Up to 1,200–1,400 °F (649–760 °C)</th>
                <td>Natural carbon burns off; this should finish below red heat</td>
              </tr>
              <tr>
                <th scope="row" class="num">Above 1,544 °F (840 °C)</th>
                <td>Calcium carbonate breaks down</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <b>Quartz inversion</b> is the sudden change in size of the silica in clay at 1,063 °F (573 °C): it expands on
          the way up and contracts on the way down. L&amp;L's Slow Bisque slows through it, between 1,000 and 1,100 °F
          (538–593 °C). Digitalfire found this "unnecessary for bisque firings", and Ceramics Monthly says it mainly
          matters when cooling dense ware. Slowing costs little, so our suggestion is to keep it for thick pieces.
        </p>

        <h3>Candling: drying in the kiln</h3>
        <p>
          <b>Candling</b> means holding the kiln at a low temperature, with the lid propped or the vent running, until
          the last moisture has left the ware. Sources disagree about the temperature:
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Candling temperatures">
          <table class="guide-table">
            <caption>
              Candling temperatures
            </caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Candling</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Ceramics Monthly</th>
                <td>Just short of boiling; for example, climbing at 25 °F/h (14 °C/h) for 4–6 hours</td>
              </tr>
              <tr>
                <th scope="row">L&amp;L preheat</th>
                <td>Hold at 150–200 °F (66–93 °C)</td>
              </tr>
              <tr>
                <th scope="row">Digitalfire</th>
                <td>Hold at 250 °F (121 °C), because holding below boiling "does not expel all the water"</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="guide-callout">
          Our starting point: climb slowly to no more than about 250 °F (121 °C), and hold until a mirror at the vent
          stays clear. Hold overnight for thick or damp ware.
        </p>
        <p>
          The <b>mirror test</b>: hold a room-temperature mirror at a vent hole or at the gap under a propped lid. If it
          fogs, water is still leaving; wait, then test again.
        </p>

        <h3>Controller schedules</h3>
        <p>
          A <b>controller</b> is an electronic unit that fires the kiln through a <b>schedule</b>: a list of
          <b>segments</b>, each a rate of climb (the <b>ramp</b>), a target temperature and an optional hold. Below are
          two presets from L&amp;L's DynaTrol and Bartlett controllers, and a schedule published by Digitalfire. "Peak"
          is the controller's own temperature for the cone you choose: for cone 04 it is 1,926 °F (1,052 °C), and for
          cone 06, 1,819 °F (993 °C).
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Bisque presets">
          <table class="guide-table">
            <caption>
              L&amp;L and Bartlett bisque presets
            </caption>
            <thead>
              <tr>
                <th scope="col">Segment</th>
                <th scope="col">Climb to</th>
                <th scope="col">Slow Bisque</th>
                <th scope="col">Fast Bisque</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1</th>
                <td class="num">250 °F (121 °C)</td>
                <td class="num">80 °F/h (44 °C/h)</td>
                <td class="num">120 °F/h (67 °C/h)</td>
              </tr>
              <tr>
                <th scope="row">2</th>
                <td class="num">1,000 °F (538 °C)</td>
                <td class="num">200 °F/h (111 °C/h)</td>
                <td class="num">300 °F/h (167 °C/h)</td>
              </tr>
              <tr>
                <th scope="row">3</th>
                <td class="num">1,100 °F (593 °C)</td>
                <td class="num">100 °F/h (56 °C/h)</td>
                <td class="num">150 °F/h (83 °C/h)</td>
              </tr>
              <tr>
                <th scope="row">4</th>
                <td>250 °F (139 °C) below the peak: 1,676 °F (913 °C) for cone 04</td>
                <td class="num">180 °F/h (100 °C/h)</td>
                <td class="num">180 °F/h (100 °C/h)</td>
              </tr>
              <tr>
                <th scope="row">5</th>
                <td>The peak</td>
                <td class="num">80 °F/h (44 °C/h)</td>
                <td class="num">108 °F/h (60 °C/h)</td>
              </tr>
              <tr>
                <th scope="row">Heating time, empty kiln</th>
                <td></td>
                <td>About 13 hours or more</td>
                <td>About 10–11½ hours</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          L&amp;L's times are "for the fastest possible empty kilns"; a loaded kiln can take as much as four times
          longer, and any hold you add is extra heatwork the presets do not allow for. L&amp;L advises Slow Bisque, with
          a preheat of 2–3 hours or longer, for large or damp pieces, and warns against fast firing, which "can cause
          defects like pinholes, cracking, and insufficient burnout".
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Digitalfire BQ1000">
          <table class="guide-table">
            <caption>
              Digitalfire BQ1000 bisque, to about cone 06
            </caption>
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">Rate</th>
                <th scope="col">Target</th>
                <th scope="col">Hold</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1</th>
                <td class="num">306 °F/h (170 °C/h)</td>
                <td class="num">248 °F (120 °C)</td>
                <td>60 minutes; up to 10 hours for heavy ware</td>
              </tr>
              <tr>
                <th scope="row">2</th>
                <td class="num">306 °F/h (170 °C/h)</td>
                <td class="num">1,733 °F (945 °C)</td>
                <td>None</td>
              </tr>
              <tr>
                <th scope="row">3</th>
                <td class="num">108 °F/h (60 °C/h)</td>
                <td class="num">1,832 °F (1,000 °C)</td>
                <td>15 minutes</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          BQ1000 takes about 7 hours 44 minutes. Its author finds up to 500 °F/h (278 °C/h) fine for thin, dry ware, and
          slows the last step to even out the temperature through the load.
        </p>

        <h3>Controller cones and Orton's chart</h3>
        <p>
          L&amp;L and Bartlett controllers use 1,926 °F (1,052 °C) for cone 04 and 1,819 °F (993 °C) for cone 06, a
          little below Orton's 1,945 °F (1,063 °C) and 1,828 °F (998 °C); they agree at cone 6 and cone 10. Witness
          cones settle the difference: if they disagree with the controller, correct it with the cone offset.
        </p>

        <h3>On a manual kiln</h3>
        <p>
          A manual kiln follows the same plan by hand: dry slowly with the lid propped and the peepholes open, step the
          switches up from Low to Medium to High, and let the sitter end the firing. The published procedures are under
          Manual kilns in detail, below.
        </p>
      </section>

      <section class="panel" aria-labelledby="glaze">
        <h2 id="glaze" tabindex="-1">Glaze firing</h2>
        <p>
          The glaze firing melts the glaze into glass on the bisque. Most beginners fire low-fire glazes at cone 06–04
          or mid-fire glazes at cone 5–6. Fire to the cone on your clay and glaze labels, with a cone pack around that
          number. For what happens inside the glaze as it melts, see
          <a routerLink="/guides/glazing-basics">Glazing from first principles</a>.
        </p>

        <h3>Loading for a glaze firing</h3>
        <ul>
          <li>Glazed pieces must not touch each other or the walls: leave about ½ in (13 mm).</li>
          <li>
            Keep glaze off the foot (<b>dry-footing</b>), or set low-fire ware on <b>stilts</b>, small stands with
            points. Stoneware and porcelain should not stand on stilts, which embed at those temperatures; use high-fire
            kiln wash or silica sand instead.
          </li>
          <li>Leave at least 1 in (25 mm) between the shelf edges and the wall or sitter.</li>
        </ul>

        <h3>Controller schedules</h3>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Glaze presets">
          <table class="guide-table">
            <caption>
              L&amp;L and Bartlett glaze presets
            </caption>
            <thead>
              <tr>
                <th scope="col">Segment</th>
                <th scope="col">Climb to</th>
                <th scope="col">Slow Glaze</th>
                <th scope="col">Fast Glaze</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1</th>
                <td class="num">250 °F (121 °C)</td>
                <td class="num">150 °F/h (83 °C/h)</td>
                <td>No separate step</td>
              </tr>
              <tr>
                <th scope="row">2</th>
                <td>250 °F (139 °C) below the peak</td>
                <td class="num">400 °F/h (222 °C/h)</td>
                <td class="num">570 °F/h (317 °C/h)</td>
              </tr>
              <tr>
                <th scope="row">3</th>
                <td>The peak</td>
                <td class="num">120 °F/h (67 °C/h)</td>
                <td class="num">200 °F/h (111 °C/h)</td>
              </tr>
              <tr>
                <th scope="row">Heating time, empty kiln</th>
                <td></td>
                <td>About 6½–7½ hours</td>
                <td>About 3–4 hours</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Preset targets">
          <table class="guide-table">
            <caption>
              Where segments 2 and 3 end, by cone (L&amp;L and Bartlett)
            </caption>
            <thead>
              <tr>
                <th scope="col">Cone</th>
                <th scope="col">Segment 2 ends</th>
                <th scope="col">Peak</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">06</th>
                <td class="num">1,569 °F (854 °C)</td>
                <td class="num">1,819 °F (993 °C)</td>
              </tr>
              <tr>
                <th scope="row">04</th>
                <td class="num">1,676 °F (913 °C)</td>
                <td class="num">1,926 °F (1,052 °C)</td>
              </tr>
              <tr>
                <th scope="row">6</th>
                <td class="num">1,982 °F (1,083 °C)</td>
                <td class="num">2,232 °F (1,222 °C)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Slow Glaze is the safer default, given L&amp;L's warning about fast firing. If you add a hold of more than
          5–10 minutes at the peak, L&amp;L says to lower the target or the cone offset to match, and notes that
          "Soaking at high temperatures accelerates element and thermocouple wear."
        </p>

        <h3>Cone 6: drop-and-hold</h3>
        <p>
          Mid-fire glazes sometimes come out with <b>pinholes</b> (tiny holes in the surface) or blisters, left by gas
          bubbling out of the melt. A <b>drop-and-hold</b> schedule fires to the top, cools quickly by about 100 °F (56
          °C) and holds there. In Digitalfire's words, "Dropping 100°F and holding gives the melt enough viscosity to
          burst bubbles while still letting them heal."
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Digitalfire PLC6DS">
          <table class="guide-table">
            <caption>
              Digitalfire PLC6DS, cone 6 drop-and-hold
            </caption>
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">Rate</th>
                <th scope="col">Target</th>
                <th scope="col">Hold</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1</th>
                <td class="num">108 °F/h (60 °C/h)</td>
                <td class="num">250 °F (121 °C)</td>
                <td>60 minutes</td>
              </tr>
              <tr>
                <th scope="row">2</th>
                <td class="num">350 °F/h (194 °C/h)</td>
                <td class="num">2,100 °F (1,148 °C)</td>
                <td>Optional 30 minutes, to clear clouds of bubbles</td>
              </tr>
              <tr>
                <th scope="row">3</th>
                <td class="num">108 °F/h (60 °C/h)</td>
                <td class="num">2,200 °F (1,204 °C)</td>
                <td>10 minutes; longer in big kilns</td>
              </tr>
              <tr>
                <th scope="row">4</th>
                <td class="num">Down at 900 °F/h (500 °C/h)</td>
                <td class="num">2,100 °F (1,148 °C)</td>
                <td>30 minutes</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          PLC6DS takes about 9 hours 36 minutes. For more fluid glazes, Digitalfire drops about 200 °F (111 °C) instead;
          dropping too far "risks crystallization during the hold". Its peak of 2,200 °F (1,204 °C) is below the chart's
          2,232 °F (1,222 °C) for cone 6; Digitalfire reports that most kilns reach cone 6 at about 2,200 °F. Check it
          with a cone pack in your own kiln.
        </p>

        <h3>Slow cooling</h3>
        <p>
          <b>Slow cooling</b> means the controller cools the kiln at a set rate instead of letting it fall freely.
          Digitalfire's C6DHSC is PLC6DS followed by cooling at 150 °F/h (83 °C/h) from 2,100 °F (1,148 °C) down to
          1,400 °F (760 °C), then off. It "improves brilliance and surface quality" and helps rutile blues, but slow
          cooling "can increase matteness" (one matte glaze went dry) and can shorten the life of the kiln's relays.
          L&amp;L ships a slow-cool program for cone 6 as well:
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="L and L slow cool">
          <table class="guide-table">
            <caption>
              L&amp;L "User 6": slow cooling for cone 6 glazes
            </caption>
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">Rate</th>
                <th scope="col">Target</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1</th>
                <td>Full speed up</td>
                <td class="num">2,232 °F (1,222 °C)</td>
              </tr>
              <tr>
                <th scope="row">2</th>
                <td>Full speed down</td>
                <td class="num">1,900 °F (1,038 °C)</td>
              </tr>
              <tr>
                <th scope="row">3</th>
                <td class="num">Down at 150 °F/h (83 °C/h)</td>
                <td class="num">1,500 °F (816 °C)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Skutt's controllers likewise offer a preheat and a one-step cooling option.</p>

        <h3>On a manual kiln</h3>
        <p>
          A manual kiln cannot follow these schedules exactly, but the plan is the same: gentle at first, steady through
          the middle, and a watched finish. Bracker's low-fire glaze schedule is under Manual kilns in detail, below;
          for hotter cones it adds "an average of 15–30 minutes per cone number". With a pyrometer, practice and a log,
          you can roughly copy a drop-and-hold or a slow cool by turning the switches down by hand, as Digitalfire
          suggests.
        </p>
      </section>

      <section class="panel" aria-labelledby="manual-kilns">
        <h2 id="manual-kilns" tabindex="-1">Manual kilns in detail</h2>

        <h3>How the switches work</h3>
        <p>
          Older kilns (L&amp;L says mostly those made before 1975) have four-position switches: Off, Low, Medium and
          High, with nothing in between. Later kilns use <b>infinite switches</b>, marked Off, then 1 to 11, then High
          on L&amp;L's kilns. An infinite switch does not send less power. It turns the elements fully on and off in a
          repeating cycle: on Low, L&amp;L says, they "may be on something like 7 seconds, and off 23 seconds in a
          30-second cycle". The higher the setting, the longer they stay on, and on High they are on all the time. The
          numbers are not exact percentages, so learn your own kiln with cones and records.
        </p>

        <h3>L&amp;L's general procedure</h3>
        <p>L&amp;L's suggested procedure for a kiln with three switches, a sitter and no vent:</p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="L and L procedure">
          <table class="guide-table">
            <caption>
              L&amp;L's manual firing procedure
            </caption>
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">What to do</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Set up</th>
                <td>
                  Sitter cone one number hotter than the shelf cones (L&amp;L's advice; see The kiln sitter). Prop the
                  lid "about 4 or 5 inches" (10–13 cm) and take out all the peephole plugs. Set the timer very high the
                  first time, and note how long the firing takes.
                </td>
              </tr>
              <tr>
                <th scope="row">Low</th>
                <td>All switches on Low (1): 3 hours if the clay is dry, 8 to 20 hours or more if it seems wet</td>
              </tr>
              <tr>
                <th scope="row">Medium</th>
                <td>Close the lid. Top two switches to 5, bottom switch to 6.</td>
              </tr>
              <tr>
                <th scope="row">First red heat</th>
                <td>
                  As soon as you see any glow, plug the bottom two peepholes. Leave the top one open for the whole
                  firing.
                </td>
              </tr>
              <tr>
                <th scope="row">Plenty of red heat, about 1,400 °F (760 °C)</th>
                <td>Bottom two switches to High, top switch to 9</td>
              </tr>
              <tr>
                <th scope="row">End</th>
                <td>
                  Watch the cones and fine-tune the top and bottom switches. When the cones slump, turn all the switches
                  off and turn off the breaker. Let the kiln cool completely before opening it.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Bracker's schedules</h3>
        <p>Bracker's Good Earth Clays, a US clay supplier, publishes these for manual kilns without a vent:</p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Bracker's manual schedules">
          <table class="guide-table">
            <caption>
              Bracker's manual-kiln schedules
            </caption>
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Bisque</th>
                <th scope="col">Low-fire glaze</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Sitter</th>
                <td>Small cone 03</td>
                <td>The small cone for the glaze</td>
              </tr>
              <tr>
                <th scope="row">Preheat</th>
                <td>Overnight: bottom switch alone on Low, plugs out, lid propped, timer at maximum</td>
                <td>None</td>
              </tr>
              <tr>
                <th scope="row">Timer</th>
                <td>In the morning, reset to 30–60 minutes longer than the expected firing time</td>
                <td>30–60 minutes longer than the expected firing time</td>
              </tr>
              <tr>
                <th scope="row">Low</th>
                <td>All switches Low, 3–4 hours; plugs out, lid propped</td>
                <td>All switches Low, 3–4 hours; plugs out, lid propped</td>
              </tr>
              <tr>
                <th scope="row">Medium</th>
                <td>Plugs in, lid closed; all switches Medium, 3–4 hours</td>
                <td>Plugs in, lid closed; all switches Medium, 3–4 hours</td>
              </tr>
              <tr>
                <th scope="row">High</th>
                <td>About 2–3 hours, until the sitter shuts off</td>
                <td>About 3 hours; 15–30 minutes more for each cone hotter</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Bracker's does not say which shelf cone its bisque sitter cone matches, so check with your own cone pack. With
          a downdraft vent, the steps are the same, but the vent runs through the firing and the cooling, and the lid
          stays closed. Bracker's also suggests staggering: bring the switches up one at a time, about 30 minutes apart.
        </p>

        <h3>When to close the lid and plug the peepholes</h3>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="When to close up">
          <table class="guide-table">
            <caption>
              When to close up: the sources differ
            </caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Advice</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Orton</th>
                <td>
                  Close the lid and plug the peepholes at dull red, around 1,100 °F (593 °C); leave the top peephole
                  open longer if carbon defects appear
                </td>
              </tr>
              <tr>
                <th scope="row">L&amp;L</th>
                <td>
                  Close the lid after the Low stage; plug the bottom peepholes at first red; with no vent, leave the top
                  one open all firing
                </td>
              </tr>
              <tr>
                <th scope="row">Bracker's</th>
                <td>Close the lid and plug the peepholes when the switches go to Medium</td>
              </tr>
              <tr>
                <th scope="row">Dawson</th>
                <td>Leave the top peephole open the whole firing (on large kilns, the bottom one too)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="guide-callout">
          Our starting point: close the lid once a mirror held at the gap no longer fogs, and at dull red plug every
          peephole except the top one, which stays open for the whole firing.
        </p>

        <h3>Evening out the top and bottom</h3>
        <p>
          If your cone packs show the bottom firing cooler than the top, Orton suggests starting with the bottom switch
          on Medium and the rest on Low, then turning the bottom to High first. Or leave the top switch off until the
          others reach Medium, then bring the top up one step behind them, holding it on Medium for about an hour after
          the others go to High. Densely loaded areas fire cooler, and heavier loads take longer.
        </p>

        <h3>A starting point for your own kiln</h3>
        <p>
          If your kiln came without instructions, the table below is a starting point we put together from the published
          procedures above. It is not a published schedule. Calibrate it with witness cones and adjust it from your
          records; lengthen each stage for heavy loads or thick ware.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Starting point for a manual kiln">
          <table class="guide-table">
            <caption>
              Our starting point for a manual kiln (an estimate, not a published schedule)
            </caption>
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col">Bisque</th>
                <th scope="col">Glaze</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Preheat</th>
                <td>
                  Bottom switch Low overnight if the ware may be damp, or all switches Low 2–3 hours if bone dry; lid
                  propped, plugs out
                </td>
                <td>None</td>
              </tr>
              <tr>
                <th scope="row">Low</th>
                <td>2–3 hours</td>
                <td>About 2 hours; lid propped, plugs out</td>
              </tr>
              <tr>
                <th scope="row">Medium (about 5–6 on an infinite switch)</th>
                <td>2–3 hours; close the lid once the mirror stays clear</td>
                <td>2–3 hours, lid closed</td>
              </tr>
              <tr>
                <th scope="row">High</th>
                <td>Until the sitter trips; plug all but the top peephole at dull red</td>
                <td>Until the sitter trips</td>
              </tr>
              <tr>
                <th scope="row">Expected total</th>
                <td>8–12 hours</td>
                <td>8–12 hours</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          If the sitter trips before the shelf cones are down, go one cone hotter in the sitter next time, as L&amp;L
          advises.
        </p>

        <h3>Using a pyrometer</h3>
        <p>
          A <b>pyrometer</b> is a temperature gauge read from a <b>thermocouple</b>, a heat probe through the kiln wall.
          It shows how fast the kiln is climbing, so you can pick the right column of the cone chart. But it reads near
          the wall, not at the ware, and it drifts. L&amp;L notes that a type K thermocouple can be off by more than 25
          °F (14 °C) after repeated cone 6 firings, "a difference greater than a full cone", while a self-supporting
          cone varies by no more than 4 °F (2 °C). Orton says pyrometers need recalibrating from time to time, and cones
          are how you check them.
        </p>
      </section>

      <section class="panel" aria-labelledby="venting">
        <h2 id="venting" tabindex="-1">Venting, peeking and safety</h2>

        <h3>Venting</h3>
        <p>
          Early in a firing, clay and glaze give off water vapor and fumes, including carbon monoxide, and glazes can
          give off toxic fumes later in the firing too. L&amp;L calls venting them "essential". With no vent system,
          that means the lid propped and the peepholes open in the early stages, as in the procedures above; slowing the
          heating during this time also helps the carbon burn out. With a <b>downdraft vent</b> (a powered vent fitted
          to the kiln), Orton says the lid and peepholes stay closed for the whole firing except to check the cones. An
          open top peephole also protects the sitter tube and the kiln's metal parts.
        </p>
        <p>
          For venting the room, and for carbon monoxide alarms, see
          <a routerLink="/guides/safe-mixing">Safe mixing and ventilation</a> and
          <a routerLink="/guides/home-safety">Don't poison your family</a>.
        </p>

        <h3>While the kiln is firing</h3>
        <ul>
          <li>
            Look through a peephole only with IR-rated shade 3 welding glasses; sunglasses are not enough. Skutt advises
            twisting the plugs into place so they do not fall out.
          </li>
          <li>Do not leave the kiln unattended beyond its expected firing time; a sitter is not a fail-safe.</li>
          <li>Never fire on or near anything that burns, such as a wood floor or carpet.</li>
          <li>
            Keep the clearances in your manual. Published figures range from 12 in (30 cm) to 3 ft (91 cm); where the
            manual is silent, 18 in (46 cm) from walls and 3 ft (91 cm) from anything that burns is the safest choice.
          </li>
          <li>Keep the space around the sitter's weight clear so it can drop.</li>
          <li>When the firing ends, turn the switches off and turn off the breaker as well.</li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="cooling">
        <h2 id="cooling" tabindex="-1">Cooling and unloading</h2>
        <p>
          Cooling is part of the firing. L&amp;L and Orton advise: "Let the kiln cool naturally with the lid closed",
          and "Never introduce cool air into a hot kiln." Opening too soon "can cause cracking", and the silica in the
          ware contracts suddenly as it cools past 1,063 °F (573 °C). Without a controller, keep the kiln closed "until
          the temperature drops well below red heat (900°F / 482°C)", and for at least 8 hours. Never force-cool a kiln
          that is still glowing. Cracks with sharp edges in fired ware are a sign of cooling too fast.
        </p>

        <h3>When to open and unload</h3>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Opening and unloading">
          <table class="guide-table">
            <caption>
              When to open the kiln: the sources differ
            </caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Advice</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">L&amp;L, manual kilns</th>
                <td>"Wait for it to completely cool before opening it."</td>
              </tr>
              <tr>
                <th scope="row">Skutt controller manual (as quoted)</th>
                <td>Avoid unloading above 125 °F (52 °C)</td>
              </tr>
              <tr>
                <th scope="row">Other makers (as reported)</th>
                <td>Up to 250 °F (121 °C), with glaze loads opened cooler than bisque</td>
              </tr>
              <tr>
                <th scope="row">Glazy</th>
                <td>Do not open until below about 392 °F (200 °C)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="guide-callout">
          Our suggestion: open the lid only below about 200 °F (93 °C), and unload below about 125 °F (52 °C), or when
          you can hold the ware comfortably in bare hands. Glaze loads, dense and glassy, need more patience than
          bisque. Without a pyrometer, wait until the kiln has cooled completely.
        </p>
        <p>
          Read the witness cones as soon as you open the kiln, before anything is moved, and write down what you see
          while it is fresh.
        </p>
      </section>

      <section class="panel" aria-labelledby="after">
        <h2 id="after" tabindex="-1">After the firing</h2>

        <h3>Record it</h3>
        <p>
          Write down each firing: the date, the kiln, the load, the schedule or the switch times, the timer reading, and
          how every witness cone and the sitter cone bent, shelf by shelf. Keep the fired cones too. Orton notes that
          "Comparing the results of the last 6 to 10 firings will show gradual changes occurring in the kiln, such as
          heating elements aging." Glazecalc's <a routerLink="/firing">firing logs</a> can hold these records, with
          columns you choose such as time, temperature, cone, ramp and hold; glaze results can go in your
          <a routerLink="/notes">notes</a>.
        </p>

        <h3>Kiln sitter care</h3>
        <ul>
          <li>
            Clean the cone supports "after every firing with a small wire brush". If wash or melted cone will not come
            off, turn the supports or replace them; Dawson suggests keeping two pairs.
          </li>
          <li>"NEVER USE LUBRICANTS OF ANY KIND ON THE KILN-SITTER."</li>
          <li>Inspect the pivot every 6–12 months, and replace a bent or worn rod.</li>
          <li>Check the adjustment with the firing gauge every 30 firings.</li>
        </ul>

        <h3>Shelves and kiln wash</h3>
        <p>
          Kiln wash protects shelves from dripping glaze and lets fired pots lift off. Put it on the top of each shelf
          and on the kiln floor only, "about the thickness of a postcard". L&amp;L's best practice is three thin coats,
          fired between coats if possible. Many potters also set pieces with runny glazes on a <b>cookie</b>, a disc of
          bisque that catches drips. This is common practice, though we found no kiln maker's advice on it.
        </p>

        <h3>Elements</h3>
        <p>
          Elements wear: an oxide layer builds up, less current flows, and firings slow down. Long holds at high
          temperature wear elements and the thermocouple faster. Skutt advises a test firing for a new or repaired kiln,
          so the elements form a protective oxide layer. Follow your maker's instructions for testing and replacing
          elements.
        </p>
      </section>

      <section class="panel" aria-labelledby="rings">
        <h2 id="rings" tabindex="-1">Rings and bars</h2>
        <p>
          British industry has also used two other heatwork indicators. <b>Bullers rings</b> are flat discs that shrink
          in proportion to heatwork and are measured with a gauge after the firing. <b>Holdcroft bars</b>, from 1898,
          sag in the middle across two supports, the idea behind the kiln sitter's bar. We found no table converting
          either to Orton cone numbers, so this guide uses Orton cones; we plan to cover rings and bars in a later
          version.
        </p>
      </section>

      <section class="panel" aria-labelledby="sources">
        <h2 id="sources" tabindex="-1">Sources</h2>
        <ul class="guide-sources">
          <li>
            <a href="https://cdn.shopify.com/s/files/1/1712/5565/files/Cone_chart.pdf"
              >Orton: Using Orton Pyrometric Cones (cone chart, ©2001)</a
            >
          </li>
          <li>
            <a href="https://cdn.shopify.com/s/files/1/0662/6594/0236/files/Cones_Orton.pdf"
              >Orton: Cones and Firing, a practical guide to successful firings (©2019)</a
            >
          </li>
          <li><a href="https://www.ortonceramic.com/pyrometric-cones-faq">Orton: Pyrometric cones FAQ</a></li>
          <li>
            <a
              href="https://oud.klei.nl/forum/bestanden/f675ae4a-d890-4b8b-a08e-173e652f25a6/KilnSitter%20lt3%20en%20lt3k.pdf"
              >Dawson: Kiln-Sitter Operating Manual, models LT-3 and LT-3K</a
            >
          </li>
          <li>
            <a href="https://hotkilns.com/support/operation/manual-control"
              >L&amp;L Kiln: Manual kiln operation with kiln sitters</a
            >
          </li>
          <li>
            <a href="https://hotkilns.com/support/operation/orton-firing-tips">L&amp;L Kiln: Orton firing tips</a>
          </li>
          <li><a href="https://hotkilns.com/support/operation/pyrometric-cones">L&amp;L Kiln: Pyrometric cones</a></li>
          <li>
            <a href="https://hotkilns.com/support/operation/dynatrol">L&amp;L Kiln: DynaTrol controller manual</a>
          </li>
          <li>
            <a href="https://hotkilns.com/support/operation/the-ceramic-process">L&amp;L Kiln: The ceramic process</a>
          </li>
          <li>
            <a href="https://www.brackers.com/firing-schedule-for-manual-kilns/"
              >Bracker's Good Earth Clays: Firing schedule for manual kilns</a
            >
          </li>
          <li>
            <a href="https://ceramicartsnetwork.org/ceramics-monthly/ceramics-monthly-article/Bisque-Firing-101"
              >Ceramics Monthly: Bisque Firing 101</a
            >
          </li>
          <li>
            <a
              href="https://ceramicartsnetwork.org/ceramics-monthly/ceramics-monthly-article/Tips-and-Tools-The-Kiln-Sitter-255314"
              >Ceramics Monthly: Tips and Tools: The Kiln Sitter</a
            >
          </li>
          <li><a href="https://digitalfire.com/schedule/bq1000">Digitalfire: BQ1000 bisque firing schedule</a></li>
          <li>
            <a href="https://digitalfire.com/schedule/plc6ds">Digitalfire: PLC6DS cone 6 drop-and-soak schedule</a>
          </li>
          <li>
            <a href="https://digitalfire.com/schedule/c6dhsc"
              >Digitalfire: C6DHSC cone 6 drop-and-hold slow-cool schedule</a
            >
          </li>
          <li><a href="https://digitalfire.com/glossary/bisque">Digitalfire: Bisque</a></li>
          <li><a href="https://help.glazy.org/concepts/firing">Glazy: Firing</a></li>
          <li><a href="https://skutt.com/?p=7401">Skutt: Ceramic kilns, using the product</a></li>
          <li>
            <a href="https://checkout.archiebrayclay.com/content/KM_Operating-Manual.pdf"
              >Skutt: KilnMaster operating manual</a
            >
          </li>
          <li>
            <a href="https://www.bu.edu/ehs/files/2015/08/Kiln-Awareness-Reminder.pdf"
              >Boston University Environmental Health and Safety: Kiln awareness reminder</a
            >
          </li>
          <li>
            <a href="https://www.potclays.co.uk/clay-questions/difference-stoneware-earthenware"
              >Potclays: The difference between stoneware and earthenware</a
            >
          </li>
          <li><a href="https://en.wikipedia.org/wiki/Pyrometric_cone">Wikipedia: Pyrometric cone</a></li>
          <li><a href="https://en.wikipedia.org/wiki/Pyrometric_device">Wikipedia: Pyrometric device</a></li>
        </ul>
      </section>
    </div>
  `
})
export class FiringGuide {
  protected readonly sections = SECTIONS;
}
