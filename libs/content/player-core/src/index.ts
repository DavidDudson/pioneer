import { ContentLicense, ContentPack, Size } from '@pioneer/rules/sdk';

/**
 * Pathfinder Player Core (2023 remaster). Mechanics are ORC-licensed; see
 * NOTICE.md. Only the fields the SDK schema models are transcribed.
 */
export const playerCore = ContentPack.define({
  manifest: { id: 'player-core', title: 'Player Core', publisher: 'Paizo Inc.', license: ContentLicense.Orc },
  ancestries: [
    { slug: 'dwarf', name: 'Dwarf', hitPoints: 10, size: Size.Medium, speed: 20, traits: ['dwarf', 'humanoid'] },
    { slug: 'elf', name: 'Elf', hitPoints: 6, size: Size.Medium, speed: 30, traits: ['elf', 'humanoid'] },
    { slug: 'gnome', name: 'Gnome', hitPoints: 8, size: Size.Small, speed: 25, traits: ['gnome', 'humanoid'] },
    { slug: 'goblin', name: 'Goblin', hitPoints: 6, size: Size.Small, speed: 25, traits: ['goblin', 'humanoid'] },
    {
      slug: 'halfling',
      name: 'Halfling',
      hitPoints: 6,
      size: Size.Small,
      speed: 25,
      traits: ['halfling', 'humanoid'],
    },
    { slug: 'human', name: 'Human', hitPoints: 8, size: Size.Medium, speed: 25, traits: ['human', 'humanoid'] },
    { slug: 'leshy', name: 'Leshy', hitPoints: 8, size: Size.Small, speed: 25, traits: ['leshy', 'plant'] },
    { slug: 'orc', name: 'Orc', hitPoints: 10, size: Size.Medium, speed: 25, traits: ['orc', 'humanoid'] },
  ],
  creatures: [],
});
