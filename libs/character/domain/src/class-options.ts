import { ContentKind, RuleElementKey } from '@pioneer/rules/sdk';
import type {
  AttributeBoost,
  ClassRole,
  ContentId,
  ContentRegistry,
  ContentText,
  HitPoints,
  MagicTradition,
  Proficiency,
  RichText,
  RuleElement,
  Selector,
  SkillCount,
  SourceRef,
} from '@pioneer/rules/sdk';

/** A statistic a class starts with a rank in, by selector: Perception, a save, a weapon or armor category. */
export interface ClassProficiency {
  readonly selector: Selector;
  readonly rank: Proficiency;
}

/** A class as a picker row reads it. */
export interface ClassOption {
  readonly id: ContentId;
  readonly name: ContentText;
  /** The attributes its key attribute may be. */
  readonly keyAttribute: AttributeBoost;
  readonly hitPoints: HitPoints;
  /** The skills it trains outright, as selectors (`skill:athletics`); the player picks `additionalSkills` more. */
  readonly trained: readonly Selector[];
  readonly additionalSkills: SkillCount;
  /** The traditions of the spellcasting its features give; none for a class that casts no spells. */
  readonly traditions: readonly MagicTradition[];
  /** The ranks it starts with, skills aside. */
  readonly proficiencies: readonly ClassProficiency[];
  /** The roles it plays, for filtering classes by play style; none for a class that sets no role. */
  readonly roles: readonly ClassRole[];
  readonly sources: readonly SourceRef[];
}

/** A subclass (a doctrine, muse, order or school) as a picker row reads it: a class feature and what it says. */
export interface SubclassOption {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly description: RichText;
  readonly sources: readonly SourceRef[];
}

/** What the class pickers read: each loaded class, and each class feature a subclass slot may offer. */
export interface ClassPickerContent {
  /** By name. */
  readonly classes: readonly ClassOption[];
  /** By id: the class features, which is what a subclass is. */
  readonly features: ReadonlyMap<ContentId, SubclassOption>;
  /** The traditions of a class feature's spellcasting, by feature id. */
  readonly traditions: ReadonlyMap<ContentId, readonly MagicTradition[]>;
}

/** The classes that play `role`, in the order given. */
export function classesForRole(classes: readonly ClassOption[], role: ClassRole): readonly ClassOption[] {
  return classes.filter((option) => option.roles.includes(role));
}

/** Class content already read, by registry: a registry's packs never change once loaded. */
const READ = new WeakMap<ContentRegistry, ClassPickerContent>();

/** The registry's classes and class features with the facts a picker shows; read once per registry. */
export function classPickerContent(registry: ContentRegistry): ClassPickerContent {
  const read = READ.get(registry) ?? readClasses(registry);
  READ.set(registry, read);
  return read;
}

const SKILL_PREFIX = 'skill:';

/** Whether a rule applies from the start: it carries no predicate, so no level or choice gates it. */
const unconditional = (rule: RuleElement): boolean => rule.predicate === undefined || rule.predicate.length === 0;

/** The `Proficiency` elements `rules` raise outright, in order. */
function startingRanks(rules: readonly RuleElement[]): ClassProficiency[] {
  return rules.flatMap((rule): ClassProficiency[] =>
    rule.key === RuleElementKey.Proficiency && typeof rule.selector === 'string' && unconditional(rule)
      ? [{ selector: rule.selector, rank: rule.rank }]
      : [],
  );
}

/** The traditions of the spellcasting entries `rules` give, each once. */
function traditionsOf(rules: readonly RuleElement[]): MagicTradition[] {
  const found = rules.flatMap((rule): MagicTradition[] =>
    rule.key === RuleElementKey.SpellcastingEntry ? [rule.tradition] : [],
  );
  return [...new Set(found)];
}

/** The ids `rules` grant outright by their id. */
function grantedIds(rules: readonly RuleElement[]): ContentId[] {
  return rules.flatMap((rule): ContentId[] =>
    rule.key === RuleElementKey.GrantItem && typeof rule.item === 'string' ? [rule.item] : [],
  );
}

function readClasses(registry: ContentRegistry): ClassPickerContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  const traditions = new Map(
    entries.flatMap((entry) =>
      entry.kind === ContentKind.ClassFeature ? [[entry.id, traditionsOf(entry.rules)] as const] : [],
    ),
  );
  const features = new Map(
    entries.flatMap((entry) =>
      entry.kind === ContentKind.ClassFeature
        ? [
            [
              entry.id,
              { id: entry.id, name: entry.name, description: entry.description, sources: entry.sources },
            ] as const,
          ]
        : [],
    ),
  );
  const classes = entries.flatMap((entry): ClassOption[] => {
    if (entry.kind !== ContentKind.Class) {
      return [];
    }
    const ranks = startingRanks(entry.rules);
    const granted = grantedIds(entry.rules).flatMap((id) => traditions.get(id) ?? []);
    return [
      {
        id: entry.id,
        name: entry.name,
        keyAttribute: entry.data.keyAttribute,
        hitPoints: entry.data.hitPoints,
        trained: ranks.filter((each) => each.selector.startsWith(SKILL_PREFIX)).map((each) => each.selector),
        additionalSkills: entry.data.additionalSkills,
        traditions: [...new Set(granted)],
        proficiencies: ranks.filter((each) => !each.selector.startsWith(SKILL_PREFIX)),
        roles: entry.data.roles ?? [],
        sources: entry.sources,
      },
    ];
  });
  return {
    classes: classes.toSorted((left, right) => left.name.localeCompare(right.name)),
    features,
    traditions,
  };
}
