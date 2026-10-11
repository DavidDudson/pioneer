import type { ClassFeatureLine } from '../class-features/class-feature-line';

/** A 1st-level cleric who has picked the Cloistered Cleric doctrine. */
export const CLERIC_FEATURES: readonly ClassFeatureLine[] = [
  { key: 'cleric-spellcasting', name: 'Cleric Spellcasting', className: 'Cleric', level: 1 },
  { key: 'cloistered-cleric', name: 'Cloistered Cleric', className: 'Cleric', level: 1 },
  { key: 'deity', name: 'Deity (Cleric)', className: 'Cleric', level: 1 },
  { key: 'divine-font', name: 'Divine Font', className: 'Cleric', level: 1 },
  { key: 'doctrine', name: 'Doctrine', className: 'Cleric', level: 1 },
];
