import { describe, expect, test } from 'bun:test';

import { FundamentalRune, RuneGrade, RuneType } from '@pioneer/rules/sdk';
import { assert, constantFrom, integer, oneof, property, record, subarray } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { InventoryItemId, InventorySchema } from './inventory';
import type { Inventory, InventoryItem } from './inventory';
import { RuneAction, transferRune } from './rune-edits';
import type { RuneRef } from './rune-etching';
import { runeRefusal } from './rune-refusal';
import {
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  RuneFixture,
  runeFixtureContent,
  runeFixtureId,
} from './testing';

const content = itemFixtureContent();
const runed = { items: content, runes: runeFixtureContent() };

const FROM = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
const TO = InventoryItemId.parse('22222222-2222-4222-8222-222222222222');

const WEAPON_RUNES = [RuneFixture.Flaming, RuneFixture.Frost, RuneFixture.Shock, RuneFixture.Keen].map((name) =>
  runeFixtureId(name),
);

const GRADE_MAX = 4;

/** Runes etched onto a plain longsword: any fundamental grades, and up to as many property runes as its potency. */
const swordRunes = record({
  fundamental: record(
    { potency: integer({ min: 1, max: GRADE_MAX }), striking: integer({ min: 1, max: GRADE_MAX }) },
    { requiredKeys: [] },
  ),
  property: subarray(WEAPON_RUNES),
}).map(({ property: etched, fundamental: { potency, striking } }) => ({
  potency,
  striking,
  property: etched.slice(0, potency ?? 0),
}));

/** Two longswords with runes etched onto each. */
const armoury: Arbitrary<Inventory> = record({ from: swordRunes, to: swordRunes }).map(({ from, to }) =>
  InventorySchema.parse({
    items: [
      { id: FROM, item: itemFixtureId(ItemFixture.Longsword), quantity: 1, runes: from },
      { id: TO, item: itemFixtureId(ItemFixture.Longsword), quantity: 1, runes: to },
    ],
  }),
);

const anyRune: Arbitrary<RuneRef> = oneof(
  constantFrom(FundamentalRune.Potency, FundamentalRune.Striking).map((rune): RuneRef => ({
    type: RuneType.Fundamental,
    rune,
  })),
  constantFrom(...WEAPON_RUNES).map((rune): RuneRef => ({ type: RuneType.Property, rune })),
);

/** Every rune on the two swords, as `kind:grade` or the property rune's id, sorted. */
function allRunes(inventory: Inventory): readonly string[] {
  return inventory.items
    .flatMap(({ runes: etched }) => {
      if (etched === undefined) {
        return [];
      }
      const { property: properties, ...fundamental } = etched;
      return [
        ...Object.entries(fundamental).flatMap(([kind, grade]) => (grade === undefined ? [] : [`${kind}:${grade}`])),
        ...properties,
      ];
    })
    .toSorted();
}

describe('transferRune (properties)', () => {
  test('an allowed transfer moves the rune: the two items hold the same runes between them', () => {
    assert(
      property(armoury, anyRune, (inventory, rune) => {
        const refused = runeRefusal(runed, inventory, { action: RuneAction.Transfer, id: FROM, rune, to: TO });
        if (refused !== undefined) {
          return;
        }
        const moved = transferRune(inventory, { from: FROM, to: TO, rune });
        expect(allRunes(moved)).toStrictEqual(allRunes(inventory));
        expect(InventorySchema.safeParse(moved).success).toBe(true);
      }),
    );
  });

  test('an allowed transfer takes the rune off one item and puts it on the other', () => {
    assert(
      property(armoury, anyRune, (inventory, rune) => {
        const refused = runeRefusal(runed, inventory, { action: RuneAction.Transfer, id: FROM, rune, to: TO });
        if (refused !== undefined) {
          return;
        }
        const moved = transferRune(inventory, { from: FROM, to: TO, rune });
        const [from, to] = moved.items;
        const on = (etched: InventoryItem | undefined): boolean =>
          rune.type === RuneType.Property
            ? (etched?.runes?.property.includes(rune.rune) ?? false)
            : etched?.runes?.[rune.rune] !== undefined;
        expect(on(from)).toBe(false);
        expect(on(to)).toBe(true);
      }),
    );
  });

  test('moving a rune back undoes the transfer', () => {
    assert(
      property(armoury, anyRune, (inventory, rune) => {
        const refused = runeRefusal(runed, inventory, { action: RuneAction.Transfer, id: FROM, rune, to: TO });
        if (refused !== undefined) {
          return;
        }
        const back = transferRune(transferRune(inventory, { from: FROM, to: TO, rune }), { from: TO, to: FROM, rune });
        expect(allRunes(back)).toStrictEqual(allRunes(inventory));
        const grade = (each: Inventory): RuneGrade | undefined =>
          rune.type === RuneType.Fundamental && each.items[0]?.runes?.[rune.rune] !== undefined
            ? RuneGrade.parse(each.items[0].runes[rune.rune])
            : undefined;
        expect(grade(back)).toBe(grade(inventory));
      }),
    );
  });
});
