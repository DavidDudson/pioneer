import type { SelectedCreature } from './select-entries';

/**
 * Foundry actor fields the creature stat block has a home for (`system.<group>.<field>`, or `group` alone to take
 * every field of a group), and the embedded item types it holds. A field of a selected actor outside these is a gap
 * the import reports until the schema or a translator covers it.
 */
const MODELLED_FIELDS: ReadonlySet<string> = new Set([
  'abilities',
  'attributes.ac',
  'attributes.hp',
  'attributes.immunities',
  'attributes.resistances',
  'attributes.speed',
  'attributes.weaknesses',
  'details.languages',
  'details.level',
  'details.publication',
  'details.publicNotes',
  'perception.mod',
  'perception.senses',
  'saves',
  'skills',
  'traits',
]);

const MODELLED_ITEMS: ReadonlySet<string> = new Set([
  'action',
  'ammo',
  'armor',
  'backpack',
  'condition',
  'consumable',
  'equipment',
  'lore',
  'melee',
  'shield',
  'spell',
  'spellcastingEntry',
  'treasure',
  'weapon',
]);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The `group.field` paths one actor's `system` has, less the groups taken whole. */
function fieldsOf(system: Readonly<Record<string, unknown>>): readonly string[] {
  return Object.entries(system).flatMap(([group, value]) =>
    MODELLED_FIELDS.has(group) || !isRecord(value) ? [group] : Object.keys(value).map((field) => `${group}.${field}`),
  );
}

/** What one creature has that the stat block has no home for: `system.` fields and `item:` types. */
function gapsOf({ actor }: SelectedCreature): readonly string[] {
  const fields = fieldsOf(actor.system).filter(
    (field) => !MODELLED_FIELDS.has(field) && !MODELLED_FIELDS.has(field.split('.')[0] ?? ''),
  );
  const items = actor.items.map(({ type }) => type).filter((type) => !MODELLED_ITEMS.has(type));
  return [...new Set([...fields.map((field) => `system.${field}`), ...items.map((type) => `item:${type}`)])];
}

/** The fields (and item types) with no home in the stat block, each with how many of the creatures have it. */
export function creatureFieldGaps(creatures: readonly SelectedCreature[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const creature of creatures) {
    for (const gap of gapsOf(creature)) {
      counts.set(gap, (counts.get(gap) ?? 0) + 1);
    }
  }
  return counts;
}
