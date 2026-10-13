import { LabelParam, LineStatusKind, SuppressionReason } from '@pioneer/rules/engine';
import type { BreakdownLine } from '@pioneer/rules/engine';
import { InventoryItemId, ItemState, ModifierType, OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentId, OriginHop } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { BREASTPLATE, line, MAGE_ARMOR, origin, ruleId, statistic, term } from '../testing/breakdown-fixtures';
import { render } from '../testing/render-breakdown';
import { BreakdownView } from './breakdown.component';

const SWORD = InventoryItemId.parse('7b1d4c1e-52c9-4b0a-9a39-0d1c1f6c2f10');

/** A weapon's potency line as the engine adds it: the slug in the message, the weapon's origin to name it by. */
function potency(entry: ContentId, hops: readonly OriginHop[] = []): BreakdownLine {
  return line(entry, {
    type: ModifierType.Item,
    value: 1,
    label: {
      message: message('engine.modifier.weaponPotency', { weapon: 'longsword' }),
      named: { param: LabelParam.Weapon, origin: { ...origin(entry), hops: [...hops] } },
    },
  });
}

const BEATEN = line(MAGE_ARMOR, {
  type: ModifierType.Item,
  value: 1,
  status: { kind: LineStatusKind.Suppressed, by: ruleId(BREASTPLATE), reason: SuppressionReason.Stacking },
});

describe(`${BreakdownView.name} weapon potency line`, () => {
  it('names the weapon after its entry, on the line and in the caption that names it', async () => {
    const value = statistic('strike:longsword', { base: [term('10', 10)], lines: [potency(BREASTPLATE), BEATEN] });
    const { lines } = await render(value);

    expect(lines).toStrictEqual([
      'Item bonus of Breastplate | +1 item',
      'Mage Armor | +1 item | Suppressed | Item bonus of Breastplate counts instead.',
    ]);
  });

  it('prefers the inventory item the weapon came through', async () => {
    const hops = [{ kind: OriginHopKind.Inventory, item: SWORD, state: ItemState.Held }] as const;
    const value = statistic('strike:longsword', { base: [term('10', 10)], lines: [potency(BREASTPLATE, hops)] });
    const { lines } = await render(value, { originNames: { items: new Map([[SWORD, 'Dawnbringer']]) } });

    expect(lines).toStrictEqual(['Item bonus of Dawnbringer | +1 item']);
  });

  it('falls back to the weapon’s slug when nothing names it', async () => {
    const value = statistic('strike:longsword', { base: [term('10', 10)], lines: [potency(BREASTPLATE)] });
    const { lines } = await render(value, { entryNames: new Map() });

    expect(lines).toStrictEqual(['Item bonus of longsword | +1 item']);
  });
});
