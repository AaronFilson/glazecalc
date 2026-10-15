import { HttpErrorResponse } from '@angular/common/http';
import { loadOnce, passkeyFailure } from './passkeys';

describe('passkeys', () => {
  it('keeps a loaded library, and tries again after a load that failed', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValue('library');
    const library = loadOnce(load);
    await expect(library()).rejects.toThrow('Failed to fetch');
    expect(await library()).toBe('library');
    expect(await library()).toBe('library');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('counts a prompt closed, timed out or with no passkey (NotAllowedError) as not used', () => {
    expect(passkeyFailure(Object.assign(new Error('x'), { name: 'NotAllowedError' }))).toBe('cancelled');
    expect(passkeyFailure(Object.assign(new Error('x'), { code: 'ERROR_CEREMONY_ABORTED' }))).toBe('cancelled');
    expect(passkeyFailure(Object.assign(new Error('x'), { name: 'InvalidStateError' }))).toBe('registered');
    expect(passkeyFailure(new Error('x'))).toBe('other');
    expect(passkeyFailure(new HttpErrorResponse({ status: 401 }))).toBeNull();
  });
});
