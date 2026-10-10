import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AncestryId } from './ancestry';
import type { AncestryDefinition } from './ancestry';
import type { PackId } from './content-id';
import type { ContentPack, ContentPackLoader } from './content-pack';
import { CreatureId } from './creature';
import type { CreatureDefinition } from './creature';
import { RulesMessage } from './messages';
import { PackEntry } from './pack-entry';
import type { ProficiencyBonusTable } from './proficiency';
import { RollOptionNamespace } from './roll-option-namespace';
import type { NamespaceKind } from './roll-option-namespace';
import type { Selector } from './selector';
import { StatisticId } from './statistic';
import type { StatisticDefinition } from './statistic';
import { VariantRuleId } from './variant-rule';
import type { VariantRuleDefinition } from './variant-rule';

export type AncestryEntry = PackEntry<AncestryId, AncestryDefinition>;
export type CreatureEntry = PackEntry<CreatureId, CreatureDefinition>;
export type StatisticEntry = PackEntry<StatisticId, StatisticDefinition>;
export type VariantRuleEntry = PackEntry<VariantRuleId, VariantRuleDefinition>;

/** A namespace's classification and the pack that first gave it, named when another pack disagrees. */
interface NamespaceClassification {
  readonly kind: NamespaceKind;
  readonly pack: PackId;
}

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
  readonly #namespaces = new Map<RollOptionNamespace, NamespaceClassification>();

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
    this.#checkNamespaces(pack);
    this.#packs.set(pack.id, pack);
    this.#registerAncestriesAndCreatures(pack);
    this.#registerStatistics(pack);
    this.#registerVariantRules(pack);
    this.#registerNamespaces(pack);
  }

  /** A pack's ancestries and creatures. */
  #registerAncestriesAndCreatures(pack: ContentPack): void {
    for (const definition of pack.ancestries) {
      const entry: AncestryEntry = new PackEntry(pack, definition, AncestryId);
      this.#ancestries.set(entry.id, entry);
    }
    for (const definition of pack.creatures) {
      const entry: CreatureEntry = new PackEntry(pack, definition, CreatureId);
      this.#creatures.set(entry.id, entry);
    }
  }

  /**
   * Throws if `pack` classifies a namespace the other way from a pack registered before, with an issue at each such
   * entry. Checked before anything is registered, so a rejected pack leaves the registry as it was.
   */
  #checkNamespaces(pack: ContentPack): void {
    const issues: z.core.$ZodIssue[] = [];
    for (const [namespace, kind] of Object.entries(pack.rollOptionNamespaces)) {
      const existing = this.#namespaces.get(RollOptionNamespace.parse(namespace));
      if (existing !== undefined && existing.kind !== kind) {
        const conflict = message(RulesMessage.NamespaceConflict, {
          namespace,
          kind: existing.kind,
          pack: existing.pack,
        });
        issues.push({
          code: 'custom',
          input: kind,
          path: ['rollOptionNamespaces', namespace],
          message: '',
          ...issueParams(conflict),
        });
      }
    }
    if (issues.length > 0) {
      throw new z.ZodError(issues);
    }
  }

  /** A pack's namespaces. `#checkNamespaces` ruled out disagreement, so a restated one keeps its first pack. */
  #registerNamespaces(pack: ContentPack): void {
    for (const [namespace, kind] of Object.entries(pack.rollOptionNamespaces)) {
      const parsed = RollOptionNamespace.parse(namespace);
      if (!this.#namespaces.has(parsed)) {
        this.#namespaces.set(parsed, { kind, pack: pack.id });
      }
    }
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

  /**
   * Every registered pack's roll option namespaces, merged: what `PredicateFacts` reads to tell a missing option's
   * false from unknown. Empty until a pack lists some (the core rules pack does).
   */
  public rollOptionNamespaces(): ReadonlyMap<RollOptionNamespace, NamespaceKind> {
    return new Map([...this.#namespaces].map(([namespace, { kind }]) => [namespace, kind]));
  }
}

/**
 * Where a server use case gets its content: a registry over the packs as they are when asked, so content seeded after
 * the process started is served without a restart. Ask once per use case and keep the answer for its duration.
 */
export interface ContentSource {
  readonly registry: () => Promise<ContentRegistry>;
}
