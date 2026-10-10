import { DisplayName, UserId } from '@pioneer/identity/domain';

/** A seeded local account. */
export interface DevUser {
  readonly id: UserId;
  readonly displayName: DisplayName;
}

/**
 * The accounts the local dev database is seeded with, signed in to with one click. Ids are fixed so a reseed
 * finds them again. Only dev builds import this; the bundle guard fails a production build that contains them.
 */
export const DevUser = {
  Gm: { id: UserId.parse('00000000-0000-4000-8000-00000000de01'), displayName: DisplayName.parse('Dev GM') },
  PlayerOne: {
    id: UserId.parse('00000000-0000-4000-8000-00000000de02'),
    displayName: DisplayName.parse('Dev Player One'),
  },
  PlayerTwo: {
    id: UserId.parse('00000000-0000-4000-8000-00000000de03'),
    displayName: DisplayName.parse('Dev Player Two'),
  },
} as const satisfies Record<string, DevUser>;

/** Every dev user, GM first: the order the sign-in page lists them. */
export const DEV_USERS: readonly DevUser[] = [DevUser.Gm, DevUser.PlayerOne, DevUser.PlayerTwo];

/**
 * Browser navigation that signs in as a dev user and redirects to `returnTo`, like a provider callback.
 * Relative to the API base (`/api`). Only the dev API entrypoint mounts it.
 */
export const DevSignInPath = {
  route: '/auth/dev/:userId',
  of: (id: UserId): `/auth/dev/${UserId}` => `/auth/dev/${id}`,
} as const;
