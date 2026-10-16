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

export async function rivalAcademiesPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/rival-academies/pack.json'), [
    json(import('@pioneer/content/packs/rival-academies/action.json')),
    json(import('@pioneer/content/packs/rival-academies/archetype.json')),
    json(import('@pioneer/content/packs/rival-academies/background.json')),
    json(import('@pioneer/content/packs/rival-academies/class-feature.json')),
    json(import('@pioneer/content/packs/rival-academies/consumable.json')),
    json(import('@pioneer/content/packs/rival-academies/effect.json')),
    json(import('@pioneer/content/packs/rival-academies/equipment.json')),
    json(import('@pioneer/content/packs/rival-academies/feat.json')),
    json(import('@pioneer/content/packs/rival-academies/ritual.json')),
    json(import('@pioneer/content/packs/rival-academies/spell.json')),
  ]);
}

export async function shiningKingdomsPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/shining-kingdoms/pack.json'), [
    json(import('@pioneer/content/packs/shining-kingdoms/action.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/archetype.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/armor.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/class-feature.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/consumable.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/deity.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/effect.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/equipment.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/feat.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/rune.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/spell.json')),
    json(import('@pioneer/content/packs/shining-kingdoms/weapon.json')),
  ]);
}

export async function draconicCodexPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/draconic-codex/pack.json'), [
    json(import('@pioneer/content/packs/draconic-codex/action.json')),
    json(import('@pioneer/content/packs/draconic-codex/ancestry-feature.json')),
    json(import('@pioneer/content/packs/draconic-codex/ancestry.json')),
    json(import('@pioneer/content/packs/draconic-codex/archetype.json')),
    json(import('@pioneer/content/packs/draconic-codex/armor.json')),
    json(import('@pioneer/content/packs/draconic-codex/consumable.json')),
    json(import('@pioneer/content/packs/draconic-codex/deity.json')),
    json(import('@pioneer/content/packs/draconic-codex/effect.json')),
    json(import('@pioneer/content/packs/draconic-codex/equipment.json')),
    json(import('@pioneer/content/packs/draconic-codex/feat.json')),
    json(import('@pioneer/content/packs/draconic-codex/heritage.json')),
    json(import('@pioneer/content/packs/draconic-codex/spell.json')),
    json(import('@pioneer/content/packs/draconic-codex/weapon.json')),
  ]);
}

export async function hellfireDispatchesPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/hellfire-dispatches/pack.json'), [
    json(import('@pioneer/content/packs/hellfire-dispatches/action.json')),
    json(import('@pioneer/content/packs/hellfire-dispatches/archetype.json')),
    json(import('@pioneer/content/packs/hellfire-dispatches/consumable.json')),
    json(import('@pioneer/content/packs/hellfire-dispatches/effect.json')),
    json(import('@pioneer/content/packs/hellfire-dispatches/equipment.json')),
    json(import('@pioneer/content/packs/hellfire-dispatches/feat.json')),
  ]);
}

export async function highSeasPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/high-seas/pack.json'), [
    json(import('@pioneer/content/packs/high-seas/action.json')),
    json(import('@pioneer/content/packs/high-seas/archetype.json')),
    json(import('@pioneer/content/packs/high-seas/armor.json')),
    json(import('@pioneer/content/packs/high-seas/consumable.json')),
    json(import('@pioneer/content/packs/high-seas/deity.json')),
    json(import('@pioneer/content/packs/high-seas/effect.json')),
    json(import('@pioneer/content/packs/high-seas/equipment.json')),
    json(import('@pioneer/content/packs/high-seas/feat.json')),
    json(import('@pioneer/content/packs/high-seas/heritage.json')),
    json(import('@pioneer/content/packs/high-seas/spell.json')),
    json(import('@pioneer/content/packs/high-seas/weapon.json')),
  ]);
}

export async function seasonOfGhostsPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/season-of-ghosts/pack.json'), [
    json(import('@pioneer/content/packs/season-of-ghosts/action.json')),
    json(import('@pioneer/content/packs/season-of-ghosts/armor.json')),
    json(import('@pioneer/content/packs/season-of-ghosts/consumable.json')),
    json(import('@pioneer/content/packs/season-of-ghosts/effect.json')),
    json(import('@pioneer/content/packs/season-of-ghosts/equipment.json')),
    json(import('@pioneer/content/packs/season-of-ghosts/feat.json')),
    json(import('@pioneer/content/packs/season-of-ghosts/ritual.json')),
    json(import('@pioneer/content/packs/season-of-ghosts/shield.json')),
    json(import('@pioneer/content/packs/season-of-ghosts/spell.json')),
    json(import('@pioneer/content/packs/season-of-ghosts/weapon.json')),
  ]);
}

export async function hellbreakersPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/hellbreakers/pack.json'), [
    json(import('@pioneer/content/packs/hellbreakers/archetype.json')),
    json(import('@pioneer/content/packs/hellbreakers/consumable.json')),
    json(import('@pioneer/content/packs/hellbreakers/effect.json')),
    json(import('@pioneer/content/packs/hellbreakers/equipment.json')),
    json(import('@pioneer/content/packs/hellbreakers/feat.json')),
    json(import('@pioneer/content/packs/hellbreakers/ritual.json')),
    json(import('@pioneer/content/packs/hellbreakers/shield.json')),
    json(import('@pioneer/content/packs/hellbreakers/weapon.json')),
  ]);
}

export async function gatewalkersPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/gatewalkers/pack.json'), [
    json(import('@pioneer/content/packs/gatewalkers/action.json')),
    json(import('@pioneer/content/packs/gatewalkers/archetype.json')),
    json(import('@pioneer/content/packs/gatewalkers/class-feature.json')),
    json(import('@pioneer/content/packs/gatewalkers/consumable.json')),
    json(import('@pioneer/content/packs/gatewalkers/effect.json')),
    json(import('@pioneer/content/packs/gatewalkers/equipment.json')),
    json(import('@pioneer/content/packs/gatewalkers/feat.json')),
    json(import('@pioneer/content/packs/gatewalkers/ritual.json')),
    json(import('@pioneer/content/packs/gatewalkers/spell.json')),
    json(import('@pioneer/content/packs/gatewalkers/weapon.json')),
  ]);
}

export async function mythSpeakersPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/myth-speakers/pack.json'), [
    json(import('@pioneer/content/packs/myth-speakers/action.json')),
    json(import('@pioneer/content/packs/myth-speakers/background.json')),
    json(import('@pioneer/content/packs/myth-speakers/class-feature.json')),
    json(import('@pioneer/content/packs/myth-speakers/consumable.json')),
    json(import('@pioneer/content/packs/myth-speakers/deity.json')),
    json(import('@pioneer/content/packs/myth-speakers/effect.json')),
    json(import('@pioneer/content/packs/myth-speakers/equipment.json')),
    json(import('@pioneer/content/packs/myth-speakers/feat.json')),
    json(import('@pioneer/content/packs/myth-speakers/shield.json')),
    json(import('@pioneer/content/packs/myth-speakers/spell.json')),
    json(import('@pioneer/content/packs/myth-speakers/weapon.json')),
  ]);
}

export async function revengeOfTheRunelordsPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/revenge-of-the-runelords/pack.json'), [
    json(import('@pioneer/content/packs/revenge-of-the-runelords/action.json')),
    json(import('@pioneer/content/packs/revenge-of-the-runelords/armor.json')),
    json(import('@pioneer/content/packs/revenge-of-the-runelords/background.json')),
    json(import('@pioneer/content/packs/revenge-of-the-runelords/consumable.json')),
    json(import('@pioneer/content/packs/revenge-of-the-runelords/effect.json')),
    json(import('@pioneer/content/packs/revenge-of-the-runelords/equipment.json')),
    json(import('@pioneer/content/packs/revenge-of-the-runelords/feat.json')),
    json(import('@pioneer/content/packs/revenge-of-the-runelords/weapon.json')),
  ]);
}

export async function secretsOfTheUnlitStarPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/secrets-of-the-unlit-star/pack.json'), [
    json(import('@pioneer/content/packs/secrets-of-the-unlit-star/action.json')),
    json(import('@pioneer/content/packs/secrets-of-the-unlit-star/consumable.json')),
    json(import('@pioneer/content/packs/secrets-of-the-unlit-star/equipment.json')),
    json(import('@pioneer/content/packs/secrets-of-the-unlit-star/heritage.json')),
    json(import('@pioneer/content/packs/secrets-of-the-unlit-star/weapon.json')),
  ]);
}

export async function troublesInGraycePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/troubles-in-grayce/pack.json'), [
    json(import('@pioneer/content/packs/troubles-in-grayce/action.json')),
    json(import('@pioneer/content/packs/troubles-in-grayce/consumable.json')),
    json(import('@pioneer/content/packs/troubles-in-grayce/effect.json')),
    json(import('@pioneer/content/packs/troubles-in-grayce/equipment.json')),
  ]);
}

export async function hellsDestinyPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/hells-destiny/pack.json'), [
    json(import('@pioneer/content/packs/hells-destiny/action.json')),
    json(import('@pioneer/content/packs/hells-destiny/archetype.json')),
    json(import('@pioneer/content/packs/hells-destiny/background.json')),
    json(import('@pioneer/content/packs/hells-destiny/class-feature.json')),
    json(import('@pioneer/content/packs/hells-destiny/consumable.json')),
    json(import('@pioneer/content/packs/hells-destiny/effect.json')),
    json(import('@pioneer/content/packs/hells-destiny/equipment.json')),
    json(import('@pioneer/content/packs/hells-destiny/feat.json')),
    json(import('@pioneer/content/packs/hells-destiny/spell.json')),
    json(import('@pioneer/content/packs/hells-destiny/weapon.json')),
  ]);
}

export async function bastionOfBlasphemiesPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/bastion-of-blasphemies/pack.json'), [
    json(import('@pioneer/content/packs/bastion-of-blasphemies/action.json')),
    json(import('@pioneer/content/packs/bastion-of-blasphemies/background.json')),
    json(import('@pioneer/content/packs/bastion-of-blasphemies/consumable.json')),
    json(import('@pioneer/content/packs/bastion-of-blasphemies/effect.json')),
    json(import('@pioneer/content/packs/bastion-of-blasphemies/equipment.json')),
    json(import('@pioneer/content/packs/bastion-of-blasphemies/weapon.json')),
  ]);
}

export async function theDeadGodsHandPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/the-dead-gods-hand/pack.json'), [
    json(import('@pioneer/content/packs/the-dead-gods-hand/armor.json')),
    json(import('@pioneer/content/packs/the-dead-gods-hand/background.json')),
    json(import('@pioneer/content/packs/the-dead-gods-hand/consumable.json')),
    json(import('@pioneer/content/packs/the-dead-gods-hand/effect.json')),
    json(import('@pioneer/content/packs/the-dead-gods-hand/equipment.json')),
    json(import('@pioneer/content/packs/the-dead-gods-hand/feat.json')),
    json(import('@pioneer/content/packs/the-dead-gods-hand/ritual.json')),
    json(import('@pioneer/content/packs/the-dead-gods-hand/weapon.json')),
  ]);
}
