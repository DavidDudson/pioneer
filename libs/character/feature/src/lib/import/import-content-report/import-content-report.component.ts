import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Skeleton, Stack, Text } from '@pioneer/frontier';
import { MatchStatus } from '@pioneer/interop/pathbuilder';
import type { ImportReport } from '@pioneer/interop/pathbuilder';

import { ImportReportGroup } from '../import-report-group/import-report-group.component';

interface ReportSummary {
  readonly matched: number;
  readonly total: number;
}

/** How many of an export's names match loaded content, and the names by kind; a skeleton until the content loads. */
@Component({
  selector: 'pio-import-content-report',
  imports: [ImportReportGroup, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './import-content-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportContentReport {
  /** Undefined while the content packs it is matched against load. */
  public readonly report = input<ImportReport | undefined>(undefined);

  protected readonly summary = computed((): ReportSummary | undefined => {
    const rows = this.report()?.groups.flatMap((group) => group.rows);
    return rows === undefined
      ? undefined
      : { matched: rows.filter((row) => row.status === MatchStatus.Matched).length, total: rows.length };
  });
}
