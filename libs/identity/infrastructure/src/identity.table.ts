import type {
  AvatarUrl,
  DisplayName,
  EmailAddress,
  OAuthAccountId,
  OAuthProvider,
  ProviderSubject,
  SessionId,
  TokenHash,
  UserId,
} from '@pioneer/identity/domain';
import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Drizzle schema for identity (ADR-0010). Migrations live in apps/api/migrations. Every lookup a
 * repository issues is served by an index here; the query-plan guard in the repository tests
 * enforces it.
 */
export const users = pgTable(
  'users',
  {
    id: uuid().$type<UserId>().primaryKey(),
    displayName: text().$type<DisplayName>().notNull(),
    avatarUrl: text().$type<AvatarUrl>(),
    email: text().$type<EmailAddress>(),
    emailVerified: boolean().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    // Account linking looks up verified addresses, oldest user first (ADR-0010).
    index('users_verified_email_idx')
      .on(table.email, table.createdAt, table.id)
      .where(sql`${table.emailVerified}`),
  ],
);

/** A provider identity linked to a user. One user may link several, by verified email (ADR-0010). */
export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid().$type<OAuthAccountId>().primaryKey(),
    userId: uuid()
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text().$type<OAuthProvider>().notNull(),
    subject: text().$type<ProviderSubject>().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    uniqueIndex('oauth_accounts_provider_subject_idx').on(table.provider, table.subject),
    index('oauth_accounts_user_id_idx').on(table.userId),
  ],
);

/** Signed-in browsers. Only the token's SHA-256 is stored, never the token. */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid().$type<SessionId>().primaryKey(),
    userId: uuid()
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text().$type<TokenHash>().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    lastSeenAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_idx').on(table.tokenHash),
    // A user's sessions, most recently seen first; also serves deleting them all.
    index('sessions_user_last_seen_idx').on(table.userId, table.lastSeenAt, table.id),
    // The expiry sweep deletes by expiry.
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);
