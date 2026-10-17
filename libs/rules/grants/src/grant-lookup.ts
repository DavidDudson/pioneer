import { contentId, ContentId, ContentKind, RollOption, slugName } from '@pioneer/rules/sdk';
import type {
  ContentEntry,
  ContentPack,
  ContentRegistry,
  PackAncestry,
  Trait,
  VariantRuleDefinition,
} from '@pioneer/rules/sdk';

import type { ContentLookup, EntryFacts, GrantEntry } from './grant-entry';

/**
 * The kinds grants read from the registry's envelope entries (`otherEntries`): those a character picks in a root slot,
 * the class features a class grants by level, feats, which a background or class grants by `GrantItem`, and the
 * items a character carries, which are roots while they are worn, held or invested, and conditions, roots while they
 * last (encumbered, while a character carries too much), the property runes etched onto those items, and actions, which
 * a feat, item or condition grants by `GrantItem`.
 */
const ENVELOPE_KINDS: ReadonlySet<ContentKind> = new Set([
  ContentKind.Action,
  ContentKind.AncestryFeature,
  ContentKind.Armor,
  ContentKind.Background,
  ContentKind.Class,
  ContentKind.ClassFeature,
  ContentKind.Condition,
  ContentKind.Consumable,
  ContentKind.Deity,
  ContentKind.Effect,
  ContentKind.Equipment,
  ContentKind.Feat,
  ContentKind.Heritage,
  ContentKind.Rune,
  ContentKind.Shield,
  ContentKind.Treasure,
  ContentKind.Weapon,
]);

/** What `entry` belongs to: a heritage's ancestry; nothing for a versatile heritage or any other kind. */
function belongsTo(entry: ContentEntry): Pick<GrantEntry, 'belongsTo'> {
  const ancestry = entry.kind === ContentKind.Heritage ? entry.data.ancestry : undefined;
  return ancestry === undefined ? {} : { belongsTo: ancestry };
}

/** Whether a condition carries a value; nothing for any other kind. */
function valued(entry: ContentEntry): Pick<GrantEntry, 'valued'> {
  return entry.kind === ContentKind.Condition ? { valued: entry.data.valued } : {};
}

/** The conditions a condition overrides; nothing for any other kind, or for a condition that overrides none. */
function overrides(entry: ContentEntry): Pick<GrantEntry, 'overrides'> {
  return entry.kind === ContentKind.Condition && entry.data.overrides.length > 0
    ? { overrides: entry.data.overrides }
    : {};
}

/** Where a deity's options go: Foundry's `deity:primary`, as a character has one deity. */
const DEITY_PREFIX = 'deity:primary';

/**
 * What a deity says of its follower, as Foundry pf2e's `DeityPF2e.prepareActorData` sets it under `deity:primary`:
 * its sanctification (`sanctification:can:holy`, or `sanctification:none`), each favoured weapon and each divine
 * font; and, which Foundry keeps elsewhere, each domain, primary (`domain:fire`) or alternate (`alternate-domain:sun`),
 * which Domain Initiate offers (ADR-0050). Foundry's bare `deity` has no namespace, which a Pioneer roll option needs;
 * `deity:primary:<slug>`, which its kind sets, says as much. `self:deity:slug` is left out, as no rule element Pioneer
 * imports reads it.
 *
 * Each divine skill sets `deity:primary:skill:<skill>` too, which Foundry keeps in the actor's data instead, so a
 * cleric's divine skill choice can offer the deity's. Its spells come along for a `DeitySpells` element (ADR-0048).
 */
function deityFields(entry: ContentEntry): Pick<GrantEntry, 'characterOptions' | 'deitySpells'> {
  if (entry.kind !== ContentKind.Deity) {
    return {};
  }
  const { sanctification, weapons, font, skills, spells, domains } = entry.data;
  const sanctified =
    sanctification === undefined
      ? ['sanctification:none']
      : sanctification.what.map((what) => `sanctification:${sanctification.modal}:${what}`);
  const options = [
    ...sanctified,
    ...weapons.map((weapon) => `favored-weapon:${weapon}`),
    ...font.map((each) => `font:${each}`),
    ...skills,
    ...domains.primary.map((domain) => `domain:${domain}`),
    ...domains.alternate.map((domain) => `alternate-domain:${domain}`),
  ];
  const characterOptions = options.map((option) => RollOption.parse(`${DEITY_PREFIX}:${option}`));
  return { characterOptions, deitySpells: spells };
}

/**
 * A deity's domains as a query reads its candidate: `domain:fire` for a primary one and `alternate-domain:sun` for an
 * alternate, under `item:`, so a `ChoiceSet` can offer the deities that grant a domain (Divine Access).
 */
function domainOptions(entry: ContentEntry): RollOption[] {
  if (entry.kind !== ContentKind.Deity) {
    return [];
  }
  const { primary, alternate } = entry.data.domains;
  return [
    ...primary.map((domain) => RollOption.parse(`domain:${domain}`)),
    ...alternate.map((domain) => RollOption.parse(`alternate-domain:${domain}`)),
  ];
}

function traitOptions(traits: readonly Trait[]): RollOption[] {
  return traits.map((trait) => RollOption.parse(`trait:${trait}`));
}

/** A class feature's tags, `tag:cleric-doctrine`, which a subclass's `ChoiceSet` filters on; none for another kind. */
function tagOptions(entry: ContentEntry): RollOption[] {
  const tags = entry.kind === ContentKind.ClassFeature ? (entry.data.tags ?? []) : [];
  return tags.map((tag) => RollOption.parse(`tag:${tag}`));
}

/** A feat's category, `category:class`, which a feat slot's query filters on (`item:category:class`); none for another kind. */
function categoryOptions(entry: ContentEntry): RollOption[] {
  return entry.kind === ContentKind.Feat ? [RollOption.parse(`category:${entry.data.category}`)] : [];
}

/**
 * `level:<n>` for an entry with a level, which a feat slot's query reads as `item:level` (`{ "lte": ["item:level",
 * "self:level"] }`), as Foundry pf2e sets it; none for an entry without one.
 */
function levelOptions(entry: ContentEntry): RollOption[] {
  const level = 'level' in entry ? entry.level : undefined;
  return level === undefined ? [] : [RollOption.parse(`level:${level}`)];
}

/** The facts a list shows of an envelope entry: its level when it has one, rarity, traits and description. */
function factsOf(entry: ContentEntry): EntryFacts {
  const level = 'level' in entry ? entry.level : undefined;
  return {
    ...(level === undefined ? {} : { level }),
    rarity: entry.rarity,
    traits: entry.traits,
    description: entry.description,
  };
}

/** An ancestry as grants read it, with its rule elements: the ancestry features and feat slots it grants. */
function ancestryEntry(pack: ContentPack, ancestry: PackAncestry): GrantEntry | undefined {
  const [source, ...sources] = ancestry.sources;
  if (source === undefined) {
    return undefined;
  }
  return {
    id: ContentId.parse(contentId(pack.id, ancestry.slug)),
    kind: ContentKind.Ancestry,
    slug: slugName(ancestry.slug),
    name: ancestry.name,
    rules: ancestry.rules ?? [],
    sources: [source, ...sources],
    rollOptions: traitOptions(ancestry.traits),
    actorTraits: ancestry.traits,
  };
}

/** A background, class, class feature, feat or heritage, read from its envelope with its rule elements. */
function envelopeEntry(entry: ContentEntry): GrantEntry | undefined {
  const [source, ...sources] = entry.sources;
  if (source === undefined || !ENVELOPE_KINDS.has(entry.kind)) {
    return undefined;
  }
  return {
    id: entry.id,
    kind: entry.kind,
    slug: slugName(entry.slug),
    name: entry.name,
    rules: entry.rules,
    sources: [source, ...sources],
    rollOptions: [
      ...traitOptions(entry.traits),
      ...tagOptions(entry),
      ...categoryOptions(entry),
      ...levelOptions(entry),
      ...domainOptions(entry),
    ],
    facts: factsOf(entry),
    ...belongsTo(entry),
    ...valued(entry),
    ...overrides(entry),
    ...deityFields(entry),
  };
}

/** A variant rule as grants read it: the feat slots (`ChoiceSet`s) it adds while it is in force, as Free Archetype does. */
function variantEntry(pack: ContentPack, variant: VariantRuleDefinition): GrantEntry | undefined {
  const [source, ...sources] = variant.sources;
  if (source === undefined) {
    return undefined;
  }
  return {
    id: ContentId.parse(contentId(pack.id, variant.slug)),
    kind: ContentKind.VariantRule,
    slug: slugName(variant.slug),
    name: variant.name,
    rules: variant.rules,
    sources: [source, ...sources],
    rollOptions: [],
  };
}

function packEntries(pack: ContentPack): GrantEntry[] {
  return [
    ...pack.ancestries.flatMap((each) => ancestryEntry(pack, each) ?? []),
    ...pack.variantRules.flatMap((each) => variantEntry(pack, each) ?? []),
    ...pack.otherEntries.flatMap((each) => envelopeEntry(each) ?? []),
  ];
}

/**
 * The registry's content as grants read it: ancestries, heritages, backgrounds and classes, the kinds a character
 * picks in its root slots, the class features and feats they grant, and carried items. Other kinds join as the
 * registry holds them. Built once per registry; lookups are by id and by kind.
 */
export function grantLookup(registry: ContentRegistry): ContentLookup {
  const entries = registry.packs.flatMap((pack) => packEntries(pack));
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const byKind = Map.groupBy(entries, (entry) => entry.kind);
  return {
    entry: (id: ContentId): GrantEntry | undefined => byId.get(id),
    ofKind: (kind: ContentKind): readonly GrantEntry[] => byKind.get(kind) ?? [],
  };
}
