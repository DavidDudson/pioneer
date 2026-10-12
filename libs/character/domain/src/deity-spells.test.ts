import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentPack, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { DEITY_SLOT } from './character-slots';
import { preparedSlots } from './prepared-spells';
import type { PreparedSlot } from './prepared-spells';
import { preparedReads, slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, playerCoreId } from './testing';
import type { PlayerCoreClass } from './testing';

/**
 * The Player Core class fixtures with a few spells beside them: Bless, divine; Fireball, arcane and primal; the uncommon
 * Mind Reading, arcane and occult. Gorum grants Fireball at 3rd rank and Mind Reading at 4th.
 */
function playerCoreWithDeity(): ContentPack {
  const classes = playerCoreClasses();
  const builder = new ContentPackBuilder()
    .withId('player-core')
    .withSpell('bless', { rank: 1, traditions: ['divine', 'occult'] })
    .withSpell('fireball', { rank: 3, traditions: ['arcane', 'primal'] })
    .withSpell('mind-reading', { rank: 3, traditions: ['arcane', 'occult'], rarity: 'uncommon' });
  const spell = (name: string): string => builder.idOf(ContentKind.Spell, name);
  const spells = builder
    .withDeity('gorum', {
      font: ['harm'],
      spells: [
        { rank: 3, spell: spell('fireball') },
        { rank: 4, spell: spell('mind-reading') },
      ],
    })
    .build();
  return ContentPack.define({
    manifest: classes.manifest,
    ancestries: classes.ancestries,
    creatures: [],
    statistics: [],
    rollOptionNamespaces: {},
    otherEntries: [...classes.otherEntries, ...spells.otherEntries],
  });
}

const registry = new ContentRegistry();
registry.register(playerCoreWithDeity());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const GORUM: ContentId = playerCoreId(ContentKind.Deity, 'gorum');

/** A level 7 `name`, Gorum's follower unless `deity` is false. */
function follower(name: PlayerCoreClass, deity = true): readonly PreparedSlot[] {
  const builder = new CharacterBuilder()
    .named(name)
    .picking('class', playerCoreClassId(name))
    .picking('boost:1:class:0', 'wis')
    .atLevel(7);
  const { document } = (deity ? builder.picking(String(DEITY_SLOT), GORUM) : builder).build();
  return preparedSlots(document, preparedReads(document, content));
}

/** The names a slot of `entry`'s own of `rank` offers, sorted. */
function offeredAt(slots: readonly PreparedSlot[], entry: string, rank: number): readonly string[] {
  const slot = slots.find((each) => each.entry === entry && each.pool === undefined && each.rank === rank);
  return (slot?.options ?? []).map(({ name }) => String(name)).toSorted();
}

describe("a cleric's deity spells", () => {
  test("join the cleric's own slots at the rank the deity grants each, whatever their tradition", () => {
    const slots = follower('cleric');

    expect(offeredAt(slots, 'cleric', 2)).toEqual(['Bless']);
    expect(offeredAt(slots, 'cleric', 3)).toEqual(['Bless', 'Fireball']);
  });

  test('need no access when uncommon, from the rank the deity grants them at', () => {
    const slots = follower('cleric');

    expect(offeredAt(slots, 'cleric', 4)).toEqual(['Bless', 'Fireball', 'Mind-reading']);
  });

  test('are not on offer without a deity, nor in another class with the same deity', () => {
    expect(offeredAt(follower('cleric', false), 'cleric', 3)).toEqual(['Bless']);
    expect(offeredAt(follower('wizard'), 'wizard', 3)).toEqual(['Fireball']);
  });
});
