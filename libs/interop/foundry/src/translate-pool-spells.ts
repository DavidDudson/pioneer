import { ContentId, contentId, EntrySlug, PackId, RuleElementKey } from '@pioneer/rules/sdk';

/**
 * The spells Player Core's pools of slots take, as `PoolSpells` elements by the entry slug they go on (ADR-0045).
 * Foundry keeps no pools: a divine font is a spellcasting entry the player fills by hand, and a school's curriculum is
 * a table in its description. Spells are named by slug, in the pack being imported, or `pack:slug` in another.
 */

const DIVINE_FONT = 'divine-font';
const CURRICULUM = 'curriculum';

interface PoolFields {
  readonly entry: string;
  readonly pool: string;
  readonly spells: readonly string[];
}

/** A spell named `slug` in the pack being imported, or `pack:slug` in another one. */
function spellId(pack: PackId, spell: string): ContentId {
  const [other, slug] = spell.includes(':') ? spell.split(':') : [undefined, spell];
  const owner = other === undefined ? pack : PackId.parse(other);
  return ContentId.parse(contentId(owner, EntrySlug.parse(`spell:${slug}`)));
}

function poolSpells(pack: PackId, { entry, pool, spells }: PoolFields, predicate?: readonly string[]): object {
  return {
    key: RuleElementKey.PoolSpells,
    entry,
    pool,
    spells: spells.map((spell) => spellId(pack, spell)),
    ...(predicate === undefined ? {} : { predicate }),
  };
}

/** Heal in a healing font, harm in a harmful one: the font the Divine Font `ChoiceSet` picks (`divine-font:<font>`). */
function divineFont(pack: PackId): readonly object[] {
  return ['heal', 'harm'].map((font) =>
    poolSpells(pack, { entry: 'cleric', pool: DIVINE_FONT, spells: [font] }, [`${DIVINE_FONT}:${font}`]),
  );
}

/**
 * Each school's curriculum, as its description's table lists it: its cantrips, then its spells of each rank from 1st to
 * 9th. Unified Magical Theory has none.
 */
const CURRICULA: ReadonlyMap<string, readonly (readonly string[])[]> = new Map([
  [
    'school-of-ars-grammatica',
    [
      ['message', 'sigil'],
      ['command', 'disguise-magic', 'runic-body', 'runic-weapon'],
      ['dispel-magic', 'translate'],
      ['enthrall', 'veil-of-privacy'],
      ['dispelling-globe', 'suggestion'],
      ['sending', 'truespeech'],
      ['repulsion', 'spellwrack'],
      ['contingency', 'planar-seal'],
      ['quandary', 'unrelenting-observation'],
      ['detonate-magic'],
    ],
  ],
  [
    'school-of-battle-magic',
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
    ],
  ],
  [
    'school-of-civic-wizardry',
    [
      ['prestidigitation', 'read-aura'],
      ['hydraulic-push', 'pummeling-rubble', 'summon-construct'],
      ['revealing-light', 'water-walk'],
      ['cozy-cabin', 'safe-passage'],
      ['creation', 'unfettered-movement'],
      ['control-water', 'wall-of-stone'],
      ['disintegrate', 'wall-of-force'],
      ['planar-palace', 'retrocognition'],
      ['earthquake', 'pinpoint'],
      ['foresight'],
    ],
  ],
  [
    'school-of-mentalism',
    [
      ['daze', 'figment'],
      ['dizzying-colors', 'sleep', 'sure-strike'],
      ['illusory-creature', 'stupefy'],
      ['dream-message', 'mind-reading'],
      ['nightmare', 'vision-of-death'],
      ['hallucination', 'illusory-scene'],
      ['never-mind', 'phantasmal-calamity'],
      ['project-image', 'warp-mind'],
      ['disappearance', 'uncontrollable-dance'],
      ['phantasmagoria'],
    ],
  ],
  [
    'school-of-protean-form',
    [
      ['gouging-claw', 'tangle-vine'],
      ['jump', 'pest-form', 'spider-sting'],
      ['enlarge', 'humanoid-form'],
      ['feet-to-fins', 'vampiric-feast'],
      ['mountain-resilience', 'vapor-form'],
      ['elemental-form', 'toxic-cloud'],
      ['cursed-metamorphosis', 'petrify'],
      ['duplicate-foe', 'fiery-body'],
      ['desiccate', 'monstrosity-form'],
      ['metamorphosis'],
    ],
  ],
  [
    'school-of-the-boundary',
    [
      ['telekinetic-hand', 'void-warp'],
      ['grim-tendrils', 'phantasmal-minion', 'summon-undead'],
      ['darkness', 'see-the-unseen'],
      ['bind-undead', 'ghostly-weapon'],
      ['flicker', 'translocate'],
      ['banishment', 'invoke-spirits'],
      ['teleport', 'vampiric-exsanguination'],
      ['eclipse-burst', 'interplanar-teleport'],
      ['quandary', 'unrelenting-observation'],
      ['massacre'],
    ],
  ],
  [
    'school-of-breathtaking-influence',
    [
      ['player-core:daze', 'infectious-enthusiasm'],
      ['player-core:command', 'player-core:fear', 'player-core:sleep'],
      ['player-core:blood-vendetta', 'phantom-crowd'],
      ['player-core:enthrall', 'mind-of-menace'],
      ['player-core:confusion', 'player-core:outcasts-curse'],
      ['player-core:subconscious-suggestion', 'player-core:wave-of-despair'],
      ['player-core:dominate', 'player-core:never-mind'],
      ['player-core:contingency', 'puppet-strings'],
      ['player-core-2:dream-council', 'gm-core:hidden-mind'],
      ['player-core-2:telepathic-demand'],
    ],
  ],
  [
    'school-of-keen-inquiry',
    [
      ['player-core:detect-magic', 'player-core:sigil'],
      ['player-core:disguise-magic', 'player-core:illusory-disguise', 'player-core:mindlink'],
      ['player-core:knock', 'player-core:see-the-unseen'],
      ['player-core:clairaudience', 'player-core:locate'],
      ['player-core:clairvoyance', 'player-core:detect-scrying'],
      ['player-core:mind-probe', 'player-core:scouting-eye'],
      ['player-core:scrying', 'player-core:truesight'],
      ['player-core:retrocognition', 'player-core:true-target'],
      ['player-core:disappearance', 'player-core:pinpoint'],
      ['player-core:foresight'],
    ],
  ],
  [
    'school-of-nexian-spaces',
    [
      ['player-core:alarm', 'player-core:pet-cache', 'player-core-2:thoughtful-gift'],
      ['dimensional-drop', 'vanish-weapon'],
      ['player-core:cozy-cabin', 'far-reach'],
      ['player-core:flicker', 'player-core:liminal-doorway'],
      ['player-core:banishment', 'space-fold-gate'],
      ['player-core-2:collective-transposition', 'proximal-shift'],
      ['player-core:interplanar-teleport', 'player-core:planar-palace'],
      ['stars-of-another-sky', 'player-core:quandary'],
      ['player-core-2:resplendent-mansion'],
    ],
  ],
  [
    'school-of-quantic-control',
    [
      ['player-core-2:gale-blast', 'player-core-2:scatter-scree'],
      ['cradle-aloft', 'player-core:gentle-landing', 'player-core:pummeling-rubble'],
      ['player-core-2:dismantle', 'unrelenting-gravity'],
      ['chosen-gravity', 'inertia-lock'],
      ['player-core-2:containment', 'living-terrain'],
      ['player-core:control-water', 'player-core:wall-of-stone'],
      ['player-core:repulsion', 'player-core:wall-of-force'],
      ['infinitesimal-collapse-field', 'player-core:planar-seal'],
      ['player-core:arctic-rift', 'earthbreaker-stride'],
      ['player-core:implosion'],
    ],
  ],
]);

/** The `PoolSpells` elements the entry with `slug` gains in `pack`, if any. */
export function poolSpellRules(slug: string, pack: PackId): readonly object[] {
  if (slug === `class-feature:${DIVINE_FONT}`) {
    return divineFont(pack);
  }
  const school = CURRICULA.get(slug.replace(/^class-feature:/u, ''));
  return school === undefined ? [] : [poolSpells(pack, { entry: 'wizard', pool: CURRICULUM, spells: school.flat() })];
}
