// QR codes for setting up an authenticator app, made on the server
// (docs/mfa-plan.md, item 4). STREAM A implements this file; the signature is
// the contract.
//
// qrcode-generator (no dependencies) renders the otpauth: URI to SVG, sent as
// a data:image/svg+xml;base64 URL that the app shows in an <img alt>. That
// needs no CSP change (img-src 'self' data:), no innerHTML, and adds nothing to
// the client bundle.

/** The text as a QR code: data:image/svg+xml;base64,… */
export const svgDataUrl = (text: string): string => {
  throw new Error('not implemented: server/lib/qr.ts (stream A, docs/mfa-plan.md item 4)');
};
