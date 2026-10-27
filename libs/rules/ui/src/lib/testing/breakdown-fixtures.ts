import {
  BaseTermKind,
  EngineMessage,
  InactiveReason,
  LineStatusKind,
  OverridePhase,
  OverrideStatusKind,
  RuleId,
  SuppressionReason,
  TermSign,
} from '@pioneer/rules/engine';
import type {
  BaseTerm,
  BreakdownLine,
  LineStatus,
  ModifierLabel,
  OverrideLine,
  StatisticFailure,
  StatisticValue,
} from '@pioneer/rules/engine';
import { FormulaMessage, FormulaText, FormulaValue, TextPosition } from '@pioneer/rules/formula';
import { Negated, PredicateMessage, SummaryKind } from '@pioneer/rules/predicate';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import {
  ContentId,
  contentId,
  ContentText,
  EntrySlug,
  ModifierType,
  Origin,
  PackId,
  Predicate,
  Selector,
  StatisticKind,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { NamedStatistic } from '../statistics/statistics.component';

const PLAYER_CORE = PackId.parse('player-core');
const CORE_RULES = PackId.parse('core-rules');

export const BREASTPLATE = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('armor:breastplate')));
const SHIELD = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('shield:steel-shield')));
const FRIGHTENED = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('condition:frightened')));
export const GOLEM_FORM = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('spell:golem-form')));
export const MAGE_ARMOR = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('spell:mage-armor')));
/** A made-up feat, so the fixture claims nothing about a real one's rules. */
export const GLOOM_WALKER = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('feat:gloom-walker')));
/** Made up, like Gloom Walker. */
export const STEADY_GRIP = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('feat:steady-grip')));
export const SURE_FOOTING = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('feat:sure-footing')));
export const CLIMBING_HOOKS = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('equipment:climbing-hooks')));
export const WITHOUT_LEVEL = ContentId.parse(
  contentId(CORE_RULES, EntrySlug.parse('variant-rule:proficiency-without-level')),
);

/** Display names for the fixtures' entries, as a container resolves them from the registry. */
export const ENTRY_NAMES: ReadonlyMap<ContentId, string> = new Map([
  [BREASTPLATE, 'Breastplate'],
  [SHIELD, 'Steel Shield'],
  [FRIGHTENED, 'Frightened'],
  [GOLEM_FORM, 'Golem Form'],
  [MAGE_ARMOR, 'Mage Armor'],
  [WITHOUT_LEVEL, 'Proficiency Without Level'],
  [GLOOM_WALKER, 'Gloom Walker'],
  [STEADY_GRIP, 'Steady Grip'],
  [SURE_FOOTING, 'Sure Footing'],
  [CLIMBING_HOOKS, 'Climbing Hooks'],
]);

export function origin(entry: ContentId): Origin {
  return Origin.parse({ hops: [], entry, sources: [{ kind: 'book', book: 'player-core', page: 1 }] });
}

/** The id of the `rule`th rule element on an entry. */
export function ruleId(entry: ContentId, rule = 0): RuleId {
  return RuleId.parse(`${entry}#${rule}`);
}

interface LineOptions {
  readonly type: ModifierType;
  /** Left out for a failed line. */
  readonly value?: number;
  readonly status?: LineStatus;
  /** The line's own label; by default, its entry's name. */
  readonly label?: ModifierLabel;
}

export function line(entry: ContentId, { type, value, status, label }: LineOptions): BreakdownLine {
  return {
    modifier: {
      id: ruleId(entry),
      slug: undefined,
      label: label ?? { entry },
      type,
      targets: [],
      predicate: undefined,
      origin: origin(entry),
    },
    value: value === undefined ? undefined : FormulaValue.parse(value),
    adjustedBy: [],
    status: status ?? { kind: LineStatusKind.Applied },
  };
}

export function term(formula: string, value: number, sign: TermSign = TermSign.Plus): BaseTerm {
  return {
    kind: BaseTermKind.Term,
    formula: FormulaText.parse(formula),
    sign,
    value: FormulaValue.parse(value),
    position: TextPosition.parse(1),
    origin: undefined,
  };
}

interface StatisticOptions {
  readonly base: readonly BaseTerm[];
  readonly lines?: readonly BreakdownLine[];
  /** `Change`s and set overrides in the order they ran; the last applied set override pins the total. */
  readonly overrides?: readonly OverrideLine[];
}

/**
 * A statistic whose base is what its terms add up to, or what its last applied `Change` left; its computed total is
 * that base plus its applied lines, and an applied set override pins the total to the value it left.
 */
export function statistic(selector: string, { base, lines = [], overrides = [] }: StatisticOptions): StatisticValue {
  const formulaValue = base.reduce((sum, { value }) => sum + value, 0);
  const changed = overrides.findLast(
    ({ phase, status }) => phase === OverridePhase.Base && status.kind === OverrideStatusKind.Applied,
  );
  const baseValue = changed?.result ?? formulaValue;
  const applied = lines.filter(({ status }) => status.kind === LineStatusKind.Applied);
  const computed = applied.reduce((sum, { value }) => sum + (value ?? 0), baseValue);
  const pin = overrides.findLast(
    ({ phase, status }) => phase === OverridePhase.Total && status.kind === OverrideStatusKind.Applied,
  );
  return {
    ok: true,
    selector: Selector.parse(selector),
    base,
    formulaValue: FormulaValue.parse(formulaValue),
    baseValue: FormulaValue.parse(baseValue),
    lines,
    computed: FormulaValue.parse(computed),
    total: pin?.result ?? FormulaValue.parse(computed),
    overrides,
    pinnedBy: pin?.id,
  };
}

/** Conditional on an authored summary, as `display.summary` gives one. */
const WHILE_RAISED: LineStatus = {
  kind: LineStatusKind.Conditional,
  when: Predicate.parse(['self:effect:raise-a-shield']),
  summary: { kind: SummaryKind.Authored, text: ContentText.parse('your shield is raised') },
  beatenBy: undefined,
};

/** A generated phrase: "you are in darkness". */
export const IN_DARKNESS_SUMMARY: PredicateSummary = {
  kind: SummaryKind.Phrase,
  message: message(PredicateMessage.Lighting, { negated: Negated.No, name: 'darkness' }),
};

/** Conditional on a generated phrase. */
export const IN_DARKNESS: LineStatus = {
  kind: LineStatusKind.Conditional,
  when: Predicate.parse(['lighting:darkness']),
  summary: IN_DARKNESS_SUMMARY,
  beatenBy: undefined,
};

/** A formula that reads `@item.level` where it has no value. */
export const UNKNOWN_LEVEL: MessageDescriptor = message(FormulaMessage.UnknownReference, {
  found: '@item.level',
  position: 1,
});

/** A line whose formula reads a reference with no value. */
const UNKNOWN_REFERENCE: LineStatus = {
  kind: LineStatusKind.Failed,
  error: UNKNOWN_LEVEL,
  position: TextPosition.parse(1),
};

const AC_BASE = 10;
const DEX = 1;
const AC_PROFICIENCY = 5;
const BREASTPLATE_BONUS = 4;
const MAGE_ARMOR_BONUS = 1;
const SHIELD_BONUS = 2;
const FRIGHTENED_PENALTY = -1;
const CON = 3;
const FORTITUDE_PROFICIENCY = 7;
const WIS = 1;
const SAVE_PROFICIENCY = 5;

/** A level 3 fighter's AC: an item bonus that beats another, a shield not raised, a condition not on, a failed line. */
export const FIGHTER_AC: StatisticValue = statistic('ac', {
  base: [term('10', AC_BASE), term('@attr.dex.capped', DEX), term('@prof.ac', AC_PROFICIENCY)],
  lines: [
    line(MAGE_ARMOR, {
      type: ModifierType.Item,
      value: MAGE_ARMOR_BONUS,
      status: { kind: LineStatusKind.Suppressed, by: ruleId(BREASTPLATE), reason: SuppressionReason.Stacking },
    }),
    line(BREASTPLATE, { type: ModifierType.Item, value: BREASTPLATE_BONUS }),
    line(SHIELD, { type: ModifierType.Circumstance, value: SHIELD_BONUS, status: WHILE_RAISED }),
    line(FRIGHTENED, {
      type: ModifierType.Status,
      value: FRIGHTENED_PENALTY,
      status: { kind: LineStatusKind.Inactive, reason: InactiveReason.Predicate },
    }),
    line(GOLEM_FORM, { type: ModifierType.Untyped, status: UNKNOWN_REFERENCE }),
  ],
});

export const FIGHTER_FORTITUDE: StatisticValue = statistic('save:fortitude', {
  base: [term('@attr.con', CON), term('@prof.save.fortitude', FORTITUDE_PROFICIENCY)],
});

export const FIGHTER_WILL: StatisticValue = statistic('save:will', {
  base: [term('@attr.wis', WIS), term('@prof.save.will', SAVE_PROFICIENCY)],
});

/** A statistic in a loop with another, so it has no value. */
export const CYCLE: StatisticFailure = {
  ok: false,
  selector: Selector.parse('perception'),
  error: message(EngineMessage.StatisticCycle, {
    found: '@stat.save:will',
    position: 1,
    statistics: 'perception, save:will',
    count: 2,
  }),
  position: TextPosition.parse(1),
};

/** The sheet's statistics for a level 3 fighter, in display order. */
export const FIGHTER_STATISTICS: readonly NamedStatistic[] = [
  { name: 'Armor Class', kind: StatisticKind.Dc, result: FIGHTER_AC },
  { name: 'Fortitude', kind: StatisticKind.Check, result: FIGHTER_FORTITUDE },
  { name: 'Will', kind: StatisticKind.Check, result: FIGHTER_WILL },
];

const DEX_STEALTH = 4;
const STEALTH_PROFICIENCY = 5;
const GLOOM_WALKER_BONUS = 1;
const UNSEEN_BONUS = 2;

/** Conditional, with no words for when: the predicate has nothing the summary vocabulary covers. */
const SOME_SITUATIONS: LineStatus = {
  kind: LineStatusKind.Conditional,
  when: Predicate.parse(['origin:unseen']),
  summary: undefined,
  beatenBy: undefined,
};

/** A rogue's Stealth: one line conditional on darkness, worded, and one conditional with no words for when. */
const ROGUE_STEALTH: StatisticValue = statistic('skill:stealth', {
  base: [term('@attr.dex', DEX_STEALTH), term('@prof.skill.stealth', STEALTH_PROFICIENCY)],
  lines: [
    line(GLOOM_WALKER, { type: ModifierType.Circumstance, value: GLOOM_WALKER_BONUS, status: IN_DARKNESS }),
    line(GLOOM_WALKER, {
      type: ModifierType.Status,
      value: UNSEEN_BONUS,
      status: SOME_SITUATIONS,
      label: { text: ContentText.parse('Unseen') },
    }),
  ],
});

/** The fighter's statistics, then a skill with conditional lines. */
export const CONDITIONAL_STATISTICS: readonly NamedStatistic[] = [
  ...FIGHTER_STATISTICS,
  { name: 'Stealth', kind: StatisticKind.Check, result: ROGUE_STEALTH },
];
