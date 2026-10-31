import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LucideGift } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Icon } from '../../icon/icon.component';
import { LocaleFormat } from '../../locale/locale-format';
import { Size } from '../../tokens';
import { Button } from '../button/button.component';

/** The present rocks now and then; under reduced motion the global rule stops it. */
const giftClasses = cva('inline-flex animate-wiggle')();

/**
 * A present that says something is on offer: a small icon button with a rocking gift icon and, when there are
 * several, their count. It only reports a press; what opens is the caller's. Put it in an avatar's corner slot.
 * Give `label` as the text alternative ("2 gifts waiting"), already translated. The rocking is the global
 * animation, which reduced motion turns off, so the badge is then still.
 *
 * ```html
 * <fr-gift-badge frCharacterAvatarEnd [count]="2" [label]="'gifts.label' | transloco" (opened)="show()" />
 * ```
 */
@Component({
  selector: 'fr-gift-badge',
  imports: [Button, Icon],
  templateUrl: './gift-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
})
export class GiftBadge {
  readonly #format = inject(LocaleFormat);

  public readonly count = input.required<number>();
  public readonly label = input.required<string>();
  /** Whether what the badge opens is showing. */
  public readonly expanded = input(false);
  public readonly opened = output();

  /** The count in the active locale, only when there are several; the button then grows past a square. */
  protected readonly shownCount = computed(() => (this.count() > 1 ? this.#format.number(this.count()) : undefined));

  protected readonly icon = LucideGift;
  protected readonly size = Size.Sm;
  protected readonly giftClasses = giftClasses;
}
