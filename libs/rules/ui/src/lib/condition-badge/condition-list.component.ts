import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LucideIcon } from '@lucide/angular';
import { Icon, LocaleFormat, Stack, Text } from '@pioneer/frontier';

import { CONDITION_NAMES, ConditionBadgeMessage } from './condition-badge-messages';
import { CONDITION_ICONS, OTHER_CONDITION_ICON } from './condition-icons';
import { isConditionSlug, rankOf } from './condition-seriousness';

/** A condition on a character: the slug of its content entry, and its value when it is valued. */
export interface ConditionLine {
  readonly slug: string;
  readonly value?: number | undefined;
}

/** One row of the list: the icon, the message key of the name, and the value in the active locale. */
interface ConditionRow {
  readonly slug: string;
  readonly icon: LucideIcon;
  readonly name: string;
  readonly value: string | undefined;
}

/**
 * A character's conditions as a list, most serious first, each with its icon, name and value when it has one, and a
 * Bloodied line while the character is at or below half its Hit Points. It is the body of a popover on an avatar, so it
 * says so when there is nothing to list. It takes slugs, so the caller resolves content ids to slugs.
 */
@Component({
  selector: 'pio-condition-list',
  imports: [Icon, Stack, Text, TranslocoPipe],
  templateUrl: './condition-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConditionList {
  readonly #format = inject(LocaleFormat);

  public readonly conditions = input.required<readonly ConditionLine[]>();
  /** Whether the character is at or below half its Hit Points. */
  public readonly bloodied = input(false);

  protected readonly bloodiedName = ConditionBadgeMessage.Bloodied;
  protected readonly noneName = ConditionBadgeMessage.None;

  protected readonly rows = computed((): readonly ConditionRow[] =>
    this.conditions()
      .toSorted((first, second) => rankOf(first.slug) - rankOf(second.slug))
      .map(({ slug, value }): ConditionRow => {
        const known = isConditionSlug(slug);
        return {
          slug,
          icon: known ? CONDITION_ICONS[slug] : OTHER_CONDITION_ICON,
          name: known ? CONDITION_NAMES[slug] : ConditionBadgeMessage.Other,
          value: value === undefined ? undefined : this.#format.number(value),
        };
      }),
  );

  protected readonly empty = computed((): boolean => this.rows().length === 0 && !this.bloodied());
}
