import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/page-header';
import { GuideContents, GuideSection } from './guide-contents';

/** The guide's sections, for its contents list and their headings' ids. */
const SECTIONS: GuideSection[] = [
  { id: 'if-something-is-swallowed', label: 'If something is swallowed' },
  { id: 'most-dangerous', label: 'What is most dangerous to swallow' },
  { id: 'storing-materials', label: 'Storing materials at home' },
  { id: 'keeping-dust-in-the-studio', label: 'Keeping dust in the studio' },
  { id: 'lead-and-children', label: 'Lead and children' },
  { id: 'pets', label: 'Pets' },
  { id: 'the-kiln', label: 'The kiln' },
  { id: 'handmade-ware', label: 'Handmade ware on the family table' },
  { id: 'sources', label: 'Sources' }
];

/** Pottery at home with children and pets: storage, dust, the kiln, and what to do if something is swallowed. */
@Component({
  selector: 'gc-home-safety-guide',
  imports: [GuideContents, PageHeader, RouterLink],
  template: `
    <gc-page-header
      title="Don't poison your family"
      lead="What to do if a child or pet swallows a glaze material, and how to keep materials, dust and the kiln away from them so it does not happen."
    />
    <gc-guide-contents [sections]="sections" />
    <div class="guide">
      <section class="panel" aria-labelledby="if-something-is-swallowed">
        <h2 id="if-something-is-swallowed" tabindex="-1">If something is swallowed</h2>
        <p class="guide-callout">
          If a child or pet may have swallowed, breathed in or spilled a glaze material, call the poison line for your
          region now, even if they seem fine. Do not wait for symptoms. If someone is unconscious, not breathing,
          struggling to breathe or having a seizure, call the emergency number first.
        </p>
        <p>
          This guide is not medical advice: a poison center, a doctor or a vet decides what to do. This page helps you
          reach them quickly and, better still, avoid needing to.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Poison and emergency numbers">
          <table class="guide-table">
            <caption>
              Poison lines and emergency numbers (checked 8 October 2026)
            </caption>
            <thead>
              <tr>
                <th scope="col">Region</th>
                <th scope="col">People</th>
                <th scope="col">Animals</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">United States</th>
                <td>
                  Poison Help <a href="tel:+18002221222">1-800-222-1222</a>, free, 24/7. Online:
                  <a href="https://www.poison.org/">webPOISONCONTROL</a>, free.
                </td>
                <td>
                  ASPCA Animal Poison Control <a href="tel:+18884264435">(888) 426-4435</a>, 24/7, a fee may apply. Pet
                  Poison Helpline <a href="tel:+18557647661">(855) 764-7661</a>, 24/7, $89 per incident.
                </td>
                <td>
                  The 1-800 number connects you to your regional poison center. poison.org closed its phone line on 31
                  March 2025 and now runs webPOISONCONTROL online. In a life-threatening emergency, call your emergency
                  number.
                </td>
              </tr>
              <tr>
                <th scope="row">United Kingdom</th>
                <td>
                  No public poisons line. Dial <a href="tel:111">111</a> if you are not sure (NHS 111 in England and
                  Wales, NHS 24 in Scotland). Call <a href="tel:999">999</a> or go to A&amp;E if they are unconscious,
                  not breathing, struggling to breathe or having a seizure.
                </td>
                <td>
                  Animal PoisonLine <a href="tel:+441202509000">01202 509 000</a>, 24 hours. £35 weekdays 8am to 8pm,
                  £45 at other times, including bank holidays.
                </td>
                <td>
                  The national poisons service takes calls only from health professionals. In Northern Ireland, contact
                  your GP.
                </td>
              </tr>
              <tr>
                <th scope="row">Ireland</th>
                <td>
                  Public Poisons Line <a href="tel:+35318092166">01 809 2166</a>, 8am to 10pm only. In an emergency,
                  <a href="tel:112">112</a>.
                </td>
                <td>No animal line found. Call your vet.</td>
                <td>Not a 24-hour line. Outside its hours, call your doctor, or 112 in an emergency.</td>
              </tr>
              <tr>
                <th scope="row">European Union</th>
                <td><a href="tel:112">112</a>, free from any phone, everywhere in the EU.</td>
                <td>No EU-wide animal line found. Call your vet.</td>
                <td>
                  No EU-wide poisons line; each country runs its own. Look yours up now and save it in your phone.
                </td>
              </tr>
              <tr>
                <th scope="row">Australia</th>
                <td>
                  Poisons Information Centre <a href="tel:131126">13 11 26</a>, 24 hours, Australia-wide. Call
                  <a href="tel:000">000</a> if they stop breathing, are unconscious, have a seizure or a severe allergic
                  reaction.
                </td>
                <td>Animal Poisons Helpline <a href="tel:1300869738">1300 869 738</a>, 24/7, from $75 AUD.</td>
                <td>One summary describes the animal line as free; its own site states a fee.</td>
              </tr>
              <tr>
                <th scope="row">New Zealand</th>
                <td>
                  National Poisons Centre <a href="tel:0800764766">0800 764 766</a> (0800 POISON), free, 24/7. In an
                  emergency, call the emergency services.
                </td>
                <td>
                  Animal Poisons Helpline <a href="tel:0800869738">0800 869 738</a>, charges apply. Or call your vet.
                </td>
                <td>The National Poisons Centre is for people; it is not expert in animal poisonings.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>We suggest saving your region's numbers in your phone today, and on a card inside the studio door.</p>

        <h3>What to have ready when you call</h3>
        <ul>
          <li>
            The material's name exactly as written on the bag or bucket, and its label or <b>safety data sheet</b> (SDS:
            the supplier's sheet of a material's hazards and first aid). A photo of the bag works.
          </li>
          <li>For a mixed glaze, its recipe. Your Glazecalc recipe is the glaze's ingredients list.</li>
          <li>Roughly how much, and when.</li>
          <li>How: swallowed, breathed in, on the skin or in the eyes.</li>
          <li>Any symptoms so far.</li>
          <li>
            The child's or pet's approximate weight, since the same amount matters more to a smaller body. For a pet,
            also its breed, age and any health problems.
          </li>
        </ul>

        <h3>What not to do</h3>
        <div class="guide-warning" role="note">
          <p>
            The NHS advises: do not try to make the person sick, and do not give them anything to eat or drink. With a
            pet, do nothing until the vet or animal poison line tells you what to do.
          </p>
        </div>
        <p>
          If you go to hospital, the NHS says to take the packaging or a sample if it is safe to do so. For a glaze
          material, that means the bag's label or the safety data sheet.
        </p>
      </section>

      <section class="panel" aria-labelledby="most-dangerous">
        <h2 id="most-dangerous" tabindex="-1">What is most dangerous to swallow</h2>
        <p>Glaze materials can harm a family in two different ways:</p>
        <ul>
          <li>
            The <b>acute</b> danger (harm from one dose, within hours) is swallowing a <b>soluble</b> material, one that
            dissolves in water or stomach acid. Locked storage and the numbers above deal with it.
          </li>
          <li>
            The <b>chronic</b> danger (harm from many small doses) is dust, mainly silica and lead, which causes no
            symptoms at first and travels home on clothes. Clean habits deal with it.
          </li>
        </ul>
        <p>
          Most of a glaze is silica, kaolin and feldspar, which barely dissolve. We treat them as a long-term breathing
          hazard rather than a swallowing emergency. The soluble materials below are the ones to lock away first.
        </p>
        <div class="guide-table-scroll" tabindex="0" role="region" aria-label="Soluble materials">
          <table class="guide-table">
            <caption>
              Soluble glaze materials: what they do if swallowed
            </caption>
            <thead>
              <tr>
                <th scope="col">Material</th>
                <th scope="col">What it does</th>
                <th scope="col">Reported doses</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Barium carbonate</th>
                <td>
                  Once sold as rat poison. It barely dissolves in water but does dissolve in acid, so treat it as
                  soluble once swallowed. Barium drives down the potassium in the blood, causing vomiting, diarrhea and
                  muscle weakness that can progress to paralysis, breathing failure and an irregular heartbeat. Symptoms
                  typically begin within 2 hours.
                </td>
                <td>
                  Sources disagree. A 2025 medical review reports deaths from barium chloride, a soluble barium salt, at
                  doses as low as 0.8 to 0.9 g. An emergency-medicine reference gives a lethal range of 1 to 30 g for
                  barium salts, with harm possibly from about 200 mg. None gives a figure for children, so call for any
                  amount.
                </td>
              </tr>
              <tr>
                <th scope="row">Borax and boric acid</th>
                <td>
                  Nausea, vomiting, diarrhea and stomach pain come first; vomit and stool may be blue-green. Severe
                  cases bring a bright red rash that later peels, seizures, kidney injury and shock.
                </td>
                <td>
                  Rough lowest lethal doses: 2 to 3 g for an infant, 5 to 6 g for a child. In one review of 784
                  swallowings, only 12% caused symptoms and none were fatal, but deaths do happen, and there is no
                  antidote.
                </td>
              </tr>
              <tr>
                <th scope="row">Lithium carbonate</th>
                <td>
                  A child weighing 15 kg (33 lb) who swallowed 300 mg had a short spell of involuntary muscle spasms and
                  overactive reflexes (acute dystonia and hyperreflexia), which passed.
                </td>
                <td>Little has been written about young children. 300 mg is far less than a spoonful of powder.</td>
              </tr>
              <tr>
                <th scope="row">Soda ash (sodium carbonate)</th>
                <td>Dissolves readily in water. We found no reliable figures for what it does to a child.</td>
                <td>None found. Call for any amount.</td>
              </tr>
              <tr>
                <th scope="row">Potassium dichromate</th>
                <td>
                  A chrome colorant used in some recipes. Its safety data sheet warns that it "May be fatal if
                  swallowed", causes burns in the gut and may damage the kidneys.
                </td>
                <td>Not established, and safety data sheets disagree on how toxic it is.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="guide-callout">
          These harmful amounts run from a few hundred milligrams to a few grams. Glaze materials are sold by the pound
          or kilogram, so one open bag or bucket holds far more than enough to harm a toddler.
        </p>

        <h3>Colorants and lead</h3>
        <p>
          <b>Colorants</b> are the metal oxides and stains that give a glaze its color: copper, cobalt, chrome,
          manganese, nickel, cadmium-selenium stains and others. A university ceramics safety page names lead, cadmium,
          cobalt and chromium among the especially hazardous glaze ingredients. We found no reliable dose figures for
          any colorant, so call for any amount. A bucket of mixed glaze holds the same materials as the bags it came
          from, only wet.
        </p>
        <p>
          Lead's main danger is different: not one spoonful, but small amounts of dust swallowed over weeks or months,
          with no warning signs (see Lead and children, below).
        </p>
      </section>

      <section class="panel" aria-labelledby="storing-materials">
        <h2 id="storing-materials" tabindex="-1">Storing materials at home</h2>
        <p>
          No official body sets rules for storing glaze materials at home, but health and safety pages agree: keep the
          work in its own space, away from children. Pennsylvania's health department, writing about hobbies that use
          lead, says to "Utilize a designated workspace or garage for your hobby and keep children away from this area."
        </p>

        <h3>A storage checklist</h3>
        <p>
          These are general poison-prevention rules applied to glaze. No ceramics standard sets them, but we suggest all
          of them:
        </p>
        <ul>
          <li>
            Keep dry materials locked away: a cabinet, or a room, garage or shed that locks. A high shelf helps, but
            children climb. If you can lock up only a few things at first, start with the soluble materials and
            colorants.
          </li>
          <li>
            Keep materials in their original bags or tubs. If you move one into another container, label it with the
            name exactly as written on the bag.
          </li>
          <li>
            Never use food or drink containers (yogurt tubs, jars, bottles) for glaze materials, even labeled. A child
            knows what a yogurt tub holds.
          </li>
          <li>
            Keep studio tools (scoops, spoons, whisks, sieves, scales) in the studio. Never use kitchen tools for glaze,
            or glaze tools for food.
          </li>
          <li>Keep wet glazes in labeled buckets with the lids on.</li>
          <li>Keep each material's safety data sheet with it, on paper or on your phone.</li>
          <li>Keep nothing from the studio in the kitchen: no bags, buckets, tools or test tiles.</li>
        </ul>
        <p>
          For buying and storing materials in more depth, see
          <a routerLink="/guides/making-a-glaze">How to make a glaze</a>.
        </p>

        <h3>Glaze waste and rinse water</h3>
        <p>
          Never pour glaze, or water you have rinsed glaze tools in, down the sink or onto the garden. The UK Crafts
          Council suggests a separate bucket of water for washing hands, brushes, sieves and tools. Let it settle
          overnight, pour off the clear water, then dry the settled glaze and put it in the trash (it goes to landfill),
          never down the drain.
        </p>
        <p>
          We suggest a lid on that bucket: the sludge holds the same metals as the glaze, and pets drink standing water.
          Disposal rules vary from place to place, so check each product's safety data sheet, and ask your local council
          or water company if you are unsure.
        </p>
      </section>

      <section class="panel" aria-labelledby="keeping-dust-in-the-studio">
        <h2 id="keeping-dust-in-the-studio" tabindex="-1">Keeping dust in the studio</h2>
        <p>
          Pennsylvania's health department puts the problem plainly: "Lead-contaminated dust from your hobby can attach
          to your clothes, shoes, hair, skin, and personal items, and readily transfer into your vehicle and onto
          surfaces in your home." The CDC adds that adults "may bring lead home with them and expose their families to
          lead without knowing." The Pennsylvania guidance gives the remedy:
        </p>
        <ul>
          <li>Wash your hands before eating.</li>
          <li>Change out of your studio clothes and shoes before you go into the house.</li>
          <li>Wash studio clothes separately from the family's laundry.</li>
          <li>
            Vacuum the house and car regularly with a <b>HEPA</b> vacuum (one with a high-efficiency filter that traps
            fine dust).
          </li>
        </ul>

        <h3>House rules we suggest</h3>
        <ul>
          <li>No clay or glaze work on the kitchen or dining table, even for a quick job.</li>
          <li>
            Clean the studio wet. A university ceramics safety page says to avoid dry sweeping, vacuum only with a HEPA
            filter and wet-mop daily. Wet-wipe surfaces after each session too.
          </li>
          <li>
            Treat all glaze dust like lead dust, even if your glazes are lead-free. Dust carrying barium, chrome, cobalt
            or manganese travels home the same way.
          </li>
          <li>Scrub your hands and nails before you pick up a child, make food or stroke a pet.</li>
          <li>Keep children from playing in the studio, and don't let it become a shortcut to the yard or garden.</li>
        </ul>

        <h3>Pregnancy and breastfeeding</h3>
        <p>
          We suggest extra care if anyone at home is pregnant or breastfeeding. Keep them out of the studio while you
          handle dry materials, and if you have used lead, ask their doctor or midwife whether a blood lead test makes
          sense for the household.
        </p>
        <p>
          For controlling dust while you work (respirators, wet methods and ventilation), see
          <a routerLink="/guides/safe-mixing">Safe mixing and ventilation</a>.
        </p>
      </section>

      <section class="panel" aria-labelledby="lead-and-children">
        <h2 id="lead-and-children" tabindex="-1">Lead and children</h2>
        <p>
          Lead is the quiet risk. The CDC lists "Mixing or applying glaze or pigments containing lead" among the hobbies
          that can expose people to lead, and warns that "Most children and adults who are exposed to lead have no
          symptoms." In its words, "The only way to tell if you or your child has been exposed is with a blood lead
          test."
        </p>

        <h3>Why children take in more</h3>
        <p>
          Children take in more household dust than adults do. They breathe more air for their body weight, and the US
          EPA notes that young children "often have higher rates of soil and dust ingestion because of their unique
          behaviors such as crawling and hand/object-to-mouth contact." For lead, the dust a child swallows from floors,
          hands and toys matters more than what they breathe.
        </p>

        <h3>The blood test and the 3.5 number</h3>
        <p>
          Blood lead is measured in <b>µg/dL</b> (micrograms of lead per deciliter, a tenth of a liter, of blood). The
          CDC's <b>blood lead reference value</b> is 3.5 µg/dL, lowered from 5 µg/dL in 2021. It is the level that 97.5%
          of US children aged 1 to 5 fall below, so a child at or above it has more lead in their blood than almost all
          children their age. The CDC says the value "is not health-based and is not a regulatory standard", and when it
          lowered the value it said "Lead exposure at all levels is harmful to children."
        </p>
        <p class="guide-callout">
          So 3.5 µg/dL is a flag for follow-up, not a safe limit. A result below it does not mean lead did no harm. A
          result at or above it means finding where the lead is coming from; the CDC's guidance is to confirm a
          finger-prick result with a sample from a vein. Doctors outside the US use their own guidance, and yours will
          explain what a result means.
        </p>

        <h3>What we suggest</h3>
        <ul>
          <li>Use lead-free glazes where you can. In a home with young children, we suggest not using lead at all.</li>
          <li>
            If you have used <b>lead frits</b> (lead already melted into a glass and ground to powder), or old glazes
            whose make-up you do not know, ask your child's doctor about a blood lead test.
          </li>
          <li>Follow the dust rules above for every glaze, not only the ones with lead.</li>
        </ul>
        <p>
          Glazecalc keeps lead off unless you choose it in <a routerLink="/account">Settings</a>. With lead off, it
          never adds lead to a recipe or suggests it.
        </p>
      </section>

      <section class="panel" aria-labelledby="pets">
        <h2 id="pets" tabindex="-1">Pets</h2>
        <p class="guide-callout">
          We found no veterinary study or guidance written for pets in potters' homes. The advice in this section is
          common sense, built on general facts about lead, barium and birds. It does not come from a veterinary source.
        </p>

        <h3>What is known</h3>
        <p>
          The Pet Poison Helpline says "Lead is toxic for all species, but young and/or malnourished animals are at
          highest risk for poisoning", with signs such as vomiting, diarrhea, not eating, stumbling, seizures and
          blindness. A dog that ate sparklers containing barium (a soluble barium salt, not glaze) developed muscle
          weakness, paralysis, drooling and an irregular heartbeat, and recovered with veterinary treatment. Birds are a
          special case: a University of Illinois vet explains that "Birds have a highly sophisticated and ultra
          efficient respiratory system, making them particularly vulnerable to the inhalation of fumes and aerosols."
        </p>

        <h3>Common-sense rules</h3>
        <ul>
          <li>Keep pets out of the studio, with the door shut.</li>
          <li>Dogs chew bags and drink from buckets. Keep bags in a closed cabinet and a lid on every bucket.</li>
          <li>
            Cats walk through dust and lick it off their paws and fur. Wet-clean the floor and keep cats out, so there
            is nothing to groom off.
          </li>
          <li>
            Birds and small mammals (rabbits, guinea pigs, hamsters) share the household air. Keep them in a far room
            with the door shut while you handle dry materials and while the kiln fires.
          </li>
          <li>Fish tanks collect settling dust. Keep them out of the studio, and covered.</li>
          <li>
            Keep pet food and water bowls away from the studio and kiln, and use commercial or tested bowls, not studio
            experiments.
          </li>
        </ul>
        <p>
          If a pet may have eaten or drunk anything from the studio, or shows signs like those above, call your vet or
          an animal poison line (see the table at the top), with the material's name and the pet's weight to hand.
        </p>
      </section>

      <section class="panel" aria-labelledby="the-kiln">
        <h2 id="the-kiln" tabindex="-1">The kiln</h2>

        <h3>The outside gets hot enough to burn</h3>
        <p>
          A UK schools risk assessment says a kiln's outside "can reach 160 °C and possibly more" (about 320 °F), and a
          school kiln guide reports metal bands at up to 460 °F (about 240 °C). Skutt, a kiln maker, recommends a kiln
          room that can be secured against children and pets. Where a room cannot be locked, the school guide suggests a
          barrier such as a kiln safety screen.
        </p>
        <p>
          We suggest keeping small children and pets, who cannot understand a warning sign, behind a locked door or a
          barrier while the kiln fires and while it cools, and posting a warning sign for everyone else.
        </p>

        <h3>Space around it</h3>
        <p>
          Sources disagree on clearance. Rio Grande says at least 12 inches (30 cm) from walls and anything combustible.
          L&amp;L strongly recommends 18 inches (46 cm) to all walls, and the building code it cites asks for 3 feet
          (0.9 m) from combustible walls. Follow your kiln's manual and local fire code; if you are unsure, allow 18
          inches from any wall and 3 feet from anything that can burn. In a garage, keep cars, fuel and paint well away.
        </p>

        <h3>Power</h3>
        <p>
          Rio Grande recommends a <b>dedicated circuit</b> (one that powers nothing else) with a properly grounded
          outlet. We suggest no extension cord. Between firings, switch off the kiln's breaker or disconnect switch, or
          unplug it, so a child cannot start it.
        </p>

        <h3>Stay for the end of the firing</h3>
        <p>
          A <b>kiln sitter</b> is the mechanical switch on many manual kilns: a small cone bends at the end of the
          firing and trips the switch off. Its manual says it "is NOT intended to perform as a fail-safe shut-off
          device." Rio Grande says never to leave a firing kiln unattended, "especially near the expected shut-off
          time". So fire only when an adult will be home and awake for the end of the firing, check that the kiln has
          switched off, and keep an ABC fire extinguisher in the kiln room. For how sitters, controllers and schedules
          work, see <a routerLink="/guides/firing">Firing a basic kiln</a>.
        </p>

        <h3>Fumes and carbon monoxide</h3>
        <p>
          Firing gives off fumes, so vent the kiln to the outdoors;
          <a routerLink="/guides/safe-mixing">Safe mixing and ventilation</a>
          explains how. A kiln in an attached garage needs venting that keeps fumes from reaching the house through the
          connecting door. Keep birds in a far room whenever the kiln fires.
        </p>
        <p>
          <b>Carbon monoxide</b> (CO) is a poisonous gas you cannot see or smell. A university kiln safety sheet
          requires CO alarms with gas kilns. Views differ for electric kilns, but burning off organic matter (in clay,
          or things like paper or wax) can make CO. We think a CO alarm in the kiln room and the rooms next to it is a
          sensible, inexpensive step for any kiln.
        </p>

        <h3>Peepholes and eyes</h3>
        <p>
          Infrared light, which you cannot see, "starts at 752°F (400°C)", and the Ceramic Arts Network says looking
          into a kiln above this should always be done with eye protection. Infrared can damage the lens of the eye and
          lead to cataracts, and long gazing can injure the retina. Sunglasses and didymium glasses do not block it.
        </p>
        <div class="guide-warning" role="note">
          <p>
            Children should not look into a kiln at all. A glowing peephole draws them, and they will not reliably keep
            protective glasses on, so keep them away while the kiln is hot. Adults should look only briefly, through
            IR-rated welding glasses. Sources recommend shades from 1.7 to 5; shade 3 is a sensible choice, darker if
            you see spots afterward.
          </p>
        </div>
      </section>

      <section class="panel" aria-labelledby="handmade-ware">
        <h2 id="handmade-ware" tabindex="-1">Handmade ware on the family table</h2>
        <p>
          The question for pots on the family table is <b>leaching</b>: metals dissolving out of the fired glaze into
          food or drink. The FDA warns that if pottery "is not manufactured properly, this lead can leach into food and
          drink", and that "no amount of washing, boiling, or other process can remove lead from pottery." Regulators
          such as the US FDA and the EU limit how much lead and cadmium a finished piece releases in a standard acid
          test, not what the glaze contains. The strictest US limit, for cups, mugs and pitchers, is 0.5 µg/mL of lead.
        </p>

        <h3>Lead-free is not the same as food-safe</h3>
        <p>
          A glaze with no lead can still leach. Digitalfire, a glaze chemistry reference, names glazes containing "heavy
          metal oxide colorants, barium, lithium, or lead" as the concern, and warns that a stain fired above its rated
          temperature can release cadmium. The ASTM D-4236 art-materials label on a jar "DOES NOT establish that a fired
          glaze is food-safe", and "Tableware producers must test all finished ware to establish dinnerware status."
        </p>
        <p class="guide-callout">
          "Food safe" means this glaze, on this clay, fired to this cone, applied this way, releases less than the legal
          limits. A recipe calculation, Glazecalc's included, can flag a risky recipe but cannot prove a pot is safe.
          Only a leach test of the fired piece can.
        </p>
        <p>
          We suggest reading a "food safe" label on a commercial glaze as a good start, not a guarantee: a different
          clay, a thicker coat, another cone or a second glaze on top changes the result.
        </p>

        <h3>Testing</h3>
        <p>
          Laboratories test fired pieces with a standard acid soak that represents a worst case, such as ASTM C738 in
          the US. One lab's EU test needs four identical pieces and takes seven working days, so make spares of anything
          you plan to have tested.
        </p>
        <p>
          Home tests are disputed. The FDA says home swab kits can show leachable lead, and that a piece that tests
          positive should not be used for food. Ceramics NZ warns that consumer lead-test pens are "not designed for
          this use" on ceramics and can give false positives. Digitalfire suggests leaving a lemon slice on the glaze
          overnight as a rough screen. The safe reading: a positive home test means stop using the piece for food, and a
          negative one proves nothing. Only a lab can tell you a piece is safe.
        </p>

        <h3>Crazed ware</h3>
        <p>
          <b>Crazing</b> is a network of fine cracks in the glaze surface, and sources disagree about it. A Ceramics
          Monthly experiment found crazed tiles could be cleaned, best in a dishwasher, though they came out less clean
          than uncrazed tiles after soap and water. Digitalfire holds that "Crazed ware is unacceptable" and that
          crazing "severely weakens ware". The safe course is simple: do not use crazed pieces for food.
        </p>

        <h3>Liner glazes</h3>
        <p>
          A <b>liner glaze</b> is the glaze on the inside of a cup or bowl, where the food sits. Digitalfire describes a
          liner that may be low enough in risk to use without lab testing: no colorants, barium, lead or lithium; fully
          melted; no crazing; and it wears well. Warning signs in any glaze are heavy amounts of colorant, crystals on
          the surface and poor melting.
        </p>

        <h3>Family rules we suggest</h3>
        <ul>
          <li>Children's cups, bowls and plates: only lab-tested, durable liner glazes, or commercial dinnerware.</li>
          <li>
            Do not store acidic food or drink (citrus, tomato, vinegar, fruit juice, wine) in pots glazed with anything
            you have not had tested.
          </li>
          <li>Do not use crazed pieces for food.</li>
          <li>Test tiles and experiments stay in the studio, never in the kitchen, the toy box or the pet's bowl.</li>
          <li>
            Take care with other pottery too. The FDA advises caution with handmade or crude-looking pieces, antiques,
            damaged or worn pieces, flea-market finds and bright orange, red or yellow decoration.
          </li>
          <li>If a child has used pottery you now doubt, the FDA says to talk to a doctor about a blood lead test.</li>
        </ul>
        <p>
          For more on how glazes melt, why some leach and what the limits mean, see
          <a routerLink="/guides/glazing-basics">Glazing from first principles</a>.
        </p>
      </section>

      <section class="panel" aria-labelledby="sources">
        <h2 id="sources" tabindex="-1">Sources</h2>
        <ul class="guide-sources">
          <li><a href="https://poisoncenters.org/">America's Poison Centers: Poison Help</a></li>
          <li><a href="https://www.poison.org/">Poison Control (poison.org): webPOISONCONTROL</a></li>
          <li><a href="https://www.nhs.uk/conditions/poisoning/">NHS: Poisoning</a></li>
          <li><a href="https://www.npis.org/">National Poisons Information Service (UK)</a></li>
          <li>
            <a href="https://www.poisons.ie/">National Poisons Information Centre of Ireland: Public Poisons Line</a>
          </li>
          <li>
            <a href="https://digital-strategy.ec.europa.eu/en/policies/112"
              >European Commission: 112, the European emergency number</a
            >
          </li>
          <li><a href="https://www.healthdirect.gov.au/poisoning">healthdirect: Poisoning</a></li>
          <li><a href="https://www.poisons.co.nz/">National Poisons Centre (New Zealand)</a></li>
          <li><a href="https://www.aspca.org/pet-care/animal-poison-control">ASPCA: Animal Poison Control</a></li>
          <li><a href="https://www.petpoisonhelpline.com/">Pet Poison Helpline</a></li>
          <li><a href="https://www.animalpoisonline.co.uk/">Animal PoisonLine (UK)</a></li>
          <li><a href="https://animalpoisons.com.au/">Animal Poisons Helpline (Australia and New Zealand)</a></li>
          <li>
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11700400"
              >PubMed Central: Acute soluble barium poisoning, a review (2025)</a
            >
          </li>
          <li><a href="https://wikem.org/wiki/Boron_toxicity">WikEM: Boron toxicity</a></li>
          <li>
            <a href="https://www.npic.orst.edu/RMPP/rmpp_ch9.pdf"
              >NPIC and US EPA: Recognition and Management of Pesticide Poisonings, chapter 9 (PDF)</a
            >
          </li>
          <li>
            <a href="https://medlibrary.org/lib/rx/meds/lithium-carbonate-16/page/2/"
              >medlibrary.org: Lithium carbonate prescribing information</a
            >
          </li>
          <li>
            <a href="https://cdc.gov/lead-prevention/prevention/jobs-hobbies-activities.html"
              >CDC: About Lead in Jobs, Hobbies, or Other Activities</a
            >
          </li>
          <li>
            <a href="https://www.cdc.gov/nceh/lead/data/blood-lead-reference-value.htm"
              >CDC: Blood Lead Reference Value</a
            >
          </li>
          <li>
            <a
              href="https://19january2021snapshot.epa.gov/sites/static/files/2018-10/documents/childrenshealthbooklet2018_final-4_newlinks.pdf"
              >US EPA: Children's health booklet (2018, PDF)</a
            >
          </li>
          <li>
            <a
              href="https://www.health.pa.gov:443/topics/Documents/Environmental%20Health/Non-Occupational%20Lead%20Exposure.pdf"
              >Pennsylvania Department of Health: Non-Occupational Lead Exposure (PDF)</a
            >
          </li>
          <li>
            <a
              href="https://www.wcu.edu/discover/campus-services-and-operations/facilities-management/safety-and-risk-management/visual-arts-theatre-safety/ceramics-safety.aspx"
              >Western Carolina University: Ceramics Safety</a
            >
          </li>
          <li>
            <a href="https://craftscouncil.org.uk/stories/how-make-your-pottery-practice-greener"
              >Crafts Council (UK): How to make your pottery practice greener</a
            >
          </li>
          <li><a href="https://www.petpoisonhelpline.com/poison/lead/">Pet Poison Helpline: Lead</a></li>
          <li>
            <a href="https://vetmed.illinois.edu/pet-health-columns/bird-toxins-teflon-avocado-lead-zinc/"
              >University of Illinois College of Veterinary Medicine: Bird toxins</a
            >
          </li>
          <li>
            <a href="https://cdn.shopify.com/s/files/1/0889/3726/7497/files/Designing-A-Kiln-Room-1.pdf"
              >Skutt: Designing a Kiln Room (PDF)</a
            >
          </li>
          <li>
            <a href="https://cdn.shopify.com/s/files/1/0889/3726/7497/files/Kiln-Management-1.pdf"
              >Kiln Management guide for schools (PDF)</a
            >
          </li>
          <li>
            <a href="https://www.theceramicshop.com/downloads/LLFLChecklist.pdf"
              >L&amp;L Kiln: Front-loader installation checklist (PDF)</a
            >
          </li>
          <li>
            <a href="https://products.riogrande.com/content/Instruction-Sheets/RioGrande-PMC-Kilns-Handbook-IS.pdf"
              >Rio Grande: PMC Kilns Handbook (PDF)</a
            >
          </li>
          <li>
            <a
              href="https://oud.klei.nl/forum/bestanden/f675ae4a-d890-4b8b-a08e-173e652f25a6/KilnSitter%20lt3%20en%20lt3k.pdf"
              >Dawson: Kiln-Sitter LT-3 manual (PDF)</a
            >
          </li>
          <li>
            <a
              href="https://ceramicartsnetwork.org/pottery-making-illustrated/pottery-making-illustrated-article/In-the-Studio-Eye-Health-for-Potters"
              >Ceramic Arts Network: In the Studio, Eye Health for Potters</a
            >
          </li>
          <li>
            <a
              href="https://www.fda.gov/food/environmental-contaminants-food/questions-and-answers-lead-glazed-traditional-pottery"
              >FDA: Questions and Answers on Lead-Glazed Traditional Pottery</a
            >
          </li>
          <li>
            <a href="https://www.fda.gov/media/71764/download"
              >FDA: Compliance Policy Guide 545.450, lead in pottery (PDF)</a
            >
          </li>
          <li><a href="https://digitalfire.com/glossary/food+safe">Digitalfire: Food Safe</a></li>
          <li><a href="https://ceramicsnz.org/news/is-it-food-safe/">Ceramics NZ: Is it food safe?</a></li>
          <li>
            <a href="https://ceramicartsnetwork.org/ceramics-monthly/ceramics-monthly-article/Techno-File-Dirty-Dishes"
              >Ceramic Arts Network: Techno File, Dirty Dishes</a
            >
          </li>
        </ul>
      </section>
    </div>
  `
})
export class HomeSafetyGuide {
  protected readonly sections = SECTIONS;
}
