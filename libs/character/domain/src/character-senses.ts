import { battleFormInPlay, sensesInPlay } from '@pioneer/rules/engine';
import type { AncestryVision, SenseInPlay } from '@pioneer/rules/engine';
import { AncestryId, ContentId, Origin, RuleElementKey } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { ANCESTRY_SLOT } from './character-slots';
import { rulesInPlay } from './character-statistics';
import type { StatisticSources } from './character-statistics';

/** What the character senses: its senses in play, and the ones it has out of form when a battle form replaced them. */
export interface CharacterSenses {
  readonly senses: readonly SenseInPlay[];
  /** The senses without the battle form; empty when no form lists senses, as nothing then replaces them. */
  readonly own: readonly SenseInPlay[];
}

/** The vision the character's ancestry gives, with the ancestry as its origin; none while it is unpicked or has none. */
function ancestryVision(
  { registry, slots }: Pick<StatisticSources, 'registry' | 'slots'>,
  document: CharacterDocument,
): AncestryVision | undefined {
  const picked = AncestryId.safeParse(document.build.choices[ANCESTRY_SLOT]);
  const ancestry = picked.success ? registry.ancestry(picked.data) : undefined;
  const sense = ancestry?.definition.vision;
  const entry = ancestry === undefined ? undefined : slots.lookup.entry(ContentId.parse(ancestry.id));
  if (ancestry === undefined || sense === undefined || entry === undefined) {
    return undefined;
  }
  return { sense, origin: Origin.parse({ hops: [], entry: ContentId.parse(ancestry.id), sources: entry.sources }) };
}

/**
 * The character's senses (`sensesInPlay`) with the rule elements in play and its ancestry's vision. A battle form
 * that lists senses replaces them all, so then the senses it has without the form are given too.
 */
export function characterSenses(document: CharacterDocument, sources: StatisticSources): CharacterSenses {
  const inputs = rulesInPlay(document, sources);
  const vision = ancestryVision(sources, document);
  const senses = sensesInPlay(inputs, vision);
  if (battleFormInPlay(inputs)?.form.senses === undefined) {
    return { senses, own: [] };
  }
  const rules = inputs.rules.filter(({ element }) => element.key !== RuleElementKey.BattleForm);
  return { senses, own: sensesInPlay({ ...inputs, rules }, vision) };
}
