import { TestBed } from '@angular/core/testing';
import { RollPresenter } from '@pioneer/play/ui';
import { DamageFormula, DamageType, Dc, InlineKind, Selector } from '@pioneer/rules/sdk';
import type { CheckNode, DamageNode } from '@pioneer/rules/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { harnessOf, openSheet, present } from '../testing/sheet-page-harness';
import { SheetInlineRolls } from './sheet-inline-rolls';
import { SheetRolls } from './sheet-rolls';

const REFLEX = Selector.parse('save:reflex');
const MISSING = Selector.parse('skill:lore:basket-weaving');

const reflexCheck: CheckNode = { type: InlineKind.Check, statistic: REFLEX, dc: Dc.parse(20) };
const fire: DamageNode = {
  type: InlineKind.Damage,
  instances: [{ formula: DamageFormula.parse('2d6'), damageType: DamageType.Fire }],
};

interface Opened {
  readonly inline: SheetInlineRolls;
  readonly rolls: SheetRolls;
}

/** Opens the sheet and reaches the roller its page provides. */
async function open(): Promise<Opened> {
  const { root } = await openSheet();
  const { injector } = present(harnessOf(root).routeDebugElement);
  return { inline: injector.get(SheetInlineRolls), rolls: injector.get(SheetRolls) };
}

describe(SheetInlineRolls, () => {
  beforeEach(() => {
    // Without motion the toast shows at once, so a spec reads what a roll shows without waiting for dice.
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has a value for the statistics the character has, and none for those it lacks', async () => {
    const { inline } = await open();
    expect(inline.hasStatistic(REFLEX)).toBe(true);
    expect(inline.hasStatistic(MISSING)).toBe(false);
  });

  it('rolls a check against the DC the text gives, and leaves the typed DC alone', async () => {
    const { inline, rolls } = await open();
    inline.check({ node: reflexCheck, label: 'DC 20 Reflex save' });
    expect(TestBed.inject(RollPresenter).toast()?.label).toBe('DC 20 Reflex save');
    expect(rolls.cardDc()).toBe(20);
    expect(rolls.dc()).toBeUndefined();
  });

  it('lets a DC typed afterwards replace the one the text gave', async () => {
    const { inline, rolls } = await open();
    inline.check({ node: reflexCheck, label: 'DC 20 Reflex save' });
    rolls.typeDc(rolls.cardDc());
    rolls.typeDc(undefined);
    expect(rolls.cardDc()).toBeUndefined();
  });

  it('rolls damage in its own colour and type, with no DC and no statistic', async () => {
    const { inline, rolls } = await open();
    inline.damage({ node: fire, label: '2d6 fire' });
    const toast = TestBed.inject(RollPresenter).toast();
    expect(toast?.lines.map(({ typeKey }) => typeKey)).toStrictEqual(['roll.damageType.fire']);
    expect(rolls.last()?.statistic).toBeUndefined();
    expect(rolls.cardDc()).toBeUndefined();
  });
});
