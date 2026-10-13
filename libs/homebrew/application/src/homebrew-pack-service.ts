import { HomebrewPack } from '@pioneer/homebrew/domain';
import type { CreateHomebrewPackBody } from '@pioneer/homebrew/domain';
import { contentPackId, PackVisibility } from '@pioneer/rules/sdk';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ConflictError, ForbiddenError, message, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { AuthorDirectory } from './author-directory';
import { HomebrewMessage } from './homebrew-message';
import type { HomebrewPackRepository } from './homebrew-pack-repository';
import { PackAccessPolicy } from './pack-access-policy';
import type { PackEnablementDirectory } from './pack-enablement-directory';

/** The ports `HomebrewPackService` works through. */
export interface HomebrewPackPorts {
  readonly packs: HomebrewPackRepository;
  readonly authors: AuthorDirectory;
  readonly enablement: PackEnablementDirectory;
}

/**
 * Homebrew pack use cases. Framework-free: the HTTP adapter calls these with the signed-in user as `actor`.
 * Every use case applies the access policy here, never in routes.
 */
export class HomebrewPackService {
  readonly #packs: HomebrewPackRepository;
  readonly #authors: AuthorDirectory;
  readonly #enablement: PackEnablementDirectory;
  readonly #access: PackAccessPolicy;
  readonly #clock: Clock;

  public constructor({ packs, authors, enablement }: HomebrewPackPorts, clock: Clock) {
    this.#packs = packs;
    this.#authors = authors;
    this.#enablement = enablement;
    this.#access = new PackAccessPolicy(enablement);
    this.#clock = clock;
  }

  /** Every pack the actor owns, newest first. */
  public async list(actor: UserId): Promise<readonly HomebrewPack[]> {
    return this.#packs.listOwnedBy(actor);
  }

  /** A pack the actor may read. Any other is a 404, the same as a missing one. */
  public async get(actor: UserId, id: ContentPackId): Promise<HomebrewPack> {
    return this.#readable(actor, id);
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

  /**
   * Change who may read a pack. Only the owner may: someone who can read it is refused (403), anyone else gets
   * a 404. Making it private while campaigns still enable it is a conflict naming them, so no campaign loses a
   * pack without its GM knowing.
   */
  public async setVisibility(actor: UserId, id: ContentPackId, visibility: PackVisibility): Promise<HomebrewPack> {
    const pack = await this.#readable(actor, id);
    if (!PackAccessPolicy.owns(actor, pack)) {
      throw new ForbiddenError(`User ${actor} does not own pack ${id}`);
    }
    if (pack.visibility === visibility) {
      return pack;
    }
    if (visibility === PackVisibility.Private) {
      await this.#refuseWhileEnabled(pack);
    }
    const changed = await this.#packs.updateVisibility(pack.withVisibility(visibility, this.#clock.now()));
    if (changed === undefined) {
      throw new NotFoundError('HomebrewPack', id);
    }
    return changed;
  }

  async #readable(actor: UserId, id: ContentPackId): Promise<HomebrewPack> {
    const pack = await this.#packs.findById(id);
    if (pack === undefined) {
      throw new NotFoundError('HomebrewPack', id);
    }
    const mayRead = await this.#access.mayRead(actor, pack);
    if (!mayRead) {
      throw new NotFoundError('HomebrewPack', id);
    }
    return pack;
  }

  async #refuseWhileEnabled(pack: HomebrewPack): Promise<void> {
    const campaigns = await this.#enablement.campaignsEnabling(pack);
    if (campaigns.length > 0) {
      throw new ConflictError(
        `Pack ${pack.id} is still enabled in ${campaigns.join(', ')}`,
        message(HomebrewMessage.CampaignsEnableIt, {
          campaigns: campaigns.join(', '),
        }),
      );
    }
  }
}
