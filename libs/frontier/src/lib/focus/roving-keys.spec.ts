import { array, assert, boolean, constantFrom, integer, property, record, tuple } from 'fast-check';
import { describe, expect, it } from 'vitest';

import { RovingOrientation, rovingTarget } from './roving-keys';
import type { RovingKey } from './roving-keys';

const ALL_ENABLED = 7;

function press(key: string, from: number, overrides: Partial<RovingKey> = {}): number | undefined {
  return rovingTarget({
    key,
    ctrl: false,
    orientation: RovingOrientation.Horizontal,
    rtl: false,
    from,
    enabled: Array.from({ length: ALL_ENABLED }, () => true),
    columns: 1,
    wrap: false,
    ...overrides,
  });
}

/** No move, or a move to a different, enabled item. */
function landsElsewhereEnabled(to: number | undefined, from: number, enabled: readonly boolean[]): boolean {
  return to === undefined || (to !== from && enabled[to] === true);
}

/** The items focus visits pressing Right from `from` in a wrapping row, sorted. */
function stepAround(enabled: readonly boolean[], from: number): number[] {
  const visited = new Set<number>();
  let at: number | undefined = from;
  for (let presses = 0; presses < enabled.length && at !== undefined; presses += 1) {
    visited.add(at);
    at = press('ArrowRight', at, { enabled, wrap: true });
  }
  return [...visited].toSorted((left, right) => left - right);
}

/** Every enabled item, plus the starting one. */
function enabledOrStart(enabled: readonly boolean[], from: number): number[] {
  return enabled.flatMap((on, index) => (on || index === from ? [index] : []));
}

const twoGaps = [true, false, true, false, true];
const grid = { orientation: RovingOrientation.Grid, columns: 3 };

describe(rovingTarget, () => {
  describe('horizontal', () => {
    it('moves back and forward', () => {
      expect([press('ArrowRight', 2), press('ArrowLeft', 2)]).toStrictEqual([3, 1]);
    });

    it('stops at the ends', () => {
      expect([press('ArrowLeft', 0), press('ArrowRight', 6)]).toStrictEqual([undefined, undefined]);
    });

    it('goes to the ends with Home and End', () => {
      expect([press('Home', 3), press('End', 3)]).toStrictEqual([0, 6]);
    });

    it('wraps when asked', () => {
      expect([press('ArrowLeft', 0, { wrap: true }), press('ArrowRight', 6, { wrap: true })]).toStrictEqual([6, 0]);
    });

    it('swaps Left and Right in right-to-left', () => {
      expect([press('ArrowLeft', 2, { rtl: true }), press('ArrowRight', 2, { rtl: true })]).toStrictEqual([3, 1]);
    });

    it('ignores Up, Down, Ctrl and other keys', () => {
      expect([press('ArrowDown', 2), press('Home', 2, { ctrl: true }), press('a', 2)]).toStrictEqual([
        undefined,
        undefined,
        undefined,
      ]);
    });

    it('skips disabled items', () => {
      expect([press('ArrowRight', 0, { enabled: twoGaps }), press('ArrowLeft', 4, { enabled: twoGaps })]).toStrictEqual(
        [2, 2],
      );
    });

    it('skips disabled items from the ends', () => {
      const enabled = [false, true, true, false];
      expect([press('Home', 2, { enabled }), press('End', 1, { enabled })]).toStrictEqual([1, 2]);
    });

    it('does nothing when every other item is disabled', () => {
      const enabled = [false, true, false];
      expect([press('ArrowRight', 1, { enabled, wrap: true }), press('End', 1, { enabled })]).toStrictEqual([
        undefined,
        undefined,
      ]);
    });
  });

  describe('vertical', () => {
    it('moves with Up and Down and ignores Left and Right', () => {
      const vertical = { orientation: RovingOrientation.Vertical, rtl: true };
      expect([
        press('ArrowDown', 2, vertical),
        press('ArrowUp', 2, vertical),
        press('ArrowLeft', 2, vertical),
      ]).toStrictEqual([3, 1, undefined]);
    });
  });

  describe('grid', () => {
    it('moves along a row without leaving it', () => {
      expect([press('ArrowRight', 1, grid), press('ArrowRight', 2, grid), press('ArrowLeft', 3, grid)]).toStrictEqual([
        2,
        undefined,
        undefined,
      ]);
    });

    it('moves between rows with Up and Down', () => {
      expect([press('ArrowDown', 1, grid), press('ArrowDown', 4, grid), press('ArrowUp', 4, grid)]).toStrictEqual([
        4,
        undefined,
        1,
      ]);
    });

    it('goes to the row ends with Home and End', () => {
      expect([press('Home', 4, grid), press('End', 4, grid), press('End', 6, grid)]).toStrictEqual([3, 5, undefined]);
    });

    it('goes to the first and last item with Ctrl+Home and Ctrl+End', () => {
      const ctrl = { ...grid, ctrl: true };
      expect([press('Home', 4, ctrl), press('End', 4, ctrl)]).toStrictEqual([0, 6]);
    });

    it('swaps Left and Right along a row in right-to-left', () => {
      const rtl = { ...grid, rtl: true };
      expect([press('ArrowLeft', 1, rtl), press('ArrowRight', 1, rtl)]).toStrictEqual([2, 0]);
    });

    it('never wraps', () => {
      expect(press('ArrowRight', 2, { ...grid, wrap: true })).toBeUndefined();
    });
  });

  describe('properties', () => {
    const groups = integer({ min: 1, max: 8 }).chain((count) =>
      tuple(array(boolean(), { minLength: count, maxLength: count }), integer({ min: 0, max: count - 1 })),
    );
    const keys = constantFrom('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End');
    const setups = record({
      orientation: constantFrom(...Object.values(RovingOrientation)),
      wrap: boolean(),
      rtl: boolean(),
      ctrl: boolean(),
    });

    it('only ever lands on another enabled item', () => {
      assert(
        property(groups, keys, setups, ([enabled, from], key, setup) => {
          const to = press(key, from, { enabled, columns: 3, ...setup });
          expect(landsElsewhereEnabled(to, from, enabled)).toBe(true);
        }),
      );
    });

    it('visits every enabled item by stepping forward with wrap', () => {
      assert(
        property(groups, ([enabled, from]) => {
          expect(stepAround(enabled, from)).toStrictEqual(enabledOrStart(enabled, from));
        }),
      );
    });
  });
});
