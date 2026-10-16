import type { PackContents } from '@pioneer/rules/sdk';

import { json, pack } from './json-packs';

/* Remaster ORC packs under `content/packs/<pack>/` that don't fit `json-packs.ts`, read the same way. */

export async function impossibleMagicPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/impossible-magic/pack.json'), [
    json(import('@pioneer/content/packs/impossible-magic/action.json')),
    json(import('@pioneer/content/packs/impossible-magic/archetype.json')),
    json(import('@pioneer/content/packs/impossible-magic/armor.json')),
    json(import('@pioneer/content/packs/impossible-magic/class.json')),
    json(import('@pioneer/content/packs/impossible-magic/class-feature.json')),
    json(import('@pioneer/content/packs/impossible-magic/consumable.json')),
    json(import('@pioneer/content/packs/impossible-magic/effect.json')),
    json(import('@pioneer/content/packs/impossible-magic/equipment.json')),
    json(import('@pioneer/content/packs/impossible-magic/feat.json')),
    json(import('@pioneer/content/packs/impossible-magic/heritage.json')),
    json(import('@pioneer/content/packs/impossible-magic/ritual.json')),
    json(import('@pioneer/content/packs/impossible-magic/rune.json')),
    json(import('@pioneer/content/packs/impossible-magic/shield.json')),
    json(import('@pioneer/content/packs/impossible-magic/spell.json')),
    json(import('@pioneer/content/packs/impossible-magic/weapon.json')),
  ]);
}

export async function gunsAndGearsPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/guns-and-gears/pack.json'), [
    json(import('@pioneer/content/packs/guns-and-gears/action.json')),
    json(import('@pioneer/content/packs/guns-and-gears/ancestry.json')),
    json(import('@pioneer/content/packs/guns-and-gears/ancestry-feature.json')),
    json(import('@pioneer/content/packs/guns-and-gears/archetype.json')),
    json(import('@pioneer/content/packs/guns-and-gears/armor.json')),
    json(import('@pioneer/content/packs/guns-and-gears/background.json')),
    json(import('@pioneer/content/packs/guns-and-gears/class.json')),
    json(import('@pioneer/content/packs/guns-and-gears/class-feature.json')),
    json(import('@pioneer/content/packs/guns-and-gears/consumable.json')),
    json(import('@pioneer/content/packs/guns-and-gears/effect.json')),
    json(import('@pioneer/content/packs/guns-and-gears/equipment.json')),
    json(import('@pioneer/content/packs/guns-and-gears/feat.json')),
    json(import('@pioneer/content/packs/guns-and-gears/heritage.json')),
    json(import('@pioneer/content/packs/guns-and-gears/weapon.json')),
  ]);
}

export async function battlecryPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/battlecry/pack.json'), [
    json(import('@pioneer/content/packs/battlecry/action.json')),
    json(import('@pioneer/content/packs/battlecry/ancestry.json')),
    json(import('@pioneer/content/packs/battlecry/ancestry-feature.json')),
    json(import('@pioneer/content/packs/battlecry/archetype.json')),
    json(import('@pioneer/content/packs/battlecry/armor.json')),
    json(import('@pioneer/content/packs/battlecry/background.json')),
    json(import('@pioneer/content/packs/battlecry/class.json')),
    json(import('@pioneer/content/packs/battlecry/class-feature.json')),
    json(import('@pioneer/content/packs/battlecry/consumable.json')),
    json(import('@pioneer/content/packs/battlecry/effect.json')),
    json(import('@pioneer/content/packs/battlecry/equipment.json')),
    json(import('@pioneer/content/packs/battlecry/feat.json')),
    json(import('@pioneer/content/packs/battlecry/heritage.json')),
    json(import('@pioneer/content/packs/battlecry/ritual.json')),
    json(import('@pioneer/content/packs/battlecry/shield.json')),
    json(import('@pioneer/content/packs/battlecry/spell.json')),
    json(import('@pioneer/content/packs/battlecry/weapon.json')),
  ]);
}

export async function chelaxInfernalInheritancePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/cheliax-infernal-inheritance/pack.json'), [
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/action.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/ancestry.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/archetype.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/armor.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/background.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/class-feature.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/consumable.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/deity.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/effect.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/equipment.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/feat.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/heritage.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/spell.json')),
    json(import('@pioneer/content/packs/cheliax-infernal-inheritance/weapon.json')),
  ]);
}
