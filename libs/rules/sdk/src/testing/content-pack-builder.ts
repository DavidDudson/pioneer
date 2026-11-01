// oxlint-disable max-lines -- one fluent builder with a method per kind; splitting it would scatter the test API
import type * as z from 'zod';

import type { AncestryDefinition } from '../ancestry';
import { contentId, EntrySlug, PackId } from '../content-id';
import { ContentKind } from '../content-kind';
import { ContentPack } from '../content-pack';
import type { CreatureDefinition } from '../creature';
import { ContentLicense } from '../license';
import type { ProficiencyBonusTable } from '../proficiency';
import type { NamespaceKind } from '../roll-option-namespace';
import { Size } from '../size';
import { SourceKind } from '../source-ref';
import type { SourceRef } from '../source-ref';
import type { StatisticDefinition } from '../statistic';
import { StatisticKind } from '../statistic';
import type { VariantRuleDefinition } from '../variant-rule';
import type {
  ActionFields,
  ClassFeatureFields,
  ClassFields,
  ConditionFields,
  DeityFields,
  MagicItemFields,
  SpellFields,
} from './content-pack-fields';

/** Who wrote the test pack's homebrew; a fixed id so packs built twice are equal. */
const TEST_AUTHOR = '00000000-0000-4000-8000-000000000001';

/** A definition as tests give it: its sources are optional, defaulting to the pack's homebrew. */
type Sourceable<Definition extends z.ZodType> = z.input<Definition> & {
  readonly sources?: readonly z.input<typeof SourceRef>[];
};

/** An envelope entry as tests give it, before the pack names its id and sources. */
interface EnvelopeFields {
  readonly kind: ContentKind;
  readonly name: string;
  readonly data: object;
  /** Rule elements as JSON; none when absent. */
  readonly rules?: readonly object[];
  /** The entry's level, for the kinds that have one (feats). */
  readonly level?: number;
  /** Its traits; none when absent. */
  readonly traits?: readonly string[];
  /** Common when absent. */
  readonly rarity?: string;
  /** Rich text as JSON; none when absent. */
  readonly description?: readonly object[];
  /** The ids of the legacy entries it replaces; none when absent. */
  readonly supersedes?: readonly string[];
}

/** A test feat's level, traits, `data` beyond its category and `rules`, as JSON. */
interface FeatFields {
  readonly level?: number;
  readonly traits?: readonly string[];
  readonly data?: object;
  readonly rules?: readonly object[];
  /** Rich text as JSON; none when absent. */
  readonly description?: readonly object[];
  /** The ids of the legacy entries it replaces; none when absent. */
  readonly supersedes?: readonly string[];
}

/** A test ancestry: its definition, with `rules` as JSON (the ancestry features it grants). */
type AncestryFields = Sourceable<typeof AncestryDefinition> & { readonly rules?: readonly object[] };

/**
 * Test builder for content packs. Defaults to a valid, empty homebrew pack whose entries cite it as their homebrew
 * source; every `with*` returns the builder so tests state only what they care about:
 *
 * ```ts
 * const pack = new ContentPackBuilder().withAncestry('human').build();
 * ```
 */
export class ContentPackBuilder {
  #id = 'test-pack';
  #license: ContentLicense = ContentLicense.Homebrew;
  readonly #ancestries: AncestryFields[] = [];
  readonly #creatures: Sourceable<typeof CreatureDefinition>[] = [];
  readonly #statistics: Sourceable<typeof StatisticDefinition>[] = [];
  readonly #namespaces: Record<string, NamespaceKind> = {};
  #proficiencyBonus: ProficiencyBonusTable | undefined;
  readonly #entries: EnvelopeFields[] = [];
  readonly #variantRules: Omit<z.input<typeof VariantRuleDefinition>, 'sources'>[] = [];

  public withId(id: string): this {
    this.#id = id;
    return this;
  }

  public withAncestry(name: string, overrides: Partial<AncestryFields> = {}): this {
    this.#ancestries.push({
      slug: `ancestry:${name}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      hitPoints: 8,
      size: Size.Medium,
      speed: 25,
      traits: ['humanoid'],
      boosts: [],
      flaws: [],
      ...overrides,
    });
    return this;
  }

  public withCreature(definition: Sourceable<typeof CreatureDefinition>): this {
    this.#creatures.push(definition);
    return this;
  }

  /** The proficiency bonus table the pack defines, without which the engine derives no statistic. */
  public withProficiencyBonus(table: ProficiencyBonusTable): this {
    this.#proficiencyBonus = table;
    return this;
  }

  /** A check whose selector is its name, with a base formula of `0` unless overridden. */
  public withStatistic(name: string, overrides: Partial<Sourceable<typeof StatisticDefinition>> = {}): this {
    this.#statistics.push({
      slug: `statistic:${name}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      selector: name,
      domains: [],
      base: '0',
      kind: StatisticKind.Check,
      ...overrides,
    });
    return this;
  }

  /**
   * A background with these boosts, each the attributes it may go to (`[['str', 'dex'], [...all six]]`), and `rules` as
   * JSON (its trained skills and skill feat).
   */
  public withBackground(name: string, boosts: readonly (readonly string[])[], rules: readonly object[] = []): this {
    this.#entries.push({ kind: ContentKind.Background, name, data: { boosts }, rules });
    return this;
  }

  /** A heritage of this pack's ancestry `ancestry`, or a versatile one without it, with `rules` as JSON. */
  public withHeritage(name: string, ancestry?: string, rules: readonly object[] = []): this {
    const data = ancestry === undefined ? {} : { ancestry: this.idOf(ContentKind.Ancestry, ancestry) };
    this.#entries.push({ kind: ContentKind.Heritage, name, data, rules });
    return this;
  }

  /** An ancestry feature (Keen Eyes) with `rules` as JSON, which an ancestry or heritage grants. */
  public withAncestryFeature(name: string, rules: readonly object[] = []): this {
    this.#entries.push({ kind: ContentKind.AncestryFeature, name, data: {}, rules });
    return this;
  }

  /** A language of `rarity`, slugged `language:<name>`, as the core rules pack has them. */
  public withLanguage(name: string, rarity = 'common'): this {
    this.#entries.push({ kind: ContentKind.Language, name, data: {}, rarity });
    return this;
  }

  /**
   * A 1st-level skill feat, unless `fields` say otherwise: its level, traits, and `data` beyond its category (its
   * prerequisites and their predicate).
   */
  public withFeat(name: string, { level = 1, traits = [], data = {}, rules = [], ...text }: FeatFields = {}): this {
    this.#entries.push({
      kind: ContentKind.Feat,
      name,
      data: { category: 'skill', ...data },
      level,
      traits,
      rules,
      ...text,
    });
    return this;
  }

  /** A one-action action, with the effects using it can put on the user: ids, or ids with the predicate that offers them. */
  public withAction(name: string, { effects }: ActionFields = {}): this {
    this.#entries.push({
      kind: ContentKind.Action,
      name,
      data: { cost: 'one', ...(effects === undefined ? {} : { effects }) },
    });
    return this;
  }

  /** A deity, empty but for `fields`: no domains, font, skills, weapons or spells unless given. */
  public withDeity(name: string, { description, ...fields }: DeityFields = {}): this {
    const data = {
      category: 'deity',
      domains: { primary: [], alternate: [] },
      font: [],
      attributes: [],
      skills: [],
      weapons: [],
      spells: [],
      ...fields,
    };
    this.#entries.push({ kind: ContentKind.Deity, name, data, ...(description === undefined ? {} : { description }) });
    return this;
  }

  /** The id this pack gives its entry of `kind` named `name`, as `GrantItem` and heritages name it. */
  public idOf(kind: ContentKind, name: string): string {
    return contentId(PackId.parse(this.#id), EntrySlug.parse(`${kind}:${name}`));
  }

  /**
   * A class whose key attribute may be any of `keyAttribute`, with 10 Hit Points unless given, and `rules` as JSON (its
   * starting ranks and the class features it grants by level).
   */
  public withClass(
    name: string,
    keyAttribute: readonly string[],
    { hitPoints = 10, rules = [] }: ClassFields = {},
  ): this {
    this.#entries.push({
      kind: ContentKind.Class,
      name,
      data: { keyAttribute, hitPoints, additionalSkills: 3 },
      rules,
    });
    return this;
  }

  /** A 1st-level class feature with `tags` (a subclass's `cleric-doctrine`) and `rules` as JSON. */
  public withClassFeature(name: string, { tags, rules = [], keyAttributeOptions }: ClassFeatureFields = {}): this {
    const data = {
      ...(tags === undefined ? {} : { tags }),
      ...(keyAttributeOptions === undefined ? {} : { keyAttributeOptions }),
    };
    this.#entries.push({ kind: ContentKind.ClassFeature, name, data, rules, level: 1 });
    return this;
  }

  /** An item of an equipment kind, slugged `<kind>:<name>`, with its kind's `data` (`{ bulk: 1, usage: ... }`). */
  public withItem(kind: ContentKind, name: string, data: object): this {
    this.#entries.push({ kind, name, data, level: 0 });
    return this;
  }

  /** An item like `withItem` with traits and rule elements: a cloak that is `invested` and adds to Perception. */
  public withMagicItem(
    kind: ContentKind,
    name: string,
    { data, traits = [], rules = [], level = 0 }: MagicItemFields,
  ): this {
    this.#entries.push({ kind, name, data, level, traits, rules });
    return this;
  }

  /** A kit slugged `kit:<name>`, with its `data` (`{ items: [...], price? }`); a kit has no level. */
  public withKit(name: string, data: object): this {
    this.#entries.push({ kind: ContentKind.Kit, name, data });
    return this;
  }

  /**
   * A condition slugged `condition:<name>`, with `rules` as JSON: what it does to statistics. It carries no value
   * unless `valued` (Clumsy 1), and recovers as `recovery` says.
   */
  public withCondition(name: string, rules: readonly object[] = [], fields: ConditionFields = {}): this {
    this.#entries.push({
      kind: ContentKind.Condition,
      name,
      data: { valued: false, overrides: [], implies: [], recovery: {}, ...fields },
      rules,
    });
    return this;
  }

  /** An environment slugged `environment:<name>`, with `rules` as JSON: what it does to statistics while it is active. */
  public withEnvironment(name: string, data: object = {}, rules: readonly object[] = []): this {
    this.#entries.push({
      kind: ContentKind.Environment,
      name,
      data: { restrictions: [], consequences: [], ...data },
      rules,
    });
    return this;
  }

  /** A spell slugged `spell:<name>`, cast with two actions, its level its rank. */
  public withSpell(
    name: string,
    { rank, traditions, traits = [], rarity, duration, dismiss, dismissNote, effects, shiftsForm }: SpellFields,
  ): this {
    const data = {
      rank,
      traditions,
      time: { type: 'actions', cost: 'two' },
      damage: [],
      ...(duration === undefined ? {} : { duration }),
      ...(dismiss === undefined ? {} : { dismiss }),
      ...(dismissNote === undefined ? {} : { dismissNote }),
      ...(effects === undefined ? {} : { effects }),
      ...(shiftsForm === undefined ? {} : { shiftsForm }),
    };
    this.#entries.push({
      kind: ContentKind.Spell,
      name,
      data,
      level: rank,
      traits,
      ...(rarity === undefined ? {} : { rarity }),
    });
    return this;
  }

  /** A spell effect slugged `effect:<name>` of `level`, lasting until someone ends it, with `rules` as JSON. */
  public withEffect(name: string, level: number, rules: readonly object[] = []): this {
    this.#entries.push({
      kind: ContentKind.Effect,
      name,
      data: { category: 'spell', duration: { type: 'unlimited' } },
      level,
      rules,
    });
    return this;
  }

  /** A variant rule named `name` that needs `structure` and changes `limits`. */
  public withVariantRule(
    name: string,
    structure?: z.input<typeof VariantRuleDefinition>['structure'],
    limits?: z.input<typeof VariantRuleDefinition>['limits'],
  ): this {
    this.#variantRules.push({ slug: `variant-rule:${name}`, name, rules: [], structure, limits });
    return this;
  }

  /** A variant rule named `name` that needs `structure` and puts `rules` in play for every character it is on. */
  public withVariantRuleElements(
    name: string,
    structure: z.input<typeof VariantRuleDefinition>['structure'],
    rules: z.input<typeof VariantRuleDefinition>['rules'],
  ): this {
    this.#variantRules.push({ slug: `variant-rule:${name}`, name, rules, structure });
    return this;
  }

  /** The licence the pack is published under; homebrew unless set. */
  public withLicense(license: ContentLicense): this {
    this.#license = license;
    return this;
  }

  public withNamespace(namespace: string, kind: NamespaceKind): this {
    this.#namespaces[namespace] = kind;
    return this;
  }

  public build(): ContentPack {
    const sources = [{ kind: SourceKind.Homebrew, author: TEST_AUTHOR, pack: this.#id }];
    return ContentPack.define({
      manifest: { id: this.#id, title: 'Test pack', publisher: 'Pioneer tests', license: this.#license },
      ancestries: this.#ancestries.map((ancestry) => ({ sources, ...ancestry })),
      creatures: this.#creatures.map((creature) => ({ sources, ...creature })),
      statistics: this.#statistics.map((statistic) => ({ sources, ...statistic })),
      rollOptionNamespaces: this.#namespaces,
      variantRules: this.#variantRules.map((variant) => ({ sources, ...variant })),
      ...(this.#proficiencyBonus === undefined ? {} : { proficiencyBonus: this.#proficiencyBonus }),
      otherEntries: this.#entries.map(
        ({
          kind,
          name,
          data,
          rules = [],
          level,
          traits = [],
          rarity = 'common',
          description = [],
          supersedes = [],
        }) => ({
          id: this.idOf(kind, name),
          pack: this.#id,
          kind,
          slug: `${kind}:${name}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          rarity,
          traits,
          sources,
          description,
          rules,
          data,
          ...(level === undefined ? {} : { level }),
          ...(supersedes.length === 0 ? {} : { supersedes }),
        }),
      ),
    });
  }
}
