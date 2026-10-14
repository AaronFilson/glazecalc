// QR codes for setting up an authenticator app, made on the server
// (docs/mfa-plan.md, item 4).
//
// qrcode-generator (no dependencies) renders the otpauth: URI to SVG, sent as
// a data:image/svg+xml;base64 URL that the app shows in an <img alt>. That
// needs no CSP change (img-src 'self' data:), no innerHTML, and adds nothing to
// the client bundle.
import qrcode from 'qrcode-generator';

/** The text as a QR code: data:image/svg+xml;base64,… */
export const svgDataUrl = (text: string): string => {
  // Type 0 picks the smallest size that holds the text; M corrects up to 15% damage.
  const code = qrcode(0, 'M');
  code.addData(text, 'Byte');
  code.make();
  // Scalable, so the page sizes it; a quiet zone of 4 modules, as the standard asks.
  const svg = code.createSvgTag({ cellSize: 4, margin: 16, scalable: true });
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
};
