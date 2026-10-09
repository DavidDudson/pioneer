import type { ReferencePath } from '@pioneer/rules/formula';
import { fromFoundryPath, knownReference, REFERENCE_CATALOGUE } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

const SIGIL = '@';

/**
 * What a reference reads, from the vocabulary (ADR-0016); or, for a path stored formulas cannot use, that it is
 * unknown, naming Pioneer's path when it is a Foundry spelling.
 */
export function referenceMeaning(path: ReferencePath): MessageDescriptor {
  const known = knownReference(path);
  if (known !== undefined) {
    return message(REFERENCE_CATALOGUE[known.kind].meaning);
  }
  const translated = fromFoundryPath(path);
  return translated === undefined
    ? message('play.rules.referenceUnknown')
    : message('play.rules.referenceFoundry', { suggestion: `${SIGIL}${translated}` });
}
