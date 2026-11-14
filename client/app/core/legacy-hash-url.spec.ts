import { redirectLegacyHashUrl } from './legacy-hash-url';

describe('redirectLegacyHashUrl', () => {
  const run = (pathname: string, hash: string) => {
    const replaceState = vi.fn();
    redirectLegacyHashUrl({ pathname, hash } as Location, { state: { a: 1 }, replaceState } as unknown as History);
    return replaceState;
  };

  it('turns an old /#/ link into the same path', () => {
    expect(run('/', '#/recipe')).toHaveBeenCalledWith({ a: 1 }, '', '/recipe');
    expect(run('/', '#/reset?token=abc')).toHaveBeenCalledWith({ a: 1 }, '', '/reset?token=abc');
  });

  it('leaves current URLs alone, including ones with a fragment', () => {
    expect(run('/', '')).not.toHaveBeenCalled();
    expect(run('/reset', '#token=abc')).not.toHaveBeenCalled();
    expect(run('/advice', '#/recipe')).not.toHaveBeenCalled();
  });

  it('never goes to an address that names another site', () => {
    expect(run('/', '#//evil.example')).not.toHaveBeenCalled();
    expect(run('/', '#//evil.example/recipe?x=1')).not.toHaveBeenCalled();
    expect(run('/', '#/\\evil.example')).not.toHaveBeenCalled();
  });

  it('lets the app start when the browser refuses the address', () => {
    const replaceState = vi.fn(() => {
      throw new DOMException('A history state object with URL cannot be created', 'SecurityError');
    });
    const history = { state: null, replaceState } as unknown as History;
    expect(() => redirectLegacyHashUrl({ pathname: '/', hash: '#/recipe' } as Location, history)).not.toThrow();
    expect(replaceState).toHaveBeenCalledOnce();
  });

  it("leaves the page's own history as it is at a crafted /#// link, without an error", () => {
    const start = window.location.href;
    const history = window.history;
    const location = { pathname: '/', hash: '#//evil.example' } as Location;
    expect(() => redirectLegacyHashUrl(location, history)).not.toThrow();
    expect(window.location.href).toBe(start);
  });
});
