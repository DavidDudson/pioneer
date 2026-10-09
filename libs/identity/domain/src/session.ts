import { InstantCodec, Temporal } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { SessionId } from './identity-fields';
import type { UserId } from './identity-fields';

/** The cookie value: 256 random bits, base64url without padding. Never stored. */
export const SessionToken = z
  .string()
  .regex(/^[\w-]{43}$/u)
  .brand<'SessionToken'>();
export type SessionToken = z.infer<typeof SessionToken>;

/** SHA-256 of a `SessionToken`, lowercase hex. The only form a token is stored in. */
export const TokenHash = z
  .string()
  .regex(/^[\da-f]{64}$/u)
  .brand<'TokenHash'>();
export type TokenHash = z.infer<typeof TokenHash>;

const SESSION_DAYS = 30;
const HOURS_PER_DAY = 24;

/** How long a session lasts: 30 days, in hours because instants have no calendar. */
export const SESSION_LIFETIME: Temporal.Duration = Temporal.Duration.from({ hours: SESSION_DAYS * HOURS_PER_DAY });

/** Once less than this is left, using the session renews it for a full lifetime. */
export const SESSION_RENEWAL_WINDOW: Temporal.Duration = Temporal.Duration.from({
  hours: (SESSION_DAYS * HOURS_PER_DAY) / 2,
});

/** "Last seen" is kept to the hour, so a busy session writes at most once an hour. */
export const LAST_SEEN_RESOLUTION: Temporal.Duration = Temporal.Duration.from({ hours: 1 });

/** JSON shape of a session in the signed-in user's session list. The token never leaves the server. */
export const SessionSummary = z.object({
  id: SessionId,
  createdAt: InstantCodec,
  lastSeenAt: InstantCodec,
  /** True for the session that made the request. */
  current: z.boolean(),
});
export type SessionSummary = z.output<typeof SessionSummary>;

interface SessionProps {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly tokenHash: TokenHash;
  readonly createdAt: Temporal.Instant;
  readonly lastSeenAt: Temporal.Instant;
  readonly expiresAt: Temporal.Instant;
}

interface SessionStart {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly tokenHash: TokenHash;
  readonly now: Temporal.Instant;
}

/**
 * A signed-in browser. Server-side only: it has no wire form, the client holds just the token.
 * Sliding expiry: use in the last half of its life renews it for another full lifetime.
 */
export class Session {
  public readonly id: SessionId;
  public readonly userId: UserId;
  public readonly tokenHash: TokenHash;
  public readonly createdAt: Temporal.Instant;
  public readonly lastSeenAt: Temporal.Instant;
  public readonly expiresAt: Temporal.Instant;

  public constructor(props: SessionProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.createdAt = props.createdAt;
    this.lastSeenAt = props.lastSeenAt;
    this.expiresAt = props.expiresAt;
  }

  public static start({ id, userId, tokenHash, now }: SessionStart): Session {
    return new Session({
      id,
      userId,
      tokenHash,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now.add(SESSION_LIFETIME),
    });
  }

  public isExpiredAt(now: Temporal.Instant): boolean {
    return Temporal.Instant.compare(now, this.expiresAt) >= 0;
  }

  /** True in the last half of the session's life, when use renews it. */
  public isRenewableAt(now: Temporal.Instant): boolean {
    return Temporal.Instant.compare(now, this.expiresAt.subtract(SESSION_RENEWAL_WINDOW)) >= 0;
  }

  /**
   * The session after being used at `now`: renewed when in its renewal window, with `lastSeenAt`
   * moved to `now`. Returns `this` when neither changes enough to be worth a write.
   */
  public usedAt(now: Temporal.Instant): Session {
    const renew = this.isRenewableAt(now);
    const stale = Temporal.Instant.compare(now, this.lastSeenAt.add(LAST_SEEN_RESOLUTION)) >= 0;
    if (!renew && !stale) {
      return this;
    }
    return new Session({
      ...this.#props(),
      lastSeenAt: now,
      expiresAt: renew ? now.add(SESSION_LIFETIME) : this.expiresAt,
    });
  }

  public summary(current: SessionId | undefined): SessionSummary {
    return { id: this.id, createdAt: this.createdAt, lastSeenAt: this.lastSeenAt, current: this.id === current };
  }

  #props(): SessionProps {
    return {
      id: this.id,
      userId: this.userId,
      tokenHash: this.tokenHash,
      createdAt: this.createdAt,
      lastSeenAt: this.lastSeenAt,
      expiresAt: this.expiresAt,
    };
  }
}
