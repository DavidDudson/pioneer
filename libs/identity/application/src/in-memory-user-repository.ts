import type { OAuthProvider, ProviderSubject, User, UserId } from '@pioneer/identity/domain';

import { UserRepository } from './user-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryUserRepository extends UserRepository {
  readonly #users = new Map<UserId, User>();
  readonly #accounts = new Map<string, UserId>();

  public override async findByProviderAccount(
    provider: OAuthProvider,
    subject: ProviderSubject,
  ): Promise<User | undefined> {
    const id = this.#accounts.get(`${provider}:${subject}`);
    return id === undefined ? undefined : this.#users.get(id);
  }

  public override async insertWithAccount(
    user: User,
    provider: OAuthProvider,
    subject: ProviderSubject,
  ): Promise<User> {
    this.#users.set(user.id, user);
    this.#accounts.set(`${provider}:${subject}`, user.id);
    return user;
  }

  public override async update(user: User): Promise<User> {
    this.#users.set(user.id, user);
    return user;
  }

  /** Test lookup by id. */
  public get(id: UserId): User | undefined {
    return this.#users.get(id);
  }
}
