import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/page-header';

/** What Glazecalc stores, why, where, and for how long. Keep it true when the app changes. */
@Component({
  selector: 'gc-privacy-page',
  imports: [PageHeader, RouterLink],
  template: `
    <gc-page-header title="Privacy" lead="Last updated October 2026." />

    <section class="panel">
      <h2>In short</h2>
      <p>
        Glazecalc keeps what it needs to run your account and nothing more. There are no ads, no analytics, no tracking
        cookies and no third-party scripts. Your data is never sold or shared.
      </p>
    </section>

    <section class="panel">
      <h2>What is stored</h2>
      <ul>
        <li>
          <b>Your account:</b> your email address and your password, which is stored only as a one-way hash (bcrypt),
          never as the password itself.
        </li>
        <li>
          <b>A trial ("Try it now"):</b> no email or password, only a generated name such as "speckled quiet kilns". A
          trial and everything saved in it are deleted automatically 14 days after it starts, unless you create an
          account to keep them.
        </li>
        <li>
          <b>What you save:</b> your recipes, materials, additives, notes, firing logs and advice. Other users cannot
          see them.
        </li>
        <li>
          <b>Password reset requests:</b> a fingerprint of each reset link (not the link itself), deleted automatically
          when it expires 30 minutes later.
        </li>
        <li>
          <b>In your browser:</b> one cookie, <code>glazecalc_session</code>, that keeps you signed in. It holds your
          sign-in token, scripts on the page cannot read it, it goes only to Glazecalc's own server, and it lasts 7 days
          (14 for a trial). Local storage holds a note that you are signed in and, during a trial, its name and end
          date. Signing out removes them.
        </li>
      </ul>
    </section>

    <section class="panel">
      <h2>Email</h2>
      <p>
        Glazecalc sends email only when you ask to reset your password and when your password changes. It is sent
        through Amazon Simple Email Service. There is no newsletter or marketing email.
      </p>
    </section>

    <section class="panel">
      <h2>Logs, backups and hosting</h2>
      <ul>
        <li>
          The web server records each request, including your IP address, in a log kept for 14 days to run and secure
          the site.
        </li>
        <li>
          Encrypted backups of the database are kept for 30 days, and copies of the server's disk for 7 days, so the
          site can be restored after a failure.
        </li>
        <li>Everything is hosted by Amazon Web Services in the United States (Oregon).</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Deleting your data</h2>
      <p>
        You can delete your account from your <a routerLink="/account">account page</a>. That removes your account and
        everything you saved right away; "Discard trial" does the same for a trial. Copies in backups disappear as the
        backups age out, within 30 days.
      </p>
    </section>

    <section class="panel">
      <h2>Questions</h2>
      <p>
        Ask by <a href="https://github.com/AaronFilson/glazecalc/issues">opening an issue on GitHub</a>. If this policy
        changes, the date at the top of this page changes too.
      </p>
    </section>
  `
})
export class PrivacyPage {}
