const JSON_INDENT = 2;

const grantOf = (slug: string, more: object = {}): object => ({ key: 'GrantItem', item: slug, ...more });
const levelAtLeast = (level: number): object => ({ predicate: [{ gte: ['self:level', level] }] });
const option = (value: string, label: string): object => ({ value, label });
const featOf = (slug: string, name: string, rollOptions: readonly string[]): object => ({
  slug,
  name,
  kind: 'feat',
  rollOptions,
  rules: [],
});

/** Levels the example's class features arrive at. */
const BRAVERY_LEVEL = 3;
const SURVEYOR_LEVEL = 7;

/**
 * Entries the example starts with: a fighter whose features arrive by level, with a class feat to pick (rule 4, a query
 * over feats, granted by rule 5) and a weapon group to pick (rule 6, a roll option); a heritage with a grant that
 * depends on terrain; and Shield Block picked again as a general feat. The query offers the fighter feats of the
 * character's level or lower, so Brutal Finish (12th) and the rogue's Nimble Dodge are left out.
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
        {
          key: 'ChoiceSet',
          flag: 'class-feat',
          prompt: 'Fighter feat',
          choices: { kind: 'feat', filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] },
        },
        { key: 'GrantItem', item: { choice: 'class-feat' } },
        {
          key: 'ChoiceSet',
          flag: 'weapon-group',
          prompt: 'Weapon group',
          rollOption: 'weapon-group',
          choices: [option('sword', 'Sword'), option('axe', 'Axe')],
        },
      ],
    },
    { slug: 'shield-block-feature', name: 'Shield Block (fighter)', rules: [grantOf('shield-block')] },
    { slug: 'shield-block', name: 'Shield Block', rules: [] },
    { slug: 'reactive-strike', name: 'Reactive Strike', rules: [] },
    { slug: 'bravery', name: 'Bravery', rules: [] },
    { slug: 'battlefield-surveyor', name: 'Battlefield Surveyor', rules: [] },
    featOf('sudden-charge', 'Sudden Charge', ['trait:fighter', 'trait:flourish', 'level:1']),
    featOf('double-slice', 'Double Slice', ['trait:fighter', 'level:1']),
    featOf('aggressive-block', 'Aggressive Block', ['trait:fighter', 'level:2']),
    featOf('brutal-finish', 'Brutal Finish', ['trait:fighter', 'level:12']),
    featOf('nimble-dodge', 'Nimble Dodge', ['trait:rogue', 'level:1']),
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

/** The example's picks: the weapon group is chosen, the class feat is left open. */
export const EXAMPLE_GRANT_PICKS = 'fighter:6 = sword';
