import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import {
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
import { injectQuery } from '@tanstack/angular-query-experimental';

import { ATTRIBUTE_LABEL_KEYS } from '../../data/attribute-label-keys';
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
 * Read-only: nothing is saved until creating a character from it lands (#307).
 */
@Component({
  selector: 'pio-pathbuilder-import-page',
  imports: [
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
}
