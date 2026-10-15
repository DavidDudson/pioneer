import { ActionStatus } from '@pioneer/rules/engine';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { ActionsStatus, checkActions } from './actions-check';
import type { ActionRow, ActionsCheck } from './actions-check';
import { EXAMPLE_ACTIONS } from './actions-example';
import { EXAMPLE_FACTS } from './predicate-verdict';

const RAISED_SHIELD = 'self:effect:raised-shield';

/** The rows of a check that read, by action name. */
function rowsOf(check: ActionsCheck): ReadonlyMap<string, ActionRow> {
  if (check.status !== ActionsStatus.Valid) {
    throw new Error(`Expected a valid check, got ${check.status}`);
  }
  return new Map(check.rows.map((row) => [row.name, row]));
}

describe(checkActions, () => {
  it('opens on an example with one action of each status', () => {
    const rows = rowsOf(checkActions(EXAMPLE_ACTIONS, EXAMPLE_FACTS, CORE_NAMESPACES));

    expect(rows.get('Stride')?.status).toBe(ActionStatus.Available);
    expect(rows.get('Pick a Lock')?.status).toBe(ActionStatus.Unavailable);
    expect(rows.get('Shield Block')?.status).toBe(ActionStatus.Unavailable);
  });

  it('lets a roll option make an action usable', () => {
    const rows = rowsOf(checkActions(EXAMPLE_ACTIONS, RAISED_SHIELD, CORE_NAMESPACES));

    expect(rows.get('Shield Block')?.status).toBe(ActionStatus.Available);
  });

  it('keeps the modes, so a downtime action is not an encounter one', () => {
    const rows = rowsOf(checkActions(EXAMPLE_ACTIONS, EXAMPLE_FACTS, CORE_NAMESPACES));

    expect(rows.get('Long-Term Rest')?.modes).toStrictEqual(['downtime']);
  });

  it('trains a skill with a rank, and spends a frequency with its id', () => {
    const text = JSON.stringify({
      actions: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Pick a Lock',
          action: { skills: ['skill:thievery'], minimumProficiency: 'trained' },
        },
        {
          id: '00000000-0000-4000-8000-000000000002',
          name: 'Rally',
          action: { frequency: { max: 1, per: 'day' } },
        },
      ],
      ranks: [{ skill: 'skill:thievery', rank: 'trained' }],
      spent: ['00000000-0000-4000-8000-000000000002'],
    });

    const rows = rowsOf(checkActions(text, '', CORE_NAMESPACES));

    expect(rows.get('Pick a Lock')?.status).toBe(ActionStatus.Available);
    expect(rows.get('Rally')?.status).toBe(ActionStatus.Unavailable);
  });

  it('says why an action is not usable', () => {
    const rows = rowsOf(checkActions(EXAMPLE_ACTIONS, EXAMPLE_FACTS, CORE_NAMESPACES));

    expect(rows.get('Shield Block')?.reasons).toHaveLength(1);
  });

  it('reports text that is not JSON', () => {
    expect(checkActions('{', '', CORE_NAMESPACES)).toStrictEqual({ status: ActionsStatus.NotJson });
  });

  it('reports actions that do not fit the schema', () => {
    const check = checkActions('{ "actions": [{ "name": "Stride" }] }', '', CORE_NAMESPACES);

    expect(check.status).toBe(ActionsStatus.Invalid);
  });

  it('reports the roll option lines that are not roll options', () => {
    const check = checkActions(EXAMPLE_ACTIONS, 'self:level:5\nnot a roll option', CORE_NAMESPACES);

    expect(check).toStrictEqual({ status: ActionsStatus.InvalidFacts, lines: [2] });
  });
});
