import {
  ConditionDc,
  ConditionValue,
  ContentId,
  ContentKind,
  ContentRegistry,
  RichText,
  Selector,
} from '@pioneer/rules/sdk';
import type { ConditionEnding } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import type { PreviewEndingStatistic } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { endingsFor } from './sheet-condition-endings';

const TEXT = RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: 'Rule text.' }] }]);
const DYING_VALUE = ConditionValue.parse(2);

const pack = new ContentPackBuilder()
  .withId('endings')
  .withFeat('treat-condition')
  .withFeat('legendary-medic')
  .withAction('stand');
const registry = new ContentRegistry();
registry.register(pack.build());

const TREAT = ContentId.parse(pack.idOf(ContentKind.Feat, 'treat-condition'));
const MEDIC = ContentId.parse(pack.idOf(ContentKind.Feat, 'legendary-medic'));
const STAND = ContentId.parse(pack.idOf(ContentKind.Action, 'stand'));
const LACKED = ContentId.parse('00000000-0000-4000-8000-0000000000aa');

const FORTITUDE = Selector.parse('save:fortitude');
const WILL = Selector.parse('save:will');

const others = (by: readonly ContentId[]): ConditionEnding => ({ kind: 'others', by, text: TEXT });
const check = (dc?: ConditionDc): ConditionEnding => ({
  kind: 'check',
  check: { against: [], ...(dc === undefined ? {} : { dc }) },
  change: { effect: 'remove' },
  text: TEXT,
});

describe(endingsFor, () => {
  it('names the entries the character holds that ease the condition, and leaves out the rest', () => {
    const [ending] = endingsFor(registry, new Set([MEDIC]), {
      endings: [others([TREAT, MEDIC, LACKED])],
      value: undefined,
    });

    expect(ending?.held.map(({ name }) => name)).toStrictEqual(['Legendary-medic']);
  });

  it('shows nothing held for an ending that names no entries', () => {
    const [ending] = endingsFor(registry, new Set([MEDIC]), { endings: [others([])], value: undefined });

    expect(ending?.held).toStrictEqual([]);
  });

  it('leaves out a held id the registry has no entry for', () => {
    const [ending] = endingsFor(registry, new Set([LACKED]), { endings: [others([LACKED])], value: undefined });

    expect(ending?.held).toStrictEqual([]);
  });

  it('works a DC that follows the value out at the value held', () => {
    const [ending] = endingsFor(registry, new Set(), {
      endings: [check(ConditionDc.parse('10 + @value'))],
      value: DYING_VALUE,
    });

    expect(ending?.dc).toBe(12);
  });

  it('keeps a flat DC as it is, and gives none where the ending has none', () => {
    const endings = endingsFor(registry, new Set(), {
      endings: [check(ConditionDc.parse('15')), check()],
      value: DYING_VALUE,
    });

    expect(endings.map(({ dc }) => dc)).toStrictEqual([15, undefined]);
  });

  it('links the action that ends it', () => {
    const [ending] = endingsFor(registry, new Set(), {
      endings: [{ kind: 'action', action: STAND, change: { effect: 'remove' }, text: TEXT }],
      value: undefined,
    });

    expect(ending?.action?.name).toBe('Stand');
  });

  it('gives the modifier the character rolls at for each statistic the check names, leaving out one it has no total for', () => {
    const rolls = new Map<Selector, PreviewEndingStatistic>([[FORTITUDE, { name: 'Fortitude', modifier: 7 }]]);
    const [ending] = endingsFor(registry, new Set(), {
      endings: [{ kind: 'check', check: { against: [FORTITUDE, WILL] }, change: { effect: 'remove' }, text: TEXT }],
      value: undefined,
      rolls,
    });

    expect(ending?.against).toStrictEqual([{ name: 'Fortitude', modifier: 7 }]);
  });

  it('rolls nothing for an ending without a check', () => {
    const [ending] = endingsFor(registry, new Set(), { endings: [others([])], value: undefined });

    expect(ending?.against).toStrictEqual([]);
  });
});
