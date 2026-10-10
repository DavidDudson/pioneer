import { ContentLicense, ContentPack, Size, SourceKind, SourceRef } from '@pioneer/rules/sdk';

/** A Player Core page and the ancestry's entry on Archives of Nethys. */
function cited(page: number, aonId: number): readonly SourceRef[] {
  return [
    SourceRef.parse({
      kind: SourceKind.Book,
      book: 'player-core',
      page,
      aon: `https://2e.aonprd.com/Ancestries.aspx?ID=${aonId}`,
    }),
  ];
}

/**
 * Pathfinder Player Core (2023 remaster). Mechanics are ORC-licensed; see
 * NOTICE.md. Only the fields the SDK schema models are transcribed.
 */
export const playerCore = ContentPack.define({
  manifest: { id: 'player-core', title: 'Player Core', publisher: 'Paizo Inc.', license: ContentLicense.Orc },
  ancestries: [
    {
      slug: 'dwarf',
      name: 'Dwarf',
      hitPoints: 10,
      size: Size.Medium,
      speed: 20,
      traits: ['dwarf', 'humanoid'],
      sources: cited(42, 59),
    },
    {
      slug: 'elf',
      name: 'Elf',
      hitPoints: 6,
      size: Size.Medium,
      speed: 30,
      traits: ['elf', 'humanoid'],
      sources: cited(46, 60),
    },
    {
      slug: 'gnome',
      name: 'Gnome',
      hitPoints: 8,
      size: Size.Small,
      speed: 25,
      traits: ['gnome', 'humanoid'],
      sources: cited(50, 61),
    },
    {
      slug: 'goblin',
      name: 'Goblin',
      hitPoints: 6,
      size: Size.Small,
      speed: 25,
      traits: ['goblin', 'humanoid'],
      sources: cited(54, 62),
    },
    {
      slug: 'halfling',
      name: 'Halfling',
      hitPoints: 6,
      size: Size.Small,
      speed: 25,
      traits: ['halfling', 'humanoid'],
      sources: cited(58, 63),
    },
    {
      slug: 'human',
      name: 'Human',
      hitPoints: 8,
      size: Size.Medium,
      speed: 25,
      traits: ['human', 'humanoid'],
      sources: cited(62, 64),
    },
    {
      slug: 'leshy',
      name: 'Leshy',
      hitPoints: 8,
      size: Size.Small,
      speed: 25,
      traits: ['leshy', 'plant'],
      sources: cited(66, 65),
    },
    {
      slug: 'orc',
      name: 'Orc',
      hitPoints: 10,
      size: Size.Medium,
      speed: 25,
      traits: ['orc', 'humanoid'],
      sources: cited(70, 66),
    },
  ],
  creatures: [],
});
