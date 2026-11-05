// Compressed replies for the app's pages and the sitemap
// (docs/prerender-compression-and-material-pages-plan.md, Part A). Each page
// carries a fresh style nonce, so it is compressed for each reply: brotli at
// quality 5 (2 to 10 ms for a page, about half of what brotli 11 saves over
// gzip 1, which is far too slow per reply), gzip 5 for clients without brotli
// (6 saves under 1% more for 20 to 60% more time),
// and the plain bytes for the rare client that takes neither. nginx sees the
// Content-Encoding and does not compress the reply again.
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import type { Request, Response } from 'express';

export type Encoding = 'br' | 'gzip' | 'identity';

export const BROTLI_QUALITY = 5;
export const GZIP_LEVEL = 5;

// Below this a reply is sent as it is: compressing would save next to nothing.
const SMALL = 1024;

// The encoding to send for an Accept-Encoding header: brotli if the client
// takes it, else gzip, else none. The client's own order is not followed
// (curl and some browsers list gzip first); a q of 0 refuses one, and * stands
// for any not named.
export const chooseEncoding = (header: string | undefined): Encoding => {
  if (!header) return 'identity';
  const q = new Map<string, number>();
  for (const part of header.split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (!name) continue;
    let weight = 1;
    for (const param of params) {
      const m = /^\s*q\s*=\s*([0-9.]+)\s*$/.exec(param);
      if (m) weight = Number(m[1]);
    }
    q.set(name, Number.isFinite(weight) ? weight : 0);
  }
  const takes = (name: string): boolean => (q.get(name) ?? q.get('*') ?? 0) > 0;
  if (takes('br')) return 'br';
  if (takes('gzip') || takes('x-gzip')) return 'gzip';
  return 'identity';
};

export const compress = (body: Buffer, encoding: Encoding): Buffer => {
  if (encoding === 'br') {
    return zlib.brotliCompressSync(body, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY,
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length
      }
    });
  }
  if (encoding === 'gzip') return zlib.gzipSync(body, { level: GZIP_LEVEL });
  return body;
};

export interface Compressed {
  encoding: Encoding;
  body: Buffer;
}

// Sends a text reply compressed for the client, with Vary, Content-Encoding and
// Content-Length; the status, type and other headers are set by the caller.
// A HEAD gets the same headers and no body. With etag, the reply gets a strong
// ETag (the plain text's hash and the encoding) and a 304 when the client
// already has it; a page with a fresh nonce never would match, so it has none.
// `cached` lets a caller keep the compressed bytes of a text that never changes.
export const sendCompressed = (
  req: Request,
  res: Response,
  text: string | Buffer,
  options: { etag?: boolean; cached?: (encoding: Encoding, make: () => Buffer) => Buffer } = {}
): void => {
  const plain = typeof text === 'string' ? Buffer.from(text, 'utf8') : text;
  res.vary('Accept-Encoding');
  const encoding = plain.length < SMALL ? 'identity' : chooseEncoding(req.get('Accept-Encoding'));
  const make = (): Buffer => compress(plain, encoding);
  const body = options.cached ? options.cached(encoding, make) : make();
  if (encoding !== 'identity') res.set('Content-Encoding', encoding);
  if (options.etag) {
    const hash = crypto.createHash('sha256').update(plain).digest('base64url').slice(0, 27);
    res.set('ETag', `"${hash}${encoding === 'identity' ? '' : '-' + encoding}"`);
    if (req.fresh) {
      res.removeHeader('Content-Length');
      res.status(304).end();
      return;
    }
  }
  res.set('Content-Length', String(body.length));
  if (req.method === 'HEAD') res.end();
  else res.end(body);
};
