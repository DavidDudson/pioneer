import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Disclosure, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { BadgeTone } from '@pioneer/frontier';
import { MatchStatus } from '@pioneer/interop/pathbuilder';
import type { ReportGroup } from '@pioneer/interop/pathbuilder';

import { KIND_KEYS, STATUS_KEYS, STATUS_TONES } from '../import-labels';

/** One name as the list shows it. */
interface RowView {
  readonly name: string;
  readonly occurrences: number;
  readonly repeated: boolean;
  readonly statusKey: string;
  readonly tone: BadgeTone;
}

/** One kind's names in the import report, collapsed to a "Feats · 3 of 32 matched" line until opened. */
@Component({
  selector: 'pio-import-report-group',
  imports: [Badge, Disclosure, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './import-report-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportReportGroup {
  public readonly group = input.required<ReportGroup>();

  protected readonly kindKey = computed(() => KIND_KEYS[this.group().kind]);
  protected readonly total = computed(() => this.group().rows.length);
  protected readonly matched = computed(
    () => this.group().rows.filter((row) => row.status === MatchStatus.Matched).length,
  );
  protected readonly rows = computed((): readonly RowView[] =>
    this.group().rows.map((row) => ({
      name: row.name,
      occurrences: row.occurrences,
      repeated: row.occurrences > 1,
      statusKey: STATUS_KEYS[row.status],
      tone: STATUS_TONES[row.status],
    })),
  );
}
