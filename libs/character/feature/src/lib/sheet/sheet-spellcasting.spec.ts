import { characterGrants, classContent, slotContent, subclassSlot } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  playerCoreClasses,
  playerCoreClassId,
  playerCoreId,
} from '@pioneer/character/domain/testing';
import { officialPacks } from '@pioneer/rules/catalog';
import { ContentKind, contentPackFromContents, ContentRegistry } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';
import type { SpellcastingEntryLine } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it } from 'vitest';

import { sheetSpellcasting } from './sheet-spellcasting';

let coreRules: PackContents;

function registryOf(core: PackContents | undefined): ContentRegistry {
  const registry = new ContentRegistry();
  if (core !== undefined) {
    registry.register(contentPackFromContents(core));
  }
  registry.register(playerCoreClasses());
  return registry;
}

/** A cloistered cleric at `level`: Wisdom +1 from the class's key attribute, nothing else boosted. */
function cloisteredCleric(registry: ContentRegistry, level: number): CharacterBuilder {
  const cleric = new CharacterBuilder().picking('class', playerCoreClassId('cleric'));
  const slot = subclassSlot(
    characterGrants(cleric.build().document, slotContent(registry)),
    slotContent(registry).lookup,
    classContent(registry),
  );
  return cleric.picking(String(slot?.key), playerCoreId(ContentKind.ClassFeature, 'cloistered-cleric')).atLevel(level);
}

/** Each entry as its source and its statistics' names and totals. */
function shown(lines: readonly SpellcastingEntryLine[]): string[][] {
  return lines.map(({ source, statistics }) => [
    source,
    ...statistics.map(({ name, result }) => `${name} ${result.ok ? result.total : 'failed'}`),
  ]);
}

describe(sheetSpellcasting, () => {
  beforeAll(async () => {
    const loader = officialPacks.find(({ id }) => id === 'core-rules');
    if (loader === undefined) {
      throw new Error('Expected the core rules pack');
    }
    coreRules = await loader.load();
  });

  it('gives a 1st-level cleric a trained divine spell attack and DC', () => {
    const registry = registryOf(coreRules);
    const lines = sheetSpellcasting(registry, cloisteredCleric(registry, 1).build());

    expect(shown(lines)).toStrictEqual([['Cleric Spellcasting', 'Spell Attack Modifier 4', 'Spell DC 14']]);
  });

  it('raises a cloistered cleric to expert at 7th level, in the attack and the DC built on it', () => {
    const registry = registryOf(coreRules);
    const lines = sheetSpellcasting(registry, cloisteredCleric(registry, 7).build());

    // Wisdom +1, expert at 7th: 4 + 7.
    expect(shown(lines)).toStrictEqual([['Cleric Spellcasting', 'Spell Attack Modifier 12', 'Spell DC 22']]);
  });

  it('leaves out a family no registered pack defines', () => {
    const entries = coreRules.entries.filter((entry) => entry.slug !== 'statistic:spell-dc');
    const registry = registryOf({ ...coreRules, entries });
    const lines = sheetSpellcasting(registry, cloisteredCleric(registry, 1).build());

    expect(shown(lines)).toStrictEqual([['Cleric Spellcasting', 'Spell Attack Modifier 4']]);
  });

  it('shows no entries without the core rules, as nothing can be derived', () => {
    const registry = registryOf(undefined);

    expect(sheetSpellcasting(registry, cloisteredCleric(registry, 1).build())).toStrictEqual([]);
  });
});
