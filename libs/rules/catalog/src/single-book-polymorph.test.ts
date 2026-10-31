import { describe, expect, test } from 'bun:test';

import { contentPackFromContents } from '@pioneer/rules/sdk';

import { darkArchiveRemasteredPack, divineMysteriesPack } from './json-packs';
import type { PackLoader } from './pack-loader';

/** The rules of the effect `slug` in `pack` as plain JSON, so a test can compare them with the data it reads. */
async function rulesOf(pack: PackLoader, slug: string): Promise<readonly unknown[]> {
  const found = contentPackFromContents(await pack()).otherEntries.find((entry) => entry.slug === slug);
  if (found === undefined) {
    throw new Error(`${slug} is not in the pack`);
  }
  return structuredClone(found.rules);
}

/** The slug of the effect in `pack` that `pattern` matches, without its kind prefix, as a roll option spells it. */
async function slugOf(pack: PackLoader, pattern: RegExp): Promise<string> {
  const found = contentPackFromContents(await pack()).otherEntries.find(
    ({ kind, slug }) => kind === 'effect' && pattern.test(slug),
  );
  if (found === undefined) {
    throw new Error(`no effect matches ${String(pattern)}`);
  }
  return found.slug.replace('effect:', '');
}

describe('single-book polymorph effects', () => {
  test('Swarm Form: resistances and weaknesses each rise by 5 for every 2 ranks above the 4th', async () => {
    const rules = await rulesOf(divineMysteriesPack, 'effect:spell-effect-swarm-form');
    const value = '5 + 5 * floor((@item.level - 4) / 2)';

    expect(rules).toContainEqual({ key: 'Resistance', type: ['slashing', 'piercing'], value });
    expect(rules).toContainEqual({ key: 'Weakness', type: ['area-damage', 'splash-damage'], value });
  });

  test("Vessel's Form: the status bonus to attack and damage is +3 while Entity's Resurgence is active", async () => {
    const rules = await rulesOf(darkArchiveRemasteredPack, 'effect:effect-vessels-form');
    const resurgence = await slugOf(darkArchiveRemasteredPack, /resurgence/u);

    expect(rules).toContainEqual({
      key: 'FlatModifier',
      selectors: ['attack-roll', 'strike-damage'],
      type: 'status',
      value: 3,
      predicate: [`self:effect:${resurgence}`],
    });
    expect(rules).toContainEqual({
      key: 'FlatModifier',
      selectors: ['attack-roll', 'strike-damage'],
      type: 'status',
      value: 2,
    });
  });
});
