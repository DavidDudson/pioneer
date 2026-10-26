import { pack } from './pack-loader';

/* The `core-rules` pack: its own files, then the vocabulary each Foundry import adds, under `imported/<pack>/`. */

/** The vocabulary the first imports add. */
function earlierVocabulary() {
  return [
    import('@pioneer/content/packs/core-rules/imported/player-core/damage-type.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core/sense.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core-2/language.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core-2/sense.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core-2/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core-2/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/divine-mysteries/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/treasure-vault/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/war-of-immortals/sense.json'),
    import('@pioneer/content/packs/core-rules/imported/war-of-immortals/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/war-of-immortals/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/tian-xia-character-guide/language.json'),
    import('@pioneer/content/packs/core-rules/imported/tian-xia-character-guide/sense.json'),
    import('@pioneer/content/packs/core-rules/imported/tian-xia-character-guide/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/tian-xia-character-guide/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/dark-archive-remastered/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/dark-archive-remastered/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/impossible-lands/language.json'),
    import('@pioneer/content/packs/core-rules/imported/impossible-lands/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/mwangi-expanse/language.json'),
  ];
}

/** The vocabulary the later imports add. */
function laterVocabulary() {
  return [
    import('@pioneer/content/packs/core-rules/imported/mwangi-expanse/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/rage-of-elements/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/rage-of-elements/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/secrets-of-magic/sense.json'),
    import('@pioneer/content/packs/core-rules/imported/secrets-of-magic/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/secrets-of-magic/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/impossible-magic/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/impossible-magic/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/cheliax-infernal-inheritance/language.json'),
    import('@pioneer/content/packs/core-rules/imported/cheliax-infernal-inheritance/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/cheliax-infernal-inheritance/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/rival-academies/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/draconic-codex/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/battlecry/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/battlecry/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/guns-and-gears/language.json'),
    import('@pioneer/content/packs/core-rules/imported/guns-and-gears/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/guns-and-gears/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/howl-of-the-wild/language.json'),
    import('@pioneer/content/packs/core-rules/imported/howl-of-the-wild/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/gm-core/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/monster-core/language.json'),
    import('@pioneer/content/packs/core-rules/imported/monster-core/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/monster-core-2/language.json'),
    import('@pioneer/content/packs/core-rules/imported/monster-core-2/sense.json'),
    import('@pioneer/content/packs/core-rules/imported/monster-core-2/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/npc-core/language.json'),
    import('@pioneer/content/packs/core-rules/imported/season-of-ghosts/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/season-of-ghosts/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/myth-speakers/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/revenge-of-the-runelords/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/bastion-of-blasphemies/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/the-dead-gods-hand/statistic.json'),
  ];
}

/** The vocabulary the adventure and Society imports add. */
function adventureVocabulary() {
  return [
    import('@pioneer/content/packs/core-rules/imported/hellbreakers/language.json'),
    import('@pioneer/content/packs/core-rules/imported/hellbreakers/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/wardens-of-wildwood/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/wardens-of-wildwood/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/curtain-call/language.json'),
    import('@pioneer/content/packs/core-rules/imported/curtain-call/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/curtain-call/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/triumph-of-the-tusk/language.json'),
    import('@pioneer/content/packs/core-rules/imported/triumph-of-the-tusk/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/spore-war/language.json'),
    import('@pioneer/content/packs/core-rules/imported/spore-war/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/spore-war/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/shades-of-blood/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/shades-of-blood/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/prey-for-death/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/clockwork-mystery/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/tian-xia-world-guide/trait.json'),
  ];
}

export async function coreRulesPack() {
  return pack(import('@pioneer/content/packs/core-rules/pack.json'), [
    import('@pioneer/content/packs/core-rules/language.json'),
    import('@pioneer/content/packs/core-rules/sense.json'),
    import('@pioneer/content/packs/core-rules/statistic.json'),
    import('@pioneer/content/packs/core-rules/variant-rule.json'),
    ...earlierVocabulary(),
    ...laterVocabulary(),
    ...adventureVocabulary(),
  ]);
}
