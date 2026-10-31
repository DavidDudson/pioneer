import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SheetMode } from '@pioneer/character/domain';
import {
  AsyncButton,
  DescriptionItem,
  DescriptionList,
  Heading,
  LocaleFormat,
  Message,
  Page,
  PageBody,
  PageHeader,
  Stack,
  Surface,
  Text,
  TextAreaField,
} from '@pioneer/frontier';
import {
  buildImportReport,
  looksLikeUrl,
  PathbuilderProblem,
  readPathbuilderExport,
  registryLookup,
} from '@pioneer/interop/pathbuilder';
import type { ImportReport, PathbuilderImport, PathbuilderReadResult } from '@pioneer/interop/pathbuilder';
import { ContentLoader } from '@pioneer/rules/data-access';
import { Attribute } from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { ATTRIBUTE_LABEL_KEYS } from '../../data/attribute-label-keys';
import { CharacterStore } from '../../data/character-store';
import { CHARACTER_CONTENT_KINDS, contentRegistryQuery } from '../../data/content-registry-query';
import { PathbuilderExportClient } from '../../data/pathbuilder-export-client';
import { ImportContentReport } from '../import-content-report/import-content-report.component';
import { SIGNED } from '../import-labels';

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
    ImportContentReport,
    Message,
    Page,
    PageBody,
    PageHeader,
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
  readonly #content = inject(ContentLoader);
  /** Pathbuilder names are matched against ancestries today; more kinds join as the report learns them. */
  readonly #registry = injectQuery(() => contentRegistryQuery(this.#content, CHARACTER_CONTENT_KINDS));
  readonly #store = inject(CharacterStore);
  readonly #exports = inject(PathbuilderExportClient);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);

  protected readonly model = signal<ImportModel>({ json: '' });
  protected readonly form = form(this.model);

  /** A pasted link, not JSON: the server fetches the export it points at (#663). */
  protected readonly isLink = computed((): boolean => looksLikeUrl(this.model().json));

  readonly #result = computed((): PathbuilderReadResult | undefined => {
    const text = this.model().json.trim();
    return text === '' || this.isLink() ? undefined : readPathbuilderExport(text);
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

  /** Has the server fetch the export a pasted link points at, and puts it in the field to be read like a pasted one. */
  protected readonly fetchExport = async (): Promise<void> => {
    const fetched = await this.#exports.fetch(this.model().json.trim());
    this.model.set({ json: JSON.stringify(fetched) });
  };

  /**
   * Sends the export itself, not the preview; the server reads and checks it again. Opens the new character on Plan,
   * where its import report shows.
   */
  protected readonly create = async (): Promise<void> => {
    const character = await this.#store.importPathbuilder(JSON.parse(this.model().json) as unknown);
    await this.#router.navigate(['../..', character.id, SheetMode.Plan], { relativeTo: this.#route });
  };

  /** The server's reason when it gave one (an ancestry that isn't loaded), else a generic retry. */
  protected readonly describeCreateError = (error: unknown): string =>
    this.#describe(error, 'character.import.createFailed');

  /** The server's reason the link was refused (another host, no id, no answer), else a generic retry. */
  protected readonly describeFetchError = (error: unknown): string =>
    this.#describe(error, 'character.import.fetchFailed');

  #describe(error: unknown, fallbackKey: string): string {
    const [issue] = error instanceof ApiError ? error.issues : [];
    return issue === undefined
      ? this.#i18n.translate(fallbackKey)
      : this.#i18n.translate(issue.message.key, issue.message.params);
  }
}
