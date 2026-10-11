import { EngineMessage, LineStatusKind, RuleInPlay } from '@pioneer/rules/engine';
import { ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { message } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { EXAMPLE_FACTS } from './predicate-verdict';
import { CheckStatus, rulesExample, RulesTool } from './rules-check';
import {
  checkStatistics,
  EXAMPLE_OVERRIDES,
  EXAMPLE_RULE_ELEMENTS,
  EXAMPLE_STATISTIC_INPUTS,
  StatisticsStatus,
} from './statistics-check';
import type { StatisticProficiency, StatisticsCheck, StatisticsTexts } from './statistics-check';

const statistic = (selector: string, base: string): object => ({
  slug: `statistic:${selector.replaceAll(':', '-')}`,
  name: selector,
  selector,
  domains: [],
  base,
  kind: 'check',
});

const definitions = (...statistics: readonly object[]): string => JSON.stringify(statistics);

/** The core rules pack's Hit Points formula. */
const HP_FORMULA = '@ancestry.hp + (@class.hp + @attr.con) * @level';

/** Player Core's proficiency bonuses, no variant. */
const STANDARD: StatisticProficiency = { table: PLAYER_CORE_PROFICIENCY_BONUS, variant: undefined };

const FLAT_TEN_ENTRY = ContentId.parse('00000000-0000-4000-8000-000000000002');

/** The made-up entry the playground puts a box's typed rule elements on. */
function playgroundEntry(box: string): ContentId {
  return ContentId.parse(contentId(PackId.parse('playground'), EntrySlug.parse(`effect:${box}`)));
}

/** A variant that makes every proficiency bonus 10, as a pack would put it in play. */
const FLAT_TEN: StatisticProficiency = {
  table: PLAYER_CORE_PROFICIENCY_BONUS,
  variant: {
    name: 'Flat Ten',
    rules: [
      RuleInPlay.parse({
        element: {
          key: 'ProficiencyBonus',
          table: { untrained: '10', trained: '10', expert: '10', master: '10', legendary: '10' },
        },
        origin: {
          hops: [{ kind: 'variant', rule: '00000000-0000-4000-8000-000000000002' }],
          entry: '00000000-0000-4000-8000-000000000002',
          sources: [{ kind: 'book', book: 'gm-core', page: 85 }],
        },
        rule: 0,
      }),
    ],
  },
};

/** The statistics tool with the example inputs and no rule elements unless given. */
function check(texts: Partial<StatisticsTexts>, proficiency = STANDARD): StatisticsCheck {
  return checkStatistics(
    { definitions: '[]', inputs: EXAMPLE_STATISTIC_INPUTS, rules: '[]', overrides: '[]', facts: '', ...texts },
    proficiency,
    CORE_NAMESPACES,
  );
}

describe(checkStatistics, () => {
  it('opens on examples that all derive, in the order written', () => {
    const result = checkStatistics(
      {
        definitions: rulesExample(RulesTool.Statistics),
        inputs: EXAMPLE_STATISTIC_INPUTS,
        rules: EXAMPLE_RULE_ELEMENTS,
        overrides: EXAMPLE_OVERRIDES,
        facts: EXAMPLE_FACTS,
      },
      STANDARD,
      CORE_NAMESPACES,
    );
    expect(result).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        {
          ok: true,
          selector: 'ac',
          total: 19,
          statistic: {
            baseValue: 16,
            lines: [
              {
                modifier: { label: { text: 'Breastplate' }, type: 'item' },
                value: 4,
                status: { kind: LineStatusKind.Applied },
              },
              { modifier: { label: { text: 'Mage Armor' } }, status: { kind: LineStatusKind.Suppressed } },
              { modifier: { label: { text: 'Raise a Shield' } }, status: { kind: LineStatusKind.Inactive } },
              { modifier: { label: { text: 'Undergrowth' } }, status: { kind: LineStatusKind.Conditional } },
              { modifier: { label: { text: 'Frightened 1' } }, value: -1, status: { kind: LineStatusKind.Applied } },
            ],
          },
        },
        { ok: true, selector: 'save:fortitude', total: 9 },
        { ok: true, selector: 'spell-attack:arcane', statistic: { baseValue: 6 }, total: 5 },
        {
          ok: true,
          selector: 'spell-dc:arcane',
          total: 18,
          statistic: { baseValue: 16, computed: 15, total: 18, pinnedBy: `${playgroundEntry('overrides')}#1` },
        },
      ],
    });
  });

  it('names the variant rule that sets a term reading @prof while it is on', () => {
    const ac = definitions(statistic('ac', '10 + @prof.ac'));
    expect(check({ definitions: ac }, FLAT_TEN)).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        {
          ok: true,
          total: 20,
          statistic: { base: [{ origin: undefined }, { origin: { entry: FLAT_TEN_ENTRY } }] },
          entryNames: new Map([[FLAT_TEN_ENTRY, 'Flat Ten']]),
        },
      ],
    });
    // Trained at level 3 without the variant: 2 + 3.
    expect(check({ definitions: ac })).toMatchObject({
      rows: [{ total: 15, statistic: { base: [{}, { origin: undefined }] }, entryNames: new Map() }],
    });
  });

  it('derives Hit Points, Speed and class DC from the ancestry and class, term by term', () => {
    const character = definitions(
      statistic('hp:max', HP_FORMULA),
      statistic('speed:land', '@ancestry.speed'),
      statistic('class-dc', '10 + @attr.key + @prof.class-dc'),
    );
    expect(check({ definitions: character })).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        {
          selector: 'hp:max',
          total: 44,
          statistic: {
            base: [
              { formula: '@ancestry.hp', value: 8 },
              { formula: '(@class.hp + @attr.con) * @level', value: 36 },
            ],
          },
        },
        {
          selector: 'speed:land',
          total: 25,
          statistic: { base: [{ formula: '@ancestry.speed', value: 25 }] },
        },
        {
          selector: 'class-dc',
          total: 19,
          statistic: { base: [{ formula: '10' }, { formula: '@attr.key', value: 4 }, { value: 5 }] },
        },
      ],
    });
  });

  it('points at the reference to an ancestry or class not chosen yet', () => {
    const character = definitions(
      statistic('hp:max', HP_FORMULA),
      statistic('class-dc', '10 + @attr.key + @prof.class-dc'),
    );
    const inputs = JSON.stringify({
      level: 3,
      attributes: { str: 4, dex: 2, con: 2, int: 1, wis: 1, cha: 0 },
      ranks: {},
    });
    expect(check({ definitions: character, inputs })).toMatchObject({
      rows: [
        {
          ok: false,
          selector: 'hp:max',
          error: { key: EngineMessage.NoAncestry },
          pointer: `${HP_FORMULA}\n^`,
        },
        {
          ok: false,
          selector: 'class-dc',
          error: { key: EngineMessage.NoClass },
          pointer: '10 + @attr.key + @prof.class-dc\n     ^',
        },
      ],
    });
  });

  it('points at the reference that closes a cycle', () => {
    const looped = definitions(statistic('a', '1 + @stat.b'), statistic('b', '@stat.a'));
    expect(check({ definitions: looped })).toMatchObject({
      status: StatisticsStatus.Valid,
      rows: [
        { ok: false, selector: 'a', error: { key: EngineMessage.StatisticCycle }, pointer: '1 + @stat.b\n    ^' },
        { ok: false, selector: 'b', error: { key: EngineMessage.StatisticCycle }, pointer: '@stat.a\n^' },
      ],
    });
  });

  it('reports each text that does not read', () => {
    expect(
      check({ definitions: '[', inputs: '{ "level": 99 }', rules: '[{ "key": "Nope" }]', facts: 'Bad' }),
    ).toMatchObject({
      status: StatisticsStatus.Problems,
      definitions: { status: CheckStatus.NotJson },
      inputs: { status: CheckStatus.Invalid },
      rules: { status: CheckStatus.Invalid },
      factLines: [1],
    });
  });

  it('points into a base formula that does not validate', () => {
    const itemRead = definitions(statistic('ac', '10 + @item.level'));
    expect(check({ definitions: itemRead })).toMatchObject({
      status: StatisticsStatus.Problems,
      definitions: {
        status: CheckStatus.Invalid,
        issues: [{ path: [0, 'base'], pointer: '10 + @item.level\n     ^' }],
      },
      inputs: undefined,
      rules: undefined,
      factLines: [],
    });
  });

  it('keeps a failed line, and names each rule element by its box and number', () => {
    const rules = JSON.stringify([{ key: 'FlatModifier', selectors: ['ac'], type: 'untyped', value: '1 / 0' }]);
    const overrides = JSON.stringify([{ key: 'FlatModifier', selectors: ['ac'], type: 'status', value: 1 }]);
    const plain = definitions(statistic('ac', '10'));
    const result = check({ definitions: plain, rules, overrides });
    expect(result).toMatchObject({
      rows: [
        {
          statistic: { lines: [{ value: 1 }, { value: undefined, status: { kind: LineStatusKind.Failed } }] },
          ruleNames: new Map([
            [`${playgroundEntry('rule-elements')}#0`, message('play.rules.ruleNumber', { number: 1 })],
            [`${playgroundEntry('overrides')}#0`, message('play.rules.overrideNumber', { number: 1 })],
          ]),
        },
      ],
    });
  });
});
