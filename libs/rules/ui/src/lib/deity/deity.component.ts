import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DescriptionItem, DescriptionList, EmptyState, HeadingLevel, Skeleton, Stack, Text } from '@pioneer/frontier';

import { ATTRIBUTE_MESSAGES } from '../attributes/attributes-messages';
import { RichTextView } from '../rich-text/rich-text.component';
import type { DeityLine } from './deity-line';
import { DEITY_DOMAIN_MESSAGES, DeityMessage, DIVINE_FONT_MESSAGES, sanctificationMessage } from './deity-messages';

/** One term of the block and its values, each a message key or a name; none reads as "None". */
interface DeityTerm {
  readonly term: string;
  readonly values: readonly DeityValue[];
}

/** A value as a message key to translate, or a name to show as it is. */
interface DeityValue {
  readonly key?: string;
  readonly name?: string;
}

/** The terms the block lists, in order: shown with placeholder values while the deity loads. */
const TERMS = [
  DeityMessage.Font,
  DeityMessage.Sanctification,
  DeityMessage.Domains,
  DeityMessage.AlternateDomains,
  DeityMessage.FavoredWeapons,
  DeityMessage.Attributes,
  DeityMessage.Skills,
] as const;

const keyed = (key: string): DeityValue => ({ key });
const named = (name: string): DeityValue => ({ name });

function termsOf(deity: DeityLine): readonly DeityTerm[] {
  return [
    { term: DeityMessage.Font, values: deity.fonts.map((font) => keyed(DIVINE_FONT_MESSAGES[font])) },
    {
      term: DeityMessage.Sanctification,
      values: [keyed(sanctificationMessage(deity.sanctification))],
    },
    { term: DeityMessage.Domains, values: deity.domains.map((domain) => keyed(DEITY_DOMAIN_MESSAGES[domain])) },
    {
      term: DeityMessage.AlternateDomains,
      values: deity.alternateDomains.map((domain) => keyed(DEITY_DOMAIN_MESSAGES[domain])),
    },
    { term: DeityMessage.FavoredWeapons, values: deity.favoredWeapons.map((weapon) => named(weapon)) },
    {
      term: DeityMessage.Attributes,
      values: deity.attributes.map((attribute) => keyed(ATTRIBUTE_MESSAGES[attribute])),
    },
    { term: DeityMessage.Skills, values: deity.skills.map((skill) => named(skill)) },
  ];
}

/**
 * The character's deity: what it grants a cleric (divine font, sanctification, domains), its favoured weapons,
 * divine attributes and skills, then its description, which holds its edicts and anathema. A term the deity has
 * nothing for (a philosophy's font) reads "None".
 *
 * Presentational (ADR-0028): the caller works out the line, undefined when the character has no deity, and sets
 * `loading` while the character loads.
 *
 * ```html
 * <pio-deity [deity]="deity()" [loading]="loading()" />
 * ```
 */
@Component({
  selector: 'pio-deity',
  imports: [DescriptionItem, DescriptionList, EmptyState, RichTextView, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './deity.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeityView {
  /** The deity; undefined for none. */
  public readonly deity = input<DeityLine | undefined>();
  /** Placeholders in its place while the character loads. */
  public readonly loading = input(false, { transform: booleanAttribute });

  protected readonly terms = computed(() => {
    const deity = this.deity();
    return deity === undefined ? [] : termsOf(deity);
  });
  protected readonly Message = DeityMessage;
  protected readonly loadingTerms = TERMS;
  protected readonly HeadingLevel = HeadingLevel;
}
