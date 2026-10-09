import type { EmailAddress, OAuthProvider, ProviderSubject, User, UserId } from '@pioneer/identity/domain';
import type { Temporal } from '@pioneer/shared/kernel';

/** One identity at one provider. */
export interface ProviderAccount {
  readonly provider: OAuthProvider;
  readonly subject: ProviderSubject;
}

/**
 * Port for accounts and the provider identities linked to them. Adapters live in
 * `identity-infrastructure`; `InMemoryUserRepository` is for tests.
 */
export abstract class UserRepository {
  /** The user a provider account is linked to, if it has signed in before. */
  public abstract findByProviderAccount(provider: OAuthProvider, subject: ProviderSubject): Promise<User | undefined>;

  /** The oldest user whose email is this one and verified, if any. */
  public abstract findByVerifiedEmail(email: EmailAddress): Promise<User | undefined>;

  /** Insert a new user together with the provider account that created it. */
  public abstract insertWithAccount(user: User, provider: OAuthProvider, subject: ProviderSubject): Promise<User>;

  /** Link another provider account to an existing user. */
  public abstract linkAccount(userId: UserId, account: ProviderAccount, now: Temporal.Instant): Promise<void>;

  public abstract update(user: User): Promise<User>;
}
