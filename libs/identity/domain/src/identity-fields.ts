import { Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

export const UserId = Uuid.brand<'UserId'>();
export type UserId = z.infer<typeof UserId>;

export const OAuthAccountId = Uuid.brand<'OAuthAccountId'>();
export type OAuthAccountId = z.infer<typeof OAuthAccountId>;

export const SessionId = Uuid.brand<'SessionId'>();
export type SessionId = z.infer<typeof SessionId>;

export const DISPLAY_NAME_MAX_LENGTH = 80;
/** A provider's user id (OIDC `sub`): opaque, unique per provider. GitHub and Discord send numbers, Google digit strings. */
const SUBJECT_MAX_LENGTH = 255;

export const DisplayName = z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH).brand<'DisplayName'>();
export type DisplayName = z.infer<typeof DisplayName>;

/** Stored lowercased, so the same address from two providers compares equal. */
export const EmailAddress = z.string().trim().toLowerCase().pipe(z.email()).brand<'EmailAddress'>();
export type EmailAddress = z.infer<typeof EmailAddress>;

export const AvatarUrl = z.url({ protocol: /^https$/u }).brand<'AvatarUrl'>();
export type AvatarUrl = z.infer<typeof AvatarUrl>;

/** OAuth providers Pioneer signs in with (ADR-0007). No passwords, no email accounts. */
export const OAuthProvider = {
  GitHub: 'github',
} as const;
export type OAuthProvider = ValueOf<typeof OAuthProvider>;
export const OAuthProviderSchema = z.enum(OAuthProvider);

export const ProviderSubject = z.string().min(1).max(SUBJECT_MAX_LENGTH).brand<'ProviderSubject'>();
export type ProviderSubject = z.infer<typeof ProviderSubject>;
