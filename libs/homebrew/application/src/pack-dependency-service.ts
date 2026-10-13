import { isWiderThan } from '@pioneer/homebrew/domain';
import type { AddPackDependencyBody, HomebrewPack, PackDependencies } from '@pioneer/homebrew/domain';
import { wouldCycle } from '@pioneer/rules/sdk';
import type { ContentPackId, PackDependencyEdge } from '@pioneer/rules/sdk';
import { ConflictError, ForbiddenError, message, NotFoundError } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import type { DependencyUsageDirectory } from './dependency-usage-directory';
import { HomebrewMessage } from './homebrew-message';
import type { HomebrewPackRepository } from './homebrew-pack-repository';
import { PackAccessPolicy } from './pack-access-policy';
import type { PackDependencyRepository } from './pack-dependency-repository';
import type { ListedPack, PackDirectory } from './pack-directory';
import type { PackEnablementDirectory } from './pack-enablement-directory';

/** The ports `PackDependencyService` works through. */
export interface PackDependencyPorts {
  readonly packs: HomebrewPackRepository;
  readonly directory: PackDirectory;
  readonly dependencies: PackDependencyRepository;
  readonly usage: DependencyUsageDirectory;
  readonly enablement: PackEnablementDirectory;
}

/**
 * Which packs a homebrew pack extends. A pack may reference anything in the packs it depends on, and nothing else.
 * Framework-free: the HTTP adapter calls these with the signed-in user as `actor`.
 *
 * A dependency graph has to stay acyclic, and no pack may be visible to more people than something it depends on, or
 * a reader could open a pack whose references they cannot resolve. `HomebrewPackService.setVisibility` keeps the
 * second rule when visibility changes.
 */
export class PackDependencyService {
  readonly #packs: HomebrewPackRepository;
  readonly #directory: PackDirectory;
  readonly #dependencies: PackDependencyRepository;
  readonly #usage: DependencyUsageDirectory;
  readonly #access: PackAccessPolicy;

  public constructor({ packs, directory, dependencies, usage, enablement }: PackDependencyPorts) {
    this.#packs = packs;
    this.#directory = directory;
    this.#dependencies = dependencies;
    this.#usage = usage;
    this.#access = new PackAccessPolicy(enablement);
  }

  /** The packs a pack the actor may read extends, and, for its owner, the ones they could add. Others: a 404. */
  public async list(actor: UserId, id: ContentPackId): Promise<PackDependencies> {
    const pack = await this.#readable(actor, id);
    return this.#view(actor, pack);
  }

  /**
   * Make the pack extend another. Only the owner may (403 for a reader, 404 for anyone else), and only a pack the
   * actor may read (404). A pack cannot extend itself, close a cycle, or be visible to more people than the pack it
   * extends: each is a 409. Extending the same pack twice is no change.
   */
  public async add(actor: UserId, id: ContentPackId, { dependsOn }: AddPackDependencyBody): Promise<PackDependencies> {
    const pack = await this.#owned(actor, id);
    if (dependsOn === id) {
      throw new ConflictError(`Pack ${id} cannot depend on itself`, message(HomebrewMessage.DependsOnItself));
    }
    const dependency = await this.#directory.findById(dependsOn);
    const mayRead = dependency !== undefined && (await this.#access.mayRead(actor, dependency));
    if (!mayRead) {
      throw new NotFoundError('Pack', dependsOn);
    }
    const edge: PackDependencyEdge = { pack: id, dependsOn };
    // Checked inside the repository's transaction, so neither another addition nor a visibility change slips between.
    await this.#dependencies.add(actor, edge, async () => this.#refuseUnsound(edge));
    return this.#view(actor, pack);
  }

  /**
   * Make the pack stop extending another. Only the owner may. Entries that still reference the pack it extends
   * refuse it with a 409 naming them. Removing it twice is no change.
   */
  public async remove(actor: UserId, id: ContentPackId, dependsOn: ContentPackId): Promise<PackDependencies> {
    const pack = await this.#owned(actor, id);
    const entries = await this.#usage.entriesUsing(id, dependsOn);
    if (entries.length > 0) {
      throw new ConflictError(
        `Pack ${id} still uses ${dependsOn} in ${entries.join(', ')}`,
        message(HomebrewMessage.DependencyInUse, {
          entries: entries.join(', '),
        }),
      );
    }
    await this.#dependencies.remove(actor, { pack: id, dependsOn });
    return this.#view(actor, pack);
  }

  /** The checks an addition holds under lock, against the packs as they are now. */
  async #refuseUnsound(edge: PackDependencyEdge): Promise<void> {
    const [pack, dependency, edges] = await Promise.all([
      this.#packs.findById(edge.pack),
      this.#directory.findById(edge.dependsOn),
      this.#dependencies.edges(),
    ]);
    if (pack === undefined || dependency === undefined) {
      throw new NotFoundError('Pack', pack === undefined ? edge.pack : edge.dependsOn);
    }
    if (wouldCycle(edges, edge)) {
      throw new ConflictError(
        `${edge.pack} depending on ${edge.dependsOn} would make a cycle`,
        message(HomebrewMessage.DependencyCycle, {
          dependency: dependency.summary.title,
        }),
      );
    }
    if (isWiderThan(pack.visibility, dependency.visibility)) {
      throw new ConflictError(
        `Pack ${edge.pack} is visible to more people than ${edge.dependsOn}`,
        message(HomebrewMessage.DependencyNarrower, {
          dependency: dependency.summary.title,
        }),
      );
    }
  }

  async #view(actor: UserId, pack: HomebrewPack): Promise<PackDependencies> {
    const [edges, listed] = await Promise.all([this.#dependencies.edges(), this.#directory.all()]);
    const directlyDependedOn = new Set(edges.filter((edge) => edge.pack === pack.id).map((edge) => edge.dependsOn));
    const readable = await this.#readableOf(actor, listed);
    const dependencies = readable.filter((candidate) => directlyDependedOn.has(candidate.id));
    if (!PackAccessPolicy.owns(actor, pack)) {
      return { editable: false, dependencies: dependencies.map((dependency) => dependency.summary), candidates: [] };
    }
    const candidates = readable.filter(
      (candidate) =>
        candidate.id !== pack.id &&
        !directlyDependedOn.has(candidate.id) &&
        !wouldCycle(edges, { pack: pack.id, dependsOn: candidate.id }) &&
        !isWiderThan(pack.visibility, candidate.visibility),
    );
    return {
      editable: true,
      dependencies: dependencies.map((dependency) => dependency.summary),
      candidates: candidates.map((candidate) => candidate.summary),
    };
  }

  async #readableOf(actor: UserId, listed: readonly ListedPack[]): Promise<readonly ListedPack[]> {
    const allowed = await Promise.all(listed.map(async (candidate) => this.#access.mayRead(actor, candidate)));
    return listed.filter((_candidate, index) => allowed[index] === true);
  }

  /** A pack the actor may read. Any other is a 404, the same as a missing one. */
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

  /** A pack the actor owns. One they can only read is a 403. */
  async #owned(actor: UserId, id: ContentPackId): Promise<HomebrewPack> {
    const pack = await this.#readable(actor, id);
    if (!PackAccessPolicy.owns(actor, pack)) {
      throw new ForbiddenError(`User ${actor} does not own pack ${id}`);
    }
    return pack;
  }
}
