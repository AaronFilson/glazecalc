// The text of the emails about an account's password, in the account's
// language (docs/i18n-plan.md). Each email is whole sentences with its values
// named, {account}, so it translates whole; a language without a translation
// gets English. The English is fingerprinted in the tests: change it, and the
// tests say to have the translations made again.
import * as mailer from './mailer.ts';
import languages from '../../lib/regions/languages.js';

export interface Email {
  subject: string;
  /** Plain text, with the values as {name}. */
  text: string;
}

/** The reset email: {account}, {link}, {minutes} and {app}. */
export const RESET: Record<string, Email> = {
  en: {
    subject: 'Reset your Glazecalc password',
    text:
      'Someone (hopefully you) asked to reset the password for the Glazecalc account {account}.\n\n' +
      'To choose a new password, open this link within {minutes} minutes:\n\n' +
      '{link}\n\n' +
      'The link works once. If you did not ask for this, ignore this email; your password stays the same.\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  de: {
    subject: 'Passwort für Glazecalc zurücksetzen',
    text:
      'Jemand (hoffentlich Sie) hat angefordert, das Passwort für das Konto {account} bei Glazecalc zurückzusetzen.\n\n' +
      'Um ein neues Passwort zu wählen, öffnen Sie innerhalb von {minutes} Minuten diesen Link:\n\n' +
      '{link}\n\n' +
      'Der Link funktioniert nur einmal. Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail; Ihr Passwort bleibt unverändert.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  es: {
    subject: 'Restablezca su contraseña de Glazecalc',
    text:
      'Alguien (esperamos que usted) ha pedido restablecer la contraseña de la cuenta de Glazecalc {account}.\n\n' +
      'Para elegir una contraseña nueva, abra este enlace en los próximos {minutes} minutos:\n\n' +
      '{link}\n\n' +
      'El enlace solo funciona una vez. Si no lo ha pedido usted, ignore este correo; su contraseña sigue siendo la misma.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  fr: {
    subject: 'Réinitialisation de votre mot de passe Glazecalc',
    text:
      'Quelqu’un (vous, nous l’espérons) a demandé à réinitialiser le mot de passe du compte Glazecalc {account}.\n\n' +
      'Pour choisir un nouveau mot de passe, ouvrez ce lien dans les {minutes} minutes :\n\n' +
      '{link}\n\n' +
      'Le lien ne fonctionne qu’une fois. Si vous n’avez rien demandé, ignorez cet e-mail ; votre mot de passe reste le même.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  it: {
    subject: 'Reimpostazione della password di Glazecalc',
    text:
      'Qualcuno (speriamo Lei) ha chiesto di reimpostare la password dell’account Glazecalc {account}.\n\n' +
      'Per scegliere una nuova password, apra questo link entro {minutes} minuti:\n\n' +
      '{link}\n\n' +
      'Il link funziona una sola volta. Se non ha chiesto Lei la reimpostazione, ignori questa email: la Sua password resta la stessa.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  pl: {
    subject: 'Resetowanie hasła w aplikacji Glazecalc',
    text:
      'Ktoś (miejmy nadzieję, że właściciel konta) poprosił o zresetowanie hasła do konta {account} w aplikacji Glazecalc.\n\n' +
      'Aby ustawić nowe hasło, należy otworzyć ten link w ciągu {minutes} min:\n\n' +
      '{link}\n\n' +
      'Link działa jeden raz. Jeśli prośba nie pochodzi od właściciela konta, wystarczy zignorować tę wiadomość; hasło pozostanie bez zmian.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'Repor a sua palavra-passe do Glazecalc',
    text:
      'Foi feito um pedido, esperamos que por si, para repor a palavra-passe da conta Glazecalc {account}.\n\n' +
      'Para escolher uma nova palavra-passe, abra esta ligação nos próximos {minutes} minutos:\n\n' +
      '{link}\n\n' +
      'A ligação só funciona uma vez. Se não fez este pedido, ignore este e-mail; a sua palavra-passe mantém-se igual.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  sk: {
    subject: 'Obnovenie hesla do aplikácie Glazecalc',
    text:
      'Niekto (dúfajme, že Vy) požiadal o obnovenie hesla k účtu {account} v aplikácii Glazecalc.\n\n' +
      'Ak si chcete zvoliť nové heslo, otvorte do {minutes} minút tento odkaz:\n\n' +
      '{link}\n\n' +
      'Odkaz funguje len raz. Ak ste o to nežiadali, tento e-mail ignorujte; Vaše heslo zostane rovnaké.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  el: {
    subject: 'Επαναφορά του κωδικού πρόσβασής σας στο Glazecalc',
    text:
      'Κάποιος (ελπίζουμε εσείς) ζήτησε επαναφορά του κωδικού πρόσβασης για τον λογαριασμό {account} στο Glazecalc.\n\n' +
      'Για να επιλέξετε νέο κωδικό πρόσβασης, ανοίξτε αυτόν τον σύνδεσμο μέσα σε {minutes} λεπτά:\n\n' +
      '{link}\n\n' +
      'Ο σύνδεσμος λειτουργεί μία φορά. Αν δεν το ζητήσατε εσείς, αγνοήστε αυτό το email. Ο κωδικός πρόσβασής σας μένει ο ίδιος.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  cs: {
    subject: 'Obnovení hesla do aplikace Glazecalc',
    text:
      'Někdo (doufejme, že Vy) požádal o obnovení hesla k účtu {account} v aplikaci Glazecalc.\n\n' +
      'Chcete-li si zvolit nové heslo, otevřete do {minutes} minut tento odkaz:\n\n' +
      '{link}\n\n' +
      'Odkaz funguje jen jednou. Pokud jste o to nežádali, tento e-mail ignorujte; Vaše heslo zůstane stejné.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  da: {
    subject: 'Nulstil adgangskoden til Glazecalc',
    text:
      'Nogen (forhåbentlig dig) har bedt om at nulstille adgangskoden til kontoen {account} i Glazecalc.\n\n' +
      'Åbn dette link inden for {minutes} minutter for at vælge en ny adgangskode:\n\n' +
      '{link}\n\n' +
      'Linket virker én gang. Hvis du ikke har bedt om dette, kan du se bort fra denne e-mail; adgangskoden forbliver den samme.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  sv: {
    subject: 'Återställ lösenordet till Glazecalc',
    text:
      'Någon (förhoppningsvis du) har bett om att få återställa lösenordet för kontot {account} i Glazecalc.\n\n' +
      'Öppna den här länken inom {minutes} minuter för att välja ett nytt lösenord:\n\n' +
      '{link}\n\n' +
      'Länken fungerar en gång. Om du inte har bett om det kan du bortse från det här meddelandet; lösenordet förblir detsamma.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  hu: {
    subject: 'Glazecalc-jelszavának visszaállítása',
    text:
      'Valaki (remélhetőleg Ön) kérte, hogy állítsuk vissza a(z) {account} Glazecalc-fiók jelszavát.\n\n' +
      'Új jelszó választásához {minutes} percen belül nyissa meg ezt a linket:\n\n' +
      '{link}\n\n' +
      'A link egyszer használható. Ha nem Ön kérte, hagyja figyelmen kívül ezt az e-mailt; a jelszava nem változik.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  fi: {
    subject: 'Glazecalcin salasanan palauttaminen',
    text:
      'Joku (toivottavasti tilin omistaja itse) on pyytänyt Glazecalc-tilin {account} salasanan palauttamista.\n\n' +
      'Valitse uusi salasana avaamalla tämä linkki {minutes} minuutin kuluessa:\n\n' +
      '{link}\n\n' +
      'Linkki toimii kerran. Jos palauttamista ei ole pyydetty, jätä tämä viesti huomiotta; salasana pysyy ennallaan.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  ro: {
    subject: 'Resetarea parolei pentru Glazecalc',
    text:
      'Cineva (sperăm că dumneavoastră) a cerut resetarea parolei pentru contul Glazecalc {account}.\n\n' +
      'Pentru a alege o parolă nouă, deschideți acest link în următoarele {minutes} min:\n\n' +
      '{link}\n\n' +
      'Linkul funcționează o singură dată. Dacă nu ați cerut acest lucru, ignorați acest e-mail; parola rămâne aceeași.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  sl: {
    subject: 'Ponastavitev gesla za aplikacijo Glazecalc',
    text:
      'Nekdo (upamo, da Vi) je zahteval ponastavitev gesla za račun {account} v aplikaciji Glazecalc.\n\n' +
      'Če želite izbrati novo geslo, v {minutes} minutah odprite to povezavo:\n\n' +
      '{link}\n\n' +
      'Povezava deluje samo enkrat. Če tega niste zahtevali, prezrite to e-poštno sporočilo; Vaše geslo ostane enako.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  nl: {
    subject: 'Wachtwoord voor Glazecalc opnieuw instellen',
    text:
      'Iemand (hopelijk u) heeft gevraagd het wachtwoord van het account {account} bij Glazecalc opnieuw in te stellen.\n\n' +
      'Open deze link binnen {minutes} minuten om een nieuw wachtwoord te kiezen:\n\n' +
      '{link}\n\n' +
      'De link werkt één keer. Hebt u hier niet om gevraagd, negeer deze e-mail dan; uw wachtwoord blijft hetzelfde.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'Нулиране на паролата за Glazecalc',
    text:
      'Някой (надяваме се, Вие) поиска нулиране на паролата за профила {account} в Glazecalc.\n\n' +
      'За да изберете нова парола, отворете тази връзка в рамките на {minutes} минути:\n\n' +
      '{link}\n\n' +
      'Връзката работи само веднъж. Ако не сте поискали това, не обръщайте внимание на този имейл; паролата Ви остава същата.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  hr: {
    subject: 'Ponovno postavljanje lozinke za aplikaciju Glazecalc',
    text:
      'Netko (nadamo se da ste to bili vi) zatražio je ponovno postavljanje lozinke za račun {account} u aplikaciji Glazecalc.\n\n' +
      'Da biste odabrali novu lozinku, otvorite ovu poveznicu u roku od {minutes} min:\n\n' +
      '{link}\n\n' +
      'Poveznica vrijedi samo jednom. Ako to niste zatražili, zanemarite ovu e-poruku; vaša lozinka ostaje ista.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  lt: {
    subject: 'Glazecalc: slaptažodžio atkūrimas',
    text:
      'Kažkas (tikimės, kad jūs) paprašė atkurti programos Glazecalc paskyros {account} slaptažodį.\n\n' +
      'Norėdami pasirinkti naują slaptažodį, per {minutes} min. atidarykite šią nuorodą:\n\n' +
      '{link}\n\n' +
      'Nuorodą galima panaudoti vieną kartą. Jei to neprašėte, nekreipkite dėmesio į šį laišką; jūsų slaptažodis liks toks pat.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  lv: {
    subject: 'Lietotnes Glazecalc paroles atiestatīšana',
    text:
      'Kāds (cerams, Jūs) pieprasīja atiestatīt paroli lietotnes Glazecalc kontam {account}.\n\n' +
      'Lai izvēlētos jaunu paroli, atveriet šo saiti {minutes} min laikā:\n\n' +
      '{link}\n\n' +
      'Saite darbojas vienu reizi. Ja to nepieprasījāt, neņemiet vērā šo vēstuli – Jūsu parole paliek tā pati.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  et: {
    subject: 'Glazecalci parooli lähtestamine',
    text:
      'Keegi (loodetavasti teie) palus lähtestada Glazecalci konto {account} parooli.\n\n' +
      'Uue parooli valimiseks avage see link {minutes} minuti jooksul:\n\n' +
      '{link}\n\n' +
      'Link töötab ühe korra. Kui te seda ei palunud, jätke see e-kiri tähelepanuta; teie parool jääb samaks.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  ga: {
    subject: 'Athshocraigh do phasfhocal Glazecalc',
    text:
      'D’iarr duine éigin (tusa, tá súil againn) an pasfhocal a athshocrú don chuntas Glazecalc {account}.\n\n' +
      'Chun pasfhocal nua a roghnú, oscail an nasc seo laistigh de {minutes} nóiméad:\n\n' +
      '{link}\n\n' +
      'Ní oibríonn an nasc ach uair amháin. Mura tusa a d’iarr é seo, déan neamhaird den ríomhphost seo; fanfaidh do phasfhocal mar an gcéanna.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  mt: {
    subject: 'Irrisettja l-password tiegħek ta’ Glazecalc',
    text:
      'Xi ħadd (nittamaw li kont int) talab li tiġi rrisettjata l-password tal-kont {account} ta’ Glazecalc.\n\n' +
      'Biex tagħżel password ġdida, iftaħ dan il-link fi żmien {minutes} min:\n\n' +
      '{link}\n\n' +
      'Il-link jaħdem darba biss. Jekk ma talabtx dan, injora dan il-messaġġ; il-password tiegħek tibqa’ l-istess.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  }
};

/** The email after a password is changed: {account}, {forgot} and {app}. */
export const CHANGED: Record<string, Email> = {
  en: {
    subject: 'Your Glazecalc password was changed',
    text:
      'The password for the Glazecalc account {account} was just changed, and every device that was signed in has been signed out.\n\n' +
      'If this was you, there is nothing else to do. If not, reset your password right away at {forgot}\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  de: {
    subject: 'Ihr Passwort für Glazecalc wurde geändert',
    text:
      'Das Passwort für das Konto {account} bei Glazecalc wurde gerade geändert, und alle Geräte, die angemeldet waren, wurden abgemeldet.\n\n' +
      'Wenn Sie das waren, müssen Sie nichts weiter tun. Wenn nicht, setzen Sie Ihr Passwort sofort hier zurück: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  es: {
    subject: 'Se ha cambiado su contraseña de Glazecalc',
    text:
      'Se acaba de cambiar la contraseña de la cuenta de Glazecalc {account}, y se ha cerrado la sesión en todos los dispositivos donde estaba iniciada.\n\n' +
      'Si ha sido usted, no tiene que hacer nada más. Si no, restablezca su contraseña de inmediato en {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  fr: {
    subject: 'Votre mot de passe Glazecalc a été modifié',
    text:
      'Le mot de passe du compte Glazecalc {account} vient d’être modifié, et tous les appareils connectés ont été déconnectés.\n\n' +
      'Si c’est vous, il n’y a rien d’autre à faire. Sinon, réinitialisez votre mot de passe tout de suite sur {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  it: {
    subject: 'La Sua password di Glazecalc è stata cambiata',
    text:
      'La password dell’account Glazecalc {account} è stata appena cambiata e tutti i dispositivi su cui era stato effettuato l’accesso sono stati disconnessi.\n\n' +
      'Se la modifica l’ha fatta Lei, non c’è altro da fare. Altrimenti, reimposti subito la password all’indirizzo {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  pl: {
    subject: 'Zmieniono hasło w aplikacji Glazecalc',
    text:
      'Hasło do konta {account} w aplikacji Glazecalc zostało właśnie zmienione, a wszystkie urządzenia, na których konto było zalogowane, zostały wylogowane.\n\n' +
      'Jeśli hasło zmienił właściciel konta, nie trzeba nic więcej robić. Jeśli nie, należy od razu zresetować hasło na stronie {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'A sua palavra-passe do Glazecalc foi alterada',
    text:
      'A palavra-passe da conta Glazecalc {account} acabou de ser alterada, e a sessão foi terminada em todos os dispositivos em que estava iniciada.\n\n' +
      'Se a alteração foi feita por si, não precisa de fazer mais nada. Caso contrário, reponha já a sua palavra-passe em {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  sk: {
    subject: 'Heslo do aplikácie Glazecalc bolo zmenené',
    text:
      'Heslo k účtu {account} v aplikácii Glazecalc bolo práve zmenené a všetky zariadenia, na ktorých bol účet prihlásený, boli odhlásené.\n\n' +
      'Ak ste to boli Vy, nemusíte už nič robiť. Ak nie, ihneď si obnovte heslo tu: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  el: {
    subject: 'Ο κωδικός πρόσβασής σας στο Glazecalc άλλαξε',
    text:
      'Ο κωδικός πρόσβασης για τον λογαριασμό {account} στο Glazecalc μόλις άλλαξε, και όλες οι συσκευές που ήταν συνδεδεμένες αποσυνδέθηκαν.\n\n' +
      'Αν το κάνατε εσείς, δεν χρειάζεται να κάνετε τίποτα άλλο. Αν όχι, επαναφέρετε αμέσως τον κωδικό πρόσβασής σας εδώ: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  cs: {
    subject: 'Vaše heslo do aplikace Glazecalc bylo změněno',
    text:
      'Heslo k účtu {account} v aplikaci Glazecalc bylo právě změněno a všechna zařízení, která byla přihlášena, byla odhlášena.\n\n' +
      'Pokud jste to byli Vy, nemusíte už nic dělat. Pokud ne, ihned si obnovte heslo zde: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  da: {
    subject: 'Adgangskoden til Glazecalc er ændret',
    text:
      'Adgangskoden til kontoen {account} i Glazecalc er netop blevet ændret, og alle enheder, der var logget ind, er blevet logget ud.\n\n' +
      'Hvis det var dig, er der ikke mere at gøre. Hvis ikke, så nulstil adgangskoden med det samme på {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  sv: {
    subject: 'Lösenordet till Glazecalc har ändrats',
    text:
      'Lösenordet för kontot {account} i Glazecalc har just ändrats, och alla enheter som var inloggade har loggats ut.\n\n' +
      'Om det var du behöver du inte göra något mer. Om inte, återställ lösenordet direkt på {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  hu: {
    subject: 'Glazecalc-jelszava megváltozott',
    text:
      'A(z) {account} Glazecalc-fiók jelszava az imént megváltozott, és minden eszközt, amely be volt jelentkezve, kijelentkeztettünk.\n\n' +
      'Ha Ön volt az, nincs további teendője. Ha nem, azonnal állítsa vissza a jelszavát itt: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  fi: {
    subject: 'Glazecalcin salasana on vaihdettu',
    text:
      'Glazecalc-tilin {account} salasana vaihdettiin juuri, ja kaikki laitteet, joilla oli kirjauduttu sisään, on kirjattu ulos.\n\n' +
      'Jos salasanan vaihtoi tilin omistaja itse, muuta ei tarvitse tehdä. Muussa tapauksessa palauta salasana heti osoitteessa {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  ro: {
    subject: 'Parola dumneavoastră pentru Glazecalc a fost schimbată',
    text:
      'Parola contului Glazecalc {account} tocmai a fost schimbată, iar toate dispozitivele care erau conectate au fost deconectate.\n\n' +
      'Dacă ați fost dumneavoastră, nu mai trebuie să faceți nimic. Dacă nu, resetați-vă imediat parola la {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  sl: {
    subject: 'Geslo za aplikacijo Glazecalc je bilo spremenjeno',
    text:
      'Geslo za račun {account} v aplikaciji Glazecalc je bilo pravkar spremenjeno, vse naprave, ki so bile prijavljene, pa so bile odjavljene.\n\n' +
      'Če ste bili to Vi, Vam ni treba storiti ničesar več. Če ne, takoj ponastavite geslo tukaj: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  nl: {
    subject: 'Uw wachtwoord voor Glazecalc is gewijzigd',
    text:
      'Het wachtwoord van het account {account} bij Glazecalc is zojuist gewijzigd, en alle apparaten die waren ingelogd, zijn uitgelogd.\n\n' +
      'Was u dit zelf, dan hoeft u verder niets te doen. Zo niet, stel uw wachtwoord dan meteen opnieuw in via {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'Паролата Ви за Glazecalc е променена',
    text:
      'Паролата за профила {account} в Glazecalc току-що беше променена и всички устройства, на които бяхте влезли, са изведени от профила.\n\n' +
      'Ако това сте били Вие, не е нужно да правите нищо друго. Ако не сте, нулирайте паролата си веднага на {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  hr: {
    subject: 'Vaša je lozinka za aplikaciju Glazecalc promijenjena',
    text:
      'Lozinka za račun {account} u aplikaciji Glazecalc upravo je promijenjena, a svi uređaji na kojima je račun bio prijavljen odjavljeni su.\n\n' +
      'Ako ste to bili vi, ne morate ništa drugo učiniti. Ako niste, odmah ponovno postavite lozinku ovdje: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  lt: {
    subject: 'Glazecalc: slaptažodis pakeistas',
    text:
      'Programos Glazecalc paskyros {account} slaptažodis ką tik pakeistas, ir visi įrenginiai, kuriuose buvo prisijungta, atjungti.\n\n' +
      'Jei tai buvote jūs, daugiau nieko daryti nereikia. Jei ne, nedelsdami atkurkite slaptažodį čia: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  lv: {
    subject: 'Jūsu lietotnes Glazecalc parole ir nomainīta',
    text:
      'Lietotnes Glazecalc konta {account} parole tikko ir nomainīta, un konts ir izrakstīts no visām ierīcēm, kurās tas bija pierakstīts.\n\n' +
      'Ja to izdarījāt Jūs, nekas cits nav jādara. Ja ne, nekavējoties atiestatiet paroli šeit: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  et: {
    subject: 'Teie Glazecalci parool on muudetud',
    text:
      'Glazecalci konto {account} parool muudeti just praegu ja kõik seadmed, kus konto oli sisse logitud, on välja logitud.\n\n' +
      'Kui see olite teie, ei pea te midagi muud tegema. Kui mitte, lähtestage parool kohe siin: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  ga: {
    subject: 'Athraíodh do phasfhocal Glazecalc',
    text:
      'Athraíodh an pasfhocal don chuntas Glazecalc {account} anois díreach, agus síníodh amach gach gléas a bhí sínithe isteach.\n\n' +
      'Más tusa a rinne é, níl aon rud eile le déanamh. Mura tusa, athshocraigh do phasfhocal láithreach anseo: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  mt: {
    subject: 'Il-password tiegħek ta’ Glazecalc inbidlet',
    text:
      'Il-password tal-kont {account} ta’ Glazecalc għadha kif inbidlet, u kull apparat li kien dieħel fil-kont ħareġ minnu.\n\n' +
      'Jekk kont int, m’hemmx għalfejn tagħmel xejn aktar. Jekk le, irrisettja l-password tiegħek minnufih hawn: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  }
};

/**
 * The email after an account is deleted: {account}, {days} and {app}. English
 * only until the next translation wave; other languages get it in English.
 */
export const DELETED: Record<string, Email> = {
  en: {
    subject: 'Your Glazecalc account was deleted',
    text:
      'The Glazecalc account {account} has been deleted, with everything saved in it: recipes, materials, firings, notes and settings. It cannot be undone.\n\n' +
      'Copies in the site backups are deleted as the backups expire, within {days} days.\n\n' +
      'You can make a new account at any time.\n' +
      '\n-- \nGlazecalc, {app}\n'
  }
};

/**
 * How long a deleted account lives on in backups, in days: the nightly dumps
 * expire after 30 days (deploy/aws/README.md, section 3), the EBS snapshots
 * after 7 (deploy/aws/dlm-policy.json).
 */
export const BACKUP_DAYS = 30;

/** The email in the language, or in English. */
const inLanguage = (emails: Record<string, Email>, language?: string): Email =>
  (language && emails[language]) || emails['en']!;

/** An email's text with its values in. */
const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));

/** A page of the app in the account's language: /de/forgot for German. */
const pageIn = (language: string | undefined, page: string): string =>
  mailer.appUrl() + languages.languagePrefix(language ?? 'en') + page;

export const sendReset = (to: string, token: string, minutes: number, language?: string): Promise<void> => {
  const email = inLanguage(RESET, language);
  return mailer.send({
    to,
    subject: email.subject,
    // The token is after the #, so it stays in the browser: it never reaches
    // the server's logs or another site's Referer header.
    text: fill(email.text, {
      account: to,
      link: pageIn(language, '/reset#token=' + token),
      minutes,
      app: mailer.appUrl()
    })
  });
};

export const sendChanged = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(CHANGED, language);
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

export const sendDeleted = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(DELETED, language);
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, days: BACKUP_DAYS, app: mailer.appUrl() })
  });
};

// The emails about confirming an address. English only for now: a language
// without a translation gets English, as with the others.

/** Sent to a new account's address: {account}, {link}, {hours} and {app}. */
export const VERIFY: Record<string, Email> = {
  en: {
    subject: 'Confirm your email for Glazecalc',
    text:
      'Someone (hopefully you) made a Glazecalc account with the address {account}.\n\n' +
      'To confirm that this address is yours, open this link within {hours} hours:\n\n' +
      '{link}\n\n' +
      'The link works once. If you did not make an account, ignore this email; nothing else will be sent to you unless you ask for it.\n' +
      '\n-- \nGlazecalc, {app}\n'
  }
};

/** Sent to the new address of an email change: {account}, {link}, {hours} and {app}. */
export const CONFIRM_CHANGE: Record<string, Email> = {
  en: {
    subject: 'Confirm your new email for Glazecalc',
    text:
      'Someone (hopefully you) asked to use {account} as the email for their Glazecalc account.\n\n' +
      'To make the change, open this link within {hours} hours:\n\n' +
      '{link}\n\n' +
      'The link works once, and every device that was signed in will be signed out. If you did not ask for this, ignore this email; nothing will change.\n' +
      '\n-- \nGlazecalc, {app}\n'
  }
};

/** Sent to the old address when a change is asked for: {account}, {forgot} and {app}. */
export const CHANGE_NOTICE: Record<string, Email> = {
  en: {
    subject: 'A new email was requested for your Glazecalc account',
    text:
      'A change of email was just asked for on the Glazecalc account {account}. A link was sent to the new address, and the change happens only when that link is opened.\n\n' +
      'If this was you, there is nothing else to do. If not, someone may know your password: reset it right away at {forgot}\n' +
      '\n-- \nGlazecalc, {app}\n'
  }
};

/** Whole hours a link works for, as the emails say. */
export const sendVerify = (to: string, token: string, hours: number, language?: string): Promise<void> => {
  const email = inLanguage(VERIFY, language);
  return mailer.send({
    to,
    subject: email.subject,
    // After the #, like a reset link's token, so it stays in the browser.
    text: fill(email.text, {
      account: to,
      link: pageIn(language, '/confirm-email#token=' + token),
      hours,
      app: mailer.appUrl()
    })
  });
};

export const sendConfirmChange = (to: string, token: string, hours: number, language?: string): Promise<void> => {
  const email = inLanguage(CONFIRM_CHANGE, language);
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      link: pageIn(language, '/confirm-email#token=' + token),
      hours,
      app: mailer.appUrl()
    })
  });
};

export const sendChangeNotice = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(CHANGE_NOTICE, language);
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

// Notices about two-step sign-in (docs/mfa-plan.md, item 10). STREAM D
// implements these: the emails MFA_ADDED and MFA_REMOVED ({account}, {method},
// {forgot}, {app}), RECOVERY_USED ({left}) and RECOVERY_NEW, English only for
// now, through inLanguage and fill as above. {method} is a whole phrase from a
// small per-language table: "an authenticator app", "the passkey "{name}"".

/** The factor a notice is about. */
export type MfaMethod = { kind: 'totp' } | { kind: 'passkey'; name: string };

const notYet = (): never => {
  throw new Error('not implemented: account_mail.ts MFA notices (stream D, docs/mfa-plan.md item 10)');
};

export const sendMfaAdded = (to: string, method: MfaMethod, language?: string): Promise<void> => notYet();

export const sendMfaRemoved = (to: string, method: MfaMethod, language?: string): Promise<void> => notYet();

export const sendRecoveryUsed = (to: string, left: number, language?: string): Promise<void> => notYet();

export const sendRecoveryNew = (to: string, language?: string): Promise<void> => notYet();

/** One notice, as the routes send it. */
export type MfaNotice =
  | { kind: 'added'; method: MfaMethod }
  | { kind: 'removed'; method: MfaMethod }
  | { kind: 'recovery-used'; left: number }
  | { kind: 'recovery-new' };

/**
 * What the routes call (streams A and B), after the reply: sends the notice in
 * the account's language, only when the address is confirmed
 * (!user.emailUnverified) and never to a trial. Never throws or rejects: a
 * failure is logged by its error code only, as logMailError does.
 */
export const noticeMfa = (
  user: { email: string; emailUnverified?: boolean; guest?: boolean; preferences?: { language?: string } },
  notice: MfaNotice
): void => {
  void user;
  void notice;
};
