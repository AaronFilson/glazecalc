// The Transloco keys manager (docs/adr/0013-translations.md): it finds the
// message keys in the app's templates and code, and in CI fails on a key used
// but missing from the English, or present but no longer used.
module.exports = {
  rootTranslationsPath: 'client/public/i18n/',
  langs: ['en'],
  keysManager: {
    input: ['client/app'],
    output: 'client/public/i18n',
    unflat: true
  }
};
