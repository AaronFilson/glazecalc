// What an access token (a personal token or an OAuth client's) may do
// (docs/integrations-plan.md, item 5; decision 3). People choose between two
// scopes, for the consent screen and the token page; underneath, each route
// asks for a permission on one area, so the scopes can be split later
// without breaking a token already made.
//
// A route that asks for no permission takes no token at all (default deny):
// the account's details, deleting it, the password, signing out, two-step
// sign-in, emptying the Trash and the tokens themselves stay behind the web
// session (server/lib/jwt_auth.ts).

/** The scopes a token can hold. */
export const SCOPES = ['data:read', 'data:write'] as const;
export type Scope = (typeof SCOPES)[number];

/** The parts of an account a permission is about. */
export const AREAS = [
  'recipes',
  'materials',
  'additives',
  'notes',
  'firing',
  'advice',
  'trash',
  'shelf',
  'preferences'
] as const;
export type Area = (typeof AREAS)[number];
export type Permission = `${Area}:${'read' | 'write'}`;

/** Every area can be read. */
const READ: readonly Permission[] = AREAS.map((area): Permission => `${area}:read`);
/**
 * What can be changed. trash:write is putting a record back; deleting from
 * the Trash for good is never a token's. A token never changes preferences.
 */
const WRITE: readonly Permission[] = [
  'recipes:write',
  'materials:write',
  'additives:write',
  'notes:write',
  'firing:write',
  'advice:write',
  'trash:write',
  'shelf:write'
];

/** What each scope allows. Writing includes reading: no one edits what they cannot see. */
export const SCOPE_PERMISSIONS: Readonly<Record<Scope, readonly Permission[]>> = {
  'data:read': READ,
  'data:write': [...READ, ...WRITE]
};

export const isScope = (value: unknown): value is Scope => SCOPES.includes(value as Scope);

/** Whether a token with these scopes may do this. Unknown scopes allow nothing. */
export const allows = (scopes: readonly string[], permission: Permission): boolean =>
  scopes.some((scope) => isScope(scope) && SCOPE_PERMISSIONS[scope].includes(permission));

/** The least scope that allows this, for an RFC 6750 insufficient_scope answer. */
export const scopeFor = (permission: Permission): Scope =>
  SCOPES.find((scope) => SCOPE_PERMISSIONS[scope].includes(permission)) ?? 'data:write';
