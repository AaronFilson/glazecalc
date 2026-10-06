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
});
