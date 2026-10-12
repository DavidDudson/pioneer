import { BuildPart } from '../build-summary/build-line';
import type { BuildLine } from '../build-summary/build-line';

/** A dwarf with a heritage and background picked, and no class yet, so no subclass, deity or key attribute either. */
export const DWARF_BUILD: readonly BuildLine[] = [
  { part: BuildPart.Class, value: undefined },
  { part: BuildPart.Subclass, value: undefined },
  { part: BuildPart.Ancestry, value: { name: 'Dwarf' } },
  { part: BuildPart.Heritage, value: { name: 'Rock Dwarf' } },
  { part: BuildPart.Background, value: { name: 'Farmhand' } },
  { part: BuildPart.Deity, value: undefined },
  { part: BuildPart.KeyAttribute, value: undefined },
  { part: BuildPart.Size, value: { size: 'medium' } },
  { part: BuildPart.Traits, value: { traits: ['Dwarf', 'Humanoid'] } },
];

/** A fighter elf with every part picked, a follower of Iomedae. */
export const FIGHTER_BUILD: readonly BuildLine[] = [
  { part: BuildPart.Class, value: { name: 'Fighter' } },
  { part: BuildPart.Subclass, value: { name: 'Shield Fighter' } },
  { part: BuildPart.Ancestry, value: { name: 'Elf' } },
  { part: BuildPart.Heritage, value: { name: 'Whisper Elf' } },
  { part: BuildPart.Background, value: { name: 'Guard' } },
  { part: BuildPart.Deity, value: { name: 'Iomedae' } },
  { part: BuildPart.KeyAttribute, value: { attribute: 'dex' } },
  { part: BuildPart.Size, value: { size: 'medium' } },
  { part: BuildPart.Traits, value: { traits: ['Elf', 'Humanoid'] } },
];
