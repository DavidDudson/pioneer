import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Stack } from '@pioneer/frontier';
import { SourceBadge, SourceBadgeMode } from '@pioneer/rules/ui';

import type { BrowseSource } from '../browse-source';

/**
 * The sources of a row as badges, the book's name and year each, which the table's Source column shows. A source
 * opens its details in a popover; the entry's own page shows the Paizo Store links.
 *
 * ```html
 * <pio-browse-sources [sources]="row.sources" />
 * ```
 */
@Component({
  selector: 'pio-browse-sources',
  imports: [SourceBadge, Stack],
  templateUrl: './browse-sources.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowseSources {
  public readonly sources = input.required<readonly BrowseSource[]>();

  protected readonly Mode = SourceBadgeMode;
}
