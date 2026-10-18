// The server's log: one line per event, JSON in production (for docker logs and
// any log service that reads them) and plain text otherwise. LOG_LEVEL (info)
// hides quieter levels: debug, info, warn, error or silent (the tests use it).
//
//   log.info('Server started', { port: 3000 });
//   log.error('Database error', { err });
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
type Level = keyof typeof LEVELS;
type Fields = Record<string, unknown>;

// Errors print as their message and stack rather than {}.
const plain = (value: unknown): unknown =>
  value instanceof Error
    ? { name: value.name, message: value.message, code: (value as { code?: unknown }).code, stack: value.stack }
    : value;

/**
 * Only an error's code (EAUTH, ECONNECTION, ...), for failures whose message
 * or stack could carry someone's details: an SMTP error repeats the address it
 * refused. 'unknown' when it has none.
 */
export const codeOf = (err: unknown): string => {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[A-Za-z0-9_.-]{1,40}$/.test(code) ? code : 'unknown';
};

/**
 * A request's address as the log may write it: the provider sign-in's
 * callback (/api/auth/<provider>/callback, server/routes/oauth_routes.ts)
 * without its query, which carries the provider's one-time code and the state;
 * any other address as it is. The nginx access log drops the same query
 * (deploy/nginx/glazecalc.conf).
 */
export const pathForLog = (url: string): string => {
  const query = url.indexOf('?');
  const path = query === -1 ? url : url.slice(0, query);
  return /^\/api\/auth\/[^/]+\/callback\/?$/i.test(path) ? path : url;
};

const threshold = (): number => LEVELS[process.env.LOG_LEVEL as Level] ?? LEVELS.info;

const write = (level: Exclude<Level, 'silent'>, msg: string, fields: Fields = {}): void => {
  if (LEVELS[level] < threshold()) return;
  const details = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, plain(value)]));
  const stream = LEVELS[level] >= LEVELS.warn ? process.stderr : process.stdout;
  if (process.env.NODE_ENV === 'production') {
    stream.write(JSON.stringify({ time: new Date().toISOString(), level, msg, ...details }) + '\n');
  } else {
    const extra = Object.keys(details).length ? ' ' + JSON.stringify(details) : '';
    stream.write(level.toUpperCase() + ' ' + msg + extra + '\n');
  }
};

export const debug = (msg: string, fields?: Fields): void => write('debug', msg, fields);
export const info = (msg: string, fields?: Fields): void => write('info', msg, fields);
export const warn = (msg: string, fields?: Fields): void => write('warn', msg, fields);
export const error = (msg: string, fields?: Fields): void => write('error', msg, fields);
