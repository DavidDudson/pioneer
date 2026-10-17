import { pack } from './pack-loader';

/* Remaster ORC packs under `content/packs/<pack>/` that don't fit `json-packs.ts`, read the same way. */

export async function impossibleMagicPack() {
  return pack(import('@pioneer/content/packs/impossible-magic/pack.json'), [
    import('@pioneer/content/packs/impossible-magic/action.json'),
    import('@pioneer/content/packs/impossible-magic/archetype.json'),
    import('@pioneer/content/packs/impossible-magic/armor.json'),
    import('@pioneer/content/packs/impossible-magic/class.json'),
    import('@pioneer/content/packs/impossible-magic/class-feature.json'),
    import('@pioneer/content/packs/impossible-magic/consumable.json'),
    import('@pioneer/content/packs/impossible-magic/effect.json'),
    import('@pioneer/content/packs/impossible-magic/equipment.json'),
    import('@pioneer/content/packs/impossible-magic/feat.json'),
    import('@pioneer/content/packs/impossible-magic/heritage.json'),
    import('@pioneer/content/packs/impossible-magic/ritual.json'),
    import('@pioneer/content/packs/impossible-magic/rune.json'),
    import('@pioneer/content/packs/impossible-magic/shield.json'),
    import('@pioneer/content/packs/impossible-magic/spell.json'),
    import('@pioneer/content/packs/impossible-magic/weapon.json'),
  ]);
}

export async function gunsAndGearsPack() {
  return pack(import('@pioneer/content/packs/guns-and-gears/pack.json'), [
    import('@pioneer/content/packs/guns-and-gears/action.json'),
    import('@pioneer/content/packs/guns-and-gears/ancestry.json'),
    import('@pioneer/content/packs/guns-and-gears/ancestry-feature.json'),
    import('@pioneer/content/packs/guns-and-gears/archetype.json'),
    import('@pioneer/content/packs/guns-and-gears/armor.json'),
    import('@pioneer/content/packs/guns-and-gears/background.json'),
    import('@pioneer/content/packs/guns-and-gears/class.json'),
    import('@pioneer/content/packs/guns-and-gears/class-feature.json'),
    import('@pioneer/content/packs/guns-and-gears/consumable.json'),
    import('@pioneer/content/packs/guns-and-gears/effect.json'),
    import('@pioneer/content/packs/guns-and-gears/equipment.json'),
    import('@pioneer/content/packs/guns-and-gears/feat.json'),
    import('@pioneer/content/packs/guns-and-gears/heritage.json'),
    import('@pioneer/content/packs/guns-and-gears/weapon.json'),
  ]);
}

export async function battlecryPack() {
  return pack(import('@pioneer/content/packs/battlecry/pack.json'), [
    import('@pioneer/content/packs/battlecry/action.json'),
    import('@pioneer/content/packs/battlecry/ancestry.json'),
    import('@pioneer/content/packs/battlecry/ancestry-feature.json'),
    import('@pioneer/content/packs/battlecry/archetype.json'),
    import('@pioneer/content/packs/battlecry/armor.json'),
    import('@pioneer/content/packs/battlecry/background.json'),
    import('@pioneer/content/packs/battlecry/class.json'),
    import('@pioneer/content/packs/battlecry/class-feature.json'),
    import('@pioneer/content/packs/battlecry/consumable.json'),
    import('@pioneer/content/packs/battlecry/effect.json'),
    import('@pioneer/content/packs/battlecry/equipment.json'),
    import('@pioneer/content/packs/battlecry/feat.json'),
    import('@pioneer/content/packs/battlecry/heritage.json'),
    import('@pioneer/content/packs/battlecry/ritual.json'),
    import('@pioneer/content/packs/battlecry/shield.json'),
    import('@pioneer/content/packs/battlecry/spell.json'),
    import('@pioneer/content/packs/battlecry/weapon.json'),
  ]);
}

export async function chelaxInfernalInheritancePack() {
  return pack(import('@pioneer/content/packs/cheliax-infernal-inheritance/pack.json'), [
    import('@pioneer/content/packs/cheliax-infernal-inheritance/action.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/ancestry.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/archetype.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/armor.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/background.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/class-feature.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/consumable.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/deity.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/effect.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/equipment.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/feat.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/heritage.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/spell.json'),
    import('@pioneer/content/packs/cheliax-infernal-inheritance/weapon.json'),
  ]);
}

export async function rivalAcademiesPack() {
  return pack(import('@pioneer/content/packs/rival-academies/pack.json'), [
    import('@pioneer/content/packs/rival-academies/action.json'),
    import('@pioneer/content/packs/rival-academies/archetype.json'),
    import('@pioneer/content/packs/rival-academies/background.json'),
    import('@pioneer/content/packs/rival-academies/class-feature.json'),
    import('@pioneer/content/packs/rival-academies/consumable.json'),
    import('@pioneer/content/packs/rival-academies/effect.json'),
    import('@pioneer/content/packs/rival-academies/equipment.json'),
    import('@pioneer/content/packs/rival-academies/feat.json'),
    import('@pioneer/content/packs/rival-academies/ritual.json'),
    import('@pioneer/content/packs/rival-academies/spell.json'),
  ]);
}

export async function shiningKingdomsPack() {
  return pack(import('@pioneer/content/packs/shining-kingdoms/pack.json'), [
    import('@pioneer/content/packs/shining-kingdoms/action.json'),
    import('@pioneer/content/packs/shining-kingdoms/archetype.json'),
    import('@pioneer/content/packs/shining-kingdoms/armor.json'),
    import('@pioneer/content/packs/shining-kingdoms/class-feature.json'),
    import('@pioneer/content/packs/shining-kingdoms/consumable.json'),
    import('@pioneer/content/packs/shining-kingdoms/deity.json'),
    import('@pioneer/content/packs/shining-kingdoms/effect.json'),
    import('@pioneer/content/packs/shining-kingdoms/equipment.json'),
    import('@pioneer/content/packs/shining-kingdoms/feat.json'),
    import('@pioneer/content/packs/shining-kingdoms/rune.json'),
    import('@pioneer/content/packs/shining-kingdoms/spell.json'),
    import('@pioneer/content/packs/shining-kingdoms/weapon.json'),
  ]);
}

export async function draconicCodexPack() {
  return pack(import('@pioneer/content/packs/draconic-codex/pack.json'), [
    import('@pioneer/content/packs/draconic-codex/action.json'),
    import('@pioneer/content/packs/draconic-codex/ancestry-feature.json'),
    import('@pioneer/content/packs/draconic-codex/ancestry.json'),
    import('@pioneer/content/packs/draconic-codex/archetype.json'),
    import('@pioneer/content/packs/draconic-codex/armor.json'),
    import('@pioneer/content/packs/draconic-codex/consumable.json'),
    import('@pioneer/content/packs/draconic-codex/deity.json'),
    import('@pioneer/content/packs/draconic-codex/effect.json'),
    import('@pioneer/content/packs/draconic-codex/equipment.json'),
    import('@pioneer/content/packs/draconic-codex/feat.json'),
    import('@pioneer/content/packs/draconic-codex/heritage.json'),
    import('@pioneer/content/packs/draconic-codex/spell.json'),
    import('@pioneer/content/packs/draconic-codex/weapon.json'),
  ]);
}

export async function hellfireDispatchesPack() {
  return pack(import('@pioneer/content/packs/hellfire-dispatches/pack.json'), [
    import('@pioneer/content/packs/hellfire-dispatches/action.json'),
    import('@pioneer/content/packs/hellfire-dispatches/archetype.json'),
    import('@pioneer/content/packs/hellfire-dispatches/consumable.json'),
    import('@pioneer/content/packs/hellfire-dispatches/effect.json'),
    import('@pioneer/content/packs/hellfire-dispatches/equipment.json'),
    import('@pioneer/content/packs/hellfire-dispatches/feat.json'),
  ]);
}

export async function highSeasPack() {
  return pack(import('@pioneer/content/packs/high-seas/pack.json'), [
    import('@pioneer/content/packs/high-seas/action.json'),
    import('@pioneer/content/packs/high-seas/archetype.json'),
    import('@pioneer/content/packs/high-seas/armor.json'),
    import('@pioneer/content/packs/high-seas/consumable.json'),
    import('@pioneer/content/packs/high-seas/deity.json'),
    import('@pioneer/content/packs/high-seas/effect.json'),
    import('@pioneer/content/packs/high-seas/equipment.json'),
    import('@pioneer/content/packs/high-seas/feat.json'),
    import('@pioneer/content/packs/high-seas/heritage.json'),
    import('@pioneer/content/packs/high-seas/spell.json'),
    import('@pioneer/content/packs/high-seas/weapon.json'),
  ]);
}

export async function seasonOfGhostsPack() {
  return pack(import('@pioneer/content/packs/season-of-ghosts/pack.json'), [
    import('@pioneer/content/packs/season-of-ghosts/action.json'),
    import('@pioneer/content/packs/season-of-ghosts/armor.json'),
    import('@pioneer/content/packs/season-of-ghosts/consumable.json'),
    import('@pioneer/content/packs/season-of-ghosts/effect.json'),
    import('@pioneer/content/packs/season-of-ghosts/equipment.json'),
    import('@pioneer/content/packs/season-of-ghosts/feat.json'),
    import('@pioneer/content/packs/season-of-ghosts/ritual.json'),
    import('@pioneer/content/packs/season-of-ghosts/shield.json'),
    import('@pioneer/content/packs/season-of-ghosts/spell.json'),
    import('@pioneer/content/packs/season-of-ghosts/weapon.json'),
  ]);
}

export async function hellbreakersPack() {
  return pack(import('@pioneer/content/packs/hellbreakers/pack.json'), [
    import('@pioneer/content/packs/hellbreakers/archetype.json'),
    import('@pioneer/content/packs/hellbreakers/consumable.json'),
    import('@pioneer/content/packs/hellbreakers/effect.json'),
    import('@pioneer/content/packs/hellbreakers/equipment.json'),
    import('@pioneer/content/packs/hellbreakers/feat.json'),
    import('@pioneer/content/packs/hellbreakers/ritual.json'),
    import('@pioneer/content/packs/hellbreakers/shield.json'),
    import('@pioneer/content/packs/hellbreakers/weapon.json'),
  ]);
}

export async function gatewalkersPack() {
  return pack(import('@pioneer/content/packs/gatewalkers/pack.json'), [
    import('@pioneer/content/packs/gatewalkers/action.json'),
    import('@pioneer/content/packs/gatewalkers/archetype.json'),
    import('@pioneer/content/packs/gatewalkers/class-feature.json'),
    import('@pioneer/content/packs/gatewalkers/consumable.json'),
    import('@pioneer/content/packs/gatewalkers/effect.json'),
    import('@pioneer/content/packs/gatewalkers/equipment.json'),
    import('@pioneer/content/packs/gatewalkers/feat.json'),
    import('@pioneer/content/packs/gatewalkers/ritual.json'),
    import('@pioneer/content/packs/gatewalkers/spell.json'),
    import('@pioneer/content/packs/gatewalkers/weapon.json'),
  ]);
}

export async function mythSpeakersPack() {
  return pack(import('@pioneer/content/packs/myth-speakers/pack.json'), [
    import('@pioneer/content/packs/myth-speakers/action.json'),
    import('@pioneer/content/packs/myth-speakers/background.json'),
    import('@pioneer/content/packs/myth-speakers/class-feature.json'),
    import('@pioneer/content/packs/myth-speakers/consumable.json'),
    import('@pioneer/content/packs/myth-speakers/deity.json'),
    import('@pioneer/content/packs/myth-speakers/effect.json'),
    import('@pioneer/content/packs/myth-speakers/equipment.json'),
    import('@pioneer/content/packs/myth-speakers/feat.json'),
    import('@pioneer/content/packs/myth-speakers/shield.json'),
    import('@pioneer/content/packs/myth-speakers/spell.json'),
    import('@pioneer/content/packs/myth-speakers/weapon.json'),
  ]);
}

export async function revengeOfTheRunelordsPack() {
  return pack(import('@pioneer/content/packs/revenge-of-the-runelords/pack.json'), [
    import('@pioneer/content/packs/revenge-of-the-runelords/action.json'),
    import('@pioneer/content/packs/revenge-of-the-runelords/armor.json'),
    import('@pioneer/content/packs/revenge-of-the-runelords/background.json'),
    import('@pioneer/content/packs/revenge-of-the-runelords/consumable.json'),
    import('@pioneer/content/packs/revenge-of-the-runelords/effect.json'),
    import('@pioneer/content/packs/revenge-of-the-runelords/equipment.json'),
    import('@pioneer/content/packs/revenge-of-the-runelords/feat.json'),
    import('@pioneer/content/packs/revenge-of-the-runelords/weapon.json'),
  ]);
}

export async function secretsOfTheUnlitStarPack() {
  return pack(import('@pioneer/content/packs/secrets-of-the-unlit-star/pack.json'), [
    import('@pioneer/content/packs/secrets-of-the-unlit-star/action.json'),
    import('@pioneer/content/packs/secrets-of-the-unlit-star/consumable.json'),
    import('@pioneer/content/packs/secrets-of-the-unlit-star/equipment.json'),
    import('@pioneer/content/packs/secrets-of-the-unlit-star/heritage.json'),
    import('@pioneer/content/packs/secrets-of-the-unlit-star/weapon.json'),
  ]);
}

export async function troublesInGraycePack() {
  return pack(import('@pioneer/content/packs/troubles-in-grayce/pack.json'), [
    import('@pioneer/content/packs/troubles-in-grayce/action.json'),
    import('@pioneer/content/packs/troubles-in-grayce/consumable.json'),
    import('@pioneer/content/packs/troubles-in-grayce/effect.json'),
    import('@pioneer/content/packs/troubles-in-grayce/equipment.json'),
  ]);
}

export async function hellsDestinyPack() {
  return pack(import('@pioneer/content/packs/hells-destiny/pack.json'), [
    import('@pioneer/content/packs/hells-destiny/action.json'),
    import('@pioneer/content/packs/hells-destiny/archetype.json'),
    import('@pioneer/content/packs/hells-destiny/background.json'),
    import('@pioneer/content/packs/hells-destiny/class-feature.json'),
    import('@pioneer/content/packs/hells-destiny/consumable.json'),
    import('@pioneer/content/packs/hells-destiny/effect.json'),
    import('@pioneer/content/packs/hells-destiny/equipment.json'),
    import('@pioneer/content/packs/hells-destiny/feat.json'),
    import('@pioneer/content/packs/hells-destiny/spell.json'),
    import('@pioneer/content/packs/hells-destiny/weapon.json'),
  ]);
}

export async function bastionOfBlasphemiesPack() {
  return pack(import('@pioneer/content/packs/bastion-of-blasphemies/pack.json'), [
    import('@pioneer/content/packs/bastion-of-blasphemies/action.json'),
    import('@pioneer/content/packs/bastion-of-blasphemies/background.json'),
    import('@pioneer/content/packs/bastion-of-blasphemies/consumable.json'),
    import('@pioneer/content/packs/bastion-of-blasphemies/effect.json'),
    import('@pioneer/content/packs/bastion-of-blasphemies/equipment.json'),
    import('@pioneer/content/packs/bastion-of-blasphemies/weapon.json'),
  ]);
}

export async function theDeadGodsHandPack() {
  return pack(import('@pioneer/content/packs/the-dead-gods-hand/pack.json'), [
    import('@pioneer/content/packs/the-dead-gods-hand/armor.json'),
    import('@pioneer/content/packs/the-dead-gods-hand/background.json'),
    import('@pioneer/content/packs/the-dead-gods-hand/consumable.json'),
    import('@pioneer/content/packs/the-dead-gods-hand/effect.json'),
    import('@pioneer/content/packs/the-dead-gods-hand/equipment.json'),
    import('@pioneer/content/packs/the-dead-gods-hand/feat.json'),
    import('@pioneer/content/packs/the-dead-gods-hand/ritual.json'),
    import('@pioneer/content/packs/the-dead-gods-hand/weapon.json'),
  ]);
}
