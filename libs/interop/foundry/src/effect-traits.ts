import { ContentKind, Trait } from '@pioneer/rules/sdk';

import type { ImportedEnvelope } from './imported-envelope';
import type { SelectedEntry } from './select-entries';
import type { ImportedKindData } from './translate-kind-data';

/** What gives an imported effect its traits: the spell it is the effect of. */

const POLYMORPH = Trait.parse('polymorph');
const SPELL_EFFECT_PREFIX = 'Spell Effect: ';
/** The variant Foundry appends to an effect of a spell with several, `Animal Form (Bear)`. */
const VARIANT_SUFFIX = / \([^)]*\)$/u;

interface TraitedEntry {
  readonly source: SelectedEntry;
  readonly envelope: ImportedEnvelope;
  readonly kindData?: ImportedKindData;
}

/**
 * Foundry's effects carry no traits, so a `Spell Effect: X` of a polymorph spell `X` is not a polymorph effect to the
 * engine, and would not replace another form. Those effects take the polymorph trait from the spell, matched by name
 * among the import's own entries.
 */
export function withPolymorphTraits<Entry extends TraitedEntry>(entries: readonly Entry[]): readonly Entry[] {
  const polymorphSpells = new Set<string>(
    entries
      .filter(({ source, envelope }) => source.document.type === 'spell' && envelope.traits.includes(POLYMORPH))
      .map(({ envelope }) => envelope.name),
  );
  return entries.map((entry) => {
    const { kindData, envelope } = entry;
    if (kindData?.kind !== ContentKind.Effect || !envelope.name.startsWith(SPELL_EFFECT_PREFIX)) {
      return entry;
    }
    const spell = envelope.name.slice(SPELL_EFFECT_PREFIX.length).replace(VARIANT_SUFFIX, '');
    if (!polymorphSpells.has(spell) || envelope.traits.includes(POLYMORPH)) {
      return entry;
    }
    return { ...entry, envelope: { ...envelope, traits: [...envelope.traits, POLYMORPH] } };
  });
}
