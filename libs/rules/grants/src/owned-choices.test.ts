import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentText, RollOptionTail, Slug } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import type { OwnedItem } from './owned-items';
import type { GrantResolution } from './resolve-grants';
import { resolveGrants } from './resolve-grants';
import { entry, inputsOf, picked, picksOf, slotOf } from './testing/builders';

function owned(slug: string, kind: ContentKind, options: readonly string[] = []): OwnedItem {
  return {
    slug: Slug.parse(slug),
    name: ContentText.parse(slug.toUpperCase()),
    kind,
    rollOptions: options.map((option) => RollOptionTail.parse(option)),
  };
}

const INVENTORY = [
  owned('longsword', ContentKind.Weapon, ['equipped', 'trait:versatile-p']),
  owned('dagger', ContentKind.Weapon, ['trait:agile']),
  owned('steel-shield', ContentKind.Shield, ['equipped']),
];

/** A fighter whose rule 0 asks for one of the owned items of `ownedKinds` that satisfy `filter`. */
function resolve(filter: readonly unknown[], picks: readonly (readonly [SlotKey, string])[] = []): GrantResolution {
  const fighter = entry('fighter', [
    { key: 'ChoiceSet', flag: 'edge', rollOption: 'edge', choices: { ownedKinds: ['weapon'], filter } },
  ]);
  return resolveGrants({
    ...inputsOf({ entries: [fighter], roots: [picked('fighter')], picks: picksOf(picks) }),
    owned: INVENTORY,
  });
}

describe('a ChoiceSet over owned items', () => {
  test('offers each owned item of the kinds, by name, whose own options satisfy the filter', () => {
    const everyWeapon = resolve([]).open[0]?.options.map((option) => String(option.value));
    const equipped = resolve(['item:equipped']).open[0]?.options.map((option) => String(option.value));

    expect(everyWeapon).toEqual(['dagger', 'longsword']);
    expect(equipped).toEqual(['longsword']);
  });

  test('stores the pick as the item slug, and sets its roll option', () => {
    const result = resolve([], [[slotOf('fighter', 0), 'dagger']]);

    expect(result.open).toEqual([]);
    expect(result.answered.map((slot) => [slot.flag, String(slot.pick), String(slot.option)])).toEqual([
      ['edge', 'dagger', 'edge:dagger'],
    ]);
  });

  test('refuses a pick the filter rules out, an item of another kind, or one the character no longer owns', () => {
    for (const pick of ['dagger', 'steel-shield', 'rapier']) {
      const result = resolve(['item:equipped'], [[slotOf('fighter', 0), pick]]);

      expect(result.answered).toEqual([]);
      expect(result.open).toHaveLength(1);
    }
  });

  test('offers nothing to a caller that gives no items', () => {
    const fighter = entry('fighter', [
      { key: 'ChoiceSet', flag: 'edge', choices: { ownedKinds: ['weapon'], filter: [] } },
    ]);
    const result = resolveGrants(inputsOf({ entries: [fighter], roots: [picked('fighter')] }));

    expect(result.open[0]?.options).toEqual([]);
  });
});
