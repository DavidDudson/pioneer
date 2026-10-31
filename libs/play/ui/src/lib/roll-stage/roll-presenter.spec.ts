import { TestBed } from '@angular/core/testing';
import { DamageTone } from '@pioneer/frontier';
import { RollTotal } from '@pioneer/rules/dice';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DICE_ROLLER_FACTORY } from './dice-roller';
import type { DiceRoller, DiceRollerFactory } from './dice-roller';
import type { RollPresentation } from './roll-presentation';
import { DICE_LINGER, RollPresenter, TOAST_DURATION } from './roll-presenter';

const surface = document.createElement('div');
const NOTHING = (): void => undefined;

function rollOf(id: number, groups: RollPresentation['groups']): RollPresentation {
  return {
    id,
    label: 'Fireball',
    total: RollTotal.parse(21),
    damageTypeKey: 'roll.damageType.fire',
    tone: DamageTone.Fire,
    groups,
  };
}

const DICE = [{ notation: '6d6@3,4,3,4,3,4', tone: DamageTone.Fire }] as const;

interface Stage {
  readonly presenter: RollPresenter;
  readonly thrown: string[];
  readonly disposed: number[];
  readonly finish: () => void;
}

/** A presenter whose dice wait until `finish()`, recording what was thrown and how many rollers were disposed. */
function stage(options: { readonly load?: Promise<never> } = {}): Stage {
  const thrown: string[] = [];
  const disposed: number[] = [];
  let release = NOTHING;
  const factory: DiceRollerFactory = async () => {
    if (options.load !== undefined) {
      await options.load;
    }
    const roller: DiceRoller = {
      roll: async (groups) => {
        thrown.push(...groups.map(({ notation }) => notation));
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      },
      dispose: () => {
        disposed.push(disposed.length);
      },
    };
    return roller;
  };
  TestBed.configureTestingModule({ providers: [{ provide: DICE_ROLLER_FACTORY, useValue: factory }] });
  return {
    presenter: TestBed.inject(RollPresenter),
    thrown,
    disposed,
    finish: () => {
      release();
    },
  };
}

function reduceMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query }));
}

describe(RollPresenter, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reduceMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('throws the dice first and shows the toast only once they settle', async () => {
    const { presenter, thrown, finish } = stage();
    const roll = rollOf(1, DICE);
    presenter.present(roll);
    expect(presenter.throwing()).toBe(roll);
    expect(presenter.toast()).toBeUndefined();
    const playing = presenter.play(surface, roll);
    await vi.advanceTimersByTimeAsync(0);
    expect(thrown).toStrictEqual(['6d6@3,4,3,4,3,4']);
    expect(presenter.toast()).toBeUndefined();
    finish();
    await playing;
    expect(presenter.toast()).toBe(roll);
  });

  it('removes the dice a moment after they settle, and the toast after its time', async () => {
    const { presenter, finish, disposed } = stage();
    const roll = rollOf(1, DICE);
    presenter.present(roll);
    const playing = presenter.play(surface, roll);
    await vi.advanceTimersByTimeAsync(0);
    finish();
    await playing;
    expect(presenter.throwing()).toBe(roll);
    await vi.advanceTimersByTimeAsync(DICE_LINGER);
    expect(presenter.throwing()).toBeUndefined();
    expect(disposed).toHaveLength(1);
    expect(presenter.toast()).toBe(roll);
    await vi.advanceTimersByTimeAsync(TOAST_DURATION);
    expect(presenter.toast()).toBeUndefined();
  });

  it('replaces a roll in flight: the first never shows its toast and its dice are cleared', async () => {
    const { presenter, finish, disposed } = stage();
    const first = rollOf(1, DICE);
    const second = rollOf(2, DICE);
    presenter.present(first);
    const firstPlay = presenter.play(surface, first);
    await vi.advanceTimersByTimeAsync(0);
    presenter.present(second);
    expect(disposed).toHaveLength(1);
    finish();
    await firstPlay;
    expect(presenter.toast()).toBeUndefined();
    expect(presenter.throwing()).toBe(second);
  });

  it('shows the toast at once, with no overlay, under reduced motion', () => {
    reduceMotion(true);
    const { presenter, thrown } = stage();
    const roll = rollOf(1, DICE);
    presenter.present(roll);
    expect(presenter.throwing()).toBeUndefined();
    expect(presenter.toast()).toBe(roll);
    expect(thrown).toStrictEqual([]);
  });

  it('shows the toast at once for a roll with no dice to throw', () => {
    const { presenter } = stage();
    const roll = rollOf(1, []);
    presenter.present(roll);
    expect(presenter.throwing()).toBeUndefined();
    expect(presenter.toast()).toBe(roll);
  });

  it('still shows the result when the dice library fails to load', async () => {
    const { presenter } = stage({ load: Promise.reject(new Error('offline')) });
    const roll = rollOf(1, DICE);
    presenter.present(roll);
    await presenter.play(surface, roll);
    expect(presenter.toast()).toBe(roll);
  });
});
