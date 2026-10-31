import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone } from '@pioneer/frontier';

const LegacyMessage = { Label: 'contentBrowser.legacy.label' } as const;

/**
 * A "Legacy" badge for an entry from a pre-remaster book, or nothing for any other entry, so a table cell and a list
 * item share it without a check of their own.
 *
 * ```html
 * <pio-legacy-badge [legacy]="row.legacy" />
 * ```
 */
@Component({
  selector: 'pio-legacy-badge',
  imports: [Badge, TranslocoPipe],
  templateUrl: './legacy-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyBadge {
  /** The entry is legacy content. */
  public readonly legacy = input.required<boolean>();

  protected readonly Message = LegacyMessage;
  protected readonly Tone = BadgeTone;
}
