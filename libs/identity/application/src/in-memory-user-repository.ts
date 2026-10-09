import type { EmailAddress, OAuthProvider, ProviderSubject, User, UserId } from '@pioneer/identity/domain';
import { Temporal } from '@pioneer/shared/kernel';

import { UserRepository } from './user-repository';
import type { ProviderAccount } from './user-repository';

function accountKey(provider: OAuthProvider, subject: ProviderSubject): string {
  return `${provider}:${subject}`;
}

/** Repository adapter for tests and local experiments. */
export class InMemoryUserRepository extends UserRepository {
  readonly #users = new Map<UserId, User>();
  readonly #accounts = new Map<string, UserId>();

  public override async findByProviderAccount(
    provider: OAuthProvider,
    subject: ProviderSubject,
  ): Promise<User | undefined> {
    const id = this.#accounts.get(accountKey(provider, subject));
    return id === undefined ? undefined : this.#users.get(id);
  }

  public override async findByVerifiedEmail(email: EmailAddress): Promise<User | undefined> {
    const matches = [...this.#users.values()].filter((user) => user.emailVerified && user.email === email);
    const [oldest] = matches.toSorted(
      (left, right) => Temporal.Instant.compare(left.createdAt, right.createdAt) || left.id.localeCompare(right.id),
    );
    return oldest;
  }

  public override async insertWithAccount(
    user: User,
    provider: OAuthProvider,
    subject: ProviderSubject,
  ): Promise<User> {
    this.#users.set(user.id, user);
    this.#accounts.set(accountKey(provider, subject), user.id);
    return user;
  }

  public override async linkAccount(userId: UserId, { provider, subject }: ProviderAccount): Promise<void> {
    this.#accounts.set(accountKey(provider, subject), userId);
  }

  public override async update(user: User): Promise<User> {
    this.#users.set(user.id, user);
    return user;
  }

  /** Test lookup by id. */
  public get(id: UserId): User | undefined {
    return this.#users.get(id);
  }

  /** How many accounts exist, for tests that assert no duplicate was created. */
  public get size(): number {
    return this.#users.size;
  }
}
