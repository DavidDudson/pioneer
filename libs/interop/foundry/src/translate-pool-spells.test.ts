import { describe, expect, test } from 'bun:test';

import { contentId, EntrySlug, PackId, RuleElementKey } from '@pioneer/rules/sdk';

import { rulesIn } from './testing/build-helpers';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { DIVINE_FONT, SCHOOL_OF_BATTLE_MAGIC, SCHOOL_OF_UNIFIED_MAGICAL_THEORY } from './testing/spellcasting-fixtures';
import { poolSpellRules } from './translate-pool-spells';

const { ChoiceSet, PoolSpells } = RuleElementKey;

function keyed(key: string, name: string, fixture: DocumentFixture): unknown[] {
  return rulesIn(translate([fixture]), name).filter(
    (rule) => typeof rule === 'object' && rule !== null && 'key' in rule && rule.key === key,
  );
}

describe('translateKindData: pool spells', () => {
  test("Divine Font's font choice offers the deity's fonts, and its pool takes the font's spell", () => {
    expect(keyed(ChoiceSet, 'divine-font', DIVINE_FONT)).toEqual([
      {
        key: ChoiceSet,
        flag: 'divine-font',
        prompt: 'Select a Divine Font.',
        rollOption: 'divine-font',
        choices: [
          { label: 'Healing', value: 'heal', predicate: ['deity:primary:font:heal'] },
          { label: 'Harmful', value: 'harm', predicate: ['deity:primary:font:harm'] },
        ],
      },
    ]);
    expect(keyed(PoolSpells, 'divine-font', DIVINE_FONT)).toEqual([
      {
        key: PoolSpells,
        entry: 'cleric',
        pool: 'divine-font',
        spells: [idOf('spell:heal')],
        predicate: ['divine-font:heal'],
      },
      {
        key: PoolSpells,
        entry: 'cleric',
        pool: 'divine-font',
        spells: [idOf('spell:harm')],
        predicate: ['divine-font:harm'],
      },
    ]);
    expect(translate([DIVINE_FONT]).envelopes.untranslatedRules).toEqual([]);
  });

  test("a school's curriculum pool takes its cantrips, then its spells by rank; Unified Magical Theory has none", () => {
    const [curriculum] = keyed(PoolSpells, 'school-of-battle-magic', SCHOOL_OF_BATTLE_MAGIC);

    expect(curriculum).toMatchObject({ key: PoolSpells, entry: 'wizard', pool: 'curriculum' });
    expect(curriculum).toHaveProperty(
      'spells',
      [
        ['shield', 'telekinetic-projectile'],
        ['breathe-fire', 'force-barrage', 'mystic-armor'],
        ['mist', 'resist-energy'],
        ['earthbind', 'fireball'],
        ['wall-of-fire', 'weapon-storm'],
        ['howling-blizzard', 'impaling-spike'],
        ['chain-lightning', 'disintegrate'],
        ['energy-aegis', 'true-target'],
        ['arctic-rift', 'desiccate'],
        ['falling-stars'],
      ].flatMap((rank) => rank.map((spell) => idOf(`spell:${spell}`))),
    );
    expect(keyed(PoolSpells, 'school-of-unified-magical-theory', SCHOOL_OF_UNIFIED_MAGICAL_THEORY)).toEqual([]);
  });

  test("a curriculum names another pack's spells as pack:slug and its own pack's by slug", () => {
    const impossibleMagic = PackId.parse('impossible-magic');
    const [curriculum] = poolSpellRules('class-feature:school-of-keen-inquiry', impossibleMagic);
    const { spells } = curriculum as { readonly spells: readonly string[] };

    expect(spells).toContain(contentId(PackId.parse('player-core'), EntrySlug.parse('spell:detect-magic')));
    expect(spells).not.toContain(contentId(impossibleMagic, EntrySlug.parse('spell:detect-magic')));
  });
});
