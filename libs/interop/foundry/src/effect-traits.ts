import { ContentKind, Trait } from '@pioneer/rules/sdk';

import type { ImportedEnvelope } from './imported-envelope';
import type { SelectedEntry } from './select-entries';
import type { ImportedKindData } from './translate-kind-data';

/** What gives an imported effect its traits: the spell, feat or action it is the effect of. */

const POLYMORPH = Trait.parse('polymorph');
/** The name prefixes of Foundry's effects, by the kinds of document each is the effect of. */
const EFFECT_PREFIXES: readonly (readonly [string, ReadonlySet<string>])[] = [
  ['Spell Effect: ', new Set(['spell'])],
  ['Effect: ', new Set(['feat', 'action'])],
];
/** The variant Foundry appends to an effect of a spell with several, `Animal Form (Bear)`. */
const VARIANT_SUFFIX = / \([^)]*\)$/u;

interface TraitedEntry {
  readonly source: SelectedEntry;
  readonly envelope: ImportedEnvelope;
  readonly kindData?: ImportedKindData;
}

/**
 * Foundry's effects carry no traits, so a `Spell Effect: X` of a polymorph spell `X`, or an `Effect: X` of a polymorph
 * feat or action `X`, is not a polymorph effect to the engine and would not replace another form. Those effects take
 * the polymorph trait from what they are the effect of, matched by name among the import's own entries.
 */
export function withPolymorphTraits<Entry extends TraitedEntry>(entries: readonly Entry[]): readonly Entry[] {
  const polymorph = new Set<string>(
    entries
      .filter(({ envelope }) => envelope.traits.includes(POLYMORPH))
      .map(({ source, envelope }) => `${source.document.type}:${envelope.name}`),
  );
  return entries.map((entry) => {
    const { kindData, envelope } = entry;
    if (kindData?.kind !== ContentKind.Effect || envelope.traits.includes(POLYMORPH)) {
      return entry;
    }
    const given = EFFECT_PREFIXES.find(([prefix]) => envelope.name.startsWith(prefix));
    if (given === undefined) {
      return entry;
    }
    const [prefix, types] = given;
    const name = envelope.name.slice(prefix.length).replace(VARIANT_SUFFIX, '');
    if (![...types].some((type) => polymorph.has(`${type}:${name}`))) {
      return entry;
    }
    return { ...entry, envelope: { ...envelope, traits: [...envelope.traits, POLYMORPH] } };
  });
}
