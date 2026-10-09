import type { AvatarUrl, DisplayName, EmailAddress, OAuthProvider, ProviderSubject } from './identity-fields';

/** Who a provider says signed in, mapped to Pioneer's fields by that provider's adapter. */
export interface ProviderProfile {
  readonly provider: OAuthProvider;
  readonly subject: ProviderSubject;
  readonly displayName: DisplayName;
  readonly avatarUrl: AvatarUrl | undefined;
  readonly email: EmailAddress | undefined;
  /** Only a verified address may ever link accounts (story #91). */
  readonly emailVerified: boolean;
}
