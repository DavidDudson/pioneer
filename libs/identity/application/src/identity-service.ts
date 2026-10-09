import { Session, SessionId, User, UserId } from '@pioneer/identity/domain';
import type { ProviderProfile, SessionSummary, SessionToken } from '@pioneer/identity/domain';
import { newId, NotFoundError, UnauthorizedError } from '@pioneer/shared/kernel';
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

/** A request's valid session and its user. `renewed` means the cookie needs a fresh expiry. */
export interface Authenticated {
  readonly user: User;
  readonly session: Session;
  readonly renewed: boolean;
}

/** A revoked session; `current` when it was the caller's own, whose cookie should go too. */
export interface Revoked {
  readonly current: boolean;
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

  /**
   * The session behind a token and its user, or `undefined` for none, unknown or expired. Using a
   * session records it: `lastSeenAt` to the hour, and a renewal once in the last half of its life.
   */
  public async authenticate(presented: SessionToken | undefined): Promise<Authenticated | undefined> {
    if (presented === undefined) {
      return undefined;
    }
    const now = this.#clock.now();
    const tokenHash = await hashSessionToken(presented);
    const active = await this.#sessions.findActive(tokenHash, now);
    if (active === undefined) {
      return undefined;
    }
    const used = active.session.usedAt(now);
    if (used !== active.session) {
      await this.#sessions.touch(used);
    }
    const renewed = !used.expiresAt.equals(active.session.expiresAt);
    return { user: active.user, session: used, renewed };
  }

  /** Like `authenticate`, but no session is a 401. */
  public async requireSession(presented: SessionToken | undefined): Promise<Authenticated> {
    const authenticated = await this.authenticate(presented);
    if (authenticated === undefined) {
      throw new UnauthorizedError();
    }
    return authenticated;
  }

  public async signOut(presented: SessionToken | undefined): Promise<void> {
    if (presented === undefined) {
      return;
    }
    const tokenHash = await hashSessionToken(presented);
    await this.#sessions.delete(tokenHash);
  }

  /** The signed-in user's unexpired sessions, most recently seen first, the caller's marked current. */
  public async listSessions({ user, session }: Authenticated): Promise<SessionSummary[]> {
    const sessions = await this.#sessions.listForUser(user.id, this.#clock.now());
    return sessions.map((each) => each.summary(session.id));
  }

  /**
   * Ends one of the signed-in user's sessions. Someone else's session, or one that is already
   * gone, is a 404 so ids reveal nothing. Revoking the caller's own session is signing out.
   */
  public async revokeSession({ user, session }: Authenticated, id: SessionId): Promise<Revoked> {
    const deleted = await this.#sessions.deleteForUser(user.id, id);
    if (!deleted) {
      throw new NotFoundError('Session', id);
    }
    return { current: id === session.id };
  }

  /** Ends every session the signed-in user has, this one included. */
  public async signOutEverywhere({ user }: Authenticated): Promise<void> {
    await this.#sessions.deleteAllForUser(user.id);
  }

  /** Deletes expired sessions; they already fail to authenticate, this just reclaims the rows. */
  public async sweepExpired(): Promise<number> {
    return this.#sessions.deleteExpired(this.#clock.now());
  }

  /**
   * Known provider account: that user. Otherwise a verified email matching a user's verified
   * email links to that user (ADR-0010). Otherwise a new user.
   */
  async #upsertUser(profile: ProviderProfile, now: Temporal.Instant): Promise<User> {
    const existing = await this.#users.findByProviderAccount(profile.provider, profile.subject);
    if (existing !== undefined) {
      return this.#users.update(existing.withProfile(profile, now));
    }
    const linked = await this.#linkByVerifiedEmail(profile, now);
    if (linked !== undefined) {
      return linked;
    }
    const created = User.fromProfile(UserId.parse(newId()), profile, now);
    return this.#users.insertWithAccount(created, profile.provider, profile.subject);
  }

  async #linkByVerifiedEmail(profile: ProviderProfile, now: Temporal.Instant): Promise<User | undefined> {
    if (!profile.emailVerified || profile.email === undefined) {
      return undefined;
    }
    const match = await this.#users.findByVerifiedEmail(profile.email);
    if (match === undefined) {
      return undefined;
    }
    await this.#users.linkAccount(match.id, profile, now);
    return this.#users.update(match.withProfile(profile, now));
  }
}
