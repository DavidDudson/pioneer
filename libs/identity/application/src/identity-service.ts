import { Session, SessionId, User, UserId } from '@pioneer/identity/domain';
import type { ProviderProfile, SessionToken } from '@pioneer/identity/domain';
import { newId, UnauthorizedError } from '@pioneer/shared/kernel';
import type { Clock, Temporal } from '@pioneer/shared/kernel';

import type { SessionRepository } from './session-repository';
import { hashSessionToken, newSessionToken } from './session-tokens';
import type { UserRepository } from './user-repository';

/** A completed sign-in: the account and the token for its new session cookie. */
export interface SignedIn {
  readonly user: User;
  readonly token: SessionToken;
  readonly session: Session;
}

/**
 * Sign-in, session lookup and sign-out. Framework-free: the HTTP adapter calls these with the
 * token the browser presented, if any (`presented`).
 */
export class IdentityService {
  readonly #users: UserRepository;
  readonly #sessions: SessionRepository;
  readonly #clock: Clock;

  public constructor(users: UserRepository, sessions: SessionRepository, clock: Clock) {
    this.#users = users;
    this.#sessions = sessions;
    this.#clock = clock;
  }

  /**
   * A provider vouched for `profile`: find or create its account, refresh the profile fields,
   * and start a session.
   */
  public async signIn(profile: ProviderProfile): Promise<SignedIn> {
    const now = this.#clock.now();
    const user = await this.#upsertUser(profile, now);
    const token = newSessionToken();
    const tokenHash = await hashSessionToken(token);
    const session = Session.start({ id: SessionId.parse(newId()), userId: user.id, tokenHash, now });
    await this.#sessions.insert(session);
    return { user, token, session };
  }

  /** The user behind a session token, or `undefined` for none, unknown or expired. */
  public async authenticate(presented: SessionToken | undefined): Promise<User | undefined> {
    if (presented === undefined) {
      return undefined;
    }
    const tokenHash = await hashSessionToken(presented);
    return this.#sessions.findUser(tokenHash, this.#clock.now());
  }

  /** Like `authenticate`, but a missing user is a 401. */
  public async requireUser(presented: SessionToken | undefined): Promise<User> {
    const user = await this.authenticate(presented);
    if (user === undefined) {
      throw new UnauthorizedError();
    }
    return user;
  }

  public async signOut(presented: SessionToken | undefined): Promise<void> {
    if (presented === undefined) {
      return;
    }
    const tokenHash = await hashSessionToken(presented);
    await this.#sessions.delete(tokenHash);
  }

  async #upsertUser(profile: ProviderProfile, now: Temporal.Instant): Promise<User> {
    const existing = await this.#users.findByProviderAccount(profile.provider, profile.subject);
    if (existing !== undefined) {
      return this.#users.update(existing.withProfile(profile, now));
    }
    const created = User.fromProfile(UserId.parse(newId()), profile, now);
    return this.#users.insertWithAccount(created, profile.provider, profile.subject);
  }
}
