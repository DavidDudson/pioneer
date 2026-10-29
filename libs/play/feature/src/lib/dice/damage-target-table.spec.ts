import { DamageGroup, DamageType } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { categoryOf, categoryOfGroup, shownTargets, TargetCategory, typesOf } from './damage-target-table';
import type { DamageTargetRow } from './damage-target-table';

const rows: readonly DamageTargetRow[] = [
  {
    value: DamageGroup.Physical,
    label: 'Physical',
    category: TargetCategory.Group,
    includes: ['Slashing', 'Piercing'],
  },
  { value: DamageType.Fire, label: 'Fire', category: TargetCategory.Energy, includes: [] },
  { value: DamageType.Slashing, label: 'Slashing', category: TargetCategory.Physical, includes: [] },
];

const labels = (shown: readonly DamageTargetRow[]): readonly string[] => shown.map((row) => row.label);

describe('damage target categories', () => {
  it('puts a type in the group that lists it, and a group in the group category', () => {
    expect(categoryOf(DamageType.Slashing)).toBe(TargetCategory.Physical);
    expect(categoryOf(DamageType.Fire)).toBe(TargetCategory.Energy);
    expect(categoryOfGroup(DamageGroup.Energy)).toBe(TargetCategory.Group);
  });

  it('lists no types for all, which covers every type', () => {
    expect(typesOf(DamageGroup.All)).toStrictEqual([]);
    expect(typesOf(DamageGroup.Physical)).not.toStrictEqual([]);
  });
});

describe(shownTargets, () => {
  it('keeps the given order when no sort is asked for', () => {
    expect(labels(shownTargets(rows, '', undefined))).toStrictEqual(['Physical', 'Fire', 'Slashing']);
  });

  it('matches the name, ignoring case and surrounding space', () => {
    expect(labels(shownTargets(rows, ' FIRE ', undefined))).toStrictEqual(['Fire']);
  });

  it('is empty when nothing matches', () => {
    expect(shownTargets(rows, 'sonic', undefined)).toStrictEqual([]);
  });

  it('orders by category with the name settling ties, or by how many types a group covers', () => {
    expect(labels(shownTargets(rows, '', { column: 'category', descending: false }))).toStrictEqual([
      'Fire',
      'Physical',
      'Slashing',
    ]);
    expect(labels(shownTargets(rows, '', { column: 'includes', descending: true }))[0]).toBe('Physical');
  });
});
