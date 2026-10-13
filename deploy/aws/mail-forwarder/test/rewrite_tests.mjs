import assert from 'node:assert/strict';
import { isLoop, parseMailbox, rewriteMessage, shouldDrop } from '../rewrite.mjs';

const FORWARDER = 'forwarder@glazecalcapp.com';
const message = (headers, body = 'Hello,\r\n\r\nA question.\r\n') => headers.join('\r\n') + '\r\n\r\n' + body;
const rewrite = (raw) => rewriteMessage(Buffer.from(raw, 'latin1'), FORWARDER).toString('latin1');
const headerLines = (text) => text.split('\r\n\r\n')[0].split('\r\n');

describe('mail forwarder: rewriting', function () {
  const original = message([
    'Return-Path: <bounce@mail.example.org>',
    'Received: from mail.example.org by inbound-smtp.us-west-2.amazonaws.com',
    'DKIM-Signature: v=1; a=rsa-sha256; d=example.org; s=s1;',
    '\th=from:to:subject; b=abc',
    ' def',
    'Authentication-Results: amazonses.com; spf=pass',
    'Sender: list@example.org',
    'From: Ada Potter <ada@example.org>',
    'To: privacy@glazecalcapp.com',
    'Subject: Delete my data',
    'Message-ID: <1@example.org>',
    'Content-Type: text/plain; charset=utf-8'
  ]);

  it('sends as the forwarder with the sender named "via Glazecalc"', () => {
    const lines = headerLines(rewrite(original));
    assert.equal(lines[0], 'From: "Ada Potter via Glazecalc" <forwarder@glazecalcapp.com>');
  });

  it('replies to the original sender', () => {
    assert.ok(headerLines(rewrite(original)).includes('Reply-To: "Ada Potter" <ada@example.org>'));
  });

  it('removes Return-Path, Sender, DKIM-Signature (and its folded lines) and the like', () => {
    const out = rewrite(original);
    for (const name of ['Return-Path', 'Sender', 'DKIM-Signature', 'Authentication-Results', 'Message-ID']) {
      assert.ok(!new RegExp(`^${name}:`, 'im').test(out), name);
    }
    assert.ok(!out.includes('b=abc'));
    assert.ok(!out.includes('def\r\n'));
    assert.ok(!out.includes('bounce@mail.example.org'));
  });

  it('keeps the other headers and the body unchanged', () => {
    const out = rewrite(original);
    for (const line of [
      'To: privacy@glazecalcapp.com',
      'Subject: Delete my data',
      'Content-Type: text/plain; charset=utf-8'
    ]) {
      assert.ok(headerLines(out).includes(line), line);
    }
    assert.ok(out.endsWith('\r\n\r\nHello,\r\n\r\nA question.\r\n'));
  });

  it('passes 8-bit and multipart bodies on byte for byte', () => {
    const body = '--b\r\nContent-Type: text/plain\r\n\r\ncafé ÿ\r\n--b--\r\n';
    const raw = message(['From: a@example.org', 'Content-Type: multipart/mixed; boundary=b'], body);
    assert.ok(rewrite(raw).endsWith('\r\n\r\n' + body));
  });

  it('marks the message as forwarded', () => {
    assert.ok(headerLines(rewrite(original)).includes('X-Glazecalc-Forwarded: 1'));
  });

  it('uses the address when the sender has no display name', () => {
    const lines = headerLines(rewrite(message(['From: <ada@example.org>', 'Subject: x'])));
    assert.equal(lines[0], 'From: "ada@example.org via Glazecalc" <forwarder@glazecalcapp.com>');
    assert.ok(lines.includes('Reply-To: ada@example.org'));
  });

  it('reads a bare address and a quoted name with an escaped quote', () => {
    assert.deepEqual(parseMailbox('ada@example.org'), { name: '', address: 'ada@example.org' });
    assert.deepEqual(parseMailbox('"Ada \\"Ceramics\\" Potter, Esq." <ada@example.org>, other@example.org'), {
      name: 'Ada "Ceramics" Potter, Esq.',
      address: 'ada@example.org'
    });
  });

  it('escapes quotes in the name', () => {
    const lines = headerLines(rewrite(message(['From: "Ada \\"A\\" Potter" <ada@example.org>'])));
    assert.equal(lines[0], 'From: "Ada \\"A\\" Potter via Glazecalc" <forwarder@glazecalcapp.com>');
  });

  it('decodes an encoded name and encodes a non-ASCII one again', () => {
    const name = Buffer.from('Zoë Müller', 'utf8').toString('base64');
    const lines = headerLines(rewrite(message([`From: =?UTF-8?B?${name}?= <zoe@example.org>`])));
    const from = lines.join('\n').match(/^From: ([^]*?)(?=\nReply-To:)/m)[1];
    const words = [...from.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map((m) => Buffer.from(m[1], 'base64').toString());
    assert.equal(words.join(''), 'Zoë Müller via Glazecalc');
    assert.ok(from.endsWith('<forwarder@glazecalcapp.com>'));
    assert.match(from, /^[\x20-\x7e\r\n]+$/);
  });

  it('decodes Q-encoded names and raw UTF-8 names', () => {
    assert.equal(parseMailbox('=?iso-8859-1?Q?Andr=E9_Potter?= <a@example.org>').name, 'André Potter');
    const raw = Buffer.from('André <a@example.org>', 'utf8').toString('latin1');
    assert.equal(parseMailbox(raw).name, 'André');
  });

  it('cannot be made to add headers through the name', () => {
    const name = Buffer.from('Eve\r\nBcc: x@example.org', 'utf8').toString('base64');
    const out = rewrite(message([`From: =?UTF-8?B?${name}?= <eve@example.org>`]));
    assert.ok(!/^Bcc:/im.test(out));
  });

  it('prefers the sender’s own Reply-To address', () => {
    const lines = headerLines(
      rewrite(message(['From: Shop <noreply@example.org>', 'Reply-To: Help Desk <help@example.org>']))
    );
    assert.ok(lines.includes('Reply-To: "Help Desk" <help@example.org>'));
  });

  it('copes with a message without a From, and with LF line endings', () => {
    const out = rewriteMessage(Buffer.from('Subject: hi\n\nBody\n'), FORWARDER).toString();
    assert.ok(out.startsWith('From: "Unknown sender via Glazecalc" <forwarder@glazecalcapp.com>\n'));
    assert.ok(!out.includes('Reply-To'));
    assert.ok(out.endsWith('\n\nBody\n'));
  });
});

describe('mail forwarder: what is not forwarded', function () {
  it('drops spam and virus FAIL verdicts only', () => {
    assert.equal(shouldDrop({ spamVerdict: { status: 'FAIL' }, virusVerdict: { status: 'PASS' } }), true);
    assert.equal(shouldDrop({ spamVerdict: { status: 'PASS' }, virusVerdict: { status: 'FAIL' } }), true);
    assert.equal(shouldDrop({ spamVerdict: { status: 'PASS' }, virusVerdict: { status: 'PASS' } }), false);
    assert.equal(shouldDrop({ spamVerdict: { status: 'GRAY' }, virusVerdict: { status: 'DISABLED' } }), false);
    assert.equal(shouldDrop({}), false);
  });

  it('recognises mail from the forwarder itself or already forwarded', () => {
    assert.equal(isLoop(message(['From: Bot <Forwarder@glazecalcapp.com>']), FORWARDER), true);
    assert.equal(isLoop(message(['From: a@example.org', 'X-Glazecalc-Forwarded: 1']), FORWARDER), true);
    assert.equal(isLoop(message(['From: a@example.org']), FORWARDER), false);
  });
});
