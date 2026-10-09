const JSON_INDENT = 2;

const grantOf = (slug: string, more: object = {}): object => ({ key: 'GrantItem', item: slug, ...more });
const levelAtLeast = (level: number): object => ({ predicate: [{ gte: ['self:level', level] }] });

/** Levels the example's class features arrive at. */
const BRAVERY_LEVEL = 3;
const SURVEYOR_LEVEL = 7;

/**
 * Entries the example starts with: a fighter whose features arrive by level, a heritage with a grant that depends on
 * terrain, and Shield Block picked again as a general feat.
 */
export const EXAMPLE_GRANT_ENTRIES = JSON.stringify(
  [
    {
      slug: 'fighter',
      name: 'Fighter',
      rules: [
        grantOf('shield-block-feature'),
        grantOf('reactive-strike'),
        grantOf('bravery', levelAtLeast(BRAVERY_LEVEL)),
        grantOf('battlefield-surveyor', levelAtLeast(SURVEYOR_LEVEL)),
      ],
    },
    { slug: 'shield-block-feature', name: 'Shield Block (fighter)', rules: [grantOf('shield-block')] },
    { slug: 'shield-block', name: 'Shield Block', rules: [] },
    { slug: 'reactive-strike', name: 'Reactive Strike', rules: [] },
    { slug: 'bravery', name: 'Bravery', rules: [] },
    { slug: 'battlefield-surveyor', name: 'Battlefield Surveyor', rules: [] },
    {
      slug: 'woodland-elf',
      name: 'Woodland Elf',
      rules: [grantOf('forest-climb', { predicate: ['terrain:forest'] })],
    },
    { slug: 'forest-climb', name: 'Climb in forest', rules: [] },
  ],
  undefined,
  JSON_INDENT,
);

/** The entries the example character has directly, one slug per line. */
export const EXAMPLE_GRANT_ROOTS = ['fighter', 'woodland-elf', 'shield-block'].join('\n');
