<!-- What this changes and why, and the issue, plan or ADR it comes from. -->

**Checks** ([CONTRIBUTING.md](../CONTRIBUTING.md) says more; CI runs them all again):

- [ ] `npm test` and `npm run test:client`
- [ ] `npm run test:e2e` when a page changes, or `npm run test:e2e:linux` for layout and printing
- [ ] `npm run lint`, `npm run typecheck`, `npm run check:i18n` and `npm run format:check`
- [ ] Text the app shows is in the messages, never in the code ([docs/translating.md](../docs/translating.md))
- [ ] A decision that shapes the app has its record in [docs/adr](../docs/adr)
- [ ] CHANGELOG.md says what changed, for whoever it affects
