import { ActionCost, FacetMessage, TargetValue } from '@pioneer/rules/sdk';
import type { DamageType, QueryParams } from '@pioneer/rules/sdk';
import { DAMAGE_TYPE_MESSAGES } from '@pioneer/rules/ui';
import type { SpellCostLine, SpellFilterGroup, SpellFilterOption, SpellRowLine } from '@pioneer/rules/ui';
import type { ValueOf } from '@pioneer/shared/kernel';

/** The properties the Spells tab filters by (#1785); each is a group of values, and a spell must pass every group that has a pick. */
export const SpellFilterGroupId = {
  Target: 'target',
  Trait: 'trait',
  Damage: 'damage',
  Actions: 'actions',
  Source: 'source',
} as const;
export type SpellFilterGroupId = ValueOf<typeof SpellFilterGroupId>;

/** The picks of each group; a group with none keeps every spell. */
export type SpellPicks = ReadonlyMap<SpellFilterGroupId, ReadonlySet<string>>;

export const NO_SPELL_FILTER: SpellPicks = new Map();

/** A spell row with where it comes from: the name of the entry, item or feat that grants it. */
export interface SourcedSpell {
  readonly line: SpellRowLine;
  readonly source: string | undefined;
}

/** The message keys that word the groups and the values a closed set has. */
const GROUP_MESSAGES: Readonly<Record<SpellFilterGroupId, string>> = {
  [SpellFilterGroupId.Target]: 'rules.facet.label.targets',
  [SpellFilterGroupId.Trait]: FacetMessage.Traits,
  [SpellFilterGroupId.Damage]: 'rules.facet.label.damageType',
  [SpellFilterGroupId.Actions]: 'rules.facet.label.castActions',
  [SpellFilterGroupId.Source]: 'character.sheet.spellFilter.source',
};

/** The existing target filter's keys are kept for single and multiple targets (#484). */
const TARGET_MESSAGES: Readonly<Record<TargetValue, string>> = {
  [TargetValue.Single]: 'character.sheet.spellTargets.single',
  [TargetValue.Multiple]: 'character.sheet.spellTargets.multiple',
  [TargetValue.Allies]: 'rules.facet.targets.allies',
  [TargetValue.Self]: 'rules.facet.targets.self',
  [TargetValue.None]: 'rules.facet.targets.none',
};

/** What a spell is cast in: an action count, a free action, a reaction, or a time of minutes or longer. */
const TIME = 'time';
const ACTION_MESSAGES: Readonly<Record<string, string>> = {
  [ActionCost.One]: 'rules.facet.castActions.one',
  [ActionCost.Two]: 'rules.facet.castActions.two',
  [ActionCost.Three]: 'rules.facet.castActions.three',
  [ActionCost.Free]: 'rules.facet.castActions.free',
  [ActionCost.Reaction]: 'rules.facet.castActions.reaction',
  [TIME]: 'rules.facet.castActions.time',
};
const ACTION_ORDER: readonly ActionCost[] = [ActionCost.One, ActionCost.Two, ActionCost.Three];

function actionsOf(cost: SpellCostLine): readonly string[] {
  if (cost.kind === 'either') {
    return cost.options.flatMap((option) => actionsOf(option));
  }
  if (cost.kind === 'time') {
    return [TIME];
  }
  const from = ACTION_ORDER.indexOf(cost.cost);
  const to = cost.upTo === undefined ? from : ACTION_ORDER.indexOf(cost.upTo);
  return from === -1 ? [cost.cost] : ACTION_ORDER.slice(from, to + 1);
}

/** The damage types a spell deals; healing and untyped damage have none. */
function damageTypesOf({ detail }: SpellRowLine): readonly DamageType[] {
  return detail.effects.flatMap(({ roll }) =>
    roll.healing === true ? [] : roll.instances.flatMap(({ damageType }) => damageType ?? []),
  );
}

/** The values a spell has in each group, unique within the group. */
function valuesOf({ line, source }: SourcedSpell): Readonly<Record<SpellFilterGroupId, readonly string[]>> {
  const { detail } = line;
  return {
    [SpellFilterGroupId.Target]: [...new Set(detail.targetValues)],
    [SpellFilterGroupId.Trait]: [...new Set(detail.traits.map(({ label }) => label))],
    [SpellFilterGroupId.Damage]: [...new Set(damageTypesOf(line))],
    [SpellFilterGroupId.Actions]: [...new Set(actionsOf(detail.cost))],
    [SpellFilterGroupId.Source]: source === undefined ? [] : [source],
  };
}

const GROUPS: readonly SpellFilterGroupId[] = Object.values(SpellFilterGroupId);

function passes(spell: SourcedSpell, filter: SpellPicks, skip?: SpellFilterGroupId): boolean {
  const picking = GROUPS.filter((group) => group !== skip && (filter.get(group)?.size ?? 0) > 0);
  if (picking.length === 0) {
    return true;
  }
  const values = valuesOf(spell);
  return picking.every((group) => values[group].some((value) => filter.get(group)?.has(value) === true));
}

/** The spells every group of `filter` keeps: OR within a group, AND across groups. */
export function filterSpells(spells: readonly SourcedSpell[], filter: SpellPicks): readonly SourcedSpell[] {
  return spells.filter((spell) => passes(spell, filter));
}

/** Words a value of a group for the viewer. */
export type ValueWords = (group: SpellFilterGroupId, value: string) => string;

/** The message of each closed set's values, by the value as the URL carries it. */
const VALUE_MESSAGES: Readonly<Record<SpellFilterGroupId, ReadonlyMap<string, string>>> = {
  [SpellFilterGroupId.Target]: new Map(Object.entries(TARGET_MESSAGES)),
  [SpellFilterGroupId.Trait]: new Map(),
  [SpellFilterGroupId.Damage]: new Map(Object.entries(DAMAGE_TYPE_MESSAGES)),
  [SpellFilterGroupId.Actions]: new Map(Object.entries(ACTION_MESSAGES)),
  [SpellFilterGroupId.Source]: new Map(),
};

/** The text of a value: a closed set's message, else the value itself (a trait's or a source's name). */
export function wordValue(translate: (key: string) => string): ValueWords {
  return (group, value) => {
    const key = VALUE_MESSAGES[group].get(value);
    return key === undefined ? value : translate(key);
  };
}

/**
 * The groups the filter panel shows, from the character's own spells: only values some spell has are options, each with how
 * many spells picking it would leave given the other groups' picks. A value picked but no longer in any spell is kept, at
 * zero, so it can be cleared.
 */
export function spellFilterGroups(
  spells: readonly SourcedSpell[],
  filter: SpellPicks,
  words: { readonly label: (key: string) => string; readonly value: ValueWords },
): readonly SpellFilterGroup[] {
  return GROUPS.map((group): SpellFilterGroup => {
    const selected = filter.get(group) ?? new Set<string>();
    const counts = new Map<string, number>([...selected].map((value) => [value, 0]));
    for (const spell of spells.filter((each) => passes(each, filter, group))) {
      for (const value of valuesOf(spell)[group]) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    const options = [...counts]
      .map(([value, count]): SpellFilterOption => ({ value, label: words.value(group, value), count }))
      .toSorted((left, right) => left.label.localeCompare(right.label));
    return { id: group, label: words.label(GROUP_MESSAGES[group]), options, selected };
  });
}

/** `s.target`, `s.trait`: the spell filters' query params, apart from the other lists' (`f.<facet>`). */
const PARAM_PREFIX = 's.';
const paramOf = (group: SpellFilterGroupId): string => `${PARAM_PREFIX}${group}`;

/** Every spell filter param cleared, so a group the new state drops leaves the URL. */
export const SPELL_FILTER_CLEARED: Readonly<Record<string, undefined>> = Object.fromEntries(
  GROUPS.map((group) => [paramOf(group), undefined]),
);

/** The filters the URL holds; a param repeats once per value (`s.source=A&s.source=B`), so a name with a comma is safe. */
export function spellFilterFromQuery(params: QueryParams): SpellPicks {
  return new Map(
    GROUPS.flatMap((group): [SpellFilterGroupId, ReadonlySet<string>][] => {
      const raw: unknown = params[paramOf(group)];
      const values = (Array.isArray(raw) ? (raw as unknown[]) : [raw]).filter(
        (value): value is string => typeof value === 'string' && value !== '',
      );
      return values.length === 0 ? [] : [[group, new Set(values)]];
    }),
  );
}

/** The query params that put `filter` in the URL, with every group it leaves out cleared. */
export function spellFilterToQuery(filter: SpellPicks): Readonly<Record<string, readonly string[] | undefined>> {
  return {
    ...SPELL_FILTER_CLEARED,
    ...Object.fromEntries(
      GROUPS.flatMap((group): [string, readonly string[]][] => {
        const picked = filter.get(group);
        return picked === undefined || picked.size === 0 ? [] : [[paramOf(group), [...picked].toSorted()]];
      }),
    ),
  };
}

/** `filter` with the group named `group` picking `selected`; a group with none picked leaves the filter, and an unknown group changes nothing. */
export function withSpellPicks(filter: SpellPicks, group: string, selected: ReadonlySet<string>): SpellPicks {
  const id = GROUPS.find((each) => each === group);
  if (id === undefined) {
    return filter;
  }
  const next = new Map(filter);
  if (selected.size === 0) {
    next.delete(id);
  } else {
    next.set(id, selected);
  }
  return next;
}
