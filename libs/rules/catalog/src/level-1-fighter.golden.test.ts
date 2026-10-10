import { describe, expect, test } from 'bun:test';

import { BaseTermKind, deriveStatistics } from '@pioneer/rules/engine';
import type { BaseTerm, BreakdownLine, ModifierLabel, OverrideLine, StatisticResult } from '@pioneer/rules/engine';
import { Proficiency } from '@pioneer/rules/sdk';
import type { Selector } from '@pioneer/rules/sdk';

import { AC_BASE, core, noFacts, withoutLevel } from './testing/core-rules';
import {
  level1Fighter,
  level1FighterItems,
  level1FighterRules,
  SCALE_MAIL_AC,
  STEEL_SHIELD_AC,
} from './testing/level-1-fighter';

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

const VARIANT_MARK = ' (variant)';

const itemNames = new Map(Object.entries(level1FighterItems).map(([slug, rule]) => [String(rule.origin.entry), slug]));

function termText(line: BaseTerm): string {
  if (line.kind === BaseTermKind.Rounding) {
    return `rounding = ${line.value}`;
  }
  return `${line.sign} ${line.formula} = ${line.value}${line.origin === undefined ? '' : VARIANT_MARK}`;
}

function labelText(label: ModifierLabel): string {
  return 'entry' in label ? (itemNames.get(String(label.entry)) ?? String(label.entry)) : String(label.text);
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
  const skill = (slug: string, key: AttributeSlug, rank: Proficiency): Checked =>
    statistic([attribute(key), prof(`@prof.skill.${slug}`, rank)]);
  const ten = term('10', AC_BASE);
  const potency = term('@weapon.potency', 0);
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
    'speed:land': statistic([term('@ancestry.speed', 25)]),
    'class-dc': statistic([ten, attribute('str', '@attr.key'), prof('@prof.class-dc', Trained)]),
    // Melee with Strength; the javelin has a range increment, so it attacks with Dexterity.
    'strike:longsword': statistic([attribute('str', '@weapon.attr'), prof('@weapon.prof', Expert), potency]),
    'strike:javelin': statistic([attribute('dex', '@weapon.attr'), prof('@weapon.prof', Expert), potency]),
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
  };
}

function totals(sheet: Record<string, Checked>): Record<string, number> {
  return Object.fromEntries(Object.entries(sheet).map(([selector, { total }]) => [selector, total]));
}

const facts = noFacts();

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
      'class-dc': 17,
      'strike:longsword': 9,
      'strike:javelin': 6,
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
    });
  });

  test('Proficiency Without Level moves only the proficiency terms, and names the variant on each', () => {
    const rules = [...level1FighterRules, ...withoutLevel()];
    expect(checked(deriveStatistics(core, level1Fighter, { rules, facts }))).toStrictEqual(golden(WITHOUT_LEVEL));
  });
});
