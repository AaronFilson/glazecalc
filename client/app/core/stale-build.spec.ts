import { NavigationError } from '@angular/router';
import { isMissingCode, reloadIfCodeIsMissing } from './stale-build';

describe('reloadIfCodeIsMissing', () => {
  const missing = (url: string) =>
    new NavigationError(
      1,
      url,
      new TypeError('Failed to fetch dynamically imported module: https://glazecalcapp.com/chunk-OLD.js')
    );
  const memoryStorage = () => {
    const items = new Map<string, string>();
    return { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => void items.set(k, v) };
  };

  it('loads the address afresh when a page’s code file is gone, once a minute at most', () => {
    const location = { assign: vi.fn() };
    const storage = memoryStorage();
    reloadIfCodeIsMissing(missing('/advice'), location, storage);
    expect(location.assign).toHaveBeenCalledWith('/advice');

    // Still failing after the reload: a real outage, so no loop.
    reloadIfCodeIsMissing(missing('/advice'), location, storage);
    expect(location.assign).toHaveBeenCalledTimes(1);
    // Another address is its own case.
    reloadIfCodeIsMissing(missing('/about'), location, storage);
    expect(location.assign).toHaveBeenLastCalledWith('/about');
  });

  it('leaves other navigation errors to the router', () => {
    const location = { assign: vi.fn() };
    reloadIfCodeIsMissing(new NavigationError(1, '/recipe', new Error('guard failed')), location, memoryStorage());
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('does not reload without storage for its loop guard', () => {
    const location = { assign: vi.fn() };
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined
    };
    reloadIfCodeIsMissing(missing('/advice'), location, broken);
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('recognizes how Chrome, Firefox and Safari report a missing module', () => {
    expect(isMissingCode(new TypeError('Failed to fetch dynamically imported module: x.js'))).toBe(true);
    expect(isMissingCode(new TypeError('error loading dynamically imported module: x.js'))).toBe(true);
    expect(isMissingCode(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isMissingCode(new Error('Cannot match any routes'))).toBe(false);
    expect(isMissingCode(undefined)).toBe(false);
  });
});
