import type { PackPublisher, PackTitle } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

import { CharacterPackCatalog } from './character-pack-catalog';
import type { CatalogPack } from './character-pack-catalog';

/** A pack to make known. Official packs are readable by everyone; a homebrew pack by its `readers`. */
export interface KnownPack {
  readonly id: ContentPackId;
  readonly title: PackTitle;
  readonly publisher: PackPublisher;
  readonly official?: boolean;
  readonly private?: boolean;
  readonly readers?: readonly UserId[];
}

/** Catalog adapter for tests: packs, who reads them and what extends what, given up front. */
export class InMemoryCharacterPackCatalog extends CharacterPackCatalog {
  readonly #packs = new Map<ContentPackId, KnownPack>();
  readonly #extends = new Map<ContentPackId, ContentPackId[]>();

  public pack(known: KnownPack): this {
    this.#packs.set(known.id, known);
    return this;
  }

  /** `pack` extends `dependsOn`. */
  public extend(pack: ContentPackId, dependsOn: ContentPackId): this {
    this.#extends.set(pack, [...(this.#extends.get(pack) ?? []), dependsOn]);
    return this;
  }

  public override async official(): Promise<readonly CatalogPack[]> {
    return InMemoryCharacterPackCatalog.#order(
      [...this.#packs.values()]
        .filter((known) => known.official === true)
        .map((known) => InMemoryCharacterPackCatalog.#listed(known)),
    );
  }

  public override async readableBy(viewer: UserId): Promise<readonly CatalogPack[]> {
    const readable = [...this.#packs.values()].filter(
      (known) => known.official === true || known.readers?.includes(viewer) === true,
    );
    return InMemoryCharacterPackCatalog.#order(readable.map((known) => InMemoryCharacterPackCatalog.#listed(known)));
  }

  public override async byIds(ids: readonly ContentPackId[]): Promise<ReadonlyMap<ContentPackId, CatalogPack>> {
    return new Map(
      ids.flatMap((id): [ContentPackId, CatalogPack][] => {
        const known = this.#packs.get(id);
        return known === undefined ? [] : [[id, InMemoryCharacterPackCatalog.#listed(known)]];
      }),
    );
  }

  public override async closure(id: ContentPackId): Promise<readonly ContentPackId[]> {
    const ordered: ContentPackId[] = [];
    const visit = (pack: ContentPackId): void => {
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
