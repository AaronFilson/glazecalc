import * as log from '../lib/log.ts';
import { expect } from './support/app.ts';

describe('the server log', () => {
  const saved = { level: process.env.LOG_LEVEL, env: process.env.NODE_ENV };
  let lines: { stream: 'out' | 'err'; text: string }[];
  let restore: () => void;

  // Catches what the log writes, and to which stream.
  beforeEach(() => {
    lines = [];
    const out = process.stdout.write;
    const err = process.stderr.write;
    process.stdout.write = ((text: string) => {
      lines.push({ stream: 'out', text });
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((text: string) => {
      lines.push({ stream: 'err', text });
      return true;
    }) as typeof process.stderr.write;
    restore = () => {
      process.stdout.write = out;
      process.stderr.write = err;
    };
    process.env.LOG_LEVEL = 'info';
  });
  afterEach(() => {
    restore();
    process.env.LOG_LEVEL = saved.level;
    if (saved.env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.env;
  });

  it('writes one JSON line per event in production, errors to stderr', () => {
    process.env.NODE_ENV = 'production';
    log.info('Server up', { port: 3000 });
    log.error('Database error', { err: Object.assign(new Error('timed out'), { code: 'ETIMEOUT' }) });
    restore();

    expect(lines.map((l) => l.stream)).to.eql(['out', 'err']);
    const [info, error] = lines.map((l) => JSON.parse(l.text) as { time: string; err: { stack: string } });
    expect(info).to.include({ level: 'info', msg: 'Server up', port: 3000 });
    expect(new Date(info.time).getTime()).to.be.closeTo(Date.now(), 5000);
    // Errors keep their message, code and stack instead of becoming {}.
    expect(error.err).to.include({ name: 'Error', message: 'timed out', code: 'ETIMEOUT' });
    expect(error.err.stack).to.include('timed out');
  });

  it('writes plain text elsewhere', () => {
    process.env.NODE_ENV = 'development';
    log.warn('APP_SECRET is not set');
    log.info('Removed expired trials', { count: 2 });
    restore();
    expect(lines).to.eql([
      { stream: 'err', text: 'WARN APP_SECRET is not set\n' },
      { stream: 'out', text: 'INFO Removed expired trials {"count":2}\n' }
    ]);
  });

  it('leaves out levels below LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'warn';
    log.debug('noise');
    log.info('more noise');
    log.warn('kept');
    process.env.LOG_LEVEL = 'silent';
    log.error('hidden too');
    restore();
    expect(lines.map((l) => l.text)).to.eql(['WARN kept\n']);
  });
});
