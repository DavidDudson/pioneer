import { ContentKind } from './content-kind';
import { RitualData } from './ritual';
import { SpellData } from './spell';
import { SpellcastingTraditionData } from './spellcasting-tradition';

/** The `data` schemas of the magic kinds, which `KIND_DATA` (`kind-data.ts`) takes in. */
export const MAGIC_KIND_DATA = {
  [ContentKind.Ritual]: RitualData,
  [ContentKind.Spell]: SpellData,
  [ContentKind.SpellcastingTradition]: SpellcastingTraditionData,
} as const;
