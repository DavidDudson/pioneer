import { HomebrewPack, isWiderThan } from '@pioneer/homebrew/domain';
import type { CreateHomebrewPackBody } from '@pioneer/homebrew/domain';
import { contentPackId, PackVisibility } from '@pioneer/rules/sdk';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ConflictError, ForbiddenError, message, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { AuthorDirectory } from './author-directory';
import { HomebrewMessage } from './homebrew-message';
import type { HomebrewPackRepository } from './homebrew-pack-repository';
import { PackAccessPolicy } from './pack-access-policy';
import type { PackDependencyRepository } from './pack-dependency-repository';
import type { PackDirectory } from './pack-directory';
import type { PackEnablementDirectory } from './pack-enablement-directory';

/** The ports `HomebrewPackService` works through. */
export interface HomebrewPackPorts {
  readonly packs: HomebrewPackRepository;
  readonly authors: AuthorDirectory;
  readonly enablement: PackEnablementDirectory;
  readonly directory: PackDirectory;
  readonly dependencies: PackDependencyRepository;
}

/**
 * Homebrew pack use cases. Framework-free: the HTTP adapter calls these with the signed-in user as `actor`.
 * Every use case applies the access policy here, never in routes.
 */
export class HomebrewPackService {
  readonly #packs: HomebrewPackRepository;
  readonly #authors: AuthorDirectory;
  readonly #enablement: PackEnablementDirectory;
  readonly #directory: PackDirectory;
  readonly #dependencies: PackDependencyRepository;
  readonly #access: PackAccessPolicy;
  readonly #clock: Clock;

  public constructor({ packs, authors, enablement, directory, dependencies }: HomebrewPackPorts, clock: Clock) {
    this.#packs = packs;
    this.#authors = authors;
    this.#enablement = enablement;
    this.#directory = directory;
    this.#dependencies = dependencies;
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
    // Checked inside the repository's transaction, with the pack locked, so a campaign cannot enable it in between.
    // For the same reason no pack starts or stops depending on it.
    const whileLocked = async (): Promise<void> => {
      if (visibility === PackVisibility.Private) {
        await this.#refuseWhileEnabled(pack);
      }
      await this.#refuseBeyondDependencies(pack, visibility);
      await this.#refuseUnderDependents(pack, visibility);
    };
    const changed = await this.#packs.updateVisibility(pack.withVisibility(visibility, this.#clock.now()), whileLocked);
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

  /** A pack may not be visible to more people than any pack it extends. */
  async #refuseBeyondDependencies(pack: HomebrewPack, visibility: PackVisibility): Promise<void> {
    const edges = await this.#dependencies.edges();
    const found = await Promise.all(
      edges.filter((edge) => edge.pack === pack.id).map(async (edge) => this.#directory.findById(edge.dependsOn)),
    );
    const narrower = found.flatMap((dependency) =>
      dependency !== undefined && isWiderThan(visibility, dependency.visibility) ? [dependency.summary.title] : [],
    );
    if (narrower.length > 0) {
      throw new ConflictError(
        `Pack ${pack.id} would be visible to more people than ${narrower.join(', ')}`,
        message(HomebrewMessage.WiderThanDependencies, {
          packs: narrower.toSorted().join(', '),
        }),
      );
    }
  }

  /** No pack that extends this one may be visible to more people than it, so narrowing it needs those narrowed first. */
  async #refuseUnderDependents(pack: HomebrewPack, visibility: PackVisibility): Promise<void> {
    const dependentIds = await this.#dependencies.dependentsOf(pack.id);
    const found = await Promise.all(dependentIds.map(async (id) => this.#directory.findById(id)));
    const wider = found.filter((dependent) => dependent !== undefined && isWiderThan(dependent.visibility, visibility));
    if (wider.length > 0) {
      // Counted, not named: the owner of this pack may not be allowed to read the others.
      throw new ConflictError(
        `${wider.length} pack(s) extending ${pack.id} are visible to more people than ${visibility}`,
        message(HomebrewMessage.NarrowerThanDependents, {
          count: wider.length,
        }),
      );
    }
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
