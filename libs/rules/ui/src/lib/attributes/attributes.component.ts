import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  DescriptionItem,
  DescriptionList,
  List,
  ListItem,
  LocaleFormat,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import { Attribute } from '@pioneer/rules/sdk';
import type { AttributeModifiers, SlotKey } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { ATTRIBUTE_MESSAGES, AttributesMessage } from './attributes-messages';

/** A boost slot still to fill, and what to call it ("Level 5 boost"). */
export interface OpenBoostLine {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
}

/** One attribute as shown: its name and its signed modifier. */
interface ShownModifier {
  readonly attribute: Attribute;
  readonly labelKey: string;
  readonly modifier: string;
}

/** A modifier always shows its sign, `+0` included. */
const SIGNED: Intl.NumberFormatOptions = { signDisplay: 'always' };

/**
 * A character's six attribute modifiers, each signed (+2), then the boosts it still has to place, so a missing
 * boost shows where the modifiers come from.
 *
 * Read-only and presentational (ADR-0028): the caller works the modifiers out from the boost picks and passes them,
 * or undefined while they load, with the open boost slots named.
 *
 * ```html
 * <pio-attributes [modifiers]="modifiers()" [open]="openBoosts()" />
 * ```
 */
@Component({
  selector: 'pio-attributes',
  imports: [DescriptionItem, DescriptionList, List, ListItem, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './attributes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributesView {
  /** The modifiers the boosts give, or undefined while they load. */
  public readonly modifiers = input<AttributeModifiers | undefined>();
  /** The boost slots still to fill, in level order. */
  public readonly open = input<readonly OpenBoostLine[]>([]);

  readonly #format = inject(LocaleFormat);
  protected readonly Message = AttributesMessage;
  protected readonly shown = computed((): readonly ShownModifier[] | undefined => {
    const modifiers = this.modifiers();
    return modifiers === undefined
      ? undefined
      : Object.values(Attribute).map((attribute) => ({
          attribute,
          labelKey: ATTRIBUTE_MESSAGES[attribute],
          modifier: this.#format.number(modifiers.get(attribute), SIGNED),
        }));
  });
}
