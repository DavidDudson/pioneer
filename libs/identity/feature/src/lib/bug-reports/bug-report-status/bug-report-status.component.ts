import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Text } from '@pioneer/frontier';
import type { BugReportStatus } from '@pioneer/identity/domain';

/** Where a bug report stands, in words. */
@Component({
  selector: 'pio-bug-report-status',
  imports: [Text, TranslocoPipe],
  templateUrl: './bug-report-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BugReportStatusLabel {
  public readonly status = input.required<BugReportStatus>();
}
