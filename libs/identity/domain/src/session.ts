import { Temporal } from '@pioneer/shared/kernel';
import { z } from 'zod';

import type { SessionId, UserId } from './identity-fields';

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

/** How long a session lasts: 30 days, in hours because instants have no calendar. Sliding renewal arrives with story #92. */
export const SESSION_LIFETIME: Temporal.Duration = Temporal.Duration.from({ hours: SESSION_DAYS * HOURS_PER_DAY });

interface SessionProps {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly tokenHash: TokenHash;
  readonly createdAt: Temporal.Instant;
  readonly expiresAt: Temporal.Instant;
}

/** A signed-in browser. Server-side only: it has no wire form, the client holds just the token. */
export class Session {
  public readonly id: SessionId;
  public readonly userId: UserId;
  public readonly tokenHash: TokenHash;
  public readonly createdAt: Temporal.Instant;
  public readonly expiresAt: Temporal.Instant;

  public constructor(props: SessionProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
  }

  public static start(input: {
    readonly id: SessionId;
    readonly userId: UserId;
    readonly tokenHash: TokenHash;
    readonly now: Temporal.Instant;
  }): Session {
    return new Session({ ...input, createdAt: input.now, expiresAt: input.now.add(SESSION_LIFETIME) });
  }

  public isExpiredAt(now: Temporal.Instant): boolean {
    return Temporal.Instant.compare(now, this.expiresAt) >= 0;
  }
}
