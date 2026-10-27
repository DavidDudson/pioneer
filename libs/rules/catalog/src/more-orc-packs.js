import { pack } from './pack-loader';

/* Remaster ORC packs imported after `orc-packs.js` filled, read the same way. */

export async function wardensOfWildwoodPack() {
  return pack(import('@pioneer/content/packs/wardens-of-wildwood/pack.json'), [
    import('@pioneer/content/packs/wardens-of-wildwood/action.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/archetype.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/armor.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/background.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/class-feature.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/consumable.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/creature.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/deity.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/effect.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/equipment.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/feat.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/ritual.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/shield.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/spell.json'),
    import('@pioneer/content/packs/wardens-of-wildwood/weapon.json'),
  ]);
}

export async function curtainCallPack() {
  return pack(import('@pioneer/content/packs/curtain-call/pack.json'), [
    import('@pioneer/content/packs/curtain-call/action.json'),
    import('@pioneer/content/packs/curtain-call/armor.json'),
    import('@pioneer/content/packs/curtain-call/background.json'),
    import('@pioneer/content/packs/curtain-call/consumable.json'),
    import('@pioneer/content/packs/curtain-call/creature.json'),
    import('@pioneer/content/packs/curtain-call/deity.json'),
    import('@pioneer/content/packs/curtain-call/effect.json'),
    import('@pioneer/content/packs/curtain-call/equipment.json'),
    import('@pioneer/content/packs/curtain-call/feat.json'),
    import('@pioneer/content/packs/curtain-call/ritual.json'),
    import('@pioneer/content/packs/curtain-call/spell.json'),
    import('@pioneer/content/packs/curtain-call/weapon.json'),
  ]);
}

export async function triumphOfTheTuskPack() {
  return pack(import('@pioneer/content/packs/triumph-of-the-tusk/pack.json'), [
    import('@pioneer/content/packs/triumph-of-the-tusk/action.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/archetype.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/armor.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/background.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/consumable.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/creature.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/effect.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/equipment.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/feat.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/ritual.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/spell.json'),
    import('@pioneer/content/packs/triumph-of-the-tusk/weapon.json'),
  ]);
}

export async function sporeWarPack() {
  return pack(import('@pioneer/content/packs/spore-war/pack.json'), [
    import('@pioneer/content/packs/spore-war/action.json'),
    import('@pioneer/content/packs/spore-war/armor.json'),
    import('@pioneer/content/packs/spore-war/background.json'),
    import('@pioneer/content/packs/spore-war/consumable.json'),
    import('@pioneer/content/packs/spore-war/creature.json'),
    import('@pioneer/content/packs/spore-war/effect.json'),
    import('@pioneer/content/packs/spore-war/equipment.json'),
    import('@pioneer/content/packs/spore-war/feat.json'),
    import('@pioneer/content/packs/spore-war/spell.json'),
    import('@pioneer/content/packs/spore-war/weapon.json'),
  ]);
}

export async function shadesOfBloodPack() {
  return pack(import('@pioneer/content/packs/shades-of-blood/pack.json'), [
    import('@pioneer/content/packs/shades-of-blood/action.json'),
    import('@pioneer/content/packs/shades-of-blood/archetype.json'),
    import('@pioneer/content/packs/shades-of-blood/background.json'),
    import('@pioneer/content/packs/shades-of-blood/class-feature.json'),
    import('@pioneer/content/packs/shades-of-blood/consumable.json'),
    import('@pioneer/content/packs/shades-of-blood/creature.json'),
    import('@pioneer/content/packs/shades-of-blood/effect.json'),
    import('@pioneer/content/packs/shades-of-blood/equipment.json'),
    import('@pioneer/content/packs/shades-of-blood/feat.json'),
    import('@pioneer/content/packs/shades-of-blood/spell.json'),
    import('@pioneer/content/packs/shades-of-blood/weapon.json'),
  ]);
}

export async function preyForDeathPack() {
  return pack(import('@pioneer/content/packs/prey-for-death/pack.json'), [
    import('@pioneer/content/packs/prey-for-death/action.json'),
    import('@pioneer/content/packs/prey-for-death/archetype.json'),
    import('@pioneer/content/packs/prey-for-death/armor.json'),
    import('@pioneer/content/packs/prey-for-death/class-feature.json'),
    import('@pioneer/content/packs/prey-for-death/consumable.json'),
    import('@pioneer/content/packs/prey-for-death/creature.json'),
    import('@pioneer/content/packs/prey-for-death/effect.json'),
    import('@pioneer/content/packs/prey-for-death/equipment.json'),
    import('@pioneer/content/packs/prey-for-death/feat.json'),
    import('@pioneer/content/packs/prey-for-death/spell.json'),
    import('@pioneer/content/packs/prey-for-death/weapon.json'),
  ]);
}

export async function clawsOfTheTyrantPack() {
  return pack(import('@pioneer/content/packs/claws-of-the-tyrant/pack.json'), [
    import('@pioneer/content/packs/claws-of-the-tyrant/action.json'),
    import('@pioneer/content/packs/claws-of-the-tyrant/creature.json'),
    import('@pioneer/content/packs/claws-of-the-tyrant/effect.json'),
    import('@pioneer/content/packs/claws-of-the-tyrant/equipment.json'),
    import('@pioneer/content/packs/claws-of-the-tyrant/feat.json'),
  ]);
}

export async function clockworkMysteryPack() {
  return pack(import('@pioneer/content/packs/clockwork-mystery/pack.json'), [
    import('@pioneer/content/packs/clockwork-mystery/background.json'),
  ]);
}

export async function tianXiaWorldGuidePack() {
  return pack(import('@pioneer/content/packs/tian-xia-world-guide/pack.json'), [
    import('@pioneer/content/packs/tian-xia-world-guide/creature.json'),
    import('@pioneer/content/packs/tian-xia-world-guide/ritual.json'),
  ]);
}

export async function foolishHousekeepingPack() {
  return pack(import('@pioneer/content/packs/foolish-housekeeping/pack.json'), [
    import('@pioneer/content/packs/foolish-housekeeping/action.json'),
    import('@pioneer/content/packs/foolish-housekeeping/archetype.json'),
    import('@pioneer/content/packs/foolish-housekeeping/creature.json'),
    import('@pioneer/content/packs/foolish-housekeeping/effect.json'),
    import('@pioneer/content/packs/foolish-housekeeping/feat.json'),
  ]);
}
