import { Trait } from '@pioneer/rules/sdk';

import type { Chip } from '../picker-cells/chip-list/chip-list.component';

/** Trait chips for fixtures: each label is a chip's name, and the trait it carries is that name in lower case, spaces as hyphens. */
export function traitChipsOf(...labels: ReadonlyArray<string>): ReadonlyArray<Chip> {
  return labels.map((label): Chip => ({ label, trait: Trait.parse(label.toLowerCase().replaceAll(' ', '-')) }));
}
