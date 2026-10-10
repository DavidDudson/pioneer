import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AsyncButton,
  DescriptionItem,
  DescriptionList,
  Heading,
  LocaleFormat,
  Message,
  Page,
  Skeleton,
  Stack,
  Surface,
  Text,
  TextAreaField,
} from '@pioneer/frontier';
import {
  buildImportReport,
  MatchStatus,
  PathbuilderProblem,
  readPathbuilderExport,
  registryLookup,
} from '@pioneer/interop/pathbuilder';
import type { ImportReport, PathbuilderImport, PathbuilderReadResult } from '@pioneer/interop/pathbuilder';
import { Attribute } from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { ATTRIBUTE_LABEL_KEYS } from '../../data/attribute-label-keys';
import { CharacterStore } from '../../data/character-store';
import { contentRegistryQuery } from '../../data/content-registry-query';
import { ImportReportGroup } from '../import-report-group/import-report-group.component';

interface ImportModel {
  readonly json: string;
}

const PROBLEM_KEYS: Readonly<Record<PathbuilderProblem, string>> = {
  [PathbuilderProblem.Malformed]: 'character.import.problem.malformed',
  [PathbuilderProblem.ExportFailed]: 'character.import.problem.exportFailed',
};

/** An attribute modifier, signed in the viewer's locale (+5, −1). */
interface ModifierView {
  readonly attribute: Attribute;
  readonly labelKey: string;
  readonly value: string;
}

interface ReportSummary {
  readonly matched: number;
  readonly total: number;
}

const SIGNED: Intl.NumberFormatOptions = { signDisplay: 'exceptZero' };

/**
 * Paste a Pathbuilder 2e export and see what Pioneer reads from it and which names match loaded content (#306).
 * Creating the character sends the export to the server, which reads it again (#307).
 */
@Component({
  selector: 'pio-pathbuilder-import-page',
  imports: [
    AsyncButton,
    DescriptionItem,
    DescriptionList,
    FormField,
    Heading,
    ImportReportGroup,
    Message,
    Page,
    Skeleton,
    Stack,
    Surface,
    Text,
    TextAreaField,
    TranslocoPipe,
  ],
  templateUrl: './pathbuilder-import-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PathbuilderImportPage {
  readonly #format = inject(LocaleFormat);
  readonly #registry = injectQuery(contentRegistryQuery);
  readonly #store = inject(CharacterStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);

  protected readonly model = signal<ImportModel>({ json: '' });
  protected readonly form = form(this.model);

  readonly #result = computed((): PathbuilderReadResult | undefined => {
    const text = this.model().json.trim();
    return text === '' ? undefined : readPathbuilderExport(text);
  });

  protected readonly preview = computed((): PathbuilderImport | undefined => {
    const result = this.#result();
    return result?.ok === true ? result.value : undefined;
  });

  protected readonly problemKey = computed((): string | undefined => {
    const result = this.#result();
    return result?.ok === false ? PROBLEM_KEYS[result.problem] : undefined;
  });

  /** Class and dual class, as a list in the viewer's locale. */
  protected readonly classes = computed((): string => this.#format.list(this.preview()?.identity.classes ?? []));

  protected readonly modifiers = computed((): readonly ModifierView[] => {
    const preview = this.preview();
    return preview === undefined
      ? []
      : Object.values(Attribute).map((attribute) => ({
          attribute,
          labelKey: ATTRIBUTE_LABEL_KEYS[attribute],
          value: this.#format.number(preview.attributes.get(attribute), SIGNED),
        }));
  });

  /** Waits on the content packs; the template shows a skeleton until they load. */
  protected readonly report = computed((): ImportReport | undefined => {
    const preview = this.preview();
    const registry = this.#registry.data();
    return preview === undefined || registry === undefined
      ? undefined
      : buildImportReport(preview.names, registryLookup(registry));
  });

  protected readonly summary = computed((): ReportSummary | undefined => {
    const rows = this.report()?.groups.flatMap((group) => group.rows);
    return rows === undefined
      ? undefined
      : { matched: rows.filter((row) => row.status === MatchStatus.Matched).length, total: rows.length };
  });

  /** Sends the export itself, not the preview; the server reads and checks it again. */
  protected readonly create = async (): Promise<void> => {
    const character = await this.#store.importPathbuilder(JSON.parse(this.model().json) as unknown);
    await this.#router.navigate(['../..', character.id], { relativeTo: this.#route });
  };

  /** The server's reason when it gave one (an ancestry that isn't loaded), else a generic retry. */
  protected readonly describeCreateError = (error: unknown): string => {
    const [issue] = error instanceof ApiError ? error.issues : [];
    return issue === undefined
      ? this.#i18n.translate('character.import.createFailed')
      : this.#i18n.translate(issue.message.key, issue.message.params);
  };
}
