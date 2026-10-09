import type { OAuthProvider, ProviderSubject, User } from '@pioneer/identity/domain';

/**
 * Port for accounts and the provider identities linked to them. Adapters live in
 * `identity-infrastructure`; `InMemoryUserRepository` is for tests.
 */
export abstract class UserRepository {
  /** The user a provider account is linked to, if it has signed in before. */
  public abstract findByProviderAccount(provider: OAuthProvider, subject: ProviderSubject): Promise<User | undefined>;

  /** Insert a new user together with the provider account that created it. */
  public abstract insertWithAccount(user: User, provider: OAuthProvider, subject: ProviderSubject): Promise<User>;

  public abstract update(user: User): Promise<User>;
}
