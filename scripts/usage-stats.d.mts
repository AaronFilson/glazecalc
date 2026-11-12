import type { Db } from 'mongodb';

/** Usage at a glance: counts only. */
export interface Usage {
  at: string;
  accounts: number;
  accountsNewThisMonth: number;
  trialsNow: number;
  countries: number;
  languages: number;
  recipes: number;
  recipesNewThisMonth: number;
  ownMaterials: number;
  ownAdditives: number;
  firingLogs: number;
  notes: number;
  shareLinks: number;
  accessTokensActive: number;
  oauthGrants: number;
  connectedApps: number;
  appChangesThisMonth: number;
}
/** The totals, from a connected database. */
export function usage(db: Db, now?: Date): Promise<Usage>;
/** The totals as a few lines a person can read or paste. */
export function summary(u: Usage): string;
