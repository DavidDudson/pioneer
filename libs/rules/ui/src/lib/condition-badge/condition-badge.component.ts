import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeVariant, Icon, LocaleFormat } from '@pioneer/frontier';

import { CONDITION_NAMES, ConditionBadgeMessage } from './condition-badge-messages';
import { CONDITION_ICONS, OTHER_CONDITION_ICON } from './condition-icons';
import { bySeriousness, isConditionSlug } from './condition-seriousness';

/**
 * A character's conditions as one badge: the icon of the most serious, and the number of conditions when there are
 * more than one. No conditions, no badge. It names the top condition for screen readers; the shape of the icon,
 * not its colour, says which it is.
 *
 * It takes slugs, so the caller resolves content ids to slugs. Put it in the avatar's top-left slot:
 *
 * ```html
 * <fr-character-avatar …>
 *   <pio-condition-badge frCharacterAvatarStart [conditions]="slugs" />
 * </fr-character-avatar>
 * ```
 */
@Component({
  selector: 'pio-condition-badge',
  imports: [Badge, Icon, TranslocoPipe],
  templateUrl: './condition-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConditionBadge {
  readonly #format = inject(LocaleFormat);

  /** Slugs of the conditions the character has, in any order. */
  public readonly conditions = input.required<readonly string[]>();

  protected readonly solid = BadgeVariant.Solid;

  protected readonly top = computed(() => {
    const [first] = bySeriousness(this.conditions());
    if (first === undefined) {
      return undefined;
    }
    if (!isConditionSlug(first)) {
      return { icon: OTHER_CONDITION_ICON, name: ConditionBadgeMessage.Other };
    }
    return { icon: CONDITION_ICONS[first], name: CONDITION_NAMES[first] };
  });

  /** The count shown beside the icon in the active locale: only when there is more than one condition. */
  protected readonly count = computed(() => {
    const total = this.conditions().length;
    return total > 1 ? this.#format.number(total) : undefined;
  });
}
