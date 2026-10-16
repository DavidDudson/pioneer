import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  DateDisplay,
  Heading,
  Link,
  Page,
  PageBody,
  PageHeader,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import { BugReportId, BugReportStatus } from '@pioneer/identity/domain';
import type { BugReportDetail } from '@pioneer/identity/domain';
import { BUG_REPORTS_PATH } from '@pioneer/shared/kernel';

import { BugReportDesk } from '../../data/bug-report-desk';
import { BugReportStatusLabel } from '../bug-report-status/bug-report-status.component';
import { saveSnapshot } from '../save-snapshot';

/**
 * One bug report for a maintainer: what the reporter wrote, where it came from, and where it stands, which a
 * maintainer sets. When the reporter shared their character, its frozen copy can be saved as a Pioneer character file
 * and opened with the character import, as a copy of the maintainer's own: the sheet has no read-only mode.
 */
@Component({
  selector: 'pio-bug-report-page',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    BugReportStatusLabel,
    Button,
    DateDisplay,
    Heading,
    Link,
    Page,
    PageBody,
    PageHeader,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './bug-report-page.component.html',
  providers: [BugReportDesk],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BugReportPage {
  readonly #desk = inject(BugReportDesk);
  readonly #document = inject(DOCUMENT);

  /** The report's id, from the route. */
  public readonly id = input.required({ transform: (id: string): BugReportId => BugReportId.parse(id) });

  protected readonly report = this.#desk.detail(() => this.id());
  protected readonly listPath = BUG_REPORTS_PATH;

  protected readonly markOpen = async (): Promise<void> => this.#desk.setStatus(this.id(), BugReportStatus.Open);
  protected readonly markConfirmed = async (): Promise<void> =>
    this.#desk.setStatus(this.id(), BugReportStatus.Confirmed);
  protected readonly markFixed = async (): Promise<void> => this.#desk.setStatus(this.id(), BugReportStatus.Fixed);
  protected readonly markDeclined = async (): Promise<void> =>
    this.#desk.setStatus(this.id(), BugReportStatus.Declined);

  protected readonly save = (report: BugReportDetail): void => {
    saveSnapshot(this.#document, report.id, report.snapshot);
  };
}
