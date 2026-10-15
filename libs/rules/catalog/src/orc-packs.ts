import type { PackContents } from '@pioneer/rules/sdk';

import { pack } from './json-packs';

/* Remaster ORC packs under `content/packs/<pack>/` that don't fit `json-packs.ts`, read the same way. */

export async function impossibleMagicPack(): Promise<PackContents> {
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

export async function gunsAndGearsPack(): Promise<PackContents> {
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
