import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Link, Stack, Text } from '@pioneer/frontier';

import type { BrowseReplacement } from '../browse-row';

const LegacyMessage = { Label: 'contentBrowser.legacy.label', ReplacedBy: 'contentBrowser.legacy.replacedBy' } as const;

/**
 * A "Legacy" badge for an entry from a pre-remaster book, or nothing for any other entry, so a table cell and a list
 * item share it without a check of their own. When remaster entries replace it, "Replaced by" and a link to each follow.
 *
 * ```html
 * <pio-legacy-badge [legacy]="row.legacy" [replacedBy]="row.replacedBy" />
 * ```
 */
@Component({
  selector: 'pio-legacy-badge',
  imports: [Badge, Link, Stack, Text, TranslocoPipe],
  templateUrl: './legacy-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyBadge {
  /** The entry is legacy content. */
  public readonly legacy = input.required<boolean>();
  /** The remaster entries that replace it, if any. */
  public readonly replacedBy = input<readonly BrowseReplacement[]>([]);

  protected readonly Message = LegacyMessage;
  protected readonly Tone = BadgeTone;
}
