/** Overwrites a buffer that held a secret (such as a decoded password) with zeros. */
export default function zeroBuffer(buf: Buffer): void {
  buf.fill(0);
}
