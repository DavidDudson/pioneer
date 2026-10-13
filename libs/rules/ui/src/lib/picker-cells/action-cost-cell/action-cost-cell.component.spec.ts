import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { ActionKind } from '../picker-cell-messages';
import { ActionCostCell } from './action-cost-cell.component';

describe(ActionCostCell, () => {
  it.each([
    [ActionKind.One, '◆', 'Single action'],
    [ActionKind.Two, '◆◆', 'Two actions'],
    [ActionKind.Three, '◆◆◆', 'Three actions'],
    [ActionKind.Free, '◇', 'Free action'],
    [ActionKind.Reaction, '⤾', 'Reaction'],
    [ActionKind.Variable, '◆ to ◆◆◆', 'One to three actions'],
    [ActionKind.Passive, '—', 'Passive'],
  ])('shows %s as its glyph, read out in words', async (cost, glyph, words) => {
    const host = await renderCell(ActionCostCell, { cost });
    expect(host.querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe(glyph);
    expect(host.querySelector('.sr-only')?.textContent.trim()).toBe(words);
  });
});
