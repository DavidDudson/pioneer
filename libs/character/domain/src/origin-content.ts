import { ContentId, ContentKind, RuleElementKey, Selector } from '@pioneer/rules/sdk';
import type {
  AncestryDefinition,
  AttributeBoost,
  ContentRegistry,
  ContentText,
  RichText,
  RuleElement,
  SourceRef,
} from '@pioneer/rules/sdk';

/** An ancestry as a picker row reads it: what it is, how it is printed, and the facts of its definition. */
export interface AncestryOption {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly definition: AncestryDefinition;
  readonly sources: ReadonlyArray<SourceRef>;
}

/** A heritage as a picker row reads it. */
export interface HeritageOption {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly description: RichText;
  /** The ancestry it belongs to; undefined for a versatile heritage. */
  readonly ancestry: ContentId | undefined;
  /** What it grants, by name: the features and feats its `GrantItem` elements give. */
  readonly grants: ReadonlyArray<ContentText>;
  readonly sources: ReadonlyArray<SourceRef>;
}

/** A background as a picker row reads it. */
export interface BackgroundOption {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly description: RichText;
  readonly boosts: ReadonlyArray<AttributeBoost>;
  /** The skills and Lores it trains, as selectors (`skill:athletics`, `skill:lore:farming`). */
  readonly trained: ReadonlyArray<Selector>;
  /** The feats it grants, by name. */
  readonly feats: ReadonlyArray<ContentText>;
  readonly sources: ReadonlyArray<SourceRef>;
}

/** What the origin pickers read: each loaded ancestry, heritage and background. */
export interface OriginContent {
  /** By name. */
  readonly ancestries: ReadonlyArray<AncestryOption>;
  readonly heritages: ReadonlyArray<HeritageOption>;
  readonly backgrounds: ReadonlyArray<BackgroundOption>;
}

/** Origin content already read, by registry: a registry's packs never change once loaded. */
const READ = new WeakMap<ContentRegistry, OriginContent>();

/** The registry's ancestries, heritages and backgrounds with the facts a picker shows; read once per registry. */
export function originContent(registry: ContentRegistry): OriginContent {
  const read = READ.get(registry) ?? readOrigins(registry);
  READ.set(registry, read);

  return read;
}

const byName = <TOption extends { readonly name: ContentText }>(
  options: ReadonlyArray<TOption>,
): ReadonlyArray<TOption> => options.toSorted((left, right) => left.name.localeCompare(right.name));

/** The names of what `rules` grant outright, in order; a grant the player picks (`ChoiceRef`) is not one. */
function grantedNames(
  rules: ReadonlyArray<RuleElement>,
  names: ReadonlyMap<ContentId, ContentText>,
): Array<ContentText> {
  return rules.flatMap((rule): Array<ContentText> => {
    if (rule.key !== RuleElementKey.GrantItem) {
      return [];
    }

    const item = ContentId.safeParse(rule.item);
    const name = item.success ? names.get(item.data) : undefined;

    return name === undefined ? [] : [name];
  });
}

/** The selectors `rules` raise outright, which a background does to train its skill and Lore. */
function trainedSelectors(rules: ReadonlyArray<RuleElement>): Array<Selector> {
  return rules.flatMap((rule): Array<Selector> => {
    if (rule.key !== RuleElementKey.Proficiency) {
      return [];
    }

    const selector = Selector.safeParse(rule.selector);

    return selector.success ? [selector.data] : [];
  });
}

function readOrigins(registry: ContentRegistry): OriginContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  const names = new Map<ContentId, ContentText>(entries.map((entry) => [entry.id, entry.name]));

  const ancestries = registry.ancestries().map((entry): AncestryOption => ({
    id: ContentId.parse(entry.id),
    name: entry.definition.name,
    definition: entry.definition,
    sources: entry.pack.ancestries.find((ancestry) => ancestry.slug === entry.definition.slug)?.sources ?? [],
  }));

  const heritages = entries.flatMap((entry): Array<HeritageOption> =>
    entry.kind === ContentKind.Heritage
      ? [
          {
            id: entry.id,
            name: entry.name,
            description: entry.description,
            ancestry: entry.data.ancestry,
            grants: grantedNames(entry.rules, names),
            sources: entry.sources,
          },
        ]
      : [],
  );

  const backgrounds = entries.flatMap((entry): Array<BackgroundOption> =>
    entry.kind === ContentKind.Background
      ? [
          {
            id: entry.id,
            name: entry.name,
            description: entry.description,
            boosts: entry.data.boosts,
            trained: trainedSelectors(entry.rules),
            feats: grantedNames(entry.rules, names),
            sources: entry.sources,
          },
        ]
      : [],
  );

  return { ancestries: byName(ancestries), heritages: byName(heritages), backgrounds: byName(backgrounds) };
}
