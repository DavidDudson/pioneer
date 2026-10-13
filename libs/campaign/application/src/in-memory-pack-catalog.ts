import type { EnabledPackId, PackPublisher, PackTitle } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

import { PackCatalog } from './pack-catalog';
import type { CatalogPack } from './pack-catalog';

/** A pack to make known. Official packs are readable by everyone; a homebrew pack by its `readers`. */
export interface KnownPack {
  readonly id: EnabledPackId;
  readonly title: PackTitle;
  readonly publisher: PackPublisher;
  readonly official?: boolean;
  readonly private?: boolean;
  readonly readers?: readonly UserId[];
}

/** Catalog adapter for tests: packs, who reads them and what extends what, given up front. */
export class InMemoryPackCatalog extends PackCatalog {
  readonly #packs = new Map<EnabledPackId, KnownPack>();
  readonly #extends = new Map<EnabledPackId, EnabledPackId[]>();

  public pack(known: KnownPack): this {
    this.#packs.set(known.id, known);
    return this;
  }

  /** `pack` extends `dependsOn`. */
  public extend(pack: EnabledPackId, dependsOn: EnabledPackId): this {
    this.#extends.set(pack, [...(this.#extends.get(pack) ?? []), dependsOn]);
    return this;
  }

  public override async official(): Promise<readonly CatalogPack[]> {
    return this.#sorted().filter((pack) => pack.official);
  }

  public override async readableBy(viewer: UserId): Promise<readonly CatalogPack[]> {
    const readable = [...this.#packs.values()].filter(
      (known) => known.official === true || known.readers?.includes(viewer) === true,
    );
    return InMemoryPackCatalog.#order(readable.map((known) => InMemoryPackCatalog.#listed(known)));
  }

  public override async byIds(ids: readonly EnabledPackId[]): Promise<ReadonlyMap<EnabledPackId, CatalogPack>> {
    return new Map(
      ids.flatMap((id): [EnabledPackId, CatalogPack][] => {
        const known = this.#packs.get(id);
        return known === undefined ? [] : [[id, InMemoryPackCatalog.#listed(known)]];
      }),
    );
  }

  public override async closure(id: EnabledPackId): Promise<readonly EnabledPackId[]> {
    const ordered: EnabledPackId[] = [];
    const visit = (pack: EnabledPackId): void => {
      if (ordered.includes(pack)) {
        return;
      }
      for (const dependency of this.#extends.get(pack) ?? []) {
        visit(dependency);
      }
      ordered.push(pack);
    };
    visit(id);
    return ordered;
  }

  #sorted(): readonly CatalogPack[] {
    return InMemoryPackCatalog.#order([...this.#packs.values()].map((known) => InMemoryPackCatalog.#listed(known)));
  }

  static #listed(known: KnownPack): CatalogPack {
    return {
      id: known.id,
      title: known.title,
      publisher: known.publisher,
      official: known.official === true,
      private: known.private === true,
    };
  }

  static #order(packs: readonly CatalogPack[]): readonly CatalogPack[] {
    return packs.toSorted((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id));
  }
}
