// An account's saved settings, for the MCP tools that follow them.
import User, { PREFERENCES } from '../models/user.ts';

/** The account's saved settings, with each one's default where none is saved. */
export const settingsOf = async (userId: string) => {
  const user = await User.findById(userId, { preferences: 1 });
  const saved = (user?.preferences ?? {}) as Record<string, unknown>;
  return <K extends keyof typeof PREFERENCES>(name: K) =>
    (saved[name] ?? PREFERENCES[name][0]) as (typeof PREFERENCES)[K][number];
};
