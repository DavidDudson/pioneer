import { ResourceCount, SpendEntrySchema, UseCountKey } from '@pioneer/character/domain';
import { ActionOriginKind, ActionStatus } from '@pioneer/rules/engine';
import { ActionCost, ActionMode, ContentId, Frequency } from '@pioneer/rules/sdk';
import type { ActionLine } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { triggerPromptRows } from './trigger-prompt-view';
import type { TriggerPromptInputs } from './trigger-prompt-view';

const SHIELD = ContentId.parse('00000000-0000-4000-8000-000000000001');
const SHRUG = ContentId.parse('00000000-0000-4000-8000-000000000002');

function line(id: ContentId, name: string, over: Partial<ActionLine> = {}): ActionLine {
  return {
    id,
    name,
    traits: [],
    cost: ActionCost.Reaction,
    modes: [ActionMode.Encounter],
    origin: { kind: ActionOriginKind.Basic },
    source: undefined,
    status: ActionStatus.Available,
    reasons: [],
    roll: undefined,
    priority: undefined,
    dormant: false,
    ...over,
  };
}

const LINES = [line(SHIELD, 'Shield Block'), line(SHRUG, 'Shrug Off', { cost: ActionCost.Free })];

const SPENT = SpendEntrySchema.parse({
  id: '00000000-0000-4000-8000-0000000000a1',
  action: SHIELD,
  cost: { kind: 'reaction' },
  at: '2026-11-28T00:00:00.000Z',
  quickened: 0,
});

function inputs(over: Partial<TriggerPromptInputs> = {}): TriggerPromptInputs {
  return {
    abilities: [SHIELD],
    lines: LINES,
    frequencies: new Map(),
    resources: { uses: {} },
    spendLog: [],
    declined: new Set(),
    ...over,
  };
}

describe(triggerPromptRows, () => {
  it('lists one ability with its cost', () => {
    const [row, ...rest] = triggerPromptRows(inputs());

    expect(rest).toHaveLength(0);
    expect(row?.line.name).toBe('Shield Block');
    expect(row?.costKey).toBe('rules.facet.actionCost.reaction');
    expect(row?.uses).toBeUndefined();
  });

  it('lists several abilities of one event together, in order', () => {
    const rows = triggerPromptRows(inputs({ abilities: [SHRUG, SHIELD] }));

    expect(rows.map(({ line: each }) => each.name)).toStrictEqual(['Shrug Off', 'Shield Block']);
  });

  it('shows the uses an ability with a frequency has left', () => {
    const frequency = Frequency.parse({ max: 2, per: 'day' });

    const rows = triggerPromptRows(
      inputs({
        abilities: [SHRUG],
        frequencies: new Map([[SHRUG, frequency]]),
        resources: { uses: { [UseCountKey.parse(SHRUG)]: ResourceCount.parse(1) } },
      }),
    );

    expect(rows[0]?.uses).toStrictEqual({ current: 1, max: 2 });
  });

  it('carries why a spent reaction cannot be used', () => {
    const spent = line(SHIELD, 'Shield Block', {
      affordable: false,
      reasons: [{ key: 'rules.actions.turn.reactionSpent' }],
    });

    const [row] = triggerPromptRows(inputs({ lines: [spent] }));

    expect(row?.line.affordable).toBe(false);
    expect(row?.line.reasons).toHaveLength(1);
  });

  it('drops an ability once it is spent, and offers it again when the spend is undone', () => {
    const accepted = triggerPromptRows(inputs({ spendLog: [SPENT] }));
    const undone = triggerPromptRows(inputs({ spendLog: [] }));

    expect(accepted).toHaveLength(0);
    expect(undone).toHaveLength(1);
  });

  it('drops a declined ability', () => {
    const rows = triggerPromptRows(inputs({ declined: new Set([SHIELD]) }));

    expect(rows).toHaveLength(0);
  });
});
