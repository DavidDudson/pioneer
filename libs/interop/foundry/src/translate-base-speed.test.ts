import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: {}, values: { item: '' } });
}

describe('BaseSpeed from Foundry', () => {
  test.each(['land', 'burrow', 'climb', 'fly', 'swim'])('a %s speed upgrades its statistic', (movement) => {
    const { rules, untranslated } = translated({ key: 'BaseSpeed', selector: movement, value: 30 });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      { key: RuleElementKey.Change, selector: `speed:${movement}`, mode: 'upgrade', value: 30 },
    ]);
  });

  test('a predicate and a formula value carry over', () => {
    const { rules, untranslated } = translated({
      key: 'BaseSpeed',
      selector: 'fly',
      predicate: ['self:effect:enter-spirit-trance'],
      value: '@actor.level + 10',
    });

    expect(untranslated).toEqual([]);
    expect(rules).toHaveLength(1);
  });

  test('a selector built from a pick is kept for the backlog', () => {
    const { rules, untranslated } = translated({
      key: 'BaseSpeed',
      selector: '{item|flags.system.rulesSelections.speed}',
      value: 25,
    });

    expect(rules).toEqual([]);
    expect(untranslated).toHaveLength(1);
  });
});

describe('BaseSpeed that reads the land speed', () => {
  test('a fly speed equal to the land speed reads the land statistic', () => {
    const { rules, untranslated } = translated({
      key: 'BaseSpeed',
      predicate: ['animal-feature:wings'],
      selector: 'fly',
      value: '@actor.system.movement.speeds.land.value',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.Change,
        selector: 'speed:fly',
        mode: 'upgrade',
        predicate: ['animal-feature:wings'],
        value: '@stat.speed.land',
      },
    ]);
  });
});
