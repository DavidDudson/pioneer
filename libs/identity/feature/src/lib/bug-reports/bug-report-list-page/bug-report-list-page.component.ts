import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  Link,
  List,
  ListItem,
  Page,
  PageBody,
  PageHeader,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import { BUG_REPORTS_PATH } from '@pioneer/shared/kernel';

import { BugReportDesk } from '../../data/bug-report-desk';
import { BugReportStatusLabel } from '../bug-report-status/bug-report-status.component';

/** The path of one report. */
function reportPath(id: string): string {
  return `${BUG_REPORTS_PATH}/${id}`;
}

/** Skeleton rows shown while the list loads. */
const PLACEHOLDERS = ['first', 'second', 'third'] as const;

/**
 * The maintainers' list of bug reports, newest first: where each stands, what was reported and from which page.
 * A member who opens it sees the same "not found" the server gives them.
 */
@Component({
  selector: 'pio-bug-report-list-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    BugReportStatusLabel,
    DateDisplay,
    Link,
    List,
    ListItem,
    Page,
    PageBody,
    PageHeader,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './bug-report-list-page.component.html',
  providers: [BugReportDesk],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BugReportListPage {
  protected readonly desk = inject(BugReportDesk);
  protected readonly placeholders = PLACEHOLDERS;
  protected readonly path = reportPath;
}
