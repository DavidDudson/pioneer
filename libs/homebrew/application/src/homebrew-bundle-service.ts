import { bundlePath, contentPackId } from '@pioneer/rules/sdk';
import type {
  BundleBody,
  BundleFile,
  ContentManifest,
  ContentPackId,
  HomebrewManifestRequest,
  PackId,
} from '@pioneer/rules/sdk';
import { NotFoundError } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import type { PackAccessPolicy } from './pack-access-policy';
import type { PackBundleSource } from './pack-bundle-source';
import type { PackDirectory } from './pack-directory';

/** The ports `HomebrewBundleService` works through. */
export interface HomebrewBundlePorts {
  readonly directory: PackDirectory;
  readonly access: PackAccessPolicy;
  readonly bundles: PackBundleSource;
}

/**
 * Homebrew content for the browser. A pack is served to whoever `PackAccessPolicy` lets read it: its owner, members of
 * a campaign that enables it, or anyone for a public one. Anyone else gets what a missing pack gets (ADR-0007). Official
 * packs are not served here; they are public.
 */
export class HomebrewBundleService {
  readonly #directory: PackDirectory;
  readonly #access: PackAccessPolicy;
  readonly #bundles: PackBundleSource;

  public constructor({ directory, access, bundles }: HomebrewBundlePorts) {
    this.#directory = directory;
    this.#access = access;
    this.#bundles = bundles;
  }

  /**
   * The bundles of the homebrew packs asked for that the actor may read, and the packs they extend that the actor may
   * read, each after what it extends. A pack the actor may not read, an official one and one that does not exist are
   * left out, so the answer says nothing about them.
   */
  public async manifest(actor: UserId, { packs }: HomebrewManifestRequest): Promise<ContentManifest> {
    const asked = await this.#readable(actor, packs);
    if (asked.length === 0) {
      return { packs: [] };
    }
    const { manifest } = await this.#bundles.of(asked);
    const readable = new Set(
      await this.#readable(
        actor,
        manifest.packs.map((pack) => contentPackId(pack.id)),
      ),
    );
    return { packs: manifest.packs.filter((pack) => readable.has(contentPackId(pack.id))) };
  }

  /** A current bundle of a homebrew pack the actor may read. Any other is a 404. */
  public async bundle(actor: UserId, pack: PackId, file: BundleFile): Promise<BundleBody> {
    const id = contentPackId(pack);
    const [readable] = await this.#readable(actor, [id]);
    const path = bundlePath(pack, file);
    if (readable === undefined) {
      throw new NotFoundError('Content bundle', path);
    }
    const { bodies } = await this.#bundles.of([id]);
    const body = bodies.get(path);
    if (body === undefined) {
      throw new NotFoundError('Content bundle', path);
    }
    return body;
  }

  /** The homebrew packs among `ids` that the actor may read. */
  async #readable(actor: UserId, ids: readonly ContentPackId[]): Promise<readonly ContentPackId[]> {
    const listed = await Promise.all(ids.map(async (id) => this.#directory.findById(id)));
    const checked = await Promise.all(
      listed.map(async (pack): Promise<ContentPackId | undefined> => {
        if (pack?.ownerId === undefined) {
          return undefined;
        }
        const mayRead = await this.#access.mayRead(actor, pack);
        return mayRead ? pack.id : undefined;
      }),
    );
    return checked.filter((id) => id !== undefined);
  }
}
