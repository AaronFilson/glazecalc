import { STANDARD_ADVICE } from './standard-advice';

// The advice page draws the standard advice from the file the database is seeded from, so the two cannot drift.

describe('standard advice', () => {
  it("is data/advice.ndjson's, in its order, with plain ids", () => {
    expect(STANDARD_ADVICE).toHaveLength(8);
    expect(STANDARD_ADVICE[0]).toEqual({
      _id: '5945b9bf45e9ddee6ff0e486',
      ownedBy: 'Standard',
      title: 'Have a system',
      content: expect.stringMatching(/^Have a system to your process\./),
      tags: ['system, methods, records']
    });
    for (const advice of STANDARD_ADVICE) {
      expect(advice.ownedBy).toBe('Standard');
      expect(advice._id).toMatch(/^[0-9a-f]{24}$/);
    }
  });
});
