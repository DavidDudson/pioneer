import { ChangeDetectionStrategy, Component } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Stack } from '../../layout/stack/stack.component';

/** The action row collapses when nothing is projected, so it adds no gap. */
const actionVariants = cva('flex flex-wrap items-center gap-sm pt-xs empty:hidden');

/**
 * What a list or search shows when it has nothing, from parts: media, then a header (or a bare title and
 * description), then the projected action. The title is text, not a heading, so empty regions stay out of the
 * document outline.
 *
 * ```html
 * <fr-empty-state>
 *   <fr-empty-state-media [icon]="Dices" />
 *   <fr-empty-state-header>
 *     <fr-empty-state-title>{{ 'play.dice.empty' | transloco }}</fr-empty-state-title>
 *   </fr-empty-state-header>
 *   <fr-button (pressed)="roll()">{{ 'play.dice.roll' | transloco }}</fr-button>
 * </fr-empty-state>
 * ```
 */
@Component({
  selector: 'fr-empty-state',
  imports: [Stack],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EmptyState {
  protected readonly actionClasses = actionVariants();
}
