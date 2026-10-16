import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AsyncButton,
  AsyncForm,
  Heading,
  Message,
  MessageTone,
  Page,
  Stack,
  Surface,
  Text,
  TextAreaField,
} from '@pioneer/frontier';
import { BugReporter } from '@pioneer/identity/data-access';
import { BugReportParam, HttpStatus, Uuid } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';

import { ReportBugForm } from './report-bug-form';

interface ReportModel {
  readonly description: string;
  readonly steps: string;
}

const EMPTY_REPORT: ReportModel = { description: '', steps: '' };

/** The character a sheet attached, as the page shows it before submit. */
interface AttachedCharacter {
  readonly id: Uuid;
  readonly name: string;
}

/**
 * Report a bug: what went wrong and the steps to see it. Opened from the account menu, or from a
 * character sheet, which attaches the character by name so the reporter sees what goes with the
 * report. Confirmation stays on the page, beside the form. The route, locale, build and browser are
 * read from the app, not asked for.
 */
@Component({
  selector: 'pio-report-bug-page',
  imports: [
    AsyncButton,
    AsyncForm,
    FormField,
    Heading,
    Message,
    Page,
    Stack,
    Surface,
    Text,
    TextAreaField,
    TranslocoPipe,
  ],
  templateUrl: './report-bug-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportBugPage {
  readonly #reporter = inject(BugReporter);
  readonly #i18n = inject(TranslocoService);
  readonly #params = toSignal(inject(ActivatedRoute).queryParamMap, {
    requireSync: true,
  });

  protected readonly successTone = MessageTone.Success;
  protected readonly sent = signal(false);

  /** The character from the sheet that linked here, if it sent a usable id. */
  protected readonly character = computed((): AttachedCharacter | undefined => {
    const params = this.#params();
    const id = Uuid.safeParse(params.get(BugReportParam.Character));
    const name = params.get(BugReportParam.CharacterName)?.trim();
    return id.success && name !== undefined && name !== '' ? { id: id.data, name } : undefined;
  });

  protected readonly model = signal<ReportModel>(EMPTY_REPORT);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, ReportBugForm);
  });

  protected readonly send = async (value: ReportModel): Promise<void> => {
    this.sent.set(false);
    const report = ReportBugForm.parse(value);
    await this.#reporter.submit({ ...report, characterId: this.character()?.id });
    this.sent.set(true);
    // The form starts over, so a second tap can't file the same report twice.
    this.form().reset(EMPTY_REPORT);
  };

  protected readonly describeError = (error: unknown): string =>
    this.#i18n.translate(
      error instanceof ApiError && error.status === HttpStatus.TooManyRequests
        ? 'identity.reportBug.tooMany'
        : 'identity.reportBug.failed',
    );
}
