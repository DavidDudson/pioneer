import { describe, expect, test } from 'bun:test';

import { BaseTermKind, deriveStatistics } from '@pioneer/rules/engine';
import type { BaseTerm, BreakdownLine, ModifierLabel, OverrideLine, StatisticResult } from '@pioneer/rules/engine';
import { OriginHopKind, Proficiency } from '@pioneer/rules/sdk';
import type { Origin, OriginHop, Selector } from '@pioneer/rules/sdk';

import { AC_BASE, core, LORE_SELECTORS, noFacts, PWL, withoutLevel } from './testing/core-rules';
import {
  level1Fighter,
  level1FighterFacts,
  level1FighterItems,
  level1FighterRules,
  SCALE_MAIL_AC,
  SCALE_MAIL_CHECK_PENALTY,
  SCALE_MAIL_SPEED_PENALTY,
  STEEL_SHIELD_AC,
} from './testing/fighter';

/**
 * A statistic as a player checks it against the book: each base term as `<sign> <formula> = <value>`, marked when a
 * variant rule set it; each modifier line as `<type> <value> <status> (<item>)`; each override line; and the total.
 */
interface Checked {
  readonly base: readonly string[];
  readonly lines: readonly string[];
  readonly overrides: readonly string[];
  readonly total: number;
}

/** How a term set by Proficiency Without Level is marked: its origin's variant hop, naming the rule. */
const VARIANT_MARK = ` (variant ${PWL})`;

function hopText(hop: OriginHop): string {
  return hop.kind === OriginHopKind.Variant ? `variant ${hop.rule}` : hop.kind;
}

function originText(origin: Origin | undefined): string {
  return origin === undefined ? '' : ` (${origin.hops.map((hop) => hopText(hop)).join(', ')})`;
}

const itemNames = new Map(
  Object.entries(level1FighterItems).flatMap(([slug, rules]) => rules.map((rule) => [String(rule.origin.entry), slug])),
);

function termText(line: BaseTerm): string {
  if (line.kind === BaseTermKind.Rounding) {
    return `rounding = ${line.value}`;
  }
  return `${line.sign} ${line.formula} = ${line.value}${originText(line.origin)}`;
}

/** An entry's label as the item's slug; the rule's own text; or an engine label's message key. */
function labelText(label: ModifierLabel): string {
  if ('entry' in label) {
    return itemNames.get(String(label.entry)) ?? String(label.entry);
  }
  return 'text' in label ? String(label.text) : label.message.key;
}

function lineText({ modifier, value, status }: BreakdownLine): string {
  return `${modifier.type} ${value} ${status.kind} (${labelText(modifier.label)})`;
}

function overrideText({ phase, mode, value, result, status }: OverrideLine): string {
  return `${phase} ${mode} ${value} = ${result} ${status.kind}`;
}

/** Every statistic, as checked; a statistic that fails throws with its error key. */
function checked(results: ReadonlyMap<Selector, StatisticResult>): Record<string, Checked> {
  return Object.fromEntries(
    [...results].map(([selector, result]): [string, Checked] => {
      if (!result.ok) {
        throw new Error(`${selector} failed: ${result.error.key}`);
      }
      const { base, lines, overrides, total } = result;
      return [
        selector,
        {
          base: base.map((line) => termText(line)),
          lines: lines.map((line) => lineText(line)),
          overrides: overrides.map((line) => overrideText(line)),
          total,
        },
      ];
    }),
  );
}

/** A proficiency bonus for the fighter's ranks at level 1, and whether a variant rule set it. */
interface ProficiencyTable {
  readonly bonus: Readonly<Record<Proficiency, number>>;
  readonly mark: string;
}

/** Player Core: the rank's bonus plus level 1 when trained or better. */
const STANDARD: ProficiencyTable = {
  bonus: { untrained: 0, trained: 3, expert: 5, master: 7, legendary: 9 },
  mark: '',
};

/** GM Core's Proficiency Without Level: the rank's bonus alone, and -2 untrained. */
const WITHOUT_LEVEL: ProficiencyTable = {
  bonus: { untrained: -2, trained: 2, expert: 4, master: 6, legendary: 8 },
  mark: VARIANT_MARK,
};

/** The fighter's attribute modifiers, as `level1Fighter` gives them. */
const ATTRIBUTES = { str: 4, dex: 1, con: 2, int: 0, wis: 1, cha: 1 } as const;
type AttributeSlug = keyof typeof ATTRIBUTES;

/** A base term as checked, with the value it adds. */
interface Term {
  readonly text: string;
  readonly value: number;
}

function term(formula: string, value: number, mark = ''): Term {
  return { text: `+ ${formula} = ${value}${mark}`, value };
}

function attribute(slug: AttributeSlug, formula = `@attr.${slug}`): Term {
  return term(formula, ATTRIBUTES[slug]);
}

/** A statistic with `terms` as its base and `lines` adding `added` to it. */
function statistic(terms: readonly Term[], lines: readonly string[] = [], added = 0): Checked {
  const base = terms.reduce((sum, { value }) => sum + value, 0);
  return { base: terms.map(({ text }) => text), lines, overrides: [], total: base + added };
}

/** The fighter's breakdowns, with proficiency bonuses from `table`. */
function golden({ bonus, mark }: ProficiencyTable): Record<string, Checked> {
  const prof = (formula: string, rank: Proficiency): Term => term(formula, bonus[rank], mark);
  // Scale mail's check penalty is inactive on the Strength- and Dexterity-based skills: its Strength is met.
  const checkPenalty = [`item ${SCALE_MAIL_CHECK_PENALTY} inactive (scale-mail)`];
  const skill = (slug: string, key: AttributeSlug, rank: Proficiency): Checked =>
    statistic([attribute(key), prof(`@prof.skill.${slug}`, rank)], key === 'str' || key === 'dex' ? checkPenalty : []);
  const ten = term('10', AC_BASE);
  const { Untrained, Trained, Expert } = Proficiency;
  return {
    // Dexterity +1 is under scale mail's +2 cap. Scale mail's bonus applies; the shield is not raised.
    ac: statistic(
      [ten, attribute('dex', '@attr.dex.capped'), prof('@prof.ac', Trained)],
      [`item ${SCALE_MAIL_AC} applied (scale-mail)`, `circumstance ${STEEL_SHIELD_AC} inactive (steel-shield)`],
      SCALE_MAIL_AC,
    ),
    'save:fortitude': statistic([attribute('con'), prof('@prof.save.fortitude', Expert)]),
    'save:reflex': statistic([attribute('dex'), prof('@prof.save.reflex', Expert)]),
    'save:will': statistic([attribute('wis'), prof('@prof.save.will', Trained)]),
    perception: statistic([attribute('wis'), prof('@prof.perception', Expert)]),
    // Human 8, then fighter 10 plus Constitution 2 per level.
    'hp:max': statistic([term('@ancestry.hp', 8), term('(@class.hp + @attr.con) * @level', 12)]),
    // Scale mail's Speed penalty is inactive too.
    'speed:land': statistic([term('@ancestry.speed', 25)], [`item ${SCALE_MAIL_SPEED_PENALTY} inactive (scale-mail)`]),
    // No other movement type: base 0, and the Speed penalty is inactive on them as well.
    ...Object.fromEntries(
      ['fly', 'swim', 'climb', 'burrow'].map((type) => [
        `speed:${type}`,
        statistic([term('0', 0)], [`item ${SCALE_MAIL_SPEED_PENALTY} inactive (scale-mail)`]),
      ]),
    ),
    // Reach and the dying limit are plain numbers, there for a Change to move.
    reach: statistic([term('5', 5)]),
    'dying-max': statistic([term('4', 4)]),
    'class-dc': statistic([ten, attribute('str', '@attr.key'), prof('@prof.class-dc', Trained)]),
    // Melee with Strength; the javelin has a range increment, so it attacks with Dexterity.
    'strike:longsword': statistic([attribute('str', '@weapon.attr'), prof('@weapon.prof', Expert)]),
    'strike:javelin': statistic([attribute('dex', '@weapon.attr'), prof('@weapon.prof', Expert)]),
    // Strength damage on a melee or thrown weapon, whatever it attacks with.
    'strike-damage:longsword': statistic([attribute('str', '@weapon.damage')]),
    'strike-damage:javelin': statistic([attribute('str', '@weapon.damage')]),
    'skill:acrobatics': skill('acrobatics', 'dex', Trained),
    'skill:arcana': skill('arcana', 'int', Untrained),
    'skill:athletics': skill('athletics', 'str', Trained),
    'skill:crafting': skill('crafting', 'int', Untrained),
    'skill:deception': skill('deception', 'cha', Untrained),
    'skill:diplomacy': skill('diplomacy', 'cha', Untrained),
    'skill:intimidation': skill('intimidation', 'cha', Trained),
    'skill:medicine': skill('medicine', 'wis', Trained),
    'skill:nature': skill('nature', 'wis', Untrained),
    'skill:occultism': skill('occultism', 'int', Untrained),
    'skill:performance': skill('performance', 'cha', Untrained),
    'skill:religion': skill('religion', 'wis', Untrained),
    'skill:society': skill('society', 'int', Untrained),
    'skill:stealth': skill('stealth', 'dex', Untrained),
    'skill:survival': skill('survival', 'wis', Trained),
    'skill:thievery': skill('thievery', 'dex', Untrained),
    // The Lores Player Core's backgrounds train, untrained: `skill:lore:warfare` reads `@prof.skill.lore.warfare`.
    ...Object.fromEntries(
      LORE_SELECTORS.map((selector) => [
        selector,
        skill(selector.replace('skill:', '').replaceAll(':', '.'), 'int', Untrained),
      ]),
    ),
  };
}

function totals(sheet: Record<string, Checked>): Record<string, number> {
  return Object.fromEntries(Object.entries(sheet).map(([selector, { total }]) => [selector, total]));
}

const facts = level1FighterFacts();

describe('Level 1 Fighter (golden)', () => {
  const derived = checked(deriveStatistics(core, level1Fighter, { rules: level1FighterRules, facts }));

  test('derives every core statistic with the breakdown Player Core gives', () => {
    expect(derived).toStrictEqual(golden(STANDARD));
  });

  test('the totals are the character sheet', () => {
    expect(totals(derived)).toStrictEqual({
      ac: 17,
      'save:fortitude': 7,
      'save:reflex': 6,
      'save:will': 4,
      perception: 6,
      'hp:max': 20,
      'speed:land': 25,
      'speed:fly': 0,
      'speed:swim': 0,
      'speed:climb': 0,
      'speed:burrow': 0,
      reach: 5,
      'dying-max': 4,
      'class-dc': 17,
      'strike:longsword': 9,
      'strike:javelin': 6,
      'strike-damage:longsword': 4,
      'strike-damage:javelin': 4,
      'skill:acrobatics': 4,
      'skill:arcana': 0,
      'skill:athletics': 7,
      'skill:crafting': 0,
      'skill:deception': 1,
      'skill:diplomacy': 1,
      'skill:intimidation': 4,
      'skill:medicine': 4,
      'skill:nature': 1,
      'skill:occultism': 0,
      'skill:performance': 1,
      'skill:religion': 1,
      'skill:society': 0,
      'skill:stealth': 1,
      'skill:survival': 4,
      'skill:thievery': 1,
      ...Object.fromEntries(LORE_SELECTORS.map((selector) => [selector, 0])),
    });
  });

  test('Proficiency Without Level moves only the proficiency terms, and names the variant on each', () => {
    const rules = [...level1FighterRules, ...withoutLevel()];
    expect(checked(deriveStatistics(core, level1Fighter, { rules, facts }))).toStrictEqual(golden(WITHOUT_LEVEL));
  });

  test("without scale mail's Strength met, its check and Speed penalties apply", () => {
    const unmet = checked(deriveStatistics(core, level1Fighter, { rules: level1FighterRules, facts: noFacts() }));
    const checkPenalty = [`item ${SCALE_MAIL_CHECK_PENALTY} applied (scale-mail)`];
    // Each total is the sheet's less 2; land Speed is 25 less 5.
    expect(unmet['skill:acrobatics']).toMatchObject({ lines: checkPenalty, total: 2 });
    expect(unmet['skill:athletics']).toMatchObject({ lines: checkPenalty, total: 5 });
    expect(unmet['skill:stealth']).toMatchObject({ lines: checkPenalty, total: -1 });
    expect(unmet['skill:thievery']).toMatchObject({ lines: checkPenalty, total: -1 });
    expect(unmet['speed:land']).toMatchObject({
      lines: [`item ${SCALE_MAIL_SPEED_PENALTY} applied (scale-mail)`],
      total: 20,
    });
    // Skills keyed to other attributes take no check penalty.
    expect(unmet['skill:medicine']).toStrictEqual(derived['skill:medicine']);
  });
});
