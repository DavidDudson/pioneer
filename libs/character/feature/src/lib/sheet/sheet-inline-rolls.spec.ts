import { TestBed } from '@angular/core/testing';
import { OutcomeKind, RANDOM_SOURCE, RollPresenter } from '@pioneer/play/ui';
import type { RollPresentation } from '@pioneer/play/ui';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { DamageFormula, DamageType, Dc, InlineKind, RichTextString, Selector } from '@pioneer/rules/sdk';
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

type DamageLine = RollPresentation['lines'][number];

function toastLine(): DamageLine | undefined {
  return TestBed.inject(RollPresenter).toast()?.lines[0];
}

interface Opened {
  readonly inline: SheetInlineRolls;
  readonly rolls: SheetRolls;
}

/** Opens the sheet and reaches the roller its page provides. */
async function open(...faces: readonly number[]): Promise<Opened> {
  const providers =
    faces.length === 0
      ? []
      : [{ provide: RANDOM_SOURCE, useValue: scriptedRandom(faces.map((face) => DieFace.parse(face))) }];
  const { root } = await openSheet(undefined, { providers });
  const { injector } = present(harnessOf(root).routeDebugElement);
  const inline = injector.get(SheetInlineRolls);
  // The engine builds after the sheet shows; a roll before then rolls nothing.
  await vi.waitFor(() => {
    expect(inline.hasStatistic(REFLEX)).toBe(true);
  });
  return { inline, rolls: injector.get(SheetRolls) };
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

  it('gives a basic save the fixed outcome of the degree it rolled', async () => {
    const { inline, rolls } = await open();
    inline.check({ node: { ...reflexCheck, basic: true }, label: 'basic Reflex save' });
    expect(rolls.last()?.view.outcome?.kind).toBe(OutcomeKind.Message);
    const toast = TestBed.inject(RollPresenter).toast();
    expect(toast?.outcome?.kind).toBe(OutcomeKind.Message);
    expect(toast?.degreeKey).toBeDefined();
  });

  it('gives a check the words its text has for the degree it rolled', async () => {
    const { inline, rolls } = await open();
    const worded = [{ type: InlineKind.Text, text: RichTextString.parse('You flee.') }] as const;
    const outcomes = { criticalSuccess: worded, success: worded, failure: worded, criticalFailure: worded };
    inline.check({ node: { ...reflexCheck, outcomes }, label: 'DC 20 Reflex save' });
    expect(rolls.last()?.view.outcome?.kind).toBe(OutcomeKind.Text);
  });

  it('shows no outcome for a check whose text has none', async () => {
    const { inline, rolls } = await open();
    inline.check({ node: reflexCheck, label: 'DC 20 Reflex save' });
    expect(rolls.last()?.view.outcome).toBeUndefined();
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

  describe('damage after a basic save', () => {
    // A natural 20 against DC 1 is a critical success, a natural 1 against DC 40 a critical failure, whatever the bonus.
    const easy: CheckNode = { ...reflexCheck, dc: Dc.parse(1), basic: true };
    const hard: CheckNode = { ...reflexCheck, dc: Dc.parse(40), basic: true };
    const notBasic: CheckNode = { ...reflexCheck, dc: Dc.parse(1) };

    it('takes none on a critical success, and shows the dice total beside it', async () => {
      const { inline } = await open(20, 4, 3);
      inline.check({ node: easy, label: 'basic Reflex save' });
      inline.damage({ node: fire, label: '2d6 fire' });
      expect(toastLine()).toMatchObject({ total: 0, unadjusted: 7 });
    });

    it('takes double on a critical failure', async () => {
      const { inline } = await open(1, 4, 3);
      inline.check({ node: hard, label: 'basic Reflex save' });
      inline.damage({ node: fire, label: '2d6 fire' });
      expect(toastLine()).toMatchObject({ total: 14, unadjusted: 7 });
    });

    it('lets the save go once damage is rolled, so a second roll is full', async () => {
      const { inline } = await open(20, 4, 3, 4, 3);
      inline.check({ node: easy, label: 'basic Reflex save' });
      inline.damage({ node: fire, label: '2d6 fire' });
      inline.damage({ node: fire, label: '2d6 fire' });
      expect(toastLine()?.total).toBe(7);
      expect(toastLine()?.unadjusted).toBeUndefined();
    });

    it('leaves damage alone after a save that is not basic', async () => {
      const { inline } = await open(20, 4, 3);
      inline.check({ node: notBasic, label: 'DC 1 Reflex save' });
      inline.damage({ node: fire, label: '2d6 fire' });
      expect(toastLine()?.total).toBe(7);
      expect(toastLine()?.unadjusted).toBeUndefined();
    });

    it('lets a basic save go when another check is rolled after it', async () => {
      const { inline } = await open(20, 20, 4, 3);
      inline.check({ node: easy, label: 'basic Reflex save' });
      inline.check({ node: notBasic, label: 'DC 1 Reflex save' });
      inline.damage({ node: fire, label: '2d6 fire' });
      expect(toastLine()?.total).toBe(7);
      expect(toastLine()?.unadjusted).toBeUndefined();
    });
  });
});
