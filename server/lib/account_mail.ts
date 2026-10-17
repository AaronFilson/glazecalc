// The text of the emails about an account's password, in the account's
// language (docs/i18n-plan.md). Each email is whole sentences with its values
// named, {account}, so it translates whole; a language without a translation
// gets English. The English is fingerprinted in the tests: change it, and the
// tests say to have the translations made again.
import * as mailer from './mailer.ts';
import { isGuestAddress } from './email.ts';
import * as log from './log.ts';
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
  },
  ja: {
    subject: 'Glazecalc のパスワードの再設定',
    text:
      'Glazecalc のアカウント {account} のパスワードを再設定するよう依頼がありました（ご本人によるものであることを願っています）。\n\n' +
      '新しいパスワードを設定するには、{minutes}分以内に次のリンクを開いてください:\n\n' +
      '{link}\n\n' +
      'このリンクは一度だけ使えます。心当たりがない場合は、このメールを無視してください。パスワードは変わりません。\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc parolanızı sıfırlayın',
    text:
      'Birisi (umarız sizsinizdir) Glazecalc hesabı {account} için parolanın sıfırlanmasını istedi.\n\n' +
      'Yeni bir parola seçmek için {minutes} dakika içinde bu bağlantıyı açın:\n\n' +
      '{link}\n\n' +
      'Bağlantı bir kez kullanılabilir. Bunu siz istemediyseniz bu e-postayı dikkate almayın; parolanız aynı kalır.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  'zh-Hant': {
    subject: '重設您的 Glazecalc 密碼',
    text:
      '有人（希望是您本人）要求重設 Glazecalc 帳戶 {account} 的密碼。\n\n' +
      '若要設定新密碼，請在 {minutes} 分鐘內開啟這個連結：\n\n' +
      '{link}\n\n' +
      '此連結只能使用一次。如果您沒有提出這項要求，請忽略這封電子郵件；您的密碼不會改變。\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  ko: {
    subject: 'Glazecalc 비밀번호 재설정',
    text:
      '누군가(본인이기를 바랍니다) Glazecalc 계정 {account}의 비밀번호 재설정을 요청했습니다.\n\n' +
      '새 비밀번호를 정하려면 {minutes}분 안에 다음 링크를 여세요.\n\n' +
      '{link}\n\n' +
      '이 링크는 한 번만 쓸 수 있습니다. 요청한 적이 없다면 이 이메일을 무시하세요. 비밀번호는 그대로 유지됩니다.\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  'zh-Hans': {
    subject: '重置 Glazecalc 密码',
    text:
      '有人（希望是您本人）申请重置 Glazecalc 账户 {account} 的密码。\n\n' +
      '要设置新密码，请在 {minutes} 分钟内打开此链接：\n\n' +
      '{link}\n\n' +
      '此链接只能使用一次。如果您没有申请，请忽略此邮件；您的密码保持不变。\n' +
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
  },
  ja: {
    subject: 'Glazecalc のパスワードが変更されました',
    text:
      'Glazecalc のアカウント {account} のパスワードが先ほど変更され、ログインしていたすべての端末がログアウトされました。\n\n' +
      'ご本人による変更であれば、ほかに必要な操作はありません。そうでない場合は、すぐに次のページでパスワードを再設定してください: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc parolanız değiştirildi',
    text:
      'Glazecalc hesabı {account} için parola az önce değiştirildi ve oturum açık olan tüm cihazlarda oturum kapatıldı.\n\n' +
      'Bunu siz yaptıysanız başka bir şey yapmanız gerekmez. Siz yapmadıysanız parolanızı hemen şu adresten sıfırlayın: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  'zh-Hant': {
    subject: '您的 Glazecalc 密碼已變更',
    text:
      'Glazecalc 帳戶 {account} 的密碼剛剛已變更，所有原本已登入的裝置都已登出。\n\n' +
      '如果這是您本人的操作，就不需要再做任何事。如果不是，請立即到 {forgot} 重設密碼\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  ko: {
    subject: 'Glazecalc 비밀번호가 변경되었습니다',
    text:
      'Glazecalc 계정 {account}의 비밀번호가 방금 변경되었으며, 로그인되어 있던 모든 기기에서 로그아웃되었습니다.\n\n' +
      '본인이 변경했다면 따로 할 일은 없습니다. 그렇지 않다면 다음 주소에서 바로 비밀번호를 재설정하세요: {forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  },
  'zh-Hans': {
    subject: '您的 Glazecalc 密码已修改',
    text:
      'Glazecalc 账户 {account} 的密码刚刚被修改，所有已登录的设备均已退出登录。\n\n' +
      '如果是您本人操作，无需再做任何事。如果不是，请立即在此重置密码：{forgot}\n' +
      '\n' +
      '-- \nGlazecalc, {app}\n'
  }
};

/**
 * The email after an account is deleted: {account}, {days} and {app}, in each
 * language offered.
 */
export const DELETED: Record<string, Email> = {
  en: {
    subject: 'Your Glazecalc account was deleted',
    text:
      'The Glazecalc account {account} has been deleted, with everything saved in it: recipes, materials, firings, notes and settings. It cannot be undone.\n\n' +
      'Copies in the site backups are deleted as the backups expire, within {days} days.\n\n' +
      'You can make a new account at any time.\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'Профилът Ви в Glazecalc беше изтрит',
    text:
      'Профилът {account} в Glazecalc беше изтрит заедно с всичко записано в него: рецепти, суровини, изпичания, бележки и настройки. Действието не може да бъде отменено.\n' +
      '\n' +
      'Копията в резервните копия на сайта се изтриват, когато резервните копия изтекат, в рамките на {days} дни.\n' +
      '\n' +
      'Можете да създадете нов профил по всяко време.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Váš účet Glazecalc byl smazán',
    text:
      'Účet Glazecalc {account} byl smazán spolu se vším, co v něm bylo uloženo: recepty, surovinami, výpaly, poznámkami a nastavením. Nelze to vrátit zpět.\n' +
      '\n' +
      'Kopie v zálohách webu se mažou, jakmile zálohy vyprší, do {days} dnů.\n' +
      '\n' +
      'Kdykoli si můžete vytvořit nový účet.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Din Glazecalc-konto er slettet',
    text:
      'Glazecalc-kontoen {account} er slettet med alt, hvad der var gemt i den: opskrifter, råvarer, brændinger, noter og indstillinger. Det kan ikke fortrydes.\n' +
      '\n' +
      'Kopier i webstedets sikkerhedskopier slettes, efterhånden som sikkerhedskopierne udløber, inden for {days} dage.\n' +
      '\n' +
      'Du kan oprette en ny konto når som helst.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Ihr Glazecalc-Konto wurde gelöscht',
    text:
      'Das Glazecalc-Konto {account} wurde gelöscht, mit allem, was darin gespeichert war: Rezepte, Rohstoffe, Brennprotokolle, Notizen und Einstellungen. Das lässt sich nicht rückgängig machen.\n' +
      '\n' +
      'Kopien in den Sicherungen der Website werden gelöscht, sobald die Sicherungen ablaufen, innerhalb von {days} Tagen.\n' +
      '\n' +
      'Sie können jederzeit ein neues Konto erstellen.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Se ha eliminado su cuenta de Glazecalc',
    text:
      'La cuenta de Glazecalc {account} se ha eliminado, con todo lo que había guardado en ella: recetas, materiales, cocciones, notas y ajustes. No se puede deshacer.\n' +
      '\n' +
      'Las copias en las copias de seguridad del sitio se eliminan a medida que estas caducan, en un plazo de {days} días.\n' +
      '\n' +
      'Puede crear una cuenta nueva en cualquier momento.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Teie Glazecalci konto kustutati',
    text:
      'Glazecalci konto {account} on kustutatud koos kõigega, mis selles oli salvestatud: retseptid, toorained, põletused, märkmed ja sätted. Seda ei saa tagasi võtta.\n' +
      '\n' +
      'Saidi varukoopiates olevad koopiad kustutatakse varukoopiate aegumisel, {days} päeva jooksul.\n' +
      '\n' +
      'Uue konto saate luua igal ajal.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Glazecalc-tilisi on poistettu',
    text:
      'Glazecalc-tili {account} on poistettu kaikkine tallennettuine tietoineen: resepteineen, raaka-aineineen, polttoineen, muistiinpanoineen ja asetuksineen. Toimintoa ei voi kumota.\n' +
      '\n' +
      'Palvelun varmuuskopioissa olevat kopiot poistetaan varmuuskopioiden vanhentuessa {days} päivän kuluessa.\n' +
      '\n' +
      'Voit luoda uuden tilin milloin tahansa.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'Votre compte Glazecalc a été supprimé',
    text:
      'Le compte Glazecalc {account} a été supprimé, avec tout ce qu’il contenait : recettes, matières premières, cuissons, notes et réglages. Cette action est irréversible.\n' +
      '\n' +
      'Les copies dans les sauvegardes du site sont supprimées à mesure que les sauvegardes expirent, dans un délai de {days} jours.\n' +
      '\n' +
      'Vous pouvez créer un nouveau compte à tout moment.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Vaš račun Glazecalc je izbrisan',
    text:
      'Račun Glazecalc {account} izbrisan je zajedno sa svime što je u njemu bilo spremljeno: receptima, sirovinama, pečenjima, bilješkama i postavkama. To se ne može poništiti.\n' +
      '\n' +
      'Kopije u sigurnosnim kopijama stranice brišu se kad sigurnosne kopije isteknu, u roku od {days} dana.\n' +
      '\n' +
      'U bilo kojem trenutku možete stvoriti novi račun.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'A Glazecalc-fiókját törölték',
    text:
      'A(z) {account} Glazecalc-fiókot töröltük, mindennel együtt, ami benne volt elmentve: receptekkel, nyersanyagokkal, égetésekkel, jegyzetekkel és beállításokkal. Ez nem vonható vissza.\n' +
      '\n' +
      'A webhely biztonsági mentéseiben lévő másolatok a mentések lejártával törlődnek, {days} napon belül.\n' +
      '\n' +
      'Bármikor létrehozhat új fiókot.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'Il Suo account Glazecalc è stato eliminato',
    text:
      'L’account Glazecalc {account} è stato eliminato, con tutto ciò che conteneva: ricette, materiali, cotture, note e impostazioni. L’operazione non può essere annullata.\n' +
      '\n' +
      'Le copie nei backup del sito vengono eliminate man mano che i backup scadono, entro {days} giorni.\n' +
      '\n' +
      'Può creare un nuovo account in qualsiasi momento.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Jūsų Glazecalc paskyra ištrinta',
    text:
      'Glazecalc paskyra {account} ištrinta kartu su viskuo, kas joje buvo įrašyta: receptais, žaliavomis, degimais, užrašais ir nustatymais. Šio veiksmo anuliuoti negalima.\n' +
      '\n' +
      'Svetainės atsarginėse kopijose esančios kopijos ištrinamos joms pasibaigus per {days} d.\n' +
      '\n' +
      'Naują paskyrą galite susikurti bet kada.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Jūsu lietotnes Glazecalc konts ir dzēsts',
    text:
      'Lietotnes Glazecalc konts {account} ir dzēsts kopā ar visu, kas tajā bija saglabāts: receptēm, izejvielām, apdedzināšanām, piezīmēm un iestatījumiem. Šo darbību nevar atsaukt.\n' +
      '\n' +
      'Kopijas vietnes rezerves kopijās tiek dzēstas, kad rezerves kopijām beidzas derīgums, {days} dienu laikā.\n' +
      '\n' +
      'Jaunu kontu varat izveidot jebkurā laikā.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Uw Glazecalc-account is verwijderd',
    text:
      'Het Glazecalc-account {account} is verwijderd, met alles wat erin was opgeslagen: recepten, grondstoffen, stookbeurten, notities en instellingen. Dit kan niet ongedaan worden gemaakt.\n' +
      '\n' +
      'Kopieën in de back-ups van de site worden verwijderd zodra de back-ups verlopen, binnen {days} dagen.\n' +
      '\n' +
      'U kunt op elk moment een nieuw account maken.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Konto Glazecalc zostało usunięte',
    text:
      'Konto Glazecalc {account} zostało usunięte wraz ze wszystkim, co w nim zapisano: recepturami, surowcami, zapisami wypałów, notatkami i ustawieniami. Tej operacji nie można cofnąć.\n' +
      '\n' +
      'Kopie w kopiach zapasowych serwisu są usuwane w miarę wygasania tych kopii, w ciągu {days} dni.\n' +
      '\n' +
      'W dowolnej chwili można założyć nowe konto.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'A sua conta Glazecalc foi eliminada',
    text:
      'A conta Glazecalc {account} foi eliminada, com tudo o que nela estava guardado: receitas, matérias-primas, cozeduras, notas e definições. Esta ação não pode ser anulada.\n' +
      '\n' +
      'As cópias nas cópias de segurança do site são eliminadas à medida que estas expiram, no prazo de {days} dias.\n' +
      '\n' +
      'Pode criar uma nova conta em qualquer altura.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'Contul dumneavoastră Glazecalc a fost șters',
    text:
      'Contul Glazecalc {account} a fost șters, împreună cu tot ce era salvat în el: rețete, materii prime, arderi, notițe și setări. Acțiunea nu poate fi anulată.\n' +
      '\n' +
      'Copiile din copiile de siguranță ale site-ului sunt șterse pe măsură ce acestea expiră, în cel mult {days} zile.\n' +
      '\n' +
      'Puteți crea un cont nou oricând.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Váš účet Glazecalc bol zrušený',
    text:
      'Účet Glazecalc {account} bol zrušený spolu so všetkým, čo v ňom bolo uložené: receptami, surovinami, výpalmi, poznámkami a nastaveniami. Nedá sa to vrátiť späť.\n' +
      '\n' +
      'Kópie v zálohách stránky sa mažú, keď zálohy vypršia, do {days} dní.\n' +
      '\n' +
      'Kedykoľvek si môžete vytvoriť nový účet.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Vaš račun Glazecalc je bil izbrisan',
    text:
      'Račun Glazecalc {account} je bil izbrisan skupaj z vsem, kar je bilo v njem shranjeno: recepti, surovinami, žganji, zapiski in nastavitvami. Tega ni mogoče razveljaviti.\n' +
      '\n' +
      'Kopije v varnostnih kopijah spletnega mesta se izbrišejo ob njihovem poteku, v {days} dneh.\n' +
      '\n' +
      'Kadar koli lahko ustvarite nov račun.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'Ditt Glazecalc-konto har raderats',
    text:
      'Glazecalc-kontot {account} har raderats, med allt som sparats i det: recept, råvaror, bränningar, anteckningar och inställningar. Det går inte att ångra.\n' +
      '\n' +
      'Kopior i webbplatsens säkerhetskopior raderas när säkerhetskopiorna löper ut, inom {days} dagar.\n' +
      '\n' +
      'Du kan skapa ett nytt konto när som helst.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Ο λογαριασμός σας στο Glazecalc διαγράφηκε',
    text:
      'Ο λογαριασμός {account} στο Glazecalc διαγράφηκε, μαζί με όλα όσα ήταν αποθηκευμένα σε αυτόν: συνταγές, υλικά, ημερολόγια ψησίματος, σημειώσεις και ρυθμίσεις. Αυτή η ενέργεια δεν αναιρείται.\n' +
      '\n' +
      'Ό,τι υπάρχει στα αντίγραφα ασφαλείας του ιστότοπου διαγράφεται καθώς αυτά λήγουν, μέσα σε {days} ημέρες.\n' +
      '\n' +
      'Μπορείτε να δημιουργήσετε νέο λογαριασμό οποιαδήποτε στιγμή.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Scriosadh do chuntas Glazecalc',
    text:
      'Scriosadh an cuntas Glazecalc {account}, agus gach a bhí sábháilte ann: oidis, ábhair, taifid bhácála, nótaí agus socruithe. Ní féidir é a chealú.\n' +
      '\n' +
      'Scriostar cóipeanna i gcúltacaí an tsuímh de réir mar a théann na cúltacaí in éag, laistigh de {days} lá.\n' +
      '\n' +
      'Is féidir leat cuntas nua a chruthú am ar bith.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のアカウントが削除されました',
    text:
      'Glazecalc のアカウント {account} は、保存されていたすべてのもの（調合、原料、焼成記録、メモ、設定）とともに削除されました。元に戻すことはできません。\n' +
      '\n' +
      'サイトのバックアップにあるコピーは、バックアップの期限が切れるのに合わせて、{days}日以内に削除されます。\n' +
      '\n' +
      '新しいアカウントはいつでも作成できます。\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Il-kont tiegħek ta’ Glazecalc tħassar',
    text:
      'Il-kont {account} ta’ Glazecalc tħassar, flimkien ma’ kulma kien issejvjat fih: riċetti, materjali, reġistri tal-ħami, noti u settings. Ma tistax terġa’ lura minn dan.\n' +
      '\n' +
      'Kopji fil-backups tas-sit jitħassru hekk kif jiskadu l-backups, fi żmien {days} jum.\n' +
      '\n' +
      'Tista’ toħloq kont ġdid meta trid.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc hesabınız silindi',
    text:
      'Glazecalc hesabı {account}, içinde kayıtlı her şeyle birlikte silindi: reçeteler, hammaddeler, pişirim kayıtları, notlar ve ayarlar. Bu işlem geri alınamaz.\n' +
      '\n' +
      'Site yedeklerindeki kopyalar, yedeklerin süresi doldukça {days} gün içinde silinir.\n' +
      '\n' +
      'İstediğiniz zaman yeni bir hesap oluşturabilirsiniz.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
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

// The emails about confirming an address, in each language offered: a language
// without a translation would get English, as with the others.

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
  },
  bg: {
    subject: 'Потвърдете имейла си за Glazecalc',
    text:
      'Някой (надяваме се, Вие) създаде профил в Glazecalc с адрес {account}.\n' +
      '\n' +
      'За да потвърдите, че този адрес е Ваш, отворете тази връзка в рамките на {hours} часа:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Връзката работи само веднъж. Ако не сте създавали профил, не обръщайте внимание на този имейл; нищо друго няма да Ви бъде изпращано, освен ако не го поискате.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Potvrďte svůj e-mail pro Glazecalc',
    text:
      'Někdo (doufejme, že Vy) vytvořil účet Glazecalc s adresou {account}.\n' +
      '\n' +
      'Chcete-li potvrdit, že tato adresa patří Vám, otevřete do {hours} hodin tento odkaz:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Odkaz funguje jen jednou. Pokud jste účet nevytvářeli, tento e-mail ignorujte; nic dalšího Vám nebude posláno, pokud o to nepožádáte.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Bekræft din e-mailadresse til Glazecalc',
    text:
      'Nogen (forhåbentlig dig) har oprettet en Glazecalc-konto med adressen {account}.\n' +
      '\n' +
      'For at bekræfte, at adressen er din, skal du åbne dette link inden for {hours} timer:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Linket virker én gang. Hvis du ikke har oprettet en konto, kan du se bort fra denne e-mail; du får ikke mere, medmindre du beder om det.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Bestätigen Sie Ihre E-Mail-Adresse für Glazecalc',
    text:
      'Jemand (hoffentlich Sie) hat ein Glazecalc-Konto mit der Adresse {account} erstellt.\n' +
      '\n' +
      'Um zu bestätigen, dass diese Adresse Ihnen gehört, öffnen Sie innerhalb von {hours} Stunden diesen Link:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Der Link funktioniert nur einmal. Wenn Sie kein Konto erstellt haben, ignorieren Sie diese E-Mail; Sie erhalten nichts weiter, es sei denn, Sie fordern es an.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Confirme su correo electrónico de Glazecalc',
    text:
      'Alguien (esperamos que usted) ha creado una cuenta de Glazecalc con la dirección {account}.\n' +
      '\n' +
      'Para confirmar que esta dirección es suya, abra este enlace en las próximas {hours} horas:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'El enlace solo funciona una vez. Si no ha creado una cuenta, ignore este correo; no se le enviará nada más, salvo que usted lo pida.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Kinnitage oma e-posti aadress Glazecalcis',
    text:
      'Keegi (loodetavasti teie) lõi aadressiga {account} Glazecalci konto.\n' +
      '\n' +
      'Kinnitamaks, et see aadress on teie oma, avage {hours} tunni jooksul see link:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Link töötab ühe korra. Kui te kontot ei loonud, jätke see e-kiri tähelepanuta; rohkem teile midagi ei saadeta, kui te seda ei palu.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Vahvista sähköpostiosoitteesi Glazecalcia varten',
    text:
      'Joku (toivottavasti tilin omistaja itse) on luonut Glazecalc-tilin osoitteella {account}.\n' +
      '\n' +
      'Vahvista osoite omaksesi avaamalla tämä linkki {hours} tunnin kuluessa:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Linkki toimii kerran. Jos tiliä ei luotu sinun toimestasi, jätä tämä viesti huomiotta; sinulle ei lähetetä muuta, ellet pyydä sitä.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'Confirmez votre adresse e-mail pour Glazecalc',
    text:
      'Quelqu’un (vous, nous l’espérons) a créé un compte Glazecalc avec l’adresse {account}.\n' +
      '\n' +
      'Pour confirmer que cette adresse est bien la vôtre, ouvrez ce lien dans les {hours} heures :\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Le lien ne fonctionne qu’une fois. Si vous n’avez pas créé de compte, ignorez cet e-mail ; vous ne recevrez rien d’autre, sauf si vous le demandez.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Potvrdite svoju adresu e-pošte za Glazecalc',
    text:
      'Netko (nadamo se da ste to bili vi) stvorio je račun Glazecalc s adresom {account}.\n' +
      '\n' +
      'Da biste potvrdili da ta adresa pripada vama, otvorite ovu poveznicu u roku od {hours} sati:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Poveznica vrijedi samo jednom. Ako niste stvorili račun, zanemarite ovu e-poruku; ništa drugo neće vam biti poslano ako to ne zatražite.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'Erősítse meg az e-mail-címét a Glazecalchoz',
    text:
      'Valaki (remélhetőleg Ön) Glazecalc-fiókot hozott létre a(z) {account} címmel.\n' +
      '\n' +
      'Annak megerősítéséhez, hogy ez a cím az Öné, {hours} órán belül nyissa meg ezt a linket:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'A link egyszer használható. Ha nem Ön hozott létre fiókot, hagyja figyelmen kívül ezt az e-mailt; több levelet nem küldünk Önnek, hacsak nem kéri.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'Conferma dell’indirizzo email per Glazecalc',
    text:
      'Qualcuno (speriamo Lei) ha creato un account Glazecalc con l’indirizzo {account}.\n' +
      '\n' +
      'Per confermare che questo indirizzo è Suo, apra questo link entro {hours} ore:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Il link funziona una sola volta. Se non ha creato un account, ignori questa email: non Le verrà inviato altro, a meno che non lo richieda.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Patvirtinkite el. pašto adresą programai Glazecalc',
    text:
      'Kažkas (tikimės, kad jūs) sukūrė Glazecalc paskyrą su adresu {account}.\n' +
      '\n' +
      'Norėdami patvirtinti, kad šis adresas jūsų, per {hours} val. atidarykite šią nuorodą:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Nuorodą galima panaudoti vieną kartą. Jei paskyros nekūrėte, nekreipkite dėmesio į šį laišką; daugiau jums nieko nebus siunčiama, nebent paprašysite.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Apstipriniet savu e-pasta adresi lietotnei Glazecalc',
    text:
      'Kāds (cerams, Jūs) izveidoja lietotnes Glazecalc kontu ar adresi {account}.\n' +
      '\n' +
      'Lai apstiprinātu, ka šī adrese ir Jūsu, {hours} stundu laikā atveriet šo saiti:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Saite darbojas vienu reizi. Ja kontu neveidojāt, neņemiet vērā šo vēstuli; Jums vairs nekas netiks sūtīts, ja vien to nepieprasīsiet.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Bevestig uw e-mailadres voor Glazecalc',
    text:
      'Iemand (hopelijk u) heeft een Glazecalc-account gemaakt met het adres {account}.\n' +
      '\n' +
      'Open binnen {hours} uur deze link om te bevestigen dat dit adres van u is:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'De link werkt één keer. Hebt u geen account gemaakt, negeer deze e-mail dan; u krijgt verder niets, tenzij u erom vraagt.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Potwierdzenie adresu e-mail w aplikacji Glazecalc',
    text:
      'Ktoś (miejmy nadzieję, że właściciel adresu) założył konto Glazecalc z adresem {account}.\n' +
      '\n' +
      'Aby potwierdzić, że jest się właścicielem tego adresu, należy otworzyć ten link w ciągu {hours} godz.:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Link działa jeden raz. Jeśli konto nie zostało założone przez właściciela adresu, wystarczy zignorować tę wiadomość; nic więcej nie zostanie wysłane, chyba że ktoś o to poprosi.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'Confirmar o seu e-mail do Glazecalc',
    text:
      'Alguém (esperamos que seja você) criou uma conta Glazecalc com o endereço {account}.\n' +
      '\n' +
      'Para confirmar que este endereço é seu, abra esta ligação nas próximas {hours} horas:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'A ligação só funciona uma vez. Se não criou uma conta, ignore este e-mail; não receberá mais nada, a menos que o peça.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'Confirmați adresa de e-mail pentru Glazecalc',
    text:
      'Cineva (sperăm că dumneavoastră) a creat un cont Glazecalc cu adresa {account}.\n' +
      '\n' +
      'Pentru a confirma că această adresă este a dumneavoastră, deschideți acest link în următoarele {hours} ore:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Linkul funcționează o singură dată. Dacă nu ați creat un cont, ignorați acest e-mail; nu veți mai primi nimic, decât dacă cereți.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Potvrďte svoj e-mail pre Glazecalc',
    text:
      'Niekto (dúfajme, že Vy) vytvoril účet Glazecalc s adresou {account}.\n' +
      '\n' +
      'Ak chcete potvrdiť, že táto adresa patrí Vám, otvorte do {hours} hodín tento odkaz:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Odkaz funguje len raz. Ak ste účet nevytvárali, tento e-mail ignorujte; nič ďalšie Vám nebude poslané, pokiaľ o to nepožiadate.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Potrdite svoj e-poštni naslov za Glazecalc',
    text:
      'Nekdo (upamo, da Vi) je ustvaril račun Glazecalc z naslovom {account}.\n' +
      '\n' +
      'Če želite potrditi, da ta naslov pripada Vam, v {hours} urah odprite to povezavo:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Povezava deluje samo enkrat. Če računa niste ustvarili Vi, prezrite to e-poštno sporočilo; nič drugega Vam ne bo poslano, razen če to zahtevate.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'Bekräfta din e-postadress för Glazecalc',
    text:
      'Någon (förhoppningsvis du) har skapat ett Glazecalc-konto med adressen {account}.\n' +
      '\n' +
      'För att bekräfta att adressen är din, öppna den här länken inom {hours} timmar:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Länken fungerar en gång. Om du inte har skapat något konto kan du bortse från det här meddelandet; inget mer skickas till dig om du inte ber om det.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Επιβεβαιώστε το email σας για το Glazecalc',
    text:
      'Κάποιος (ελπίζουμε εσείς) δημιούργησε λογαριασμό στο Glazecalc με τη διεύθυνση {account}.\n' +
      '\n' +
      'Για να επιβεβαιώσετε ότι αυτή η διεύθυνση είναι δική σας, ανοίξτε αυτόν τον σύνδεσμο μέσα σε {hours} ώρες:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Ο σύνδεσμος λειτουργεί μία φορά. Αν δεν δημιουργήσατε εσείς λογαριασμό, αγνοήστε αυτό το email. Δεν θα σας σταλεί τίποτα άλλο, εκτός αν το ζητήσετε.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Deimhnigh do ríomhphost don chuntas Glazecalc',
    text:
      'Chruthaigh duine éigin (tusa, tá súil againn) cuntas Glazecalc leis an seoladh {account}.\n' +
      '\n' +
      'Chun a dheimhniú gur leatsa an seoladh seo, oscail an nasc seo laistigh de {hours} uair an chloig:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Ní oibríonn an nasc ach uair amháin. Mura tusa a chruthaigh cuntas, déan neamhaird den ríomhphost seo; ní sheolfar aon rud eile chugat mura n-iarrann tú é.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のメールアドレスの確認',
    text:
      'Glazecalc で、アドレス {account} を使ったアカウントが作成されました（ご本人によるものであることを願っています）。\n' +
      '\n' +
      'このアドレスがご本人のものであることを確認するには、{hours}時間以内に次のリンクを開いてください:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'このリンクは一度だけ使えます。アカウントを作成した覚えがない場合は、このメールを無視してください。ご自身が求めない限り、これ以上メールが送られることはありません。\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Ikkonferma l-indirizz elettroniku tiegħek għal Glazecalc',
    text:
      'Xi ħadd (nittamaw li kont int) għamel kont ta’ Glazecalc bl-indirizz {account}.\n' +
      '\n' +
      'Biex tikkonferma li dan l-indirizz huwa tiegħek, iftaħ dan il-link fi żmien {hours} siegħa:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Il-link jaħdem darba biss. Jekk ma għamiltx kont, injora dan il-messaġġ; ma jintbagħtlek xejn aktar sakemm ma titlobx int.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc için e-posta adresinizi doğrulayın',
    text:
      'Birisi (umarız sizsinizdir) {account} adresiyle bir Glazecalc hesabı oluşturdu.\n' +
      '\n' +
      'Bu adresin size ait olduğunu doğrulamak için {hours} saat içinde bu bağlantıyı açın:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Bağlantı bir kez kullanılabilir. Hesap oluşturmadıysanız bu e-postayı dikkate almayın; siz istemedikçe size başka bir şey gönderilmez.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
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
  },
  bg: {
    subject: 'Потвърдете новия си имейл за Glazecalc',
    text:
      'Някой (надяваме се, Вие) поиска {account} да бъде имейлът на профила му в Glazecalc.\n' +
      '\n' +
      'За да направите промяната, отворете тази връзка в рамките на {hours} часа:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Връзката работи само веднъж и всички устройства, на които е бил влязъл профилът, ще бъдат изведени от него. Ако не сте поискали това, не обръщайте внимание на този имейл; нищо няма да се промени.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Potvrďte svůj nový e-mail pro Glazecalc',
    text:
      'Někdo (doufejme, že Vy) požádal, aby se {account} používal jako e-mail ke svému účtu Glazecalc.\n' +
      '\n' +
      'Chcete-li změnu provést, otevřete do {hours} hodin tento odkaz:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Odkaz funguje jen jednou a všechna přihlášená zařízení se odhlásí. Pokud jste o to nežádali, tento e-mail ignorujte; nic se nezmění.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Bekræft din nye e-mailadresse til Glazecalc',
    text:
      'Nogen (forhåbentlig dig) har bedt om at bruge {account} som e-mailadresse til sin Glazecalc-konto.\n' +
      '\n' +
      'For at gennemføre ændringen skal du åbne dette link inden for {hours} timer:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Linket virker én gang, og alle enheder, der var logget ind, bliver logget ud. Hvis du ikke har bedt om dette, kan du se bort fra denne e-mail; der ændres intet.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Bestätigen Sie Ihre neue E-Mail-Adresse für Glazecalc',
    text:
      'Jemand (hoffentlich Sie) hat angefordert, {account} als E-Mail-Adresse für sein Glazecalc-Konto zu verwenden.\n' +
      '\n' +
      'Um die Änderung vorzunehmen, öffnen Sie innerhalb von {hours} Stunden diesen Link:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Der Link funktioniert nur einmal, und alle Geräte, die angemeldet waren, werden abgemeldet. Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail; es ändert sich nichts.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Confirme su nuevo correo electrónico de Glazecalc',
    text:
      'Alguien (esperamos que usted) ha pedido usar {account} como correo electrónico de su cuenta de Glazecalc.\n' +
      '\n' +
      'Para hacer el cambio, abra este enlace en las próximas {hours} horas:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'El enlace solo funciona una vez, y se cerrará la sesión en todos los dispositivos donde estaba iniciada. Si no lo ha pedido usted, ignore este correo; no cambiará nada.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Kinnitage oma uus e-posti aadress Glazecalcis',
    text:
      'Keegi (loodetavasti teie) palus kasutada aadressi {account} oma Glazecalci konto e-posti aadressina.\n' +
      '\n' +
      'Muudatuse tegemiseks avage {hours} tunni jooksul see link:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Link töötab ühe korra ja kõik seadmed, kuhu oli sisse logitud, logitakse välja. Kui te seda ei palunud, jätke see e-kiri tähelepanuta; midagi ei muutu.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Vahvista uusi sähköpostiosoitteesi Glazecalcia varten',
    text:
      'Joku (toivottavasti tilin omistaja itse) on pyytänyt osoitetta {account} Glazecalc-tilinsä sähköpostiosoitteeksi.\n' +
      '\n' +
      'Tee muutos avaamalla tämä linkki {hours} tunnin kuluessa:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Linkki toimii kerran, ja kaikki kirjautuneet laitteet kirjataan ulos. Jos muutosta ei pyydetty sinun toimestasi, jätä tämä viesti huomiotta; mikään ei muutu.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'Confirmez votre nouvelle adresse e-mail pour Glazecalc',
    text:
      'Quelqu’un (vous, nous l’espérons) a demandé à utiliser {account} comme adresse e-mail de son compte Glazecalc.\n' +
      '\n' +
      'Pour effectuer le changement, ouvrez ce lien dans les {hours} heures :\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Le lien ne fonctionne qu’une fois, et tous les appareils connectés seront déconnectés. Si vous n’avez rien demandé, ignorez cet e-mail ; rien ne changera.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Potvrdite svoju novu adresu e-pošte za Glazecalc',
    text:
      'Netko (nadamo se da ste to bili vi) zatražio je da se {account} koristi kao adresa e-pošte njegova računa Glazecalc.\n' +
      '\n' +
      'Da biste proveli promjenu, otvorite ovu poveznicu u roku od {hours} sati:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Poveznica vrijedi samo jednom, a svi prijavljeni uređaji bit će odjavljeni. Ako to niste zatražili, zanemarite ovu e-poruku; ništa se neće promijeniti.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'Erősítse meg az új e-mail-címét a Glazecalchoz',
    text:
      'Valaki (remélhetőleg Ön) azt kérte, hogy a(z) {account} cím legyen a Glazecalc-fiókja e-mail-címe.\n' +
      '\n' +
      'A módosításhoz {hours} órán belül nyissa meg ezt a linket:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'A link egyszer használható, és minden eszközt, amely be volt jelentkezve, kijelentkeztetünk. Ha nem Ön kérte, hagyja figyelmen kívül ezt az e-mailt; semmi sem változik.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'Conferma del nuovo indirizzo email per Glazecalc',
    text:
      'Qualcuno (speriamo Lei) ha chiesto di usare {account} come indirizzo email del proprio account Glazecalc.\n' +
      '\n' +
      'Per effettuare la modifica, apra questo link entro {hours} ore:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Il link funziona una sola volta e tutti i dispositivi su cui era stato effettuato l’accesso verranno disconnessi. Se non ha chiesto Lei la modifica, ignori questa email: non cambierà nulla.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Patvirtinkite naują el. pašto adresą programai Glazecalc',
    text:
      'Kažkas (tikimės, kad jūs) paprašė naudoti {account} kaip savo Glazecalc paskyros el. pašto adresą.\n' +
      '\n' +
      'Norėdami atlikti pakeitimą, per {hours} val. atidarykite šią nuorodą:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Nuorodą galima panaudoti vieną kartą, o visi įrenginiai, kuriuose buvo prisijungta, bus atjungti. Jei to neprašėte, nekreipkite dėmesio į šį laišką; niekas nepasikeis.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Apstipriniet savu jauno e-pasta adresi lietotnei Glazecalc',
    text:
      'Kāds (cerams, Jūs) pieprasīja izmantot {account} kā e-pasta adresi savam lietotnes Glazecalc kontam.\n' +
      '\n' +
      'Lai veiktu izmaiņu, {hours} stundu laikā atveriet šo saiti:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Saite darbojas vienu reizi, un visas ierīces, kurās konts bija pierakstīts, tiks izrakstītas. Ja to nepieprasījāt, neņemiet vērā šo vēstuli; nekas nemainīsies.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Bevestig uw nieuwe e-mailadres voor Glazecalc',
    text:
      'Iemand (hopelijk u) heeft gevraagd {account} te gebruiken als e-mailadres van zijn of haar Glazecalc-account.\n' +
      '\n' +
      'Open binnen {hours} uur deze link om de wijziging door te voeren:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'De link werkt één keer, en alle apparaten die waren ingelogd, worden uitgelogd. Hebt u hier niet om gevraagd, negeer deze e-mail dan; er verandert niets.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Potwierdzenie nowego adresu e-mail w aplikacji Glazecalc',
    text:
      'Ktoś (miejmy nadzieję, że właściciel konta) poprosił o użycie adresu {account} jako adresu e-mail konta Glazecalc.\n' +
      '\n' +
      'Aby wprowadzić zmianę, należy otworzyć ten link w ciągu {hours} godz.:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Link działa jeden raz, a wszystkie zalogowane urządzenia zostaną wylogowane. Jeśli prośba nie pochodzi od właściciela konta, wystarczy zignorować tę wiadomość; nic się nie zmieni.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'Confirmar o seu novo e-mail do Glazecalc',
    text:
      'Alguém (esperamos que seja você) pediu para usar {account} como e-mail da sua conta Glazecalc.\n' +
      '\n' +
      'Para fazer a alteração, abra esta ligação nas próximas {hours} horas:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'A ligação só funciona uma vez, e a sessão será terminada em todos os dispositivos com sessão iniciada. Se não fez este pedido, ignore este e-mail; nada será alterado.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'Confirmați noua adresă de e-mail pentru Glazecalc',
    text:
      'Cineva (sperăm că dumneavoastră) a cerut să folosească {account} ca adresă de e-mail a contului său Glazecalc.\n' +
      '\n' +
      'Pentru a face schimbarea, deschideți acest link în următoarele {hours} ore:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Linkul funcționează o singură dată, iar toate dispozitivele conectate vor fi deconectate. Dacă nu ați cerut acest lucru, ignorați acest e-mail; nu se va schimba nimic.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Potvrďte svoj nový e-mail pre Glazecalc',
    text:
      'Niekto (dúfajme, že Vy) požiadal, aby sa {account} používal ako e-mail k jeho účtu Glazecalc.\n' +
      '\n' +
      'Ak chcete zmenu vykonať, otvorte do {hours} hodín tento odkaz:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Odkaz funguje len raz a všetky prihlásené zariadenia sa odhlásia. Ak ste o to nežiadali, tento e-mail ignorujte; nič sa nezmení.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Potrdite svoj novi e-poštni naslov za Glazecalc',
    text:
      'Nekdo (upamo, da Vi) je zahteval, naj se {account} uporablja kot e-poštni naslov njegovega računa Glazecalc.\n' +
      '\n' +
      'Če želite izvesti spremembo, v {hours} urah odprite to povezavo:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Povezava deluje samo enkrat, vse prijavljene naprave pa bodo odjavljene. Če tega niste zahtevali, prezrite to e-poštno sporočilo; nič se ne bo spremenilo.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'Bekräfta din nya e-postadress för Glazecalc',
    text:
      'Någon (förhoppningsvis du) har bett om att få använda {account} som e-postadress för sitt Glazecalc-konto.\n' +
      '\n' +
      'För att göra ändringen, öppna den här länken inom {hours} timmar:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Länken fungerar en gång, och alla enheter som var inloggade loggas ut. Om du inte har bett om detta kan du bortse från det här meddelandet; ingenting ändras.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Επιβεβαιώστε το νέο σας email για το Glazecalc',
    text:
      'Κάποιος (ελπίζουμε εσείς) ζήτησε να χρησιμοποιείται το {account} ως email του λογαριασμού του στο Glazecalc.\n' +
      '\n' +
      'Για να γίνει η αλλαγή, ανοίξτε αυτόν τον σύνδεσμο μέσα σε {hours} ώρες:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Ο σύνδεσμος λειτουργεί μία φορά, και όλες οι συσκευές που ήταν συνδεδεμένες θα αποσυνδεθούν. Αν δεν το ζητήσατε εσείς, αγνοήστε αυτό το email. Δεν θα αλλάξει τίποτα.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Deimhnigh do ríomhphost nua don chuntas Glazecalc',
    text:
      'D’iarr duine éigin (tusa, tá súil againn) go n-úsáidfí an seoladh {account} mar ríomhphost cuntais Glazecalc.\n' +
      '\n' +
      'Chun an t-athrú a dhéanamh, oscail an nasc seo laistigh de {hours} uair an chloig:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Ní oibríonn an nasc ach uair amháin, agus síneofar amach gach gléas a bhí sínithe isteach. Mura tusa a d’iarr é seo, déan neamhaird den ríomhphost seo; ní athrófar aon rud.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc の新しいメールアドレスの確認',
    text:
      'Glazecalc のアカウントのメールアドレスを {account} に変更するよう依頼がありました（ご本人によるものであることを願っています）。\n' +
      '\n' +
      '変更するには、{hours}時間以内に次のリンクを開いてください:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'このリンクは一度だけ使えます。変更すると、ログインしていたすべての端末がログアウトされます。心当たりがない場合は、このメールを無視してください。何も変更されません。\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Ikkonferma l-indirizz elettroniku l-ġdid tiegħek għal Glazecalc',
    text:
      'Xi ħadd (nittamaw li kont int) talab li l-indirizz {account} jintuża għal kont ta’ Glazecalc.\n' +
      '\n' +
      'Biex issir il-bidla, iftaħ dan il-link fi żmien {hours} siegħa:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Il-link jaħdem darba biss, u kull apparat li kien dieħel fil-kont se joħroġ minnu. Jekk ma talabtx dan, injora dan il-messaġġ; ma jinbidel xejn.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc için yeni e-posta adresinizi doğrulayın',
    text:
      'Birisi (umarız sizsinizdir) {account} adresinin Glazecalc hesabının e-posta adresi olarak kullanılmasını istedi.\n' +
      '\n' +
      'Değişikliği yapmak için {hours} saat içinde bu bağlantıyı açın:\n' +
      '\n' +
      '{link}\n' +
      '\n' +
      'Bağlantı bir kez kullanılabilir ve oturum açık olan tüm cihazlarda oturum kapatılır. Bunu siz istemediyseniz bu e-postayı dikkate almayın; hiçbir şey değişmez.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
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
  },
  bg: {
    subject: 'Поискан е нов имейл за профила Ви в Glazecalc',
    text:
      'Току-що беше поискана промяна на имейла на профила {account} в Glazecalc. На новия адрес е изпратена връзка и промяната се извършва само когато тя бъде отворена.\n' +
      '\n' +
      'Ако това сте били Вие, не е нужно да правите нищо друго. Ако не, някой може да знае паролата Ви: нулирайте я веднага на {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Pro Váš účet Glazecalc byl vyžádán nový e-mail',
    text:
      'U účtu Glazecalc {account} byla právě vyžádána změna e-mailu. Na novou adresu byl odeslán odkaz a změna se provede, teprve až se tento odkaz otevře.\n' +
      '\n' +
      'Pokud jste to byli Vy, nemusíte nic dělat. Pokud ne, někdo možná zná Vaše heslo: ihned si ho obnovte na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Der er bedt om en ny e-mailadresse til din Glazecalc-konto',
    text:
      'Der er netop bedt om en ændring af e-mailadressen på Glazecalc-kontoen {account}. Et link er sendt til den nye adresse, og ændringen sker først, når linket åbnes.\n' +
      '\n' +
      'Hvis det var dig, er der ikke mere at gøre. Hvis ikke, kender nogen måske adgangskoden: Nulstil den med det samme på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Für Ihr Glazecalc-Konto wurde eine neue E-Mail-Adresse angefordert',
    text:
      'Für das Glazecalc-Konto {account} wurde gerade eine Änderung der E-Mail-Adresse angefordert. An die neue Adresse wurde ein Link gesendet, und die Änderung erfolgt erst, wenn dieser Link geöffnet wird.\n' +
      '\n' +
      'Wenn Sie das waren, müssen Sie nichts weiter tun. Wenn nicht, kennt vielleicht jemand Ihr Passwort: Setzen Sie es sofort hier zurück: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Se ha pedido un correo electrónico nuevo para su cuenta de Glazecalc',
    text:
      'Se acaba de pedir un cambio de correo electrónico para la cuenta de Glazecalc {account}. Se ha enviado un enlace a la dirección nueva, y el cambio solo se hace cuando se abre ese enlace.\n' +
      '\n' +
      'Si ha sido usted, no tiene que hacer nada más. Si no, puede que alguien conozca su contraseña: restablézcala de inmediato en {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Teie Glazecalci konto jaoks paluti uut e-posti aadressi',
    text:
      'Glazecalci konto {account} e-posti aadressi muutmist paluti just praegu. Uuele aadressile saadeti link ja muudatus tehakse alles siis, kui see link avatakse.\n' +
      '\n' +
      'Kui see olite teie, ei pea te midagi muud tegema. Kui mitte, võib keegi teie parooli teada: lähtestage see kohe siin: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Glazecalc-tilillesi on pyydetty uutta sähköpostiosoitetta',
    text:
      'Glazecalc-tilin {account} sähköpostiosoitteen vaihtoa pyydettiin juuri. Uuteen osoitteeseen lähetettiin linkki, ja vaihto tapahtuu vasta, kun linkki avataan.\n' +
      '\n' +
      'Jos pyysit sitä itse, mitään muuta ei tarvitse tehdä. Jos et, joku saattaa tietää salasanasi: palauta se heti osoitteessa {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'Une nouvelle adresse e-mail a été demandée pour votre compte Glazecalc',
    text:
      'Un changement d’adresse e-mail vient d’être demandé pour le compte Glazecalc {account}. Un lien a été envoyé à la nouvelle adresse, et le changement n’a lieu que lorsque ce lien est ouvert.\n' +
      '\n' +
      'Si c’est vous, il n’y a rien d’autre à faire. Sinon, quelqu’un connaît peut-être votre mot de passe : réinitialisez-le tout de suite sur {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Zatražena je nova adresa e-pošte za vaš račun Glazecalc',
    text:
      'Za račun Glazecalc {account} upravo je zatražena promjena adrese e-pošte. Poveznica je poslana na novu adresu, a promjena se provodi tek kad se ta poveznica otvori.\n' +
      '\n' +
      'Ako ste to bili vi, ne morate ništa učiniti. Ako niste, netko možda zna vašu lozinku: odmah postavite novu lozinku na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'Új e-mail-címet kértek a Glazecalc-fiókjához',
    text:
      'Az imént e-mail-cím módosítását kérték a(z) {account} Glazecalc-fiókhoz. Az új címre linket küldtünk, és a módosítás csak akkor történik meg, ha megnyitják a linket.\n' +
      '\n' +
      'Ha Ön volt az, nincs további teendője. Ha nem, valaki ismerheti a jelszavát: azonnal állítsa vissza itt: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'È stato richiesto un nuovo indirizzo email per il Suo account Glazecalc',
    text:
      'È appena stato richiesto un cambio di indirizzo email per l’account Glazecalc {account}. Un link è stato inviato al nuovo indirizzo, e la modifica avviene solo quando quel link viene aperto.\n' +
      '\n' +
      'Se l’ha richiesto Lei, non c’è altro da fare. Altrimenti, qualcuno potrebbe conoscere la Sua password: la reimposti subito all’indirizzo {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Paprašyta naujo el. pašto adreso jūsų Glazecalc paskyrai',
    text:
      'Ką tik paprašyta pakeisti Glazecalc paskyros {account} el. pašto adresą. Nuoroda išsiųsta naujuoju adresu, o pakeitimas įvyks tik atidarius tą nuorodą.\n' +
      '\n' +
      'Jei tai buvote jūs, daugiau nieko daryti nereikia. Jei ne, kažkas gali žinoti jūsų slaptažodį: nedelsdami atkurkite jį čia: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Jūsu lietotnes Glazecalc kontam pieprasīta jauna e-pasta adrese',
    text:
      'Lietotnes Glazecalc kontam {account} tikko pieprasīta e-pasta adreses maiņa. Uz jauno adresi nosūtīta saite, un izmaiņa notiks tikai tad, kad šī saite tiks atvērta.\n' +
      '\n' +
      'Ja to izdarījāt Jūs, nekas cits nav jādara. Ja ne, kāds var zināt Jūsu paroli: nekavējoties atiestatiet to šeit: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Er is een nieuw e-mailadres aangevraagd voor uw Glazecalc-account',
    text:
      'Er is zojuist een wijziging van het e-mailadres aangevraagd voor het Glazecalc-account {account}. Er is een link naar het nieuwe adres gestuurd, en de wijziging gaat pas in als die link wordt geopend.\n' +
      '\n' +
      'Was u dit zelf, dan hoeft u verder niets te doen. Zo niet, dan kent iemand misschien uw wachtwoord: stel het meteen opnieuw in via {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Poproszono o nowy adres e-mail dla konta Glazecalc',
    text:
      'Właśnie poproszono o zmianę adresu e-mail dla konta Glazecalc {account}. Link wysłano na nowy adres, a zmiana nastąpi dopiero po jego otwarciu.\n' +
      '\n' +
      'Jeśli prośba pochodzi od właściciela konta, nie trzeba nic robić. W przeciwnym razie ktoś może znać hasło: należy je natychmiast zresetować pod adresem {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'Foi pedido um novo e-mail para a sua conta Glazecalc',
    text:
      'Acabou de ser pedida uma alteração de e-mail na conta Glazecalc {account}. Foi enviada uma ligação para o novo endereço, e a alteração só acontece quando essa ligação for aberta.\n' +
      '\n' +
      'Se foi você, não precisa de fazer mais nada. Caso contrário, alguém pode conhecer a sua palavra-passe: reponha-a já em {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'A fost cerută o nouă adresă de e-mail pentru contul dumneavoastră Glazecalc',
    text:
      'Tocmai s-a cerut schimbarea adresei de e-mail pentru contul Glazecalc {account}. Un link a fost trimis la noua adresă, iar schimbarea se face numai când linkul este deschis.\n' +
      '\n' +
      'Dacă ați fost dumneavoastră, nu mai aveți nimic de făcut. Dacă nu, cineva ar putea cunoaște parola: resetați-o imediat la {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Pre Váš účet Glazecalc bol vyžiadaný nový e-mail',
    text:
      'Pre účet Glazecalc {account} bola práve vyžiadaná zmena e-mailu. Na novú adresu bol odoslaný odkaz a zmena sa vykoná, až keď sa tento odkaz otvorí.\n' +
      '\n' +
      'Ak ste to boli Vy, nemusíte robiť nič. Ak nie, niekto možno pozná Vaše heslo: ihneď si ho obnovte na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Za Vaš račun Glazecalc je bil zahtevan nov e-poštni naslov',
    text:
      'Pri računu Glazecalc {account} je bila pravkar zahtevana sprememba e-poštnega naslova. Povezava je bila poslana na novi naslov, sprememba pa se izvede šele, ko se ta povezava odpre.\n' +
      '\n' +
      'Če ste to bili Vi, Vam ni treba storiti ničesar. Če ne, morda nekdo pozna Vaše geslo: takoj ga ponastavite na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'En ny e-postadress har begärts för ditt Glazecalc-konto',
    text:
      'En ändring av e-postadressen har just begärts för Glazecalc-kontot {account}. En länk har skickats till den nya adressen, och ändringen sker först när länken öppnas.\n' +
      '\n' +
      'Om det var du finns det inget mer att göra. Annars kan någon känna till lösenordet: återställ det direkt på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Ζητήθηκε νέο email για τον λογαριασμό σας στο Glazecalc',
    text:
      'Μόλις ζητήθηκε αλλαγή του email για τον λογαριασμό {account} στο Glazecalc. Στάλθηκε σύνδεσμος στη νέα διεύθυνση, και η αλλαγή γίνεται μόνο όταν ανοιχτεί αυτός ο σύνδεσμος.\n' +
      '\n' +
      'Αν το κάνατε εσείς, δεν χρειάζεται να κάνετε τίποτα άλλο. Αν όχι, κάποιος μπορεί να γνωρίζει τον κωδικό πρόσβασής σας: επαναφέρετέ τον αμέσως εδώ: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Iarradh ríomhphost nua do do chuntas Glazecalc',
    text:
      'Iarradh athrú ríomhphoist anois díreach ar an gcuntas Glazecalc {account}. Seoladh nasc chuig an seoladh nua, agus ní tharlaíonn an t-athrú ach nuair a osclaítear an nasc sin.\n' +
      '\n' +
      'Más tusa a rinne é, níl aon rud eile le déanamh. Mura tusa, b’fhéidir go bhfuil do phasfhocal ag duine éigin: athshocraigh é láithreach anseo: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のアカウントで新しいメールアドレスが申請されました',
    text:
      'Glazecalc のアカウント {account} で、メールアドレスの変更が申請されました。新しいアドレスにリンクが送られており、そのリンクが開かれたときにだけ変更されます。\n' +
      '\n' +
      'ご本人による申請であれば、ほかに必要な操作はありません。そうでない場合は、誰かがパスワードを知っている可能性があります。すぐに次のページでパスワードを再設定してください: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Intalab indirizz elettroniku ġdid għall-kont tiegħek ta’ Glazecalc',
    text:
      'Għadha kif intalbet bidla tal-indirizz elettroniku fuq il-kont {account} ta’ Glazecalc. Intbagħat link lill-indirizz il-ġdid, u l-bidla ssir biss meta jinfetaħ dak il-link.\n' +
      '\n' +
      'Jekk kont int, m’hemmx għalfejn tagħmel xejn aktar. Jekk le, xi ħadd jista’ jkun jaf il-password tiegħek: irrisettjaha minnufih hawn: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc hesabınız için yeni bir e-posta adresi istendi',
    text:
      'Glazecalc hesabı {account} için az önce e-posta adresi değişikliği istendi. Yeni adrese bir bağlantı gönderildi; değişiklik yalnızca bu bağlantı açıldığında gerçekleşir.\n' +
      '\n' +
      'Bunu siz yaptıysanız başka bir şey yapmanız gerekmez. Siz yapmadıysanız biri parolanızı biliyor olabilir: parolanızı hemen şu adresten sıfırlayın: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
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

// Notices about two-step sign-in (docs/mfa-plan.md, item 10), in each language
// offered. Each goes to the account's address after the change, so someone who
// did not make it hears of it.

/** The factor a notice is about. */
export type MfaMethod = { kind: 'totp' } | { kind: 'passkey'; name: string };

/** Sent when a second step is added: {account}, {method}, {forgot} and {app}. */
export const MFA_ADDED: Record<string, Email> = {
  en: {
    subject: 'A sign-in step was added to your Glazecalc account',
    text:
      'This was just added to the Glazecalc account {account} as a second step for signing in: {method}.\n\n' +
      'If this was you, there is nothing else to do. Keep your recovery codes somewhere safe. ' +
      'If not, someone may know your password: reset it right away at {forgot}\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'Към профила Ви в Glazecalc е добавена стъпка за влизане',
    text:
      'Към профила {account} в Glazecalc току-що беше добавена втора стъпка за влизане: {method}.\n' +
      '\n' +
      'Ако това сте били Вие, не е нужно да правите нищо друго. Пазете кодовете си за възстановяване на сигурно място. Ако не, някой може да знае паролата Ви: нулирайте я веднага на {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'K Vašemu účtu Glazecalc byl přidán krok přihlášení',
    text:
      'K účtu Glazecalc {account} bylo právě přidáno jako druhý krok přihlášení: {method}.\n' +
      '\n' +
      'Pokud jste to byli Vy, nemusíte nic dělat. Kódy pro obnovení uschovejte na bezpečném místě. Pokud ne, někdo možná zná Vaše heslo: ihned si ho obnovte na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Et trin til login er føjet til din Glazecalc-konto',
    text:
      'Dette er netop føjet til Glazecalc-kontoen {account} som et andet trin ved login: {method}.\n' +
      '\n' +
      'Hvis det var dig, er der ikke mere at gøre. Opbevar gendannelseskoderne et sikkert sted. Hvis ikke, kender nogen måske adgangskoden: Nulstil den med det samme på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Ein Anmeldeschritt wurde Ihrem Glazecalc-Konto hinzugefügt',
    text:
      'Dem Glazecalc-Konto {account} wurde gerade ein zweiter Schritt für die Anmeldung hinzugefügt: {method}.\n' +
      '\n' +
      'Wenn Sie das waren, müssen Sie nichts weiter tun. Bewahren Sie Ihre Wiederherstellungscodes an einem sicheren Ort auf. Wenn nicht, kennt vielleicht jemand Ihr Passwort: Setzen Sie es sofort hier zurück: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Se ha añadido un paso de inicio de sesión a su cuenta de Glazecalc',
    text:
      'Se acaba de añadir esto a la cuenta de Glazecalc {account} como segundo paso para iniciar sesión: {method}.\n' +
      '\n' +
      'Si ha sido usted, no tiene que hacer nada más. Guarde sus códigos de recuperación en un lugar seguro. Si no, puede que alguien conozca su contraseña: restablézcala de inmediato en {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Teie Glazecalci kontole lisati sisselogimise samm',
    text:
      'Glazecalci kontole {account} lisati just sisselogimise teise sammuna: {method}.\n' +
      '\n' +
      'Kui see olite teie, ei pea te midagi muud tegema. Hoidke oma taastekoode turvalises kohas. Kui mitte, võib keegi teie parooli teada: lähtestage see kohe siin: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Glazecalc-tilillesi lisättiin kirjautumisvaihe',
    text:
      'Glazecalc-tilille {account} lisättiin juuri toiseksi kirjautumisvaiheeksi: {method}.\n' +
      '\n' +
      'Jos lisäsit sen itse, mitään muuta ei tarvitse tehdä. Säilytä varmuuskoodit turvallisessa paikassa. Jos et, joku saattaa tietää salasanasi: palauta se heti osoitteessa {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'Une étape de connexion a été ajoutée à votre compte Glazecalc',
    text:
      'Une deuxième étape de connexion vient d’être ajoutée au compte Glazecalc {account} : {method}.\n' +
      '\n' +
      'Si c’est vous, il n’y a rien d’autre à faire. Conservez vos codes de récupération en lieu sûr. Sinon, quelqu’un connaît peut-être votre mot de passe : réinitialisez-le tout de suite sur {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Vašem računu Glazecalc dodan je korak prijave',
    text:
      'Računu Glazecalc {account} upravo je dodano kao drugi korak prijave: {method}.\n' +
      '\n' +
      'Ako ste to bili vi, ne morate ništa učiniti. Kodove za oporavak spremite na sigurno mjesto. Ako niste, netko možda zna vašu lozinku: odmah postavite novu lozinku na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'Új bejelentkezési lépést adtak hozzá a Glazecalc-fiókjához',
    text:
      'A(z) {account} Glazecalc-fiókhoz az imént adták hozzá a bejelentkezés második lépéseként: {method}.\n' +
      '\n' +
      'Ha Ön volt az, nincs további teendője. Őrizze meg a helyreállítási kódjait biztos helyen. Ha nem, valaki ismerheti a jelszavát: azonnal állítsa vissza itt: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'Un passaggio di accesso è stato aggiunto al Suo account Glazecalc',
    text:
      'All’account Glazecalc {account} è appena stato aggiunto un secondo passaggio per l’accesso: {method}.\n' +
      '\n' +
      'Se l’ha fatto Lei, non c’è altro da fare. Conservi i Suoi codici di recupero in un luogo sicuro. Altrimenti, qualcuno potrebbe conoscere la Sua password: la reimposti subito all’indirizzo {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Į jūsų Glazecalc paskyrą pridėtas prisijungimo žingsnis',
    text:
      'Ką tik į Glazecalc paskyrą {account} pridėtas antras prisijungimo žingsnis: {method}.\n' +
      '\n' +
      'Jei tai buvote jūs, daugiau nieko daryti nereikia. Atkūrimo kodus laikykite saugioje vietoje. Jei ne, kažkas gali žinoti jūsų slaptažodį: nedelsdami atkurkite jį čia: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Jūsu lietotnes Glazecalc kontam pievienots pierakstīšanās solis',
    text:
      'Lietotnes Glazecalc kontam {account} tikko pievienots otrais pierakstīšanās solis: {method}.\n' +
      '\n' +
      'Ja to izdarījāt Jūs, nekas cits nav jādara. Glabājiet atkopšanas kodus drošā vietā. Ja ne, kāds var zināt Jūsu paroli: nekavējoties atiestatiet to šeit: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Er is een inlogstap toegevoegd aan uw Glazecalc-account',
    text:
      'Zojuist is dit aan het Glazecalc-account {account} toegevoegd als tweede stap voor het inloggen: {method}.\n' +
      '\n' +
      'Was u dit zelf, dan hoeft u verder niets te doen. Bewaar uw herstelcodes op een veilige plek. Zo niet, dan kent iemand misschien uw wachtwoord: stel het meteen opnieuw in via {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Do konta Glazecalc dodano krok logowania',
    text:
      'Do konta Glazecalc {account} właśnie dodano jako drugi krok logowania: {method}.\n' +
      '\n' +
      'Jeśli zrobił to właściciel konta, nie trzeba nic robić. Kody odzyskiwania należy przechowywać w bezpiecznym miejscu. W przeciwnym razie ktoś może znać hasło: należy je natychmiast zresetować pod adresem {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'Foi adicionado um passo de início de sessão à sua conta Glazecalc',
    text:
      'Este segundo passo para iniciar sessão acabou de ser adicionado à conta Glazecalc {account}: {method}.\n' +
      '\n' +
      'Se foi você, não precisa de fazer mais nada. Guarde os códigos de recuperação num local seguro. Caso contrário, alguém pode conhecer a sua palavra-passe: reponha-a já em {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'A fost adăugat un pas de conectare la contul dumneavoastră Glazecalc',
    text:
      'Acest al doilea pas pentru conectare tocmai a fost adăugat la contul Glazecalc {account}: {method}.\n' +
      '\n' +
      'Dacă ați fost dumneavoastră, nu mai aveți nimic de făcut. Păstrați codurile de recuperare într-un loc sigur. Dacă nu, cineva ar putea cunoaște parola: resetați-o imediat la {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'K Vášmu účtu Glazecalc bol pridaný krok prihlásenia',
    text:
      'K účtu Glazecalc {account} bolo práve pridané ako druhý krok prihlásenia: {method}.\n' +
      '\n' +
      'Ak ste to boli Vy, nemusíte robiť nič. Kódy na obnovenie uschovajte na bezpečnom mieste. Ak nie, niekto možno pozná Vaše heslo: ihneď si ho obnovte na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Vašemu računu Glazecalc je bil dodan korak prijave',
    text:
      'Računu Glazecalc {account} je bilo pravkar dodano kot drugi korak prijave: {method}.\n' +
      '\n' +
      'Če ste to bili Vi, Vam ni treba storiti ničesar. Obnovitvene kode shranite na varno mesto. Če ne, morda nekdo pozna Vaše geslo: takoj ga ponastavite na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'Ett inloggningssteg har lagts till i ditt Glazecalc-konto',
    text:
      'Detta har just lagts till i Glazecalc-kontot {account} som ett andra steg vid inloggning: {method}.\n' +
      '\n' +
      'Om det var du finns det inget mer att göra. Förvara återställningskoderna på ett säkert ställe. Annars kan någon känna till lösenordet: återställ det direkt på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Προστέθηκε βήμα σύνδεσης στον λογαριασμό σας στο Glazecalc',
    text:
      'Μόλις προστέθηκε στον λογαριασμό {account} στο Glazecalc ως δεύτερο βήμα σύνδεσης: {method}.\n' +
      '\n' +
      'Αν το κάνατε εσείς, δεν χρειάζεται να κάνετε τίποτα άλλο. Φυλάξτε τους κωδικούς ανάκτησής σας σε ασφαλές μέρος. Αν όχι, κάποιος μπορεί να γνωρίζει τον κωδικό πρόσβασής σας: επαναφέρετέ τον αμέσως εδώ: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Cuireadh céim síniú isteach le do chuntas Glazecalc',
    text:
      'Cuireadh é seo leis an gcuntas Glazecalc {account} anois díreach mar an dara céim chun síniú isteach: {method}.\n' +
      '\n' +
      'Más tusa a rinne é, níl aon rud eile le déanamh. Coinnigh do chóid aisghabhála in áit shábháilte. Mura tusa, b’fhéidir go bhfuil do phasfhocal ag duine éigin: athshocraigh é láithreach anseo: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のアカウントにログインの手順が追加されました',
    text:
      'Glazecalc のアカウント {account} に、ログインの二段階目の認証として次のものが追加されました: {method}。\n' +
      '\n' +
      'ご本人による操作であれば、ほかに必要な操作はありません。リカバリーコードは安全な場所に保管してください。そうでない場合は、誰かがパスワードを知っている可能性があります。すぐに次のページでパスワードを再設定してください: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Żdied pass tad-dħul mal-kont tiegħek ta’ Glazecalc',
    text:
      'Dan għadu kif żdied mal-kont {account} ta’ Glazecalc bħala t-tieni pass għad-dħul: {method}.\n' +
      '\n' +
      'Jekk kont int, m’hemmx għalfejn tagħmel xejn aktar. Żomm il-kodiċijiet ta’ rkupru tiegħek f’post sigur. Jekk le, xi ħadd jista’ jkun jaf il-password tiegħek: irrisettjaha minnufih hawn: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc hesabınıza bir oturum açma adımı eklendi',
    text:
      'Glazecalc hesabı {account} için oturum açmada ikinci adım olarak az önce şu eklendi: {method}.\n' +
      '\n' +
      'Bunu siz yaptıysanız başka bir şey yapmanız gerekmez. Kurtarma kodlarınızı güvenli bir yerde saklayın. Siz yapmadıysanız biri parolanızı biliyor olabilir: parolanızı hemen şu adresten sıfırlayın: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  }
};

/** Sent when a second step is removed: {account}, {method}, {forgot} and {app}. */
export const MFA_REMOVED: Record<string, Email> = {
  en: {
    subject: 'A sign-in step was removed from your Glazecalc account',
    text:
      'This was just removed from the Glazecalc account {account} as a second step for signing in: {method}. ' +
      'If it was the last one, signing in now needs only the password.\n\n' +
      'If this was you, there is nothing else to do. If not, reset your password right away at {forgot}\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'От профила Ви в Glazecalc е премахната стъпка за влизане',
    text:
      'От профила {account} в Glazecalc току-що беше премахната втора стъпка за влизане: {method}. Ако е била последната, за влизане вече е нужна само паролата.\n' +
      '\n' +
      'Ако това сте били Вие, не е нужно да правите нищо друго. Ако не, нулирайте паролата си веднага на {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Z Vašeho účtu Glazecalc byl odebrán krok přihlášení',
    text:
      'Z účtu Glazecalc {account} bylo právě odebráno jako druhý krok přihlášení: {method}. Pokud to byl poslední, k přihlášení nyní stačí jen heslo.\n' +
      '\n' +
      'Pokud jste to byli Vy, nemusíte nic dělat. Pokud ne, ihned si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Et trin til login er fjernet fra din Glazecalc-konto',
    text:
      'Dette er netop fjernet fra Glazecalc-kontoen {account} som et andet trin ved login: {method}. Hvis det var det sidste, kræver login nu kun adgangskoden.\n' +
      '\n' +
      'Hvis det var dig, er der ikke mere at gøre. Hvis ikke, så nulstil adgangskoden med det samme på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Ein Anmeldeschritt wurde von Ihrem Glazecalc-Konto entfernt',
    text:
      'Vom Glazecalc-Konto {account} wurde gerade ein zweiter Schritt für die Anmeldung entfernt: {method}. Wenn es der letzte war, genügt zum Anmelden jetzt das Passwort allein.\n' +
      '\n' +
      'Wenn Sie das waren, müssen Sie nichts weiter tun. Wenn nicht, setzen Sie Ihr Passwort sofort hier zurück: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Se ha quitado un paso de inicio de sesión de su cuenta de Glazecalc',
    text:
      'Se acaba de quitar esto de la cuenta de Glazecalc {account} como segundo paso para iniciar sesión: {method}. Si era el último, ahora para iniciar sesión basta con la contraseña.\n' +
      '\n' +
      'Si ha sido usted, no tiene que hacer nada más. Si no, restablezca su contraseña de inmediato en {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Teie Glazecalci kontolt eemaldati sisselogimise samm',
    text:
      'Glazecalci kontolt {account} eemaldati just sisselogimise teise sammuna: {method}. Kui see oli viimane, piisab sisselogimiseks nüüd ainult paroolist.\n' +
      '\n' +
      'Kui see olite teie, ei pea te midagi muud tegema. Kui mitte, lähtestage oma parool kohe siin: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Glazecalc-tililtäsi poistettiin kirjautumisvaihe',
    text:
      'Glazecalc-tililtä {account} poistettiin juuri tämä toinen kirjautumisvaihe: {method}. Jos se oli viimeinen, kirjautumiseen riittää nyt pelkkä salasana.\n' +
      '\n' +
      'Jos poistit sen itse, mitään muuta ei tarvitse tehdä. Jos et, palauta salasanasi heti osoitteessa {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'Une étape de connexion a été retirée de votre compte Glazecalc',
    text:
      'Une deuxième étape de connexion vient d’être retirée du compte Glazecalc {account} : {method}. Si c’était la dernière, la connexion ne demande plus que le mot de passe.\n' +
      '\n' +
      'Si c’est vous, il n’y a rien d’autre à faire. Sinon, réinitialisez votre mot de passe tout de suite sur {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'S vašeg računa Glazecalc uklonjen je korak prijave',
    text:
      'S računa Glazecalc {account} upravo je uklonjeno kao drugi korak prijave: {method}. Ako je to bio posljednji, za prijavu je sada dovoljna samo lozinka.\n' +
      '\n' +
      'Ako ste to bili vi, ne morate ništa učiniti. Ako niste, odmah postavite novu lozinku na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'Egy bejelentkezési lépést eltávolítottak a Glazecalc-fiókjából',
    text:
      'A(z) {account} Glazecalc-fiókból az imént távolították el a bejelentkezés második lépéseként: {method}. Ha ez volt az utolsó, a bejelentkezéshez mostantól csak a jelszó kell.\n' +
      '\n' +
      'Ha Ön volt az, nincs további teendője. Ha nem, azonnal állítsa vissza a jelszavát itt: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'Un passaggio di accesso è stato rimosso dal Suo account Glazecalc',
    text:
      'Dall’account Glazecalc {account} è appena stato rimosso un secondo passaggio per l’accesso: {method}. Se era l’ultimo, per accedere ora basta la password.\n' +
      '\n' +
      'Se l’ha fatto Lei, non c’è altro da fare. Altrimenti, reimposti subito la password all’indirizzo {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Iš jūsų Glazecalc paskyros pašalintas prisijungimo žingsnis',
    text:
      'Ką tik iš Glazecalc paskyros {account} pašalintas antras prisijungimo žingsnis: {method}. Jei tai buvo paskutinis, dabar prisijungti pakanka tik slaptažodžio.\n' +
      '\n' +
      'Jei tai buvote jūs, daugiau nieko daryti nereikia. Jei ne, nedelsdami atkurkite slaptažodį čia: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'No Jūsu lietotnes Glazecalc konta noņemts pierakstīšanās solis',
    text:
      'No lietotnes Glazecalc konta {account} tikko noņemts otrais pierakstīšanās solis: {method}. Ja tas bija pēdējais, pierakstīties tagad var tikai ar paroli.\n' +
      '\n' +
      'Ja to izdarījāt Jūs, nekas cits nav jādara. Ja ne, nekavējoties atiestatiet paroli šeit: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Er is een inlogstap verwijderd van uw Glazecalc-account',
    text:
      'Zojuist is dit van het Glazecalc-account {account} verwijderd als tweede stap voor het inloggen: {method}. Was het de laatste, dan is voor het inloggen nu alleen het wachtwoord nodig.\n' +
      '\n' +
      'Was u dit zelf, dan hoeft u verder niets te doen. Zo niet, stel uw wachtwoord dan meteen opnieuw in via {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Z konta Glazecalc usunięto krok logowania',
    text:
      'Z konta Glazecalc {account} właśnie usunięto jako drugi krok logowania: {method}. Jeśli był to ostatni, do zalogowania wystarczy teraz samo hasło.\n' +
      '\n' +
      'Jeśli zrobił to właściciel konta, nie trzeba nic robić. W przeciwnym razie należy natychmiast zresetować hasło pod adresem {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'Foi removido um passo de início de sessão da sua conta Glazecalc',
    text:
      'Este segundo passo para iniciar sessão acabou de ser removido da conta Glazecalc {account}: {method}. Se era o último, iniciar sessão passa a exigir apenas a palavra-passe.\n' +
      '\n' +
      'Se foi você, não precisa de fazer mais nada. Caso contrário, reponha já a sua palavra-passe em {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'A fost eliminat un pas de conectare din contul dumneavoastră Glazecalc',
    text:
      'Acest al doilea pas pentru conectare tocmai a fost eliminat din contul Glazecalc {account}: {method}. Dacă a fost ultimul, conectarea necesită acum doar parola.\n' +
      '\n' +
      'Dacă ați fost dumneavoastră, nu mai aveți nimic de făcut. Dacă nu, resetați-vă imediat parola la {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Z Vášho účtu Glazecalc bol odstránený krok prihlásenia',
    text:
      'Z účtu Glazecalc {account} bolo práve odstránené ako druhý krok prihlásenia: {method}. Ak to bol posledný, na prihlásenie teraz stačí len heslo.\n' +
      '\n' +
      'Ak ste to boli Vy, nemusíte robiť nič. Ak nie, ihneď si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Z Vašega računa Glazecalc je bil odstranjen korak prijave',
    text:
      'Z računa Glazecalc {account} je bilo pravkar odstranjeno kot drugi korak prijave: {method}. Če je bil to zadnji, za prijavo zdaj zadostuje samo geslo.\n' +
      '\n' +
      'Če ste to bili Vi, Vam ni treba storiti ničesar. Če ne, takoj ponastavite geslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'Ett inloggningssteg har tagits bort från ditt Glazecalc-konto',
    text:
      'Detta har just tagits bort från Glazecalc-kontot {account} som ett andra steg vid inloggning: {method}. Om det var det sista räcker det nu med lösenordet för att logga in.\n' +
      '\n' +
      'Om det var du finns det inget mer att göra. Annars bör du återställa lösenordet direkt på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Καταργήθηκε βήμα σύνδεσης από τον λογαριασμό σας στο Glazecalc',
    text:
      'Μόλις καταργήθηκε από τον λογαριασμό {account} στο Glazecalc ως δεύτερο βήμα σύνδεσης: {method}. Αν ήταν το τελευταίο, για τη σύνδεση χρειάζεται πλέον μόνο ο κωδικός πρόσβασης.\n' +
      '\n' +
      'Αν το κάνατε εσείς, δεν χρειάζεται να κάνετε τίποτα άλλο. Αν όχι, επαναφέρετε αμέσως τον κωδικό πρόσβασής σας εδώ: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Baineadh céim síniú isteach ó do chuntas Glazecalc',
    text:
      'Baineadh é seo den chuntas Glazecalc {account} anois díreach mar an dara céim chun síniú isteach: {method}. Más é an ceann deireanach é, ní bhíonn ach an pasfhocal ag teastáil anois chun síniú isteach.\n' +
      '\n' +
      'Más tusa a rinne é, níl aon rud eile le déanamh. Mura tusa, athshocraigh do phasfhocal láithreach anseo: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のアカウントからログインの手順が削除されました',
    text:
      'Glazecalc のアカウント {account} から、ログインの二段階目の認証として使われていた次のものが削除されました: {method}。それが最後の一つだった場合、ログインに必要なのはパスワードだけになりました。\n' +
      '\n' +
      'ご本人による操作であれば、ほかに必要な操作はありません。そうでない場合は、すぐに次のページでパスワードを再設定してください: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Tneħħa pass tad-dħul mill-kont tiegħek ta’ Glazecalc',
    text:
      'Dan għadu kif tneħħa mill-kont {account} ta’ Glazecalc bħala t-tieni pass għad-dħul: {method}. Jekk kien l-aħħar wieħed, issa biex tidħol hemm bżonn il-password biss.\n' +
      '\n' +
      'Jekk kont int, m’hemmx għalfejn tagħmel xejn aktar. Jekk le, irrisettja l-password tiegħek minnufih hawn: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc hesabınızdan bir oturum açma adımı kaldırıldı',
    text:
      'Glazecalc hesabı {account} için oturum açmada ikinci adım olarak kullanılan şu az önce kaldırıldı: {method}. Bu sonuncusuysa oturum açmak için artık yalnızca parola gerekir.\n' +
      '\n' +
      'Bunu siz yaptıysanız başka bir şey yapmanız gerekmez. Siz yapmadıysanız parolanızı hemen şu adresten sıfırlayın: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  }
};

/** Sent when a recovery code is used: {account}, {left}, {page}, {forgot} and {app}. */
export const RECOVERY_USED: Record<string, Email> = {
  en: {
    subject: 'A recovery code was used on your Glazecalc account',
    text:
      'One of the recovery codes for the Glazecalc account {account} was just used, so it will not work again. ' +
      'Unused codes left: {left}. You can make new codes on your account page: {page}\n\n' +
      'If this was not you, someone may have your password and your codes: reset your password right away at {forgot}\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'В профила Ви в Glazecalc е използван код за възстановяване',
    text:
      'Един от кодовете за възстановяване на профила {account} в Glazecalc току-що беше използван, така че няма да работи повторно. Останали неизползвани кодове: {left}. Можете да създадете нови кодове на страницата на профила си: {page}\n' +
      '\n' +
      'Ако това не сте били Вие, някой може да има паролата и кодовете Ви: нулирайте паролата си веднага на {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Na Vašem účtu Glazecalc byl použit kód pro obnovení',
    text:
      'Jeden z kódů pro obnovení k účtu Glazecalc {account} byl právě použit, takže už nebude fungovat. Nepoužitých kódů zbývá: {left}. Nové kódy můžete vytvořit na stránce svého účtu: {page}\n' +
      '\n' +
      'Pokud jste to nebyli Vy, někdo možná má Vaše heslo i Vaše kódy: ihned si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'En gendannelseskode er brugt på din Glazecalc-konto',
    text:
      'En af gendannelseskoderne til Glazecalc-kontoen {account} er netop brugt, så den virker ikke igen. Ubrugte koder tilbage: {left}. Du kan lave nye koder på kontosiden: {page}\n' +
      '\n' +
      'Hvis det ikke var dig, har nogen måske adgangskoden og dine koder: Nulstil adgangskoden med det samme på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Ein Wiederherstellungscode wurde für Ihr Glazecalc-Konto verwendet',
    text:
      'Einer der Wiederherstellungscodes für das Glazecalc-Konto {account} wurde gerade verwendet und funktioniert deshalb nicht noch einmal. Noch nicht verwendete Codes: {left}. Neue Codes können Sie auf Ihrer Kontoseite erstellen: {page}\n' +
      '\n' +
      'Wenn Sie das nicht waren, haben vielleicht andere Ihr Passwort und Ihre Codes: Setzen Sie Ihr Passwort sofort hier zurück: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Se ha usado un código de recuperación en su cuenta de Glazecalc',
    text:
      'Se acaba de usar uno de los códigos de recuperación de la cuenta de Glazecalc {account}, así que no volverá a funcionar. Códigos sin usar que quedan: {left}. Puede crear códigos nuevos en la página de su cuenta: {page}\n' +
      '\n' +
      'Si no ha sido usted, puede que alguien tenga su contraseña y sus códigos: restablezca su contraseña de inmediato en {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Teie Glazecalci kontol kasutati taastekoodi',
    text:
      'Üht Glazecalci konto {account} taastekoodidest kasutati just, seega see enam ei tööta. Kasutamata koode on alles: {left}. Uusi koode saate teha oma konto lehel: {page}\n' +
      '\n' +
      'Kui see ei olnud teie, võib kellelgi olla teie parool ja koodid: lähtestage oma parool kohe siin: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Glazecalc-tililläsi käytettiin varmuuskoodia',
    text:
      'Yhtä Glazecalc-tilin {account} palautuskoodeista käytettiin juuri, joten se ei toimi uudelleen. Käyttämättömiä koodeja jäljellä: {left}. Voit luoda uudet koodit tilisivulla: {page}\n' +
      '\n' +
      'Jos et käyttänyt sitä itse, joku saattaa tietää salasanasi ja koodisi: palauta salasanasi heti osoitteessa {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'Un code de récupération a été utilisé sur votre compte Glazecalc',
    text:
      'L’un des codes de récupération du compte Glazecalc {account} vient d’être utilisé : il ne fonctionnera plus. Codes inutilisés restants : {left}. Vous pouvez créer de nouveaux codes sur la page de votre compte : {page}\n' +
      '\n' +
      'Si ce n’est pas vous, quelqu’un a peut-être votre mot de passe et vos codes : réinitialisez votre mot de passe tout de suite sur {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Na vašem računu Glazecalc upotrijebljen je kod za oporavak',
    text:
      'Jedan od kodova za oporavak za račun Glazecalc {account} upravo je upotrijebljen, pa više neće vrijediti. Neupotrijebljenih kodova preostaje: {left}. Nove kodove možete stvoriti na stranici svojeg računa: {page}\n' +
      '\n' +
      'Ako to niste bili vi, netko možda ima vašu lozinku i vaše kodove: odmah postavite novu lozinku na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'Helyreállítási kódot használtak a Glazecalc-fiókjában',
    text:
      'A(z) {account} Glazecalc-fiók egyik helyreállítási kódját az imént használták fel, ezért az többé nem működik. Megmaradt fel nem használt kódok: {left}. Új kódokat a fiókja oldalán készíthet: {page}\n' +
      '\n' +
      'Ha nem Ön volt, valaki birtokolhatja a jelszavát és a kódjait: azonnal állítsa vissza a jelszavát itt: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'Un codice di recupero è stato usato sul Suo account Glazecalc',
    text:
      'Uno dei codici di recupero dell’account Glazecalc {account} è appena stato usato, quindi non funzionerà più. Codici inutilizzati rimasti: {left}. Può creare nuovi codici nella pagina del Suo account: {page}\n' +
      '\n' +
      'Se non è stato Lei, qualcuno potrebbe avere la Sua password e i Suoi codici: reimposti subito la password all’indirizzo {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Jūsų Glazecalc paskyroje panaudotas atkūrimo kodas',
    text:
      'Vienas iš Glazecalc paskyros {account} atkūrimo kodų ką tik buvo panaudotas, todėl daugiau neveiks. Liko nepanaudotų kodų: {left}. Naujus kodus galite sukurti savo paskyros puslapyje: {page}\n' +
      '\n' +
      'Jei tai buvote ne jūs, kažkas gali turėti jūsų slaptažodį ir kodus: nedelsdami atkurkite slaptažodį čia: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Jūsu lietotnes Glazecalc kontā izmantots atkopšanas kods',
    text:
      'Viens no lietotnes Glazecalc konta {account} atkopšanas kodiem tikko tika izmantots, tāpēc vairs nedarbosies. Neizmantoto kodu skaits: {left}. Jaunus kodus varat izveidot sava konta lapā: {page}\n' +
      '\n' +
      'Ja tas nebijāt Jūs, kādam var būt Jūsu parole un kodi: nekavējoties atiestatiet paroli šeit: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Er is een herstelcode gebruikt voor uw Glazecalc-account',
    text:
      'Een van de herstelcodes van het Glazecalc-account {account} is zojuist gebruikt en werkt dus niet nog een keer. Ongebruikte codes over: {left}. U kunt nieuwe codes maken op uw accountpagina: {page}\n' +
      '\n' +
      'Was u dit niet, dan heeft iemand misschien uw wachtwoord en uw codes: stel uw wachtwoord meteen opnieuw in via {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Użyto kodu odzyskiwania na koncie Glazecalc',
    text:
      'Właśnie użyto jednego z kodów odzyskiwania konta Glazecalc {account}, więc ten kod nie zadziała ponownie. Pozostało niewykorzystanych kodów: {left}. Nowe kody można wygenerować na stronie konta: {page}\n' +
      '\n' +
      'Jeśli nie zrobił tego właściciel konta, ktoś może mieć hasło i kody: należy natychmiast zresetować hasło pod adresem {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'Foi usado um código de recuperação na sua conta Glazecalc',
    text:
      'Um dos códigos de recuperação da conta Glazecalc {account} acabou de ser usado, por isso não voltará a funcionar. Códigos por usar: {left}. Pode criar novos códigos na página da sua conta: {page}\n' +
      '\n' +
      'Se não foi você, alguém pode ter a sua palavra-passe e os seus códigos: reponha já a sua palavra-passe em {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'A fost folosit un cod de recuperare pentru contul dumneavoastră Glazecalc',
    text:
      'Unul dintre codurile de recuperare ale contului Glazecalc {account} tocmai a fost folosit, deci nu va mai funcționa. Coduri nefolosite rămase: {left}. Puteți crea coduri noi pe pagina contului: {page}\n' +
      '\n' +
      'Dacă nu ați fost dumneavoastră, cineva ar putea avea parola și codurile: resetați-vă imediat parola la {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Na Vašom účte Glazecalc bol použitý kód na obnovenie',
    text:
      'Jeden z kódov na obnovenie k účtu Glazecalc {account} bol práve použitý, takže už nebude fungovať. Nepoužitých kódov zostáva: {left}. Nové kódy môžete vytvoriť na stránke svojho účtu: {page}\n' +
      '\n' +
      'Ak ste to neboli Vy, niekto možno má Vaše heslo aj Vaše kódy: ihneď si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Na Vašem računu Glazecalc je bila uporabljena obnovitvena koda',
    text:
      'Ena od obnovitvenih kod za račun Glazecalc {account} je bila pravkar uporabljena, zato ne bo več delovala. Neuporabljenih kod je še: {left}. Nove kode lahko ustvarite na strani svojega računa: {page}\n' +
      '\n' +
      'Če to niste bili Vi, ima nekdo morda Vaše geslo in Vaše kode: takoj ponastavite geslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'En återställningskod har använts på ditt Glazecalc-konto',
    text:
      'En av återställningskoderna för Glazecalc-kontot {account} har just använts, så den fungerar inte igen. Oanvända koder kvar: {left}. Du kan skapa nya koder på kontosidan: {page}\n' +
      '\n' +
      'Om det inte var du kan någon ha ditt lösenord och dina koder: återställ lösenordet direkt på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Χρησιμοποιήθηκε κωδικός ανάκτησης στον λογαριασμό σας στο Glazecalc',
    text:
      'Ένας από τους κωδικούς ανάκτησης του λογαριασμού {account} στο Glazecalc μόλις χρησιμοποιήθηκε, οπότε δεν θα λειτουργήσει ξανά. Κωδικοί που δεν έχουν χρησιμοποιηθεί: {left}. Μπορείτε να δημιουργήσετε νέους κωδικούς στη σελίδα του λογαριασμού σας: {page}\n' +
      '\n' +
      'Αν δεν ήσασταν εσείς, κάποιος μπορεί να έχει τον κωδικό πρόσβασής σας και τους κωδικούς ανάκτησής σας: επαναφέρετε αμέσως τον κωδικό πρόσβασής σας εδώ: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Úsáideadh cód aisghabhála ar do chuntas Glazecalc',
    text:
      'Úsáideadh ceann de na cóid aisghabhála don chuntas Glazecalc {account} anois díreach, mar sin ní oibreoidh sé arís. Cóid nár úsáideadh atá fágtha: {left}. Is féidir leat cóid nua a dhéanamh ar leathanach do chuntais: {page}\n' +
      '\n' +
      'Murar tusa a bhí ann, b’fhéidir go bhfuil do phasfhocal agus do chóid ag duine éigin: athshocraigh do phasfhocal láithreach anseo: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のアカウントでリカバリーコードが使われました',
    text:
      'Glazecalc のアカウント {account} のリカバリーコードが一つ使われました。このコードはもう使えません。未使用のコードの残り: {left}。新しいコードはアカウントページで作成できます: {page}\n' +
      '\n' +
      'ご本人でない場合は、誰かがパスワードとコードを持っている可能性があります。すぐに次のページでパスワードを再設定してください: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Intuża kodiċi ta’ rkupru fuq il-kont tiegħek ta’ Glazecalc',
    text:
      'Wieħed mill-kodiċijiet ta’ rkupru tal-kont {account} ta’ Glazecalc għadu kif intuża, għalhekk ma jaħdimx aktar. Kodiċijiet li fadal mhux użati: {left}. Tista’ toħloq kodiċijiet ġodda fil-paġna tal-kont tiegħek: {page}\n' +
      '\n' +
      'Jekk ma kontx int, xi ħadd jista’ jkollu l-password u l-kodiċijiet tiegħek: irrisettja l-password tiegħek minnufih hawn: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc hesabınızda bir kurtarma kodu kullanıldı',
    text:
      'Glazecalc hesabı {account} için kurtarma kodlarından biri az önce kullanıldı; bu kod bir daha çalışmaz. Kalan kullanılmamış kodlar: {left}. Hesap sayfanızda yeni kodlar oluşturabilirsiniz: {page}\n' +
      '\n' +
      'Bu siz değilseniz biri parolanızı ve kodlarınızı ele geçirmiş olabilir: parolanızı hemen şu adresten sıfırlayın: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  }
};

/** Sent when new recovery codes are made: {account}, {forgot} and {app}. */
export const RECOVERY_NEW: Record<string, Email> = {
  en: {
    subject: 'New recovery codes for your Glazecalc account',
    text:
      'New recovery codes were just made for the Glazecalc account {account}. The old codes no longer work.\n\n' +
      'If this was you, keep the new codes somewhere safe. If not, reset your password right away at {forgot}\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'Нови кодове за възстановяване за профила Ви в Glazecalc',
    text:
      'Току-що бяха създадени нови кодове за възстановяване за профила {account} в Glazecalc. Старите кодове вече не работят.\n' +
      '\n' +
      'Ако това сте били Вие, пазете новите кодове на сигурно място. Ако не, нулирайте паролата си веднага на {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Nové kódy pro obnovení k Vašemu účtu Glazecalc',
    text:
      'K účtu Glazecalc {account} byly právě vytvořeny nové kódy pro obnovení. Staré kódy už nefungují.\n' +
      '\n' +
      'Pokud jste to byli Vy, nové kódy uschovejte na bezpečném místě. Pokud ne, ihned si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Nye gendannelseskoder til din Glazecalc-konto',
    text:
      'Der er netop lavet nye gendannelseskoder til Glazecalc-kontoen {account}. De gamle koder virker ikke længere.\n' +
      '\n' +
      'Hvis det var dig, skal du opbevare de nye koder et sikkert sted. Hvis ikke, så nulstil adgangskoden med det samme på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Neue Wiederherstellungscodes für Ihr Glazecalc-Konto',
    text:
      'Für das Glazecalc-Konto {account} wurden gerade neue Wiederherstellungscodes erstellt. Die alten Codes funktionieren nicht mehr.\n' +
      '\n' +
      'Wenn Sie das waren, bewahren Sie die neuen Codes an einem sicheren Ort auf. Wenn nicht, setzen Sie Ihr Passwort sofort hier zurück: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Códigos de recuperación nuevos para su cuenta de Glazecalc',
    text:
      'Se acaban de crear códigos de recuperación nuevos para la cuenta de Glazecalc {account}. Los códigos anteriores ya no funcionan.\n' +
      '\n' +
      'Si ha sido usted, guarde los códigos nuevos en un lugar seguro. Si no, restablezca su contraseña de inmediato en {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Uued taastekoodid teie Glazecalci kontole',
    text:
      'Glazecalci kontole {account} tehti just uued taastekoodid. Vanad koodid enam ei tööta.\n' +
      '\n' +
      'Kui see olite teie, hoidke uusi koode turvalises kohas. Kui mitte, lähtestage oma parool kohe siin: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Uudet varmuuskoodit Glazecalc-tilillesi',
    text:
      'Glazecalc-tilille {account} luotiin juuri uudet varmuuskoodit. Vanhat koodit eivät enää toimi.\n' +
      '\n' +
      'Jos loit ne itse, säilytä uudet koodit turvallisessa paikassa. Jos et, palauta salasanasi heti osoitteessa {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'Nouveaux codes de récupération pour votre compte Glazecalc',
    text:
      'De nouveaux codes de récupération viennent d’être créés pour le compte Glazecalc {account}. Les anciens codes ne fonctionnent plus.\n' +
      '\n' +
      'Si c’est vous, conservez les nouveaux codes en lieu sûr. Sinon, réinitialisez votre mot de passe tout de suite sur {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Novi kodovi za oporavak za vaš račun Glazecalc',
    text:
      'Za račun Glazecalc {account} upravo su stvoreni novi kodovi za oporavak. Stari kodovi više ne vrijede.\n' +
      '\n' +
      'Ako ste to bili vi, nove kodove spremite na sigurno mjesto. Ako niste, odmah postavite novu lozinku na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'Új helyreállítási kódok a Glazecalc-fiókjához',
    text:
      'A(z) {account} Glazecalc-fiókhoz az imént új helyreállítási kódokat készítettek. A régi kódok már nem működnek.\n' +
      '\n' +
      'Ha Ön volt az, őrizze meg az új kódokat biztos helyen. Ha nem, azonnal állítsa vissza a jelszavát itt: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'Nuovi codici di recupero per il Suo account Glazecalc',
    text:
      'Sono appena stati creati nuovi codici di recupero per l’account Glazecalc {account}. I vecchi codici non funzionano più.\n' +
      '\n' +
      'Se li ha creati Lei, conservi i nuovi codici in un luogo sicuro. Altrimenti, reimposti subito la password all’indirizzo {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Nauji atkūrimo kodai jūsų Glazecalc paskyrai',
    text:
      'Glazecalc paskyrai {account} ką tik sukurti nauji atkūrimo kodai. Seni kodai nebeveikia.\n' +
      '\n' +
      'Jei tai buvote jūs, naujus kodus laikykite saugioje vietoje. Jei ne, nedelsdami atkurkite slaptažodį čia: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Jauni atkopšanas kodi Jūsu lietotnes Glazecalc kontam',
    text:
      'Lietotnes Glazecalc kontam {account} tikko izveidoti jauni atkopšanas kodi. Vecie kodi vairs nedarbojas.\n' +
      '\n' +
      'Ja to izdarījāt Jūs, glabājiet jaunos kodus drošā vietā. Ja ne, nekavējoties atiestatiet paroli šeit: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Nieuwe herstelcodes voor uw Glazecalc-account',
    text:
      'Er zijn zojuist nieuwe herstelcodes gemaakt voor het Glazecalc-account {account}. De oude codes werken niet meer.\n' +
      '\n' +
      'Was u dit zelf, bewaar de nieuwe codes dan op een veilige plek. Zo niet, stel uw wachtwoord dan meteen opnieuw in via {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Nowe kody odzyskiwania dla konta Glazecalc',
    text:
      'Właśnie wygenerowano nowe kody odzyskiwania dla konta Glazecalc {account}. Stare kody już nie działają.\n' +
      '\n' +
      'Jeśli zrobił to właściciel konta, nowe kody należy przechowywać w bezpiecznym miejscu. W przeciwnym razie należy natychmiast zresetować hasło pod adresem {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'Novos códigos de recuperação para a sua conta Glazecalc',
    text:
      'Acabaram de ser criados novos códigos de recuperação para a conta Glazecalc {account}. Os códigos antigos deixaram de funcionar.\n' +
      '\n' +
      'Se foi você, guarde os novos códigos num local seguro. Caso contrário, reponha já a sua palavra-passe em {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'Coduri de recuperare noi pentru contul dumneavoastră Glazecalc',
    text:
      'Tocmai au fost create coduri de recuperare noi pentru contul Glazecalc {account}. Codurile vechi nu mai funcționează.\n' +
      '\n' +
      'Dacă ați fost dumneavoastră, păstrați codurile noi într-un loc sigur. Dacă nu, resetați-vă imediat parola la {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Nové kódy na obnovenie k Vášmu účtu Glazecalc',
    text:
      'K účtu Glazecalc {account} boli práve vytvorené nové kódy na obnovenie. Staré kódy už nefungujú.\n' +
      '\n' +
      'Ak ste to boli Vy, nové kódy uschovajte na bezpečnom mieste. Ak nie, ihneď si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Nove obnovitvene kode za Vaš račun Glazecalc',
    text:
      'Za račun Glazecalc {account} so bile pravkar ustvarjene nove obnovitvene kode. Stare kode ne delujejo več.\n' +
      '\n' +
      'Če ste to bili Vi, nove kode shranite na varno mesto. Če ne, takoj ponastavite geslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'Nya återställningskoder för ditt Glazecalc-konto',
    text:
      'Nya återställningskoder har just skapats för Glazecalc-kontot {account}. De gamla koderna fungerar inte längre.\n' +
      '\n' +
      'Om det var du, förvara de nya koderna på ett säkert ställe. Annars bör du återställa lösenordet direkt på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Νέοι κωδικοί ανάκτησης για τον λογαριασμό σας στο Glazecalc',
    text:
      'Μόλις δημιουργήθηκαν νέοι κωδικοί ανάκτησης για τον λογαριασμό {account} στο Glazecalc. Οι παλιοί κωδικοί δεν λειτουργούν πια.\n' +
      '\n' +
      'Αν το κάνατε εσείς, φυλάξτε τους νέους κωδικούς σε ασφαλές μέρος. Αν όχι, επαναφέρετε αμέσως τον κωδικό πρόσβασής σας εδώ: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Cóid aisghabhála nua do do chuntas Glazecalc',
    text:
      'Rinneadh cóid aisghabhála nua don chuntas Glazecalc {account} anois díreach. Ní oibríonn na seanchóid a thuilleadh.\n' +
      '\n' +
      'Más tusa a rinne é, coinnigh na cóid nua in áit shábháilte. Mura tusa, athshocraigh do phasfhocal láithreach anseo: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のアカウントの新しいリカバリーコード',
    text:
      'Glazecalc のアカウント {account} の新しいリカバリーコードが作成されました。古いコードはもう使えません。\n' +
      '\n' +
      'ご本人による操作であれば、新しいコードを安全な場所に保管してください。そうでない場合は、すぐに次のページでパスワードを再設定してください: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Kodiċijiet ta’ rkupru ġodda għall-kont tiegħek ta’ Glazecalc',
    text:
      'Għadhom kif inħolqu kodiċijiet ta’ rkupru ġodda għall-kont {account} ta’ Glazecalc. Il-kodiċijiet il-qodma ma jaħdmux aktar.\n' +
      '\n' +
      'Jekk kont int, żomm il-kodiċijiet il-ġodda f’post sigur. Jekk le, irrisettja l-password tiegħek minnufih hawn: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc hesabınız için yeni kurtarma kodları',
    text:
      'Glazecalc hesabı {account} için az önce yeni kurtarma kodları oluşturuldu. Eski kodlar artık çalışmıyor.\n' +
      '\n' +
      'Bunu siz yaptıysanız yeni kodları güvenli bir yerde saklayın. Siz yapmadıysanız parolanızı hemen şu adresten sıfırlayın: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  }
};

/**
 * Sent when someone entered the password but did not finish the second step:
 * a sign-in ran out of tries, or a round of wrong codes was used up
 * (server/lib/code_lock.ts; second_step.ts noticeUnfinished), at most once a day.
 * Like the other notices it says nothing of where the tries came from.
 * {account}, {forgot} and {app}.
 */
export const SECOND_STEP_UNFINISHED: Record<string, Email> = {
  en: {
    subject: 'Someone entered your Glazecalc password but did not finish signing in',
    text:
      'Someone entered the right password for the Glazecalc account {account}, but did not finish the second step of signing in. Your second step kept them out.\n\n' +
      'If this was you, there is nothing else to do. If not, someone knows your password: change it right away. You can reset it at {forgot}\n\n' +
      'After 10 wrong codes from an authenticator app, codes are refused for an hour; after 10 more, for a day; and then for a week each time. A passkey or a recovery code still works while codes are refused. Resetting your password by email shuts that person out: any sign-in they started ends, the password they know stops working, and codes work again.\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'Някой въведе паролата Ви за Glazecalc, но не завърши влизането',
    text:
      'Някой въведе вярната парола за профила {account} в Glazecalc, но не завърши втората стъпка на влизането. Втората Ви стъпка го спря.\n' +
      '\n' +
      'Ако това сте били Вие, не е нужно да правите нищо друго. Ако не, някой знае паролата Ви: сменете я веднага. Можете да я нулирате на {forgot}\n' +
      '\n' +
      'След 10 грешни кода от приложение за удостоверяване кодовете се отхвърлят за един час; след още 10 – за един ден; и после всеки път за една седмица. Докато кодовете се отхвърлят, ключ за достъп или код за възстановяване все още работи. Нулирането на паролата по имейл прекратява това: незавършените му влизания приключват, той вече няма паролата и кодовете отново работят.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Někdo zadal Vaše heslo ke Glazecalc, ale nedokončil přihlášení',
    text:
      'Někdo zadal správné heslo k účtu Glazecalc {account}, ale nedokončil druhý krok přihlášení. Váš druhý krok ho nepustil dál.\n' +
      '\n' +
      'Pokud jste to byli Vy, nemusíte nic dělat. Pokud ne, někdo zná Vaše heslo: ihned ho změňte. Můžete si ho obnovit na {forgot}\n' +
      '\n' +
      'Po 10 chybných kódech z ověřovací aplikace se kódy odmítají hodinu; po dalších 10 jeden den; a pak pokaždé týden. Přístupový klíč nebo kód pro obnovení funguje i v době, kdy se kódy odmítají. Obnovení hesla e-mailem to ukončí: nedokončená přihlášení dotyčného skončí, heslo už nezná a kódy zase fungují.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Nogen angav din Glazecalc-adgangskode, men gennemførte ikke login',
    text:
      'Nogen angav den rigtige adgangskode til Glazecalc-kontoen {account}, men gennemførte ikke det andet trin i login. Dit andet trin holdt dem ude.\n' +
      '\n' +
      'Hvis det var dig, er der ikke mere at gøre. Hvis ikke, kender nogen adgangskoden: Skift den med det samme. Du kan nulstille den på {forgot}\n' +
      '\n' +
      'Efter 10 forkerte koder fra en godkendelsesapp afvises koder i en time; efter yderligere 10 i et døgn; og derefter i en uge hver gang. En adgangsnøgle eller en gendannelseskode virker stadig, mens koder afvises. Nulstilling af adgangskoden via e-mail bringer det til ophør: Den andens ufuldførte login ophører, vedkommende har ikke længere adgangskoden, og koderne virker igen.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Jemand hat Ihr Glazecalc-Passwort eingegeben, aber die Anmeldung nicht abgeschlossen',
    text:
      'Jemand hat das richtige Passwort für das Glazecalc-Konto {account} eingegeben, aber den zweiten Schritt der Anmeldung nicht abgeschlossen. Ihr zweiter Schritt hat die Person ausgesperrt.\n' +
      '\n' +
      'Wenn Sie das waren, müssen Sie nichts weiter tun. Wenn nicht, kennt jemand Ihr Passwort: Ändern Sie es sofort. Sie können es hier zurücksetzen: {forgot}\n' +
      '\n' +
      'Nach 10 falschen Codes aus einer Authenticator-App werden Codes eine Stunde lang abgelehnt, nach 10 weiteren einen Tag lang, danach jedes Mal eine Woche lang. Ein Passkey oder ein Wiederherstellungscode funktioniert weiterhin, während Codes abgelehnt werden. Wenn Sie Ihr Passwort per E-Mail zurücksetzen, endet das: Die nicht abgeschlossenen Anmeldungen der Person enden, sie hat das Passwort nicht mehr, und Codes funktionieren wieder.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Alguien introdujo su contraseña de Glazecalc pero no terminó de iniciar sesión',
    text:
      'Alguien introdujo la contraseña correcta de la cuenta de Glazecalc {account}, pero no terminó el segundo paso del inicio de sesión. Su segundo paso impidió entrar a esa persona.\n' +
      '\n' +
      'Si ha sido usted, no tiene que hacer nada más. Si no, alguien conoce su contraseña: cámbiela de inmediato. Puede restablecerla en {forgot}\n' +
      '\n' +
      'Tras 10 códigos incorrectos de una aplicación de autenticación, los códigos se rechazan durante una hora; tras otros 10, durante un día; y después, durante una semana cada vez. Una llave de acceso o un código de recuperación sigue funcionando mientras se rechazan los códigos. Restablecer su contraseña por correo pone fin a esto: los inicios de sesión sin terminar de esa persona se cancelan, esa persona ya no tiene la contraseña y los códigos vuelven a funcionar.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Keegi sisestas teie Glazecalci parooli, kuid ei lõpetanud sisselogimist',
    text:
      'Keegi sisestas Glazecalci konto {account} õige parooli, kuid ei lõpetanud sisselogimise teist sammu. Teie teine samm hoidis ta väljas.\n' +
      '\n' +
      'Kui see olite teie, ei pea te midagi muud tegema. Kui mitte, teab keegi teie parooli: muutke see kohe ära. Saate selle lähtestada siin: {forgot}\n' +
      '\n' +
      'Pärast 10 valet koodi autentimisrakendusest lükatakse koodid tagasi tunniks; pärast veel 10 päevaks; ja seejärel iga kord nädalaks. Pääsuvõti või taastekood töötab ka siis, kui koode tagasi lükatakse. Parooli lähtestamine e-posti teel lõpetab selle: tema pooleli jäänud sisselogimised lõpevad, tal ei ole enam parooli ja koodid töötavad jälle.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Joku antoi Glazecalc-salasanasi mutta ei viimeistellyt kirjautumista',
    text:
      'Joku antoi oikean salasanan Glazecalc-tilille {account}, mutta ei viimeistellyt kirjautumisen toista vaihetta. Toinen vaihe esti pääsyn.\n' +
      '\n' +
      'Jos se olit sinä, mitään muuta ei tarvitse tehdä. Jos et, joku tietää salasanasi: vaihda se heti. Voit palauttaa sen osoitteessa {forgot}\n' +
      '\n' +
      'Kun todennussovelluksen koodeja on annettu väärin 10, koodit hylätään tunnin ajan; seuraavien 10 väärän jälkeen vuorokauden ajan; ja sen jälkeen aina viikon ajan. Pääsyavain tai varmuuskoodi toimii edelleen, vaikka koodit hylätään. Salasanan palauttaminen sähköpostilla päättää tämän: heidän keskeneräiset kirjautumisensa päättyvät, heillä ei enää ole salasanaa ja koodit toimivat taas.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'Quelqu’un a saisi votre mot de passe Glazecalc sans terminer la connexion',
    text:
      'Quelqu’un a saisi le bon mot de passe du compte Glazecalc {account}, mais n’a pas terminé la deuxième étape de la connexion. Votre deuxième étape l’a empêché d’entrer.\n' +
      '\n' +
      'Si c’est vous, il n’y a rien d’autre à faire. Sinon, quelqu’un connaît votre mot de passe : changez-le tout de suite. Vous pouvez le réinitialiser sur {forgot}\n' +
      '\n' +
      'Après 10 codes erronés d’une application d’authentification, les codes sont refusés pendant une heure ; après 10 de plus, pendant un jour ; puis pendant une semaine à chaque fois. Une clé d’accès ou un code de récupération fonctionne toujours tant que les codes sont refusés. Réinitialiser votre mot de passe par e-mail y met fin : les connexions inachevées de cette personne prennent fin, elle n’a plus le mot de passe, et les codes fonctionnent de nouveau.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Netko je unio vašu lozinku za Glazecalc, ali nije dovršio prijavu',
    text:
      'Netko je unio točnu lozinku za račun Glazecalc {account}, ali nije dovršio drugi korak prijave. Vaš drugi korak ga je zaustavio.\n' +
      '\n' +
      'Ako ste to bili vi, ne morate ništa učiniti. Ako niste, netko zna vašu lozinku: odmah je promijenite. Novu možete postaviti na {forgot}\n' +
      '\n' +
      'Nakon 10 pogrešnih kodova iz aplikacije za provjeru autentičnosti kodovi se odbijaju sat vremena; nakon sljedećih 10 jedan dan; a zatim svaki put tjedan dana. Pristupni ključ ili kod za oporavak i dalje radi dok se kodovi odbijaju. Ponovno postavljanje lozinke e-poštom to prekida: nedovršene prijave te osobe prestaju, ta osoba više ne zna lozinku, a kodovi opet rade.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'Valaki megadta a Glazecalc-jelszavát, de nem fejezte be a bejelentkezést',
    text:
      'Valaki megadta a helyes jelszót a(z) {account} Glazecalc-fiókhoz, de nem fejezte be a bejelentkezés második lépését. A második lépése kint tartotta.\n' +
      '\n' +
      'Ha Ön volt az, nincs további teendője. Ha nem, valaki ismeri a jelszavát: azonnal változtassa meg. Itt állíthatja vissza: {forgot}\n' +
      '\n' +
      'Hitelesítő alkalmazásból érkező 10 hibás kód után a kódokat egy órára elutasítjuk; újabb 10 után egy napra; azután minden alkalommal egy hétre. Amíg a kódokat elutasítjuk, a hozzáférési kulcs vagy a helyreállítási kód továbbra is működik. A jelszó e-mailben való visszaállítása ezt megszünteti: a félbehagyott bejelentkezései véget érnek, már nincs meg neki a jelszó, és a kódok újra működnek.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'Qualcuno ha inserito la Sua password di Glazecalc ma non ha completato l’accesso',
    text:
      'Qualcuno ha inserito la password giusta dell’account Glazecalc {account}, ma non ha completato il secondo passaggio dell’accesso. Il Suo secondo passaggio lo ha tenuto fuori.\n' +
      '\n' +
      'Se era Lei, non c’è altro da fare. Altrimenti, qualcuno conosce la Sua password: la cambi subito. Può reimpostarla all’indirizzo {forgot}\n' +
      '\n' +
      'Dopo 10 codici errati di un’app di autenticazione, i codici vengono rifiutati per un’ora; dopo altri 10, per un giorno; e poi, ogni volta, per una settimana. Una passkey o un codice di recupero funziona ancora mentre i codici vengono rifiutati. Reimpostare la password via email mette fine a tutto questo: gli accessi non completati di quella persona terminano, quella persona non ha più la password e i codici tornano a funzionare.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Kažkas įvedė jūsų Glazecalc slaptažodį, bet neužbaigė prisijungimo',
    text:
      'Kažkas įvedė teisingą Glazecalc paskyros {account} slaptažodį, bet neužbaigė antro prisijungimo žingsnio. Jūsų antras žingsnis jį sustabdė.\n' +
      '\n' +
      'Jei tai buvote jūs, daugiau nieko daryti nereikia. Jei ne, kažkas žino jūsų slaptažodį: nedelsdami jį pakeiskite. Atkurti jį galite čia: {forgot}\n' +
      '\n' +
      'Po 10 neteisingų kodų iš autentifikavimo programos kodai atmetami valandai; po dar 10 – parai; vėliau kaskart savaitei. Kol kodai atmetami, prieigos raktas arba atkūrimo kodas vis dar veikia. Slaptažodžio atkūrimas el. paštu tai nutraukia: to asmens nebaigti prisijungimai nutraukiami, jis nebeturi slaptažodžio, o kodai vėl veikia.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Kāds ievadīja Jūsu lietotnes Glazecalc paroli, bet nepabeidza pierakstīšanos',
    text:
      'Kāds ievadīja pareizo lietotnes Glazecalc konta {account} paroli, bet nepabeidza pierakstīšanās otro soli. Jūsu otrais solis viņu neielaida.\n' +
      '\n' +
      'Ja to izdarījāt Jūs, nekas cits nav jādara. Ja ne, kāds zina Jūsu paroli: nekavējoties nomainiet to. Varat to atiestatīt šeit: {forgot}\n' +
      '\n' +
      'Pēc 10 nepareiziem kodiem no autentifikatora lietotnes kodi tiek noraidīti uz stundu; pēc vēl 10 – uz diennakti; pēc tam katru reizi uz nedēļu. Kamēr kodi tiek noraidīti, piekļuves atslēga vai atkopšanas kods joprojām darbojas. Paroles atiestatīšana pa e-pastu to beidz: viņa nepabeigtās pierakstīšanās beidzas, viņam paroles vairs nav, un kodi atkal darbojas.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Iemand heeft uw Glazecalc-wachtwoord ingevoerd maar het inloggen niet afgerond',
    text:
      'Iemand heeft het juiste wachtwoord voor het Glazecalc-account {account} ingevoerd, maar heeft de tweede stap van het inloggen niet afgerond. Uw tweede stap hield die persoon buiten.\n' +
      '\n' +
      'Was u dit zelf, dan hoeft u verder niets te doen. Zo niet, dan kent iemand uw wachtwoord: wijzig het meteen. U kunt het opnieuw instellen via {forgot}\n' +
      '\n' +
      'Na 10 onjuiste codes uit een authenticator-app worden codes een uur lang geweigerd; na nog eens 10 een dag lang; en daarna telkens een week lang. Een passkey of een herstelcode werkt nog wel terwijl codes worden geweigerd. Uw wachtwoord per e-mail opnieuw instellen maakt hier een einde aan: de onafgeronde pogingen van die persoon vervallen, die persoon heeft het wachtwoord niet meer, en codes werken weer.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Ktoś wpisał hasło do Glazecalc, ale nie dokończył logowania',
    text:
      'Ktoś wpisał prawidłowe hasło do konta Glazecalc {account}, ale nie dokończył drugiego kroku logowania. Drugi krok go zatrzymał.\n' +
      '\n' +
      'Jeśli był to właściciel konta, nie trzeba nic robić. W przeciwnym razie ktoś zna hasło: należy je natychmiast zmienić. Można je zresetować pod adresem {forgot}\n' +
      '\n' +
      'Po 10 błędnych kodach z aplikacji uwierzytelniającej kody są odrzucane przez godzinę; po kolejnych 10 przez dobę, a potem za każdym razem przez tydzień. Klucz dostępu lub kod odzyskiwania nadal działa, gdy kody są odrzucane. Zresetowanie hasła e-mailem to kończy: niedokończone logowania tej osoby wygasają, nie zna ona już hasła, a kody znów działają.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'Alguém introduziu a sua palavra-passe do Glazecalc mas não concluiu o início de sessão',
    text:
      'Alguém introduziu a palavra-passe certa da conta Glazecalc {account}, mas não concluiu o segundo passo do início de sessão. O seu segundo passo manteve-o de fora.\n' +
      '\n' +
      'Se foi você, não precisa de fazer mais nada. Caso contrário, alguém conhece a sua palavra-passe: altere-a já. Pode repô-la em {forgot}\n' +
      '\n' +
      'Após 10 códigos errados de uma aplicação de autenticação, os códigos são recusados durante uma hora; após mais 10, durante um dia; e depois durante uma semana de cada vez. Uma chave de acesso ou um código de recuperação continua a funcionar enquanto os códigos são recusados. Repor a palavra-passe por e-mail põe fim a isto: os inícios de sessão por concluir dessa pessoa terminam, ela deixa de ter a palavra-passe e os códigos voltam a funcionar.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'Cineva a introdus parola dumneavoastră Glazecalc, dar nu a încheiat conectarea',
    text:
      'Cineva a introdus parola corectă pentru contul Glazecalc {account}, dar nu a încheiat al doilea pas al conectării. Al doilea pas l-a oprit.\n' +
      '\n' +
      'Dacă ați fost dumneavoastră, nu mai aveți nimic de făcut. Dacă nu, cineva știe parola: schimbați-o imediat. O puteți reseta la {forgot}\n' +
      '\n' +
      'După 10 coduri greșite dintr-o aplicație de autentificare, codurile sunt refuzate o oră; după alte 10, o zi; apoi, de fiecare dată, o săptămână. O cheie de acces sau un cod de recuperare funcționează în continuare cât timp codurile sunt refuzate. Resetarea parolei prin e-mail pune capăt situației: conectările neîncheiate ale persoanei respective se încheie, ea nu mai are parola, iar codurile funcționează din nou.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Niekto zadal Vaše heslo ku Glazecalc, ale nedokončil prihlásenie',
    text:
      'Niekto zadal správne heslo k účtu Glazecalc {account}, ale nedokončil druhý krok prihlásenia. Váš druhý krok ho nepustil ďalej.\n' +
      '\n' +
      'Ak ste to boli Vy, nemusíte robiť nič. Ak nie, niekto pozná Vaše heslo: ihneď ho zmeňte. Môžete si ho obnoviť na {forgot}\n' +
      '\n' +
      'Po 10 chybných kódoch z overovacej aplikácie sa kódy odmietajú hodinu; po ďalších 10 jeden deň; a potom zakaždým týždeň. Prístupový kľúč alebo kód na obnovenie funguje aj v čase, keď sa kódy odmietajú. Obnovenie hesla e-mailom to ukončí: nedokončené prihlásenia dotyčného skončia, heslo už nepozná a kódy zase fungujú.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Nekdo je vnesel Vaše geslo za Glazecalc, a ni dokončal prijave',
    text:
      'Nekdo je vnesel pravilno geslo za račun Glazecalc {account}, a ni dokončal drugega koraka prijave. Vaš drugi korak ga je ustavil.\n' +
      '\n' +
      'Če ste to bili Vi, Vam ni treba storiti ničesar. Če ne, nekdo pozna Vaše geslo: takoj ga spremenite. Ponastavite ga lahko na {forgot}\n' +
      '\n' +
      'Po 10 napačnih kodah iz aplikacije za preverjanje pristnosti se kode zavračajo eno uro; po nadaljnjih 10 en dan; nato vsakič en teden. Ključ za dostop ali obnovitvena koda med zavračanjem kod še vedno deluje. Ponastavitev gesla po e-pošti to konča: nedokončane prijave te osebe se končajo, ta oseba gesla ne pozna več, kode pa spet delujejo.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'Någon angav lösenordet till ditt Glazecalc-konto men slutförde inte inloggningen',
    text:
      'Någon angav rätt lösenord för Glazecalc-kontot {account} men slutförde inte det andra steget i inloggningen. Det andra steget höll dem ute.\n' +
      '\n' +
      'Om det var du finns det inget mer att göra. Annars känner någon till lösenordet: byt det direkt. Du kan återställa det på {forgot}\n' +
      '\n' +
      'Efter 10 felaktiga koder från en autentiseringsapp nekas koder i en timme; efter ytterligare 10 i en dag; och därefter i en vecka varje gång. En lösennyckel eller en återställningskod fungerar fortfarande medan koder nekas. Att återställa lösenordet via e-post avslutar detta: deras ofullbordade inloggningar upphör, de har inte längre lösenordet och koderna fungerar igen.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Κάποιος εισήγαγε τον κωδικό πρόσβασής σας στο Glazecalc αλλά δεν ολοκλήρωσε τη σύνδεση',
    text:
      'Κάποιος εισήγαγε τον σωστό κωδικό πρόσβασης για τον λογαριασμό {account} στο Glazecalc, αλλά δεν ολοκλήρωσε το δεύτερο βήμα της σύνδεσης. Το δεύτερο βήμα σας εμπόδισε την είσοδο.\n' +
      '\n' +
      'Αν ήσασταν εσείς, δεν χρειάζεται να κάνετε τίποτα άλλο. Αν όχι, κάποιος γνωρίζει τον κωδικό πρόσβασής σας: αλλάξτε τον αμέσως. Μπορείτε να τον επαναφέρετε εδώ: {forgot}\n' +
      '\n' +
      'Μετά από 10 λανθασμένους κωδικούς από εφαρμογή ελέγχου ταυτότητας, οι κωδικοί απορρίπτονται για μία ώρα. Μετά από 10 ακόμη, για μία ημέρα. Και στη συνέχεια, για μία εβδομάδα κάθε φορά. Ένα κλειδί πρόσβασης ή ένας κωδικός ανάκτησης εξακολουθεί να λειτουργεί όσο οι κωδικοί απορρίπτονται. Η επαναφορά του κωδικού πρόσβασης μέσω email τερματίζει την απόρριψη: οι μη ολοκληρωμένες συνδέσεις τερματίζονται, ο κωδικός πρόσβασης που έμαθε το άλλο άτομο δεν ισχύει πια, και οι κωδικοί λειτουργούν ξανά.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Cuireadh do phasfhocal Glazecalc isteach ach níor críochnaíodh an síniú isteach',
    text:
      'Chuir duine éigin an pasfhocal ceart isteach don chuntas Glazecalc {account}, ach níor críochnaíodh an dara céim den síniú isteach. Chuir do dhara céim bac ar an síniú isteach.\n' +
      '\n' +
      'Más tusa a bhí ann, níl aon rud eile le déanamh. Mura tusa, tá do phasfhocal ag duine éigin: athraigh é láithreach. Is féidir leat é a athshocrú anseo: {forgot}\n' +
      '\n' +
      'Tar éis 10 gcód mícheart ó aip fhíordheimhnithe, ní ghlactar le cóid ar feadh uair an chloig; tar éis 10 gcinn eile, ar feadh lae; agus ansin ar feadh seachtaine gach uair. Oibríonn eochair rochtana nó cód aisghabhála fós fad nach nglactar le cóid. Cuireann athshocrú do phasfhocail trí ríomhphost deireadh leis seo: cuirtear deireadh leis na sínithe isteach nár críochnaíodh, níl an pasfhocal acu a thuilleadh, agus oibríonn cóid arís.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のパスワードが入力されましたが、ログインは完了していません',
    text:
      'Glazecalc のアカウント {account} に正しいパスワードが入力されましたが、ログインの二段階目の認証は完了しませんでした。二段階目の認証によって、ログインは防がれました。\n' +
      '\n' +
      'ご本人であれば、ほかに必要な操作はありません。そうでない場合は、誰かがパスワードを知っています。すぐにパスワードを変更してください。次のページで再設定できます: {forgot}\n' +
      '\n' +
      '認証アプリのコードを10回間違えると、一時間コードを受け付けなくなります。さらに10回間違えると一日、その後は毎回一週間です。コードを受け付けない間も、パスキーやリカバリーコードは使えます。メールでパスワードを再設定すると、この状態は解除されます。相手の完了していないログインは終了し、相手はパスワードを使えなくなり、コードも再び使えるようになります。\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Xi ħadd daħħal il-password tiegħek ta’ Glazecalc iżda ma lestiex id-dħul',
    text:
      'Xi ħadd daħħal il-password it-tajba tal-kont {account} ta’ Glazecalc, iżda ma lestiex it-tieni pass tad-dħul. It-tieni pass tiegħek ma ħalliex id-dħul jitlesta.\n' +
      '\n' +
      'Jekk kont int, m’hemmx għalfejn tagħmel xejn aktar. Jekk le, xi ħadd jaf il-password tiegħek: ibdilha minnufih. Tista’ tirrisettjaha hawn: {forgot}\n' +
      '\n' +
      'Wara 10 kodiċijiet ħżiena minn app tal-awtentikazzjoni, il-kodiċijiet jiġu rrifjutati għal siegħa; wara 10 oħra, għal jum; u mbagħad għal ġimgħa kull darba. Passkey jew kodiċi ta’ rkupru xorta jaħdmu waqt li l-kodiċijiet qed jiġu rrifjutati. Jekk tirrisettja l-password tiegħek bil-posta elettronika, dan jintemm: id-dħul mhux lest tagħhom jintemm, il-password li kellhom ma tibqax tgħodd, u l-kodiċijiet jerġgħu jaħdmu.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Birisi Glazecalc parolanızı girdi ama oturum açmayı tamamlamadı',
    text:
      'Birisi Glazecalc hesabı {account} için doğru parolayı girdi ama oturum açmanın ikinci adımını tamamlamadı. İkinci adımınız bu kişinin girmesini engelledi.\n' +
      '\n' +
      'Bu sizseniz başka bir şey yapmanız gerekmez. Değilseniz biri parolanızı biliyor: parolanızı hemen değiştirin. Şu adresten sıfırlayabilirsiniz: {forgot}\n' +
      '\n' +
      'Bir kimlik doğrulama uygulamasından 10 yanlış koddan sonra kodlar bir saat boyunca reddedilir; 10 yanlış kod daha girilirse bir gün; sonrasında her seferinde bir hafta. Kodlar reddedilirken geçiş anahtarı veya kurtarma kodu yine çalışır. Parolanızı e-postayla sıfırlamak bunu sona erdirir: bu kişinin tamamlanmamış oturum açmaları sona erer, parola artık elinde olmaz ve kodlar yeniden çalışır.\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  }
};

/**
 * Sent when two-step sign-in is turned off altogether (the last factor
 * removed, or the owner's clear_mfa.ts --clear): one email instead of one per
 * factor. {account}, {forgot} and {app}.
 */
export const MFA_OFF: Record<string, Email> = {
  en: {
    subject: 'Two-step sign-in was turned off on your Glazecalc account',
    text:
      'Two-step sign-in was just turned off on the Glazecalc account {account}: every authenticator app, passkey and recovery code was removed, and every device that was signed in has been signed out. Signing in now needs only the password.\n\n' +
      'You can turn two-step sign-in on again on your account page. If you did not ask for this, reset your password right away at {forgot}\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'Двустепенното влизане е изключено за профила Ви в Glazecalc',
    text:
      'Двустепенното влизане току-що беше изключено за профила {account} в Glazecalc: всяко приложение за удостоверяване, ключ за достъп и код за възстановяване бяха премахнати, а всички устройства, на които е бил влязъл профилът, бяха изведени от него. За влизане вече е нужна само паролата.\n' +
      '\n' +
      'Можете да включите отново двустепенното влизане на страницата на профила си. Ако не сте поискали това, нулирайте паролата си веднага на {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Na Vašem účtu Glazecalc bylo vypnuto dvoustupňové přihlášení',
    text:
      'Na účtu Glazecalc {account} bylo právě vypnuto dvoustupňové přihlášení: byla odebrána každá ověřovací aplikace, každý přístupový klíč i každý kód pro obnovení a všechna přihlášená zařízení byla odhlášena. K přihlášení nyní stačí jen heslo.\n' +
      '\n' +
      'Dvoustupňové přihlášení můžete znovu zapnout na stránce svého účtu. Pokud jste o to nežádali, ihned si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Login i to trin er slået fra på din Glazecalc-konto',
    text:
      'Login i to trin er netop slået fra på Glazecalc-kontoen {account}: Alle godkendelsesapps, adgangsnøgler og gendannelseskoder er fjernet, og alle enheder, der var logget ind, er logget ud. Login kræver nu kun adgangskoden.\n' +
      '\n' +
      'Du kan slå login i to trin til igen på kontosiden. Hvis du ikke har bedt om dette, så nulstil adgangskoden med det samme på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Die Zwei-Schritt-Anmeldung wurde für Ihr Glazecalc-Konto ausgeschaltet',
    text:
      'Die Zwei-Schritt-Anmeldung wurde gerade für das Glazecalc-Konto {account} ausgeschaltet: Jede Authenticator-App, jeder Passkey und jeder Wiederherstellungscode wurde entfernt, und alle Geräte, die angemeldet waren, wurden abgemeldet. Zum Anmelden genügt jetzt das Passwort allein.\n' +
      '\n' +
      'Sie können die Zwei-Schritt-Anmeldung auf Ihrer Kontoseite wieder einschalten. Wenn Sie das nicht angefordert haben, setzen Sie Ihr Passwort sofort hier zurück: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Se ha desactivado el inicio de sesión en dos pasos de su cuenta de Glazecalc',
    text:
      'Se acaba de desactivar el inicio de sesión en dos pasos de la cuenta de Glazecalc {account}: se han quitado todas las aplicaciones de autenticación, llaves de acceso y códigos de recuperación, y se ha cerrado la sesión en todos los dispositivos donde estaba iniciada. Ahora para iniciar sesión basta con la contraseña.\n' +
      '\n' +
      'Puede volver a activar el inicio de sesión en dos pasos en la página de su cuenta. Si no lo ha pedido usted, restablezca su contraseña de inmediato en {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Teie Glazecalci kontol lülitati kaheastmeline sisselogimine välja',
    text:
      'Glazecalci kontol {account} lülitati just kaheastmeline sisselogimine välja: kõik autentimisrakendused, pääsuvõtmed ja taastekoodid eemaldati ning kõik seadmed, kuhu oli sisse logitud, on välja logitud. Sisselogimiseks piisab nüüd ainult paroolist.\n' +
      '\n' +
      'Kaheastmelise sisselogimise saate oma konto lehel uuesti sisse lülitada. Kui te seda ei palunud, lähtestage oma parool kohe siin: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Glazecalc-tilisi kaksivaiheinen kirjautuminen poistettiin käytöstä',
    text:
      'Glazecalc-tilin {account} kaksivaiheinen kirjautuminen poistettiin juuri käytöstä: kaikki todennussovellukset, pääsyavaimet ja varmuuskoodit poistettiin, ja kaikki kirjautuneet laitteet kirjattiin ulos. Kirjautumiseen riittää nyt pelkkä salasana.\n' +
      '\n' +
      'Voit ottaa kaksivaiheisen kirjautumisen uudelleen käyttöön tilisivulla. Jos et pyytänyt tätä, palauta salasanasi heti osoitteessa {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'La connexion en deux étapes a été désactivée sur votre compte Glazecalc',
    text:
      'La connexion en deux étapes vient d’être désactivée sur le compte Glazecalc {account} : toutes les applications d’authentification, clés d’accès et tous les codes de récupération ont été retirés, et tous les appareils connectés ont été déconnectés. La connexion ne demande plus que le mot de passe.\n' +
      '\n' +
      'Vous pouvez réactiver la connexion en deux étapes sur la page de votre compte. Si vous n’avez rien demandé, réinitialisez votre mot de passe tout de suite sur {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Na vašem računu Glazecalc isključena je dvostupanjska prijava',
    text:
      'Na računu Glazecalc {account} upravo je isključena dvostupanjska prijava: uklonjena je svaka aplikacija za provjeru autentičnosti, svaki pristupni ključ i svaki kod za oporavak, a svi prijavljeni uređaji su odjavljeni. Za prijavu je sada dovoljna samo lozinka.\n' +
      '\n' +
      'Dvostupanjsku prijavu možete ponovno uključiti na stranici svojeg računa. Ako to niste zatražili, odmah postavite novu lozinku na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'A kétlépéses bejelentkezést kikapcsolták a Glazecalc-fiókjában',
    text:
      'A kétlépéses bejelentkezést az imént kikapcsolták a(z) {account} Glazecalc-fiókban: minden hitelesítő alkalmazást, hozzáférési kulcsot és helyreállítási kódot eltávolítottak, és minden eszközt, amely be volt jelentkezve, kijelentkeztettünk. A bejelentkezéshez mostantól csak a jelszó kell.\n' +
      '\n' +
      'A kétlépéses bejelentkezést a fiókja oldalán újra bekapcsolhatja. Ha nem Ön kérte, azonnal állítsa vissza a jelszavát itt: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'L’accesso in due passaggi è stato disattivato sul Suo account Glazecalc',
    text:
      'L’accesso in due passaggi è appena stato disattivato sull’account Glazecalc {account}: ogni app di autenticazione, passkey e codice di recupero è stato rimosso e tutti i dispositivi su cui era stato effettuato l’accesso sono stati disconnessi. Per accedere ora basta la password.\n' +
      '\n' +
      'Può attivare di nuovo l’accesso in due passaggi nella pagina del Suo account. Se non l’ha richiesto Lei, reimposti subito la password all’indirizzo {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Jūsų Glazecalc paskyroje išjungtas dviejų žingsnių prisijungimas',
    text:
      'Glazecalc paskyroje {account} ką tik išjungtas dviejų žingsnių prisijungimas: pašalintos visos autentifikavimo programos, prieigos raktai ir atkūrimo kodai, o visi įrenginiai, kuriuose buvo prisijungta, atjungti. Dabar prisijungti pakanka tik slaptažodžio.\n' +
      '\n' +
      'Dviejų žingsnių prisijungimą vėl galite įjungti savo paskyros puslapyje. Jei to neprašėte, nedelsdami atkurkite slaptažodį čia: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Jūsu lietotnes Glazecalc kontā izslēgta divpakāpju pierakstīšanās',
    text:
      'Lietotnes Glazecalc kontā {account} tikko izslēgta divpakāpju pierakstīšanās: noņemtas visas autentifikatora lietotnes, piekļuves atslēgas un atkopšanas kodi, un konts ir izrakstīts no visām ierīcēm, kurās tas bija pierakstīts. Pierakstīties tagad var tikai ar paroli.\n' +
      '\n' +
      'Divpakāpju pierakstīšanos varat atkal ieslēgt sava konta lapā. Ja to nepieprasījāt, nekavējoties atiestatiet paroli šeit: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Inloggen in twee stappen is uitgezet voor uw Glazecalc-account',
    text:
      'Inloggen in twee stappen is zojuist uitgezet voor het Glazecalc-account {account}: elke authenticator-app, passkey en herstelcode is verwijderd, en alle apparaten die waren ingelogd, zijn uitgelogd. Voor het inloggen is nu alleen het wachtwoord nodig.\n' +
      '\n' +
      'U kunt inloggen in twee stappen op uw accountpagina weer aanzetten. Hebt u hier niet om gevraagd, stel uw wachtwoord dan meteen opnieuw in via {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Wyłączono logowanie dwuetapowe na koncie Glazecalc',
    text:
      'Właśnie wyłączono logowanie dwuetapowe na koncie Glazecalc {account}: usunięto każdą aplikację uwierzytelniającą, każdy klucz dostępu i każdy kod odzyskiwania, a wszystkie zalogowane urządzenia zostały wylogowane. Do zalogowania wystarczy teraz samo hasło.\n' +
      '\n' +
      'Logowanie dwuetapowe można włączyć ponownie na stronie konta. Jeśli to nie właściciel konta o to poprosił, należy natychmiast zresetować hasło pod adresem {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'O início de sessão em dois passos foi desativado na sua conta Glazecalc',
    text:
      'O início de sessão em dois passos acabou de ser desativado na conta Glazecalc {account}: todas as aplicações de autenticação, chaves de acesso e códigos de recuperação foram removidos, e a sessão foi terminada em todos os dispositivos em que estava iniciada. Iniciar sessão passa agora a exigir apenas a palavra-passe.\n' +
      '\n' +
      'Pode ativar novamente o início de sessão em dois passos na página da sua conta. Se não fez este pedido, reponha já a sua palavra-passe em {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'Conectarea în doi pași a fost dezactivată pentru contul dumneavoastră Glazecalc',
    text:
      'Conectarea în doi pași tocmai a fost dezactivată pentru contul Glazecalc {account}: toate aplicațiile de autentificare, cheile de acces și codurile de recuperare au fost eliminate, iar toate dispozitivele conectate au fost deconectate. Conectarea necesită acum doar parola.\n' +
      '\n' +
      'Puteți activa din nou conectarea în doi pași pe pagina contului. Dacă nu ați cerut acest lucru, resetați-vă imediat parola la {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Na Vašom účte Glazecalc bolo vypnuté dvojstupňové prihlásenie',
    text:
      'Na účte Glazecalc {account} bolo práve vypnuté dvojstupňové prihlásenie: bola odstránená každá overovacia aplikácia, každý prístupový kľúč aj každý kód na obnovenie a všetky prihlásené zariadenia boli odhlásené. Na prihlásenie teraz stačí len heslo.\n' +
      '\n' +
      'Dvojstupňové prihlásenie môžete znova zapnúť na stránke svojho účtu. Ak ste o to nežiadali, ihneď si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Na Vašem računu Glazecalc je bila izklopljena dvostopenjska prijava',
    text:
      'Na računu Glazecalc {account} je bila pravkar izklopljena dvostopenjska prijava: vsaka aplikacija za preverjanje pristnosti, vsak ključ za dostop in vsaka obnovitvena koda so bili odstranjeni, vse prijavljene naprave pa odjavljene. Za prijavo zdaj zadostuje samo geslo.\n' +
      '\n' +
      'Dvostopenjsko prijavo lahko znova vklopite na strani svojega računa. Če tega niste zahtevali, takoj ponastavite geslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'Inloggning i två steg har stängts av på ditt Glazecalc-konto',
    text:
      'Inloggning i två steg har just stängts av på Glazecalc-kontot {account}: alla autentiseringsappar, inloggningsnycklar och återställningskoder har tagits bort, och alla enheter som var inloggade har loggats ut. Nu räcker det med lösenordet för att logga in.\n' +
      '\n' +
      'Du kan aktivera inloggning i två steg igen på kontosidan. Om du inte har bett om detta, återställ lösenordet direkt på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Η σύνδεση σε δύο βήματα απενεργοποιήθηκε στον λογαριασμό σας στο Glazecalc',
    text:
      'Η σύνδεση σε δύο βήματα μόλις απενεργοποιήθηκε στον λογαριασμό {account} στο Glazecalc: καταργήθηκαν όλες οι εφαρμογές ελέγχου ταυτότητας, τα κλειδιά πρόσβασης και οι κωδικοί ανάκτησης, και όλες οι συσκευές που ήταν συνδεδεμένες αποσυνδέθηκαν. Για τη σύνδεση χρειάζεται πλέον μόνο ο κωδικός πρόσβασης.\n' +
      '\n' +
      'Μπορείτε να ενεργοποιήσετε ξανά τη σύνδεση σε δύο βήματα στη σελίδα του λογαριασμού σας. Αν δεν το ζητήσατε εσείς, επαναφέρετε αμέσως τον κωδικό πρόσβασής σας εδώ: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Cuireadh as síniú isteach dhá chéim ar do chuntas Glazecalc',
    text:
      'Cuireadh as síniú isteach dhá chéim ar an gcuntas Glazecalc {account} anois díreach: baineadh gach aip fhíordheimhnithe, eochair rochtana agus cód aisghabhála, agus síníodh amach gach gléas a bhí sínithe isteach. Ní bhíonn ach an pasfhocal ag teastáil anois chun síniú isteach.\n' +
      '\n' +
      'Is féidir leat síniú isteach dhá chéim a chur ar siúl arís ar leathanach do chuntais. Mura tusa a d’iarr é seo, athshocraigh do phasfhocal láithreach anseo: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のアカウントで二段階認証が無効になりました',
    text:
      'Glazecalc のアカウント {account} で二段階認証が無効になりました。すべての認証アプリ、パスキー、リカバリーコードが削除され、ログインしていたすべての端末がログアウトされました。ログインに必要なのはパスワードだけになりました。\n' +
      '\n' +
      '二段階認証は、アカウントページでもう一度有効にできます。心当たりがない場合は、すぐに次のページでパスワードを再設定してください: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Id-dħul f’żewġ passi ntefa fuq il-kont tiegħek ta’ Glazecalc',
    text:
      'Id-dħul f’żewġ passi għadu kif intefa fuq il-kont {account} ta’ Glazecalc: kull app tal-awtentikazzjoni, passkey u kodiċi ta’ rkupru tneħħew, u kull apparat li kien dieħel fil-kont ħareġ minnu. Issa biex tidħol hemm bżonn il-password biss.\n' +
      '\n' +
      'Tista’ terġa’ tixgħel id-dħul f’żewġ passi fil-paġna tal-kont tiegħek. Jekk ma talabtx dan, irrisettja l-password tiegħek minnufih hawn: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc hesabınızda iki adımlı oturum açma devre dışı bırakıldı',
    text:
      'Glazecalc hesabı {account} için iki adımlı oturum açma az önce devre dışı bırakıldı: tüm kimlik doğrulama uygulamaları, geçiş anahtarları ve kurtarma kodları kaldırıldı ve oturum açık olan tüm cihazlarda oturum kapatıldı. Oturum açmak için artık yalnızca parola gerekir.\n' +
      '\n' +
      'İki adımlı oturum açmayı hesap sayfanızdan yeniden etkinleştirebilirsiniz. Bunu siz istemediyseniz parolanızı hemen şu adresten sıfırlayın: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  }
};

/**
 * The owner's 7-day notice before turning two-step sign-in off for someone who
 * lost every factor (server/clear_mfa.ts --notify): {account}, {date}, {forgot}
 * and {app}. Replies go to privacy@glazecalcapp.com.
 */
export const MFA_CLEAR_NOTICE: Record<string, Email> = {
  en: {
    subject: 'Two-step sign-in on your Glazecalc account will be turned off',
    text:
      'Someone asked for two-step sign-in to be turned off on the Glazecalc account {account}, because every authenticator app, passkey and recovery code for it was lost.\n\n' +
      'Two-step sign-in will be turned off on {date} unless you write to privacy@glazecalcapp.com before then. After that, the account can be signed in to with its password alone.\n\n' +
      'If this was you, there is nothing else to do. If not, write to privacy@glazecalcapp.com now, and reset your password right away at {forgot}\n' +
      '\n-- \nGlazecalc, {app}\n'
  },
  bg: {
    subject: 'Двустепенното влизане за профила Ви в Glazecalc ще бъде изключено',
    text:
      'Някой поиска двустепенното влизане за профила {account} в Glazecalc да бъде изключено, защото всяко приложение за удостоверяване, ключ за достъп и код за възстановяване за него са загубени.\n' +
      '\n' +
      'Двустепенното влизане ще бъде изключено на {date}, освен ако не пишете на privacy@glazecalcapp.com преди това. След това в профила ще може да се влиза само с парола.\n' +
      '\n' +
      'Ако това сте били Вие, не е нужно да правите нищо друго. Ако не, пишете веднага на privacy@glazecalcapp.com и нулирайте паролата си веднага на {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  cs: {
    subject: 'Dvoustupňové přihlášení na Vašem účtu Glazecalc bude vypnuto',
    text:
      'Někdo požádal o vypnutí dvoustupňového přihlášení na účtu Glazecalc {account}, protože byla ztracena každá ověřovací aplikace, každý přístupový klíč i každý kód pro obnovení k němu.\n' +
      '\n' +
      'Dvoustupňové přihlášení bude vypnuto dne {date}, pokud do té doby nenapíšete na privacy@glazecalcapp.com. Poté se bude možné k účtu přihlásit jen heslem.\n' +
      '\n' +
      'Pokud jste to byli Vy, nemusíte nic dělat. Pokud ne, napište hned na privacy@glazecalcapp.com a ihned si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  da: {
    subject: 'Login i to trin på din Glazecalc-konto bliver slået fra',
    text:
      'Nogen har bedt om, at login i to trin slås fra på Glazecalc-kontoen {account}, fordi alle godkendelsesapps, adgangsnøgler og gendannelseskoder til den er gået tabt.\n' +
      '\n' +
      'Login i to trin slås fra den {date}, medmindre du skriver til privacy@glazecalcapp.com inden da. Derefter kan der logges ind på kontoen med adgangskoden alene.\n' +
      '\n' +
      'Hvis det var dig, er der ikke mere at gøre. Hvis ikke, så skriv til privacy@glazecalcapp.com nu, og nulstil adgangskoden med det samme på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  de: {
    subject: 'Die Zwei-Schritt-Anmeldung für Ihr Glazecalc-Konto wird ausgeschaltet',
    text:
      'Jemand hat darum gebeten, die Zwei-Schritt-Anmeldung für das Glazecalc-Konto {account} auszuschalten, weil jede Authenticator-App, jeder Passkey und jeder Wiederherstellungscode dafür verloren gegangen ist.\n' +
      '\n' +
      'Die Zwei-Schritt-Anmeldung wird am {date} ausgeschaltet, es sei denn, Sie schreiben vorher an privacy@glazecalcapp.com. Danach kann man sich allein mit dem Passwort bei dem Konto anmelden.\n' +
      '\n' +
      'Wenn Sie das waren, müssen Sie nichts weiter tun. Wenn nicht, schreiben Sie sofort an privacy@glazecalcapp.com und setzen Sie Ihr Passwort sofort hier zurück: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  es: {
    subject: 'Se va a desactivar el inicio de sesión en dos pasos de su cuenta de Glazecalc',
    text:
      'Alguien ha pedido que se desactive el inicio de sesión en dos pasos de la cuenta de Glazecalc {account}, porque se han perdido todas las aplicaciones de autenticación, llaves de acceso y códigos de recuperación de la cuenta.\n' +
      '\n' +
      'El inicio de sesión en dos pasos se desactivará el {date}, salvo que usted escriba antes a privacy@glazecalcapp.com. Después, se podrá iniciar sesión en la cuenta solo con la contraseña.\n' +
      '\n' +
      'Si ha sido usted, no tiene que hacer nada más. Si no, escriba ahora a privacy@glazecalcapp.com y restablezca su contraseña de inmediato en {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  et: {
    subject: 'Teie Glazecalci konto kaheastmeline sisselogimine lülitatakse välja',
    text:
      'Keegi palus lülitada Glazecalci konto {account} kaheastmeline sisselogimine välja, sest kõik selle autentimisrakendused, pääsuvõtmed ja taastekoodid kadusid.\n' +
      '\n' +
      'Kaheastmeline sisselogimine lülitatakse välja {date}, kui te ei kirjuta enne seda aadressile privacy@glazecalcapp.com. Pärast seda saab kontole sisse logida ainult parooliga.\n' +
      '\n' +
      'Kui see olite teie, ei pea te midagi muud tegema. Kui mitte, kirjutage kohe aadressile privacy@glazecalcapp.com ja lähtestage oma parool kohe siin: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fi: {
    subject: 'Glazecalc-tilisi kaksivaiheinen kirjautuminen poistetaan käytöstä',
    text:
      'Joku on pyytänyt kaksivaiheisen kirjautumisen poistamista käytöstä Glazecalc-tililtä {account}, koska kaikki tilin todennussovellukset, pääsyavaimet ja varmuuskoodit on menetetty.\n' +
      '\n' +
      'Kaksivaiheinen kirjautuminen poistetaan käytöstä {date}, ellet kirjoita osoitteeseen privacy@glazecalcapp.com ennen sitä. Sen jälkeen tilille voi kirjautua pelkällä salasanalla.\n' +
      '\n' +
      'Jos pyysit sitä itse, mitään muuta ei tarvitse tehdä. Jos et, kirjoita heti osoitteeseen privacy@glazecalcapp.com ja palauta salasanasi saman tien osoitteessa {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  fr: {
    subject: 'La connexion en deux étapes de votre compte Glazecalc va être désactivée',
    text:
      'Quelqu’un a demandé la désactivation de la connexion en deux étapes du compte Glazecalc {account}, parce que toutes les applications d’authentification, clés d’accès et tous les codes de récupération de ce compte ont été perdus.\n' +
      '\n' +
      'La connexion en deux étapes sera désactivée le {date}, sauf si vous écrivez à privacy@glazecalcapp.com avant cette date. Ensuite, on pourra se connecter au compte avec son seul mot de passe.\n' +
      '\n' +
      'Si c’est vous, il n’y a rien d’autre à faire. Sinon, écrivez dès maintenant à privacy@glazecalcapp.com et réinitialisez tout de suite votre mot de passe sur {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hr: {
    subject: 'Dvostupanjska prijava na vašem računu Glazecalc bit će isključena',
    text:
      'Netko je zatražio isključivanje dvostupanjske prijave na računu Glazecalc {account}, jer je izgubljena svaka aplikacija za provjeru autentičnosti, svaki pristupni ključ i svaki kod za oporavak za njega.\n' +
      '\n' +
      'Dvostupanjska prijava bit će isključena {date}, osim ako do tada ne napišete na privacy@glazecalcapp.com. Nakon toga će se u račun moći prijaviti samo lozinkom.\n' +
      '\n' +
      'Ako ste to bili vi, ne morate ništa učiniti. Ako niste, sada napišite na privacy@glazecalcapp.com i odmah postavite novu lozinku na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  hu: {
    subject: 'A kétlépéses bejelentkezést ki fogják kapcsolni a Glazecalc-fiókjában',
    text:
      'Valaki azt kérte, hogy kapcsolják ki a kétlépéses bejelentkezést a(z) {account} Glazecalc-fiókban, mert a fiók minden hitelesítő alkalmazását, hozzáférési kulcsát és helyreállítási kódját elveszítették.\n' +
      '\n' +
      'A kétlépéses bejelentkezést ekkor kapcsoljuk ki: {date}, hacsak előbb nem ír a privacy@glazecalcapp.com címre. Ezután a fiókba a jelszóval önmagában is be lehet jelentkezni.\n' +
      '\n' +
      'Ha Ön volt az, nincs további teendője. Ha nem, azonnal írjon a privacy@glazecalcapp.com címre, és azonnal állítsa vissza a jelszavát itt: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  it: {
    subject: 'L’accesso in due passaggi del Suo account Glazecalc verrà disattivato',
    text:
      'Qualcuno ha chiesto di disattivare l’accesso in due passaggi sull’account Glazecalc {account}, perché ogni app di autenticazione, passkey e codice di recupero di quell’account è andato perso.\n' +
      '\n' +
      'L’accesso in due passaggi verrà disattivato il {date}, a meno che Lei non scriva a privacy@glazecalcapp.com prima di allora. Dopo, all’account si potrà accedere con la sola password.\n' +
      '\n' +
      'Se l’ha chiesto Lei, non c’è altro da fare. Altrimenti, scriva subito a privacy@glazecalcapp.com e reimposti subito la password all’indirizzo {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lt: {
    subject: 'Jūsų Glazecalc paskyroje bus išjungtas dviejų žingsnių prisijungimas',
    text:
      'Kažkas paprašė išjungti dviejų žingsnių prisijungimą Glazecalc paskyroje {account}, nes prarastos visos jos autentifikavimo programos, prieigos raktai ir atkūrimo kodai.\n' +
      '\n' +
      'Dviejų žingsnių prisijungimas bus išjungtas {date}, nebent iki to laiko parašysite adresu privacy@glazecalcapp.com. Po to prie paskyros bus galima prisijungti vien slaptažodžiu.\n' +
      '\n' +
      'Jei tai buvote jūs, daugiau nieko daryti nereikia. Jei ne, nedelsdami parašykite adresu privacy@glazecalcapp.com ir nedelsdami atkurkite slaptažodį čia: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  lv: {
    subject: 'Jūsu lietotnes Glazecalc kontā tiks izslēgta divpakāpju pierakstīšanās',
    text:
      'Kāds pieprasīja izslēgt divpakāpju pierakstīšanos lietotnes Glazecalc kontā {account}, jo ir pazaudētas visas tā autentifikatora lietotnes, piekļuves atslēgas un atkopšanas kodi.\n' +
      '\n' +
      'Divpakāpju pierakstīšanās tiks izslēgta {date}, ja vien pirms tam nerakstīsiet uz privacy@glazecalcapp.com. Pēc tam kontā varēs pierakstīties tikai ar paroli.\n' +
      '\n' +
      'Ja to izdarījāt Jūs, nekas cits nav jādara. Ja ne, nekavējoties rakstiet uz privacy@glazecalcapp.com un nekavējoties atiestatiet paroli šeit: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  nl: {
    subject: 'Inloggen in twee stappen wordt uitgezet voor uw Glazecalc-account',
    text:
      'Iemand heeft gevraagd inloggen in twee stappen uit te zetten voor het Glazecalc-account {account}, omdat elke authenticator-app, passkey en herstelcode ervan kwijt is.\n' +
      '\n' +
      'Inloggen in twee stappen wordt uitgezet op {date}, tenzij u vóór die tijd een e-mail stuurt naar privacy@glazecalcapp.com. Daarna kan met alleen het wachtwoord op het account worden ingelogd.\n' +
      '\n' +
      'Was u dit zelf, dan hoeft u verder niets te doen. Zo niet, stuur dan nu een e-mail naar privacy@glazecalcapp.com en stel uw wachtwoord meteen opnieuw in via {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  pl: {
    subject: 'Logowanie dwuetapowe na koncie Glazecalc zostanie wyłączone',
    text:
      'Ktoś poprosił o wyłączenie logowania dwuetapowego na koncie Glazecalc {account}, ponieważ utracono każdą aplikację uwierzytelniającą, każdy klucz dostępu i każdy kod odzyskiwania tego konta.\n' +
      '\n' +
      'Logowanie dwuetapowe zostanie wyłączone dnia {date}, chyba że przed tym terminem zostanie wysłana wiadomość na adres privacy@glazecalcapp.com. Potem do konta będzie można zalogować się samym hasłem.\n' +
      '\n' +
      'Jeśli prośba pochodzi od właściciela konta, nie trzeba nic robić. W przeciwnym razie należy teraz napisać na adres privacy@glazecalcapp.com i natychmiast zresetować hasło pod adresem {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  'pt-PT': {
    subject: 'O início de sessão em dois passos na sua conta Glazecalc vai ser desativado',
    text:
      'Alguém pediu que o início de sessão em dois passos fosse desativado na conta Glazecalc {account}, porque todas as aplicações de autenticação, chaves de acesso e códigos de recuperação da conta foram perdidos.\n' +
      '\n' +
      'O início de sessão em dois passos será desativado em {date}, a menos que escreva para privacy@glazecalcapp.com antes dessa data. Depois disso, será possível iniciar sessão na conta apenas com a palavra-passe.\n' +
      '\n' +
      'Se foi você, não precisa de fazer mais nada. Caso contrário, escreva já para privacy@glazecalcapp.com e reponha a sua palavra-passe em {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ro: {
    subject: 'Conectarea în doi pași pentru contul dumneavoastră Glazecalc va fi dezactivată',
    text:
      'Cineva a cerut dezactivarea conectării în doi pași pentru contul Glazecalc {account}, deoarece toate aplicațiile de autentificare, cheile de acces și codurile de recuperare ale contului au fost pierdute.\n' +
      '\n' +
      'Conectarea în doi pași va fi dezactivată la {date}, dacă nu scrieți la privacy@glazecalcapp.com înainte de această dată. După aceea, în cont se poate intra numai cu parola.\n' +
      '\n' +
      'Dacă ați fost dumneavoastră, nu mai aveți nimic de făcut. Dacă nu, scrieți acum la privacy@glazecalcapp.com și resetați-vă imediat parola la {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sk: {
    subject: 'Dvojstupňové prihlásenie na Vašom účte Glazecalc bude vypnuté',
    text:
      'Niekto požiadal o vypnutie dvojstupňového prihlásenia na účte Glazecalc {account}, pretože bola stratená každá overovacia aplikácia, každý prístupový kľúč aj každý kód na obnovenie k nemu.\n' +
      '\n' +
      'Dvojstupňové prihlásenie bude vypnuté {date}, pokiaľ dovtedy nenapíšete na privacy@glazecalcapp.com. Potom sa bude dať do účtu prihlásiť len heslom.\n' +
      '\n' +
      'Ak ste to boli Vy, nemusíte robiť nič. Ak nie, napíšte hneď na privacy@glazecalcapp.com a ihneď si obnovte heslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sl: {
    subject: 'Dvostopenjska prijava na Vašem računu Glazecalc bo izklopljena',
    text:
      'Nekdo je zahteval izklop dvostopenjske prijave na računu Glazecalc {account}, ker so bile izgubljene vse aplikacije za preverjanje pristnosti, vsi ključi za dostop in vse obnovitvene kode zanj.\n' +
      '\n' +
      'Dvostopenjska prijava bo izklopljena {date}, če do takrat ne pišete na privacy@glazecalcapp.com. Potem se bo v račun mogoče prijaviti samo z geslom.\n' +
      '\n' +
      'Če ste to bili Vi, Vam ni treba storiti ničesar. Če ne, zdaj pišite na privacy@glazecalcapp.com in takoj ponastavite geslo na {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  sv: {
    subject: 'Inloggning i två steg på ditt Glazecalc-konto kommer att stängas av',
    text:
      'Någon har bett om att inloggning i två steg ska stängas av på Glazecalc-kontot {account}, eftersom alla autentiseringsappar, inloggningsnycklar och återställningskoder för det har gått förlorade.\n' +
      '\n' +
      'Inloggning i två steg stängs av den {date} om du inte skriver till privacy@glazecalcapp.com före dess. Därefter går det att logga in på kontot med enbart lösenordet.\n' +
      '\n' +
      'Om det var du finns det inget mer att göra. Annars bör du skriva till privacy@glazecalcapp.com nu och återställa lösenordet direkt på {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  el: {
    subject: 'Η σύνδεση σε δύο βήματα στον λογαριασμό σας στο Glazecalc θα απενεργοποιηθεί',
    text:
      'Κάποιος ζήτησε να απενεργοποιηθεί η σύνδεση σε δύο βήματα στον λογαριασμό {account} στο Glazecalc, επειδή χάθηκαν όλες οι εφαρμογές ελέγχου ταυτότητας, τα κλειδιά πρόσβασης και οι κωδικοί ανάκτησής του.\n' +
      '\n' +
      'Η σύνδεση σε δύο βήματα θα απενεργοποιηθεί στις {date}, εκτός αν γράψετε στο privacy@glazecalcapp.com πριν από τότε. Μετά από αυτό, η σύνδεση στον λογαριασμό θα γίνεται μόνο με τον κωδικό πρόσβασης.\n' +
      '\n' +
      'Αν το ζητήσατε εσείς, δεν χρειάζεται να κάνετε τίποτα άλλο. Αν όχι, γράψτε τώρα στο privacy@glazecalcapp.com και επαναφέρετε αμέσως τον κωδικό πρόσβασής σας εδώ: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ga: {
    subject: 'Cuirfear as síniú isteach dhá chéim ar do chuntas Glazecalc',
    text:
      'D’iarr duine éigin go gcuirfí as síniú isteach dhá chéim ar an gcuntas Glazecalc {account}, mar gur cailleadh gach aip fhíordheimhnithe, eochair rochtana agus cód aisghabhála a bhí aige.\n' +
      '\n' +
      'Cuirfear as síniú isteach dhá chéim ar {date} mura scríobhann tú chuig privacy@glazecalcapp.com roimhe sin. Ina dhiaidh sin, beifear in ann síniú isteach sa chuntas leis an bpasfhocal amháin.\n' +
      '\n' +
      'Más tusa a d’iarr é, níl aon rud eile le déanamh. Mura tusa, scríobh chuig privacy@glazecalcapp.com anois, agus athshocraigh do phasfhocal láithreach anseo: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  ja: {
    subject: 'Glazecalc のアカウントの二段階認証が無効になります',
    text:
      'Glazecalc のアカウント {account} について、すべての認証アプリ、パスキー、リカバリーコードをなくしたため、二段階認証を無効にしてほしいという依頼がありました。\n' +
      '\n' +
      'それまでに privacy@glazecalcapp.com へご連絡がない限り、二段階認証は{date}に無効になります。その後は、パスワードだけでこのアカウントにログインできるようになります。\n' +
      '\n' +
      'ご本人による依頼であれば、ほかに必要な操作はありません。そうでない場合は、今すぐ privacy@glazecalcapp.com へご連絡のうえ、すぐに次のページでパスワードを再設定してください: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  mt: {
    subject: 'Id-dħul f’żewġ passi fuq il-kont tiegħek ta’ Glazecalc se jintefa',
    text:
      'Xi ħadd talab li jintefa d-dħul f’żewġ passi fuq il-kont {account} ta’ Glazecalc, għax intilfu kull app tal-awtentikazzjoni, passkey u kodiċi ta’ rkupru tiegħu.\n' +
      '\n' +
      'Id-dħul f’żewġ passi se jintefa f’din id-data: {date}, sakemm ma tiktibx lil privacy@glazecalcapp.com qabel. Wara dan, wieħed ikun jista’ jidħol fil-kont bil-password biss.\n' +
      '\n' +
      'Jekk kont int, m’hemmx għalfejn tagħmel xejn aktar. Jekk le, ikteb lil privacy@glazecalcapp.com issa, u rrisettja l-password tiegħek minnufih hawn: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  },
  tr: {
    subject: 'Glazecalc hesabınızda iki adımlı oturum açma devre dışı bırakılacak',
    text:
      'Birisi, Glazecalc hesabı {account} için tüm kimlik doğrulama uygulamaları, geçiş anahtarları ve kurtarma kodları kaybedildiğinden iki adımlı oturum açmanın devre dışı bırakılmasını istedi.\n' +
      '\n' +
      'İki adımlı oturum açma {date} tarihinde devre dışı bırakılacak; bunu önlemek için bu tarihten önce privacy@glazecalcapp.com adresine yazın. Bundan sonra hesaba yalnızca parolayla oturum açılabilecek.\n' +
      '\n' +
      'Bunu siz istediyseniz başka bir şey yapmanız gerekmez. İstemediyseniz şimdi privacy@glazecalcapp.com adresine yazın ve parolanızı hemen şu adresten sıfırlayın: {forgot}\n' +
      '\n' +
      '-- \n' +
      'Glazecalc, {app}\n'
  }
};

/**
 * A date as the email's language writes it, day, month in words and year (UTC):
 * 21 October 2026 in English, 21. Oktober 2026 in German.
 */
export const mailDate = (date: Date, language?: string): string =>
  date.toLocaleDateString(language && language !== 'en' ? language : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

/** How each email names a factor, as a whole phrase: {name} is a passkey's name. */
export const METHODS: Record<string, { totp: string; passkey: string }> = {
  en: { totp: 'an authenticator app', passkey: 'the passkey "{name}"' },
  bg: { totp: 'приложение за удостоверяване', passkey: 'ключът за достъп „{name}“' },
  cs: { totp: 'ověřovací aplikace', passkey: 'přístupový klíč „{name}“' },
  da: { totp: 'en godkendelsesapp', passkey: 'adgangsnøglen »{name}«' },
  de: { totp: 'eine Authenticator-App', passkey: 'der Passkey „{name}“' },
  es: { totp: 'una aplicación de autenticación', passkey: 'la llave de acceso «{name}»' },
  et: { totp: 'autentimisrakendus', passkey: 'pääsuvõti „{name}“' },
  fi: { totp: 'todennussovellus', passkey: 'pääsyavain ”{name}”' },
  fr: { totp: 'une application d’authentification', passkey: 'la clé d’accès « {name} »' },
  hr: { totp: 'aplikacija za provjeru autentičnosti', passkey: 'pristupni ključ „{name}”' },
  hu: { totp: 'egy hitelesítő alkalmazás', passkey: 'a(z) „{name}” hozzáférési kulcs' },
  it: { totp: 'un’app di autenticazione', passkey: 'la passkey «{name}»' },
  lt: { totp: 'autentifikavimo programa', passkey: 'prieigos raktas „{name}“' },
  lv: { totp: 'autentifikatora lietotne', passkey: 'piekļuves atslēga “{name}”' },
  nl: { totp: 'een authenticator-app', passkey: 'de passkey “{name}”' },
  pl: { totp: 'aplikacja uwierzytelniająca', passkey: 'klucz dostępu „{name}”' },
  'pt-PT': { totp: 'uma aplicação de autenticação', passkey: 'a chave de acesso «{name}»' },
  ro: { totp: 'o aplicație de autentificare', passkey: 'cheia de acces „{name}”' },
  sk: { totp: 'overovacia aplikácia', passkey: 'prístupový kľúč „{name}“' },
  sl: { totp: 'aplikacija za preverjanje pristnosti', passkey: 'ključ za dostop »{name}«' },
  sv: { totp: 'en autentiseringsapp', passkey: 'lösennyckeln ”{name}”' },
  el: { totp: 'μια εφαρμογή ελέγχου ταυτότητας', passkey: 'το κλειδί πρόσβασης «{name}»' },
  ga: { totp: 'aip fhíordheimhnithe', passkey: 'an eochair rochtana “{name}”' },
  ja: { totp: '認証アプリ', passkey: 'パスキー「{name}」' },
  mt: { totp: 'app tal-awtentikazzjoni', passkey: 'il-passkey “{name}”' },
  tr: { totp: 'bir kimlik doğrulama uygulaması', passkey: '“{name}” adlı geçiş anahtarı' }
};

/** The phrase for a factor in the language, or in English. A passkey's name is kept to one plain line. */
export const methodIn = (method: MfaMethod, language?: string): string => {
  const phrases = (language && METHODS[language]) || METHODS['en']!;
  if (method.kind === 'totp') return phrases.totp;
  const name = method.name
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, ' ')
    .trim()
    .slice(0, 60);
  return phrases.passkey.replace('{name}', () => name);
};

const sendMfaChange = (emails: Record<string, Email>, to: string, method: MfaMethod, language?: string) => {
  const email = inLanguage(emails, language);
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      method: methodIn(method, language),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};

export const sendMfaAdded = (to: string, method: MfaMethod, language?: string): Promise<void> =>
  sendMfaChange(MFA_ADDED, to, method, language);

export const sendMfaRemoved = (to: string, method: MfaMethod, language?: string): Promise<void> =>
  sendMfaChange(MFA_REMOVED, to, method, language);

export const sendRecoveryUsed = (to: string, left: number, language?: string): Promise<void> => {
  const email = inLanguage(RECOVERY_USED, language);
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      left,
      page: pageIn(language, '/account'),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};

export const sendRecoveryNew = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(RECOVERY_NEW, language);
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

export const sendMfaOff = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(MFA_OFF, language);
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

export const sendSecondStepUnfinished = (to: string, language?: string): Promise<void> => {
  const email = inLanguage(SECOND_STEP_UNFINISHED, language);
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, { account: to, forgot: pageIn(language, '/forgot'), app: mailer.appUrl() })
  });
};

/**
 * The 7-day notice (server/clear_mfa.ts --notify): two-step sign-in goes off
 * on `offDate` unless the person writes to privacy@. Unlike noticeMfa it
 * rejects on failure, so the script can say the mail did not go.
 */
export const sendMfaClearNotice = (to: string, offDate: Date, language?: string): Promise<void> => {
  const email = inLanguage(MFA_CLEAR_NOTICE, language);
  // The date in the email's own language: English where the email falls back to it.
  const dateLanguage = language && MFA_CLEAR_NOTICE[language] ? language : 'en';
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      date: mailDate(offDate, dateLanguage),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};

/**
 * One notice, as the routes send it. 'mfa-off' is for when two-step sign-in
 * ends altogether (the last factor removed, or clear_mfa.ts --clear): send it
 * instead of 'removed', so the person gets one email.
 */
export type MfaNotice =
  | { kind: 'added'; method: MfaMethod }
  | { kind: 'removed'; method: MfaMethod }
  | { kind: 'mfa-off' }
  | { kind: 'recovery-used'; left: number }
  | { kind: 'recovery-new' }
  | { kind: 'second-step-unfinished' };

const sendNotice = (to: string, notice: MfaNotice, language?: string): Promise<void> => {
  switch (notice.kind) {
    case 'added':
      return sendMfaAdded(to, notice.method, language);
    case 'removed':
      return sendMfaRemoved(to, notice.method, language);
    case 'mfa-off':
      return sendMfaOff(to, language);
    case 'recovery-used':
      return sendRecoveryUsed(to, notice.left, language);
    case 'recovery-new':
      return sendRecoveryNew(to, language);
    case 'second-step-unfinished':
      return sendSecondStepUnfinished(to, language);
  }
};

/**
 * What the routes call (streams A and B), after the reply: sends the notice in
 * the account's language, only when the address is confirmed
 * (!user.emailUnverified) and never to a trial, nor when email is off. Never
 * throws or rejects: a failure is logged by its error code only, as
 * logMailError does, since an SMTP error can repeat the address.
 */
export const noticeMfa = (
  user: {
    email: string;
    emailUnverified?: boolean | null;
    guest?: boolean | null;
    preferences?: { language?: string | null } | null;
  },
  notice: MfaNotice
): void => {
  const failed = (err: unknown) =>
    log.error('Could not send the two-step sign-in notice email', { code: log.codeOf(err) });
  try {
    if (!user?.email || user.emailUnverified || user.guest || isGuestAddress(user.email) || !mailer.available()) return;
    sendNotice(user.email, notice, user.preferences?.language ?? undefined).catch(failed);
  } catch (err) {
    failed(err);
  }
};

// Access tokens (docs/integrations-plan.md, item 28). English only so far: the
// next translation wave adds the others, and until then every language gets
// the English. A token's name is the person's own text, kept to one plain line.

/** A new personal access token: {account}, {name}, {date} it expires, {page}, {forgot} and {app}. */
export const TOKEN_MADE: Record<string, Email> = {
  en: {
    subject: 'A new access token for your Glazecalc account',
    text:
      'An access token named "{name}" was just made for the Glazecalc account {account}. It can read the recipes, materials, notes and firing logs saved in the account until {date}.\n\n' +
      'If this was you, there is nothing else to do. You can see and revoke your tokens at {page}\n\n' +
      'If not, revoke it there and reset your password right away at {forgot}\n' +
      '\n-- \nGlazecalc, {app}\n'
  }
};

/** A personal access token expiring soon: {account}, {name}, {date}, {page} and {app}. */
export const TOKEN_EXPIRING: Record<string, Email> = {
  en: {
    subject: 'An access token for your Glazecalc account expires soon',
    text:
      'The access token named "{name}" on the Glazecalc account {account} stops working on {date}.\n\n' +
      'If you still use it, make a new token before then at {page} and give it to your assistant or script in place of the old one. If you no longer use it, there is nothing to do.\n' +
      '\n-- \nGlazecalc, {app}\n'
  }
};

/** A token's name for an email: one plain line, at most 100 characters. */
export const tokenNameForMail = (name: string): string =>
  name
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, ' ')
    .trim()
    .slice(0, 100);

const sendTokenMail = (
  emails: Record<string, Email>,
  to: string,
  token: { name: string; expiresAt: Date },
  language?: string
): Promise<void> => {
  const email = inLanguage(emails, language);
  // The date in the email's own language: English where the email falls back to it.
  const dateLanguage = language && emails[language] ? language : 'en';
  return mailer.send({
    to,
    subject: email.subject,
    text: fill(email.text, {
      account: to,
      name: tokenNameForMail(token.name),
      date: mailDate(token.expiresAt, dateLanguage),
      page: pageIn(language, '/account'),
      forgot: pageIn(language, '/forgot'),
      app: mailer.appUrl()
    })
  });
};

export const sendTokenMade = (to: string, token: { name: string; expiresAt: Date }, language?: string): Promise<void> =>
  sendTokenMail(TOKEN_MADE, to, token, language);

export const sendTokenExpiring = (
  to: string,
  token: { name: string; expiresAt: Date },
  language?: string
): Promise<void> => sendTokenMail(TOKEN_EXPIRING, to, token, language);
