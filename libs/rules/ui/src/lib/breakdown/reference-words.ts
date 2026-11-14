import { ReferencePath } from '@pioneer/rules/formula';
import { knownReference, ReferenceKind } from '@pioneer/rules/sdk';
import type { KnownReference } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { ATTRIBUTE_MESSAGES } from '../attributes/attributes-messages';
import { BreakdownMessage } from './breakdown-messages';
import type { StatisticNamer } from './reference-names';

/** One `@` reference in a formula's text: its dotted path, no further than the last segment. */
const REFERENCE_TEXT = /@(?<path>[a-z][a-z0-9.-]*)/giu;

/** The message that names each reference with no placeholder, spelled out in full so the key check sees them. */
const PLAIN_NAMES = {
  [ReferenceKind.Level]: 'rules.breakdown.reference.level',
  [ReferenceKind.CappedDexterity]: 'rules.breakdown.reference.cappedDexterity',
  [ReferenceKind.KeyAttributeModifier]: 'rules.breakdown.reference.keyAttribute',
  [ReferenceKind.AncestryHitPoints]: 'rules.breakdown.reference.ancestryHitPoints',
  [ReferenceKind.AncestrySpeed]: 'rules.breakdown.reference.ancestrySpeed',
  [ReferenceKind.ClassHitPoints]: 'rules.breakdown.reference.classHitPoints',
  [ReferenceKind.ItemLevel]: 'rules.breakdown.reference.itemLevel',
  [ReferenceKind.ItemValue]: 'rules.breakdown.reference.itemValue',
  [ReferenceKind.ItemOriginLevel]: 'rules.breakdown.reference.itemOriginLevel',
  [ReferenceKind.WeaponAttributeModifier]: 'rules.breakdown.reference.weaponAttribute',
  [ReferenceKind.WeaponDamageModifier]: 'rules.breakdown.reference.weaponDamage',
  [ReferenceKind.WeaponProficiencyBonus]: 'rules.breakdown.reference.weaponProficiency',
  [ReferenceKind.SpellcastingAttributeModifier]: 'rules.breakdown.reference.spellcastingAttribute',
  [ReferenceKind.SpellcastingProficiencyBonus]: 'rules.breakdown.reference.spellcastingProficiency',
} as const;

/** How a reference is worded: through the translator, and the name of the statistic it reads. */
export interface ReferenceWords {
  readonly translate: (descriptor: MessageDescriptor) => string;
  readonly statisticName: StatisticNamer;
}

/** The name of a statistic and the message that words it: `@prof.ac` is "Armor Class Proficiency". */
function ofStatistic(
  key: string,
  known: Extract<KnownReference, { readonly selector: unknown }>,
  { translate, statisticName }: ReferenceWords,
): string | undefined {
  const name = statisticName(known.selector);
  return name === undefined ? undefined : translate({ key, params: { name } });
}

/** What a known reference is called, or undefined when nothing names it. */
function nameOf(known: KnownReference, words: ReferenceWords): string | undefined {
  if (known.kind === ReferenceKind.AttributeModifier) {
    return words.translate({ key: ATTRIBUTE_MESSAGES[known.attribute] });
  }
  if (known.kind === ReferenceKind.Statistic) {
    return words.statisticName(known.selector);
  }
  if (known.kind === ReferenceKind.ProficiencyBonus) {
    return ofStatistic(BreakdownMessage.ReferenceProficiencyBonus, known, words);
  }
  if (known.kind === ReferenceKind.ProficiencyRank) {
    return ofStatistic(BreakdownMessage.ReferenceProficiencyRank, known, words);
  }
  if (known.kind === ReferenceKind.Flag) {
    return undefined;
  }
  return words.translate({ key: PLAIN_NAMES[known.kind] });
}

/** The name of the reference at `path`, or undefined when the catalogue has no such path or nothing names it. */
export function referenceName(path: string, words: ReferenceWords): string | undefined {
  const parsed = ReferencePath.safeParse(path);
  const known = parsed.success ? knownReference(parsed.data) : undefined;
  return known === undefined ? undefined : nameOf(known, words);
}

/**
 * A formula's text with each `@` reference replaced by its name (`@attr.con` is "Constitution"); a reference with no
 * name stays as written, so nothing goes blank.
 */
export function formulaWords(formula: string, words: ReferenceWords): string {
  return formula.replaceAll(REFERENCE_TEXT, (written, path: string) => referenceName(path, words) ?? written);
}
