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
  PageBody,
  PageHeader,
  Stack,
  Surface,
  Text,
  TextAreaField,
  ToggleButtonField,
} from '@pioneer/frontier';
import { BugReporter } from '@pioneer/identity/data-access';
import { BugReportParam, HttpStatus, Uuid } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';

import { ReportBugForm } from './report-bug-form';

interface ReportModel {
  readonly description: string;
  readonly steps: string;
  readonly shareCharacter: boolean;
}

/** Sharing starts ticked: the maintainers can only see what the reporter saw if the character comes along. */
const EMPTY_REPORT: ReportModel = {
  description: '',
  steps: '',
  shareCharacter: true,
};

/** The character a sheet attached, as the page shows it before submit. */
interface AttachedCharacter {
  readonly id: Uuid;
  readonly name: string;
}

/**
 * Report a bug: what went wrong and the steps to see it. Opened from the account menu, or from a
 * character sheet, which attaches the character by name. The reporter can untick sharing it; if it
 * is shared, the server copies it as it is when the report is sent (and the page says so when it
 * could not). Confirmation stays on the page, beside the form. The route, locale, build and browser are
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
    PageBody,
    PageHeader,
    Stack,
    Surface,
    Text,
    TextAreaField,
    ToggleButtonField,
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
  /** Set when the reporter asked to share the character and the server could not copy it. */
  protected readonly sentWithoutCharacter = signal(false);

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
    const { shareCharacter, ...report } = ReportBugForm.parse(value);
    const characterId = this.character()?.id;
    const wanted = characterId !== undefined && shareCharacter;
    const receipt = await this.#reporter.submit({
      ...report,
      characterId,
      shareCharacter: wanted,
    });
    this.sentWithoutCharacter.set(wanted && !receipt.snapshotTaken);
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
