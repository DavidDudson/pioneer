import { describe, expect, test } from 'bun:test';

import { ReferencePath } from '@pioneer/rules/formula';

import {
  FOUNDRY_REFERENCES,
  fromFoundryPath,
  knownReference,
  REFERENCE_CATALOGUE,
  ReferenceKind,
} from './formula-reference';

const known = (path: string): unknown => knownReference(ReferencePath.parse(path));
const translated = (path: string): string | undefined => fromFoundryPath(ReferencePath.parse(path));

describe('formula reference vocabulary', () => {
  test.each([
    ['level', { kind: ReferenceKind.Level }],
    ['attr.str', { kind: ReferenceKind.AttributeModifier, attribute: 'str' }],
    ['attr.dex', { kind: ReferenceKind.AttributeModifier, attribute: 'dex' }],
    ['attr.dex.capped', { kind: ReferenceKind.CappedDexterity }],
    ['prof.ac', { kind: ReferenceKind.ProficiencyBonus, selector: 'ac' }],
    ['prof.save.fortitude', { kind: ReferenceKind.ProficiencyBonus, selector: 'save:fortitude' }],
    ['prof.skill.lore-sailing', { kind: ReferenceKind.ProficiencyBonus, selector: 'skill:lore-sailing' }],
    ['rank.attack.martial', { kind: ReferenceKind.ProficiencyRank, selector: 'attack:martial' }],
    ['stat.spell-attack.arcane', { kind: ReferenceKind.Statistic, selector: 'spell-attack:arcane' }],
    ['item.level', { kind: ReferenceKind.ItemLevel }],
  ])('@%s is known', (path, reference) => {
    expect(known(path)).toStrictEqual(reference);
  });

  test.each([
    'actor.level',
    'actor.abilities.str.mod',
    'attr',
    'attr.luck',
    'attr.STR',
    'attr.str.capped',
    'attr.dex.capped.extra',
    'level.value',
    'prof',
    'prof.Save',
    'prof.save.-fortitude',
    'rank.save_fortitude',
    'stat',
    'item.badge.value',
  ])('@%s is unknown', (path) => {
    expect(known(path)).toBeUndefined();
  });

  test('only item.level reads the item', () => {
    const itemScoped = Object.entries(REFERENCE_CATALOGUE)
      .filter(([, definition]) => definition.scope === 'item')
      .map(([kind]) => kind);
    expect(itemScoped).toStrictEqual([ReferenceKind.ItemLevel]);
  });
});

describe('Foundry reference translation', () => {
  test.each([
    ['actor.level', 'level'],
    ['actor.system.details.level.value', 'level'],
    ['actor.abilities.cha.mod', 'attr.cha'],
    ['actor.system.abilities.dex.mod', 'attr.dex'],
    ['actor.skills.athletics.rank', 'rank.skill.athletics'],
    ['actor.system.skills.lore-sailing.rank', 'rank.skill.lore-sailing'],
    ['actor.saves.reflex.rank', 'rank.save.reflex'],
    ['actor.perception.rank', 'rank.perception'],
    ['actor.system.proficiencies.attacks.martial.rank', 'rank.attack.martial'],
    ['actor.system.proficiencies.defenses.heavy.rank', 'rank.defense.heavy'],
    ['item.level', 'item.level'],
    ['item.system.level.value', 'item.level'],
  ])('@%s becomes @%s', (foundry, pioneer) => {
    expect(translated(foundry)).toBe(pioneer);
  });

  test.each(['actor.abilities.luck.mod', 'actor.skills.Athletics.rank', 'item.badge.value', 'level', 'actor.hp'])(
    '@%s has no translation',
    (foundry) => {
      expect(translated(foundry)).toBeUndefined();
    },
  );

  test('every Foundry spelling translates to a path in the catalogue', () => {
    const paths = FOUNDRY_REFERENCES.map(({ foundry }) =>
      foundry
        .replace('<attribute>', 'wis')
        .replace('<skill>', 'stealth')
        .replace('<save>', 'will')
        .replace('<category>', 'simple'),
    );
    expect(paths.filter((path) => translated(path) === undefined)).toStrictEqual([]);
  });
});
