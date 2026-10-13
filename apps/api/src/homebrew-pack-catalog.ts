import { PackCatalog } from '@pioneer/campaign/application';
import type { CatalogPack } from '@pioneer/campaign/application';
import { EnabledPackId, PackPublisher, PackTitle } from '@pioneer/campaign/domain';
import type {
  ListedPack,
  PackAccessPolicy,
  PackDependencyRepository,
  PackDirectory,
} from '@pioneer/homebrew/application';
import { loadOrder, PackVisibility } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

function catalogued(pack: ListedPack): CatalogPack {
  return {
    id: EnabledPackId.parse(pack.id),
    title: PackTitle.parse(pack.summary.title),
    publisher: PackPublisher.parse(pack.summary.publisher),
    official: pack.summary.official,
    private: pack.visibility === PackVisibility.Private,
  };
}

/**
 * The campaign context's `PackCatalog` over homebrew's ports: who may read a pack is its `PackAccessPolicy`, and what
 * a pack extends is the dependency graph. It lives in the composition root because neither context may import the
 * other.
 */
export class HomebrewPackCatalog extends PackCatalog {
  readonly #directory: PackDirectory;
  readonly #dependencies: PackDependencyRepository;
  readonly #access: PackAccessPolicy;

  public constructor(directory: PackDirectory, dependencies: PackDependencyRepository, access: PackAccessPolicy) {
    super();
    this.#directory = directory;
    this.#dependencies = dependencies;
    this.#access = access;
  }

  public override async official(): Promise<readonly CatalogPack[]> {
    const packs = await this.#directory.all();
    return packs.filter((pack) => pack.summary.official).map((pack) => catalogued(pack));
  }

  public override async readableBy(viewer: UserId): Promise<readonly CatalogPack[]> {
    const packs = await this.#directory.all();
    const allowed = await Promise.all(packs.map(async (pack) => this.#access.mayRead(viewer, pack)));
    return packs.filter((_pack, index) => allowed[index] === true).map((pack) => catalogued(pack));
  }

  public override async byIds(ids: readonly EnabledPackId[]): Promise<ReadonlyMap<EnabledPackId, CatalogPack>> {
    const wanted = new Set(ids);
    const packs = await this.#directory.all();
    return new Map(
      packs
        .filter((pack) => wanted.has(EnabledPackId.parse(pack.id)))
        .map((pack): [EnabledPackId, CatalogPack] => [EnabledPackId.parse(pack.id), catalogued(pack)]),
    );
  }

  public override async closure(id: EnabledPackId): Promise<readonly EnabledPackId[]> {
    const edges = await this.#dependencies.edges();
    return loadOrder(edges, id).map((pack) => EnabledPackId.parse(pack));
  }
}
