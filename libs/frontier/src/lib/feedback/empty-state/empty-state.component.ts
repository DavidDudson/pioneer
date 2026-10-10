import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { LucideIcon } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Icon } from '../../icon/icon.component';
import { Stack } from '../../layout/stack/stack.component';
import { Text } from '../../text/text/text.component';

/** The action row collapses when nothing is projected, so it adds no gap. */
const actionVariants = cva('flex flex-wrap items-center gap-sm pt-xs empty:hidden');

/**
 * What a list or search shows when it has nothing: an optional icon, a title,
 * an optional description and an optional action (projected). The title is
 * text, not a heading, so empty regions stay out of the document outline.
 *
 * ```html
 * <fr-empty-state [icon]="Dices" [title]="'play.dice.empty' | transloco">
 *   <fr-button (pressed)="roll()">{{ 'play.dice.roll' | transloco }}</fr-button>
 * </fr-empty-state>
 * ```
 */
@Component({
  selector: 'fr-empty-state',
  imports: [Icon, Stack, Text],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EmptyState {
  /** Decorative; the title carries the meaning. */
  public readonly icon = input<LucideIcon | undefined>(undefined);
  public readonly title = input.required<string>();
  public readonly description = input<string | undefined>(undefined);

  protected readonly actionClasses = actionVariants();
}
