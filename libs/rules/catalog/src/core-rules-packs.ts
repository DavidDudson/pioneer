import type { PackContents } from '@pioneer/rules/sdk';

import { json, pack } from './json-packs';
import type { JsonModule } from './json-packs';

/* The `core-rules` pack: its own files, then the vocabulary each Foundry import adds, under `imported/<pack>/`. */

type JsonFile = Promise<JsonModule>;

/** The vocabulary the first imports add. */
function earlierVocabulary(): readonly JsonFile[] {
  return [
    json(import('@pioneer/content/packs/core-rules/imported/player-core/damage-type.json')),
    json(import('@pioneer/content/packs/core-rules/imported/player-core/sense.json')),
    json(import('@pioneer/content/packs/core-rules/imported/player-core/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/player-core/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/player-core-2/language.json')),
    json(import('@pioneer/content/packs/core-rules/imported/player-core-2/sense.json')),
    json(import('@pioneer/content/packs/core-rules/imported/player-core-2/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/player-core-2/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/divine-mysteries/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/treasure-vault/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/war-of-immortals/sense.json')),
    json(import('@pioneer/content/packs/core-rules/imported/war-of-immortals/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/war-of-immortals/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/tian-xia-character-guide/language.json')),
    json(import('@pioneer/content/packs/core-rules/imported/tian-xia-character-guide/sense.json')),
    json(import('@pioneer/content/packs/core-rules/imported/tian-xia-character-guide/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/tian-xia-character-guide/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/dark-archive-remastered/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/dark-archive-remastered/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/impossible-lands/language.json')),
    json(import('@pioneer/content/packs/core-rules/imported/impossible-lands/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/mwangi-expanse/language.json')),
  ];
}

/** The vocabulary the later imports add. */
function laterVocabulary(): readonly JsonFile[] {
  return [
    json(import('@pioneer/content/packs/core-rules/imported/mwangi-expanse/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/rage-of-elements/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/rage-of-elements/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/secrets-of-magic/sense.json')),
    json(import('@pioneer/content/packs/core-rules/imported/secrets-of-magic/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/secrets-of-magic/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/impossible-magic/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/impossible-magic/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/cheliax-infernal-inheritance/language.json')),
    json(import('@pioneer/content/packs/core-rules/imported/cheliax-infernal-inheritance/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/cheliax-infernal-inheritance/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/rival-academies/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/draconic-codex/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/battlecry/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/battlecry/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/guns-and-gears/language.json')),
    json(import('@pioneer/content/packs/core-rules/imported/guns-and-gears/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/guns-and-gears/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/howl-of-the-wild/language.json')),
    json(import('@pioneer/content/packs/core-rules/imported/howl-of-the-wild/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/gm-core/trait.json')),
    json(import('@pioneer/content/packs/core-rules/imported/season-of-ghosts/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/imported/season-of-ghosts/trait.json')),
  ];
}

export async function coreRulesPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/core-rules/pack.json'), [
    json(import('@pioneer/content/packs/core-rules/language.json')),
    json(import('@pioneer/content/packs/core-rules/sense.json')),
    json(import('@pioneer/content/packs/core-rules/statistic.json')),
    json(import('@pioneer/content/packs/core-rules/variant-rule.json')),
    ...earlierVocabulary(),
    ...laterVocabulary(),
  ]);
}
