// Rewrites a received message so that Amazon SES will send it on to the owner.
// Pure functions only (no AWS calls), so they can be tested without AWS.
//
// SES will send a message only if its From address belongs to a verified
// identity, so the original From cannot stay. The message is changed like this:
//   From      "<original display name> via Glazecalc" <forwarder address>
//   Reply-To  the original sender (replying goes to them, not to the forwarder);
//             if the sender set a Reply-To of their own, that address is used
//   removed   Return-Path, Sender, DKIM-Signature and other headers that would
//             not match the new sender, or that SES sets itself
// Every other header, and the body, are passed on byte for byte.
//
// The message is handled as a latin1 string, which maps each byte to one
// character and back, so non-ASCII bytes in headers or the body survive.

export const FORWARDED_HEADER = 'X-Glazecalc-Forwarded';

const DROP_HEADERS = new Set([
  'from',
  'reply-to',
  'return-path',
  'sender',
  'bcc',
  'delivered-to',
  'message-id',
  'dkim-signature',
  'domainkey-signature',
  'dkim-filter',
  'x-google-dkim-signature',
  'authentication-results',
  'received-spf',
  'return-receipt-to',
  'disposition-notification-to',
  FORWARDED_HEADER.toLowerCase()
]);
const DROP_PREFIXES = ['arc-', 'x-ses-', 'x-amzn-ses-'];

/** Splits a raw message into header blocks (name, unfolded value, raw text), the line ending, the gap and the body. */
export function parseMessage(raw) {
  const text = Buffer.isBuffer(raw) ? raw.toString('latin1') : String(raw);
  const gap = /\r?\n\r?\n/.exec(text);
  const head = gap ? text.slice(0, gap.index) : text;
  const rest = gap ? text.slice(gap.index + gap[0].length) : '';
  const eol = (gap ? gap[0] : head).includes('\r\n') ? '\r\n' : '\n';
  const blocks = [];
  for (const line of head.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && blocks.length > 0) {
      blocks[blocks.length - 1].push(line);
    } else if (/^[!-9;-~]+:/.test(line)) {
      blocks.push([line]);
    }
    // Anything else (an mbox "From " line, junk) is dropped.
  }
  const headers = blocks.map((lines) => {
    const joined = lines.join(' ');
    const colon = joined.indexOf(':');
    return {
      name: joined.slice(0, colon),
      value: joined
        .slice(colon + 1)
        .replace(/\s+/g, ' ')
        .trim(),
      raw: lines.join(eol)
    };
  });
  return { headers, eol, gap: gap ? gap[0] : eol + eol, body: rest };
}

const decodeBytes = (bytes, charset) => {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
};

/** Decodes RFC 2047 encoded words (=?utf-8?B?...?=) and raw UTF-8 bytes in a header value. */
export function decodeWords(value) {
  let text = value.replace(/(\?=)\s+(?==\?)/g, '$1');
  text = text.replace(/=\?([^?\s]+)\?([bBqQ])\?([^?\s]*)\?=/g, (_whole, charset, kind, data) => {
    const bytes =
      kind.toLowerCase() === 'b'
        ? Buffer.from(data, 'base64')
        : Buffer.from(
            data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16))),
            'latin1'
          );
    return decodeBytes(bytes, charset.replace(/\*.*$/, ''));
  });
  if (/[\u0080-\u00ff]/.test(text) && !/[\u0100-\uffff]/.test(text)) {
    // Raw 8-bit bytes in the header: usually UTF-8.
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(text, 'latin1'));
    } catch {
      return text;
    }
  }
  return text;
}

// eslint-disable-next-line no-control-regex -- control characters are exactly what is removed
const CONTROL = /[\x00-\x1f\x7f]+/g;

/** A display name made safe for a header: no control characters, one line, not too long. */
export function cleanName(name) {
  const single = name.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
  return [...single].slice(0, 80).join('');
}

/** The first mailbox in an address header, as { name, address }; address is null if there is none. */
export function parseMailbox(value) {
  // Cut at the first comma that is outside quotes and angle brackets.
  let first = value;
  let quoted = false;
  let angle = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '\\' && quoted) i++;
    else if (c === '"') quoted = !quoted;
    else if (!quoted && c === '<') angle++;
    else if (!quoted && c === '>') angle = Math.max(0, angle - 1);
    else if (!quoted && angle === 0 && (c === ',' || c === ';')) {
      first = value.slice(0, i);
      break;
    }
  }
  first = first.trim();
  let name = '';
  let address = first;
  const angled = /^(.*)<([^<>]*)>\s*$/s.exec(first);
  if (angled) {
    name = angled[1].trim();
    address = angled[2].trim();
  }
  address = address.replace(/\([^)]*\)/g, '').trim();
  if (name.length >= 2 && name.startsWith('"') && name.endsWith('"')) {
    name = name.slice(1, -1).replace(/\\(.)/g, '$1');
  }
  if (!/^[^\s<>()",;:\\]+@[^\s<>()",;:\\]+$/.test(address)) address = null;
  return { name: cleanName(decodeWords(name)), address };
}

/** "Name" <address>, with the name as a quoted string or, if it is not plain ASCII, as encoded words. */
export function formatMailbox(name, address, eol = '\r\n') {
  if (!name) return address;
  if (/^[\x20-\x7e]+$/.test(name)) {
    return `"${name.replace(/(["\\])/g, '\\$1')}" <${address}>`;
  }
  const words = [];
  let chunk = '';
  for (const char of name) {
    if (Buffer.byteLength(chunk + char, 'utf8') > 42) {
      words.push(chunk);
      chunk = '';
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);
  const encoded = words.map((w) => `=?UTF-8?B?${Buffer.from(w, 'utf8').toString('base64')}?=`);
  return `${encoded.join(eol + ' ')} <${address}>`;
}

const header = (parsed, name) => parsed.headers.find((h) => h.name.toLowerCase() === name);

/** True if this message was already forwarded by us, or claims to be from the forwarder: do not forward it again. */
export function isLoop(raw, forwarderAddress) {
  const parsed = parseMessage(raw);
  if (header(parsed, FORWARDED_HEADER.toLowerCase())) return true;
  const from = header(parsed, 'from');
  return !!from && parseMailbox(from.value).address?.toLowerCase() === forwarderAddress.toLowerCase();
}

/** True if SES's scan marked the message as spam or as carrying a virus (receipt: an SES event record's receipt). */
export function shouldDrop(receipt) {
  return receipt?.spamVerdict?.status === 'FAIL' || receipt?.virusVerdict?.status === 'FAIL';
}

/** The message to send to the owner, as a Buffer. */
export function rewriteMessage(raw, forwarderAddress) {
  const parsed = parseMessage(raw);
  const { eol } = parsed;
  const fromHeader = header(parsed, 'from');
  const replyHeader = header(parsed, 'reply-to');
  const sender = fromHeader ? parseMailbox(fromHeader.value) : { name: '', address: null };
  const replyTo = replyHeader ? parseMailbox(replyHeader.value) : { name: '', address: null };

  const via = `${sender.name || sender.address || 'Unknown sender'} via Glazecalc`;
  const added = [`From: ${formatMailbox(via, forwarderAddress, eol)}`];
  const replyAddress = replyTo.address ?? sender.address;
  if (replyAddress) {
    added.push(`Reply-To: ${formatMailbox(replyTo.address ? replyTo.name : sender.name, replyAddress, eol)}`);
  }
  added.push(`${FORWARDED_HEADER}: 1`);

  const kept = parsed.headers
    .filter((h) => {
      const name = h.name.toLowerCase();
      return !DROP_HEADERS.has(name) && !DROP_PREFIXES.some((p) => name.startsWith(p));
    })
    .map((h) => h.raw);
  return Buffer.from(added.concat(kept).join(eol) + parsed.gap + parsed.body, 'latin1');
}
