import { HomebrewPack } from '@pioneer/homebrew/domain';
import type { CreateHomebrewPackBody } from '@pioneer/homebrew/domain';
import { contentPackId } from '@pioneer/rules/sdk';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ConflictError, message, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { AuthorDirectory } from './author-directory';
import { HomebrewMessage } from './homebrew-message';
import type { HomebrewPackRepository } from './homebrew-pack-repository';
import { mayViewPack } from './homebrew-policy';

/** The ports `HomebrewPackService` works through. */
export interface HomebrewPackPorts {
  readonly packs: HomebrewPackRepository;
  readonly authors: AuthorDirectory;
}

/**
 * Homebrew pack use cases. Framework-free: the HTTP adapter calls these with the signed-in user as `actor`.
 * Every use case applies the access policy here, never in routes.
 */
export class HomebrewPackService {
  readonly #packs: HomebrewPackRepository;
  readonly #authors: AuthorDirectory;
  readonly #clock: Clock;

  public constructor({ packs, authors }: HomebrewPackPorts, clock: Clock) {
    this.#packs = packs;
    this.#authors = authors;
    this.#clock = clock;
  }

  /** Every pack the actor owns, newest first. */
  public async list(actor: UserId): Promise<readonly HomebrewPack[]> {
    return this.#packs.listOwnedBy(actor);
  }

  /** One of the actor's packs. Another user's is a 404, the same as a missing one. */
  public async get(actor: UserId, id: ContentPackId): Promise<HomebrewPack> {
    const pack = await this.#packs.findById(id);
    if (pack === undefined || !mayViewPack(actor, pack)) {
      throw new NotFoundError('HomebrewPack', id);
    }
    return pack;
  }

  /**
   * A new, empty, private pack owned by the actor and credited to their display name. A slug any pack already
   * uses is a conflict, so a homebrew pack can never take an official pack's key.
   */
  public async create(actor: UserId, input: CreateHomebrewPackBody): Promise<HomebrewPack> {
    const publisher = await this.#authors.displayName(actor);
    if (publisher === undefined) {
      throw new NotFoundError('User', actor);
    }
    const pack = HomebrewPack.create({
      id: contentPackId(input.slug),
      slug: input.slug,
      title: input.title,
      publisher,
      ownerId: actor,
      now: this.#clock.now(),
    });
    const inserted = await this.#packs.insert(pack);
    if (inserted === undefined) {
      throw new ConflictError(`Pack slug ${input.slug} is already in use`, message(HomebrewMessage.SlugTaken));
    }
    return inserted;
  }
}
