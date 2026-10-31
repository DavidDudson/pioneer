import type {
  AppVersion,
  AvatarUrl,
  BugReportId,
  BugReportStatus,
  CharacterSnapshot,
  DisplayName,
  EmailAddress,
  OAuthAccountId,
  OAuthProvider,
  ProviderSubject,
  ReportedRoute,
  ReportText,
  SessionId,
  TokenHash,
  UserAgent,
  UserId,
  UserRole,
} from '@pioneer/identity/domain';
import type { BodyFont, DistanceUnit, Locale, MonoFont, Uuid } from '@pioneer/shared/kernel';
import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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
    role: text().$type<UserRole>().notNull().default('member'),
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

/**
 * Each user's display preferences, one row once they first choose one. `null` is not chosen. Only
 * ever read by primary key, which is the user's id (named `id` so the audit trail keys on it). No
 * `version`: unlike characters, a PATCH sets whole fields and the last write of each field wins. Two
 * devices changing different fields both keep their change; racing on one field keeps the latest choice.
 */
export const userPreferences = pgTable('user_preferences', {
  id: uuid()
    .$type<UserId>()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  uiLocale: text().$type<Locale>(),
  contentLocale: text().$type<Locale>(),
  distanceUnit: text().$type<DistanceUnit>(),
  bodyFont: text().$type<BodyFont>(),
  monoFont: text().$type<MonoFont>(),
  updatedAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
});

/**
 * Bug reports. `characterId` is a plain reference with no foreign key: a report outlives the character
 * it names. `snapshot` is the frozen copy of that character's stored inputs (ADR-0004) the reporter chose to
 * share; it is written once with the report and never joined back to the character. The one lookup beyond the primary key is a
 * reporter's recent reports, for the rate limit.
 */
export const bugReports = pgTable(
  'bug_reports',
  {
    id: uuid().$type<BugReportId>().primaryKey(),
    reporter: uuid()
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    route: text().$type<ReportedRoute>().notNull(),
    appVersion: text().$type<AppVersion>().notNull(),
    locale: text().$type<Locale>().notNull(),
    userAgent: text().$type<UserAgent>().notNull(),
    description: text().$type<ReportText>().notNull(),
    steps: text().$type<ReportText>().notNull(),
    characterId: uuid().$type<Uuid>(),
    snapshot: jsonb().$type<CharacterSnapshot>(),
    status: text().$type<BugReportStatus>().notNull(),
  },
  (table) => [
    index('bug_reports_reporter_created_idx').on(table.reporter, table.createdAt),
    // The maintainers' list: newest first.
    index('bug_reports_created_idx').on(table.createdAt),
  ],
);
