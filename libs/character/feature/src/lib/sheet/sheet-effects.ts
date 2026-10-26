import { effectContent, EffectSourceKind, isPolymorphEntry, steppedBadge } from '@pioneer/character/domain';
import type {
  ActiveEffect,
  EffectBadgeValue,
  CounterTerms,
  EffectInstanceId,
  EffectTerms,
} from '@pioneer/character/domain';
import { ContentKind, EffectBadgeType, RollOption, RuleElementKey, SpellRank } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, DamageFormula } from '@pioneer/rules/sdk';

/** The registry kind the effects picker and the sheet's effect list read. */
export const EFFECT_CONTENT_KINDS: readonly ContentKind[] = [ContentKind.Effect];

/** Whether two reads of the effects hold the same ones, so a play edit that leaves them alone derives nothing again. */
export function sameEffects(
  left: readonly ActiveEffect[] | undefined,
  right: readonly ActiveEffect[] | undefined,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** An effect the content has, as the add picker offers it. */
export interface EffectOption {
  readonly id: ContentId;
  readonly name: string;
  /** The formula its badge rolls when it is applied, if the badge is rolled. */
  readonly formula: DamageFormula | undefined;
  /** Whether it is a polymorph effect, which is cast at a rank and replaces the one before. */
  readonly polymorph: boolean;
  /** The lowest rank it can be cast at: its own level. */
  readonly rankFloor: SpellRank;
  /** The forms its choice offers, each the roll option that picks the rules for it; none when it offers none. */
  readonly forms: readonly FormChoice[];
}

/** One form an effect offers: the roll option its choice sets, and its name. */
interface FormChoice {
  readonly option: RollOption;
  readonly label: string;
}

/** Where an effect came from, as the sheet words it. */
interface EffectSourceView {
  readonly kind: EffectSourceKind;
  /** The ally who gave it; undefined for the character itself and for a GM. */
  readonly name: string | undefined;
}

/** A line of what an effect was applied with: a message key and the parameters it reads. */
interface EffectDetail {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/** One effect active on the character, as the sheet lists it. */
export interface EffectView {
  readonly id: EffectInstanceId;
  /** The effect's content entry, which the sheet's preview opens. */
  readonly effect: ContentId;
  readonly name: string;
  readonly source: EffectSourceView;
  /** Rounds left, for an effect with a clock. */
  readonly remaining: number | undefined;
  readonly badge: EffectBadgeValue | undefined;
  /** The rounds left, and the form and rank of a polymorph effect: muted lines the list shows after its name. */
  readonly details: readonly EffectDetail[];
  /** The counter a badge steps through, for an effect whose badge is one. */
  readonly counter: CounterTerms | undefined;
  /** Whether the counter has a step up and a step down left: it holds at its bounds unless it loops. */
  readonly canRaise: boolean;
  readonly canLower: boolean;
}

type EffectEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Effect }>;

function isEffect(entry: ContentEntry): entry is EffectEntry {
  return entry.kind === ContentKind.Effect;
}

/** The effects of the registry's packs by id; the last pack's entry wins, as in the registry. */
function effectEntries(registry: ContentRegistry): ReadonlyMap<ContentId, EffectEntry> {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return new Map(entries.flatMap((entry) => (isEffect(entry) ? [[entry.id, entry] as const] : [])));
}

/** The forms the effect's `ChoiceSet` offers, as the roll options picking them set; none for an effect without one. */
function formChoicesOf(entry: EffectEntry): readonly FormChoice[] {
  return entry.rules.flatMap((rule): FormChoice[] => {
    if (rule.key !== RuleElementKey.ChoiceSet || rule.rollOption === undefined || !Array.isArray(rule.choices)) {
      return [];
    }
    const { rollOption } = rule;
    return rule.choices.map(({ value, label }) => ({ option: RollOption.parse(`${rollOption}:${value}`), label }));
  });
}

/** The lowest rank an effect is cast at: its level, never below the first rank. */
function rankFloorOf(entry: EffectEntry): SpellRank {
  const level = SpellRank.safeParse(entry.level);
  return level.success ? level.data : SpellRank.parse(1);
}

function formulaOf(terms: EffectTerms | undefined): DamageFormula | undefined {
  return terms?.badge?.type === EffectBadgeType.Formula ? terms.badge.formula : undefined;
}

/** Every effect the content has, by name, for the add picker. */
export function effectOptions(registry: ContentRegistry): readonly EffectOption[] {
  const terms = effectContent(registry);
  return [...effectEntries(registry).values()]
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      formula: formulaOf(terms.get(entry.id)),
      polymorph: isPolymorphEntry(entry.traits, entry.rules),
      rankFloor: rankFloorOf(entry),
      forms: formChoicesOf(entry),
    }))
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

function counterOf(terms: EffectTerms | undefined): CounterTerms | undefined {
  return terms?.badge?.type === EffectBadgeType.Counter ? terms.badge : undefined;
}

/** Whether a counter at `badge` has a step up or down left: it holds at its bounds unless it loops. */
function canStep(counter: CounterTerms | undefined, badge: EffectBadgeValue | undefined, up: boolean): boolean {
  return counter !== undefined && badge !== undefined && steppedBadge(counter, badge, up) !== badge;
}

/** The rounds left, the form chosen and the rank cast at, as lines the list shows. */
function detailsOf(entry: EffectEntry, each: ActiveEffect): readonly EffectDetail[] {
  const form = formChoicesOf(entry).find(({ option }) => option === each.form);
  return [
    ...(each.remaining === undefined
      ? []
      : [{ key: 'character.sheet.effects.remaining', params: { count: each.remaining } }]),
    ...(form === undefined ? [] : [{ key: 'character.sheet.effects.form', params: { name: form.label } }]),
    ...(each.rank === undefined ? [] : [{ key: 'character.sheet.effects.rank', params: { rank: each.rank } }]),
  ];
}

/** Each effect active on the character with its source, rounds left and badge. An effect the content lacks is left out. */
export function effectViews(registry: ContentRegistry, active: readonly ActiveEffect[]): readonly EffectView[] {
  const entries = effectEntries(registry);
  const terms = effectContent(registry);
  return active.flatMap((each): EffectView[] => {
    const entry = entries.get(each.effect);
    if (entry === undefined) {
      return [];
    }
    const counter = counterOf(terms.get(each.effect));
    return [
      {
        id: each.id,
        effect: each.effect,
        name: entry.name,
        source: {
          kind: each.source.kind,
          name: each.source.kind === EffectSourceKind.Ally ? each.source.name : undefined,
        },
        remaining: each.remaining,
        badge: each.badge,
        details: detailsOf(entry, each),
        counter,
        canRaise: canStep(counter, each.badge, true),
        canLower: canStep(counter, each.badge, false),
      },
    ];
  });
}

/** The badge one step up or down from its value, held at its bounds or looped as the content says. */
export function steppedView(view: EffectView, up: boolean): EffectBadgeValue | undefined {
  return view.counter === undefined || view.badge === undefined
    ? undefined
    : steppedBadge(view.counter, view.badge, up);
}
