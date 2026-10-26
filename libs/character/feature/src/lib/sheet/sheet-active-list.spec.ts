import { ActiveSpellId, EffectRounds, SlotCountKey } from '@pioneer/character/domain';
import type { ActiveSpell } from '@pioneer/character/domain';
import { ContentId, ContentKind, ContentRegistry, RichTextString, SpellRank } from '@pioneer/rules/sdk';
import type { RichText } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { newId } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { ActiveKind, activeCount, activeRows, sustainedCast } from './sheet-active-list';

const NOTE: RichText = [
  { type: 'paragraph', content: [{ type: 'text', text: RichTextString.parse('A reaction when an ally hits.') }] },
];

const pack = new ContentPackBuilder()
  .withId('player-core')
  .withSpell('barrier', { rank: 2, traditions: [], duration: { type: 'sustained' } })
  .withSpell('mirror', { rank: 3, traditions: [], duration: { type: 'sustained' }, dismiss: true })
  .withSpell('fireball', { rank: 3, traditions: [] })
  .withSpell('mark', { rank: 3, traditions: [], dismissNote: NOTE });
const registry = new ContentRegistry();
registry.register(pack.build());

const BARRIER = ContentId.parse(pack.idOf(ContentKind.Spell, 'barrier'));
const MIRROR = ContentId.parse(pack.idOf(ContentKind.Spell, 'mirror'));
const FIREBALL = ContentId.parse(pack.idOf(ContentKind.Spell, 'fireball'));
const MARK = ContentId.parse(pack.idOf(ContentKind.Spell, 'mark'));

function active(spell: ContentId, remaining: number, sustainedThisTurn: boolean): ActiveSpell {
  return {
    id: ActiveSpellId.parse(newId()),
    spell,
    rank: SpellRank.parse(2),
    remaining: EffectRounds.parse(remaining),
    sustainedThisTurn,
  };
}

describe(activeRows, () => {
  it('lists an active spell with its source, rounds left and whether it was sustained', () => {
    const [row] = activeRows(registry, { activeSpells: [active(BARRIER, 100, true)], effects: [] });
    expect(row).toMatchObject({
      kind: ActiveKind.Spell,
      name: 'Barrier',
      source: 'self',
      remaining: 100,
      sustained: true,
      sustainedThisTurn: true,
      canSustain: true,
      dismissAction: false,
      dismissNote: undefined,
      editable: false,
    });
  });

  it('carries the note on how a spell is dismissed early, which costs no Dismiss action', () => {
    const [row] = activeRows(registry, { activeSpells: [active(MARK, 9, false)], effects: [] });
    expect(row).toMatchObject({ dismissAction: false, dismissNote: NOTE });
  });

  it('cannot sustain a spell on its last round', () => {
    const [row] = activeRows(registry, { activeSpells: [active(BARRIER, 1, false)], effects: [] });
    expect(row?.canSustain).toBe(false);
  });

  it('marks a spell whose content needs the Dismiss action', () => {
    const rows = activeRows(registry, {
      activeSpells: [active(BARRIER, 9, false), active(MIRROR, 9, false)],
      effects: [],
    });
    expect(rows.map(({ dismissAction }) => dismissAction)).toStrictEqual([false, true]);
  });

  it('leaves out a spell the content does not have', () => {
    const missing = active(ContentId.parse(newId()), 9, false);
    const rows = activeRows(registry, { activeSpells: [missing], effects: [] });
    expect(rows).toStrictEqual([]);
  });
});

describe(activeCount, () => {
  it('counts the spells and effects together', () => {
    const activeSpells = [active(BARRIER, 9, false), active(MIRROR, 9, false)];
    expect(activeCount({ activeSpells, effects: [] })).toBe(2);
  });
});

describe(sustainedCast, () => {
  it('records a cast of a sustained spell for as long as it can be kept up, at the rank its content gives', () => {
    expect(sustainedCast(registry, MIRROR)).toMatchObject({ kind: 'cast', rank: 3, rounds: 100 });
  });

  it('records the rank of the slot it was cast from, heightened or from a pool', () => {
    expect(sustainedCast(registry, BARRIER, SlotCountKey.parse('wizard:4'))).toMatchObject({ rank: 4 });
    expect(sustainedCast(registry, BARRIER, SlotCountKey.parse('cleric:font:5'))).toMatchObject({ rank: 5 });
  });

  it('records nothing for a spell that is not sustained, or for something that is no spell', () => {
    expect(sustainedCast(registry, FIREBALL)).toBeUndefined();
    const noSpell = ContentId.parse(newId());
    expect(sustainedCast(registry, noSpell)).toBeUndefined();
  });
});
