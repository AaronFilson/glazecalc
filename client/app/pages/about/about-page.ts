import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/page-header';

/** What Glazecalc is, how its numbers are worked out, and how it is built. */
@Component({
  selector: 'gc-about-page',
  imports: [PageHeader, RouterLink],
  template: `
    <gc-page-header
      title="About Glazecalc"
      lead="A free, open-source glaze chemistry calculator and notebook for potters, ceramicists and students."
    />

    <section class="panel">
      <h2>What it does</h2>
      <p>
        Glazecalc turns a glaze recipe, the materials and how much of each you weigh out, into its unity molecular
        formula: the oxides the glaze is made of once fired, scaled so the fluxes add up to one. That makes recipes
        comparable, helps explain how a glaze behaves, and helps when a material has to be replaced.
      </p>
      <p>
        Alongside the calculator it keeps your recipes, your own materials, colorants and other additives, notes and
        firing logs, a page of practical <a routerLink="/advice">glaze advice</a>, and
        <a routerLink="/guides">guides</a> for new potters, from what a glaze is to firing it safely.
      </p>
    </section>

    <section class="panel">
      <h2>How the numbers are worked out</h2>
      <p>
        Each material is described by its chemical formula or by an oxide analysis, plus its loss on ignition: the part
        that burns off in the kiln, such as the carbon dioxide in whiting or the water in kaolin. Glazecalc converts
        each amount to moles of each oxide using standard molar masses, adds them up across the recipe, and divides by
        the total moles of flux. Colorants and other additives are listed with a recipe but left out of the unity
        formula, as is usual.
      </p>
      <p>
        The results are a guide, not a guarantee. Real materials vary from supplier to supplier and batch to batch, and
        firing matters as much as chemistry, so test every glaze. Glazes for food surfaces should be tested for
        leaching.
      </p>
    </section>

    <section class="panel">
      <h2>How it is built</h2>
      <p>
        Glazecalc started in 2017 and was rebuilt in 2026. It is one small web application, and its
        <a href="https://github.com/AaronFilson/glazecalc">source code is on GitHub</a> under the MIT License.
      </p>
      <ul>
        <li>
          Angular 22 in the browser (standalone components and signals), with the glaze chemistry in a small shared
          library.
        </li>
        <li>A TypeScript API on Node.js 24 and Express 5, with MongoDB 9, checked by more than 350 automated tests.</li>
        <li>Runs in Docker on Amazon Web Services, behind nginx with HTTPS from Let's Encrypt.</li>
        <li>
          Deployed by GitHub Actions: images are built and tested on every change, and deploys sign in to AWS without
          stored keys.
        </li>
      </ul>
    </section>

    <section class="panel">
      <h2>Who made it</h2>
      <p>
        Glazecalc is made by Aaron Filson. Found a problem or have an idea?
        <a href="https://github.com/AaronFilson/glazecalc/issues">Open an issue on GitHub</a>.
      </p>
      <p class="studio">
        Aaron Filson's handmade pottery is at <a href="https://updraftpotterystudio.com/">Updraft Pottery Studio</a> in
        Tacoma, Washington. Have a look at the work, and order a piece if one speaks to you.
      </p>
    </section>
  `
})
export class AboutPage {}
