import { AncestryId } from './ancestry';
import type { AncestryDefinition } from './ancestry';
import type { PackId } from './content-id';
import type { ContentPack, ContentPackLoader } from './content-pack';
import { CreatureId } from './creature';
import type { CreatureDefinition } from './creature';
import { PackEntry } from './pack-entry';
import type { ProficiencyBonusTable } from './proficiency';
import type { Selector } from './selector';
import { StatisticId } from './statistic';
import type { StatisticDefinition } from './statistic';
import { VariantRuleId } from './variant-rule';
import type { VariantRuleDefinition } from './variant-rule';

export type AncestryEntry = PackEntry<AncestryId, AncestryDefinition>;
export type CreatureEntry = PackEntry<CreatureId, CreatureDefinition>;
export type StatisticEntry = PackEntry<StatisticId, StatisticDefinition>;
export type VariantRuleEntry = PackEntry<VariantRuleId, VariantRuleDefinition>;

/**
 * Everything loaded from content packs, indexed by id. Server and client each
 * hold one; packs are added with `load` (lazy) or `register` (already loaded).
 */
export class ContentRegistry {
  readonly #packs = new Map<PackId, ContentPack>();
  readonly #ancestries = new Map<AncestryId, AncestryEntry>();
  readonly #creatures = new Map<CreatureId, CreatureEntry>();
  readonly #statistics = new Map<StatisticId, StatisticEntry>();
  readonly #statisticsBySelector = new Map<Selector, readonly StatisticEntry[]>();
  readonly #variantRules = new Map<VariantRuleId, VariantRuleEntry>();
  #proficiencyBonus: ProficiencyBonusTable | undefined;

  public async load(loader: ContentPackLoader): Promise<ContentPack> {
    const existing = this.#packs.get(loader.id);
    if (existing !== undefined) {
      return existing;
    }
    const pack = await loader.load();
    if (pack.id !== loader.id) {
      throw new Error(`Loader "${loader.id}" returned pack "${pack.id}"`);
    }
    this.register(pack);
    return pack;
  }

  public register(pack: ContentPack): void {
    if (this.#packs.has(pack.id)) {
      throw new Error(`Content pack "${pack.id}" is already registered`);
    }
    this.#packs.set(pack.id, pack);
    for (const definition of pack.ancestries) {
      const entry: AncestryEntry = new PackEntry(pack, definition, AncestryId);
      this.#ancestries.set(entry.id, entry);
    }
    for (const definition of pack.creatures) {
      const entry: CreatureEntry = new PackEntry(pack, definition, CreatureId);
      this.#creatures.set(entry.id, entry);
    }
    this.#registerStatistics(pack);
    this.#registerVariantRules(pack);
  }

  /** A pack's variant rules, and its proficiency bonus table, which replaces the one before when it has one. */
  #registerVariantRules(pack: ContentPack): void {
    for (const definition of pack.variantRules) {
      const entry: VariantRuleEntry = new PackEntry(pack, definition, VariantRuleId);
      this.#variantRules.set(entry.id, entry);
    }
    this.#proficiencyBonus = pack.proficiencyBonus ?? this.#proficiencyBonus;
  }

  #registerStatistics(pack: ContentPack): void {
    for (const definition of pack.statistics) {
      const entry: StatisticEntry = new PackEntry(pack, definition, StatisticId);
      this.#statistics.set(entry.id, entry);
      const sharing = this.#statisticsBySelector.get(definition.selector) ?? [];
      this.#statisticsBySelector.set(definition.selector, [...sharing, entry]);
    }
  }

  public get packs(): readonly ContentPack[] {
    return [...this.#packs.values()];
  }

  public ancestries(): readonly AncestryEntry[] {
    return [...this.#ancestries.values()];
  }

  public ancestry(id: AncestryId): AncestryEntry | undefined {
    return this.#ancestries.get(id);
  }

  public creatures(): readonly CreatureEntry[] {
    return [...this.#creatures.values()];
  }

  public creature(id: CreatureId): CreatureEntry | undefined {
    return this.#creatures.get(id);
  }

  public statistics(): readonly StatisticEntry[] {
    return [...this.#statistics.values()];
  }

  public statistic(id: StatisticId): StatisticEntry | undefined {
    return this.#statistics.get(id);
  }

  /**
   * Every statistic with `selector`, in the order their packs were registered. A pack uses each selector once,
   * but two packs may share one; which of them applies is the engine's choice.
   */
  public statisticsFor(selector: Selector): readonly StatisticEntry[] {
    return this.#statisticsBySelector.get(selector) ?? [];
  }

  public variantRules(): readonly VariantRuleEntry[] {
    return [...this.#variantRules.values()];
  }

  public variantRule(id: VariantRuleId): VariantRuleEntry | undefined {
    return this.#variantRules.get(id);
  }

  /**
   * How proficiency ranks become bonuses: the table of the last registered pack that has one (the core rules pack,
   * or homebrew restating it), or undefined before any pack defines one. Variant rules replace it per character
   * through rule elements, not here.
   */
  public proficiencyBonus(): ProficiencyBonusTable | undefined {
    return this.#proficiencyBonus;
  }
}
