import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SheetMode } from '@pioneer/character/domain';
import {
  AsyncButton,
  Button,
  DescriptionItem,
  DescriptionList,
  Disclosure,
  FileButton,
  Heading,
  List,
  ListItem,
  Message,
  Page,
  PageBody,
  PageHeader,
  Stack,
  Surface,
  Text,
  TextAreaField,
} from '@pioneer/frontier';
import type { PioneerImportPreview } from '@pioneer/interop/pioneer';
import { slugName } from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { CharacterStore } from '../../data/character-store';
import { PioneerImportHomebrew } from '../pioneer-import-homebrew/pioneer-import-homebrew.component';
import { CONTENT_KIND_KEYS } from '../pioneer-import-labels';

interface ImportModel {
  readonly json: string;
}

/** One kind of content the file names that no loaded pack has, ready to show. */
interface UnmatchedView {
  readonly kind: string;
  readonly labelKey: string;
  readonly entries: readonly string[];
}

/** JSON read from the text. */
interface ParsedFile {
  readonly value: unknown;
}

/** The text as JSON, or `undefined` when it isn't (yet): the server judges whether the JSON is a Pioneer file. */
function parsed(text: string): ParsedFile | undefined {
  try {
    return { value: JSON.parse(text) as unknown };
  } catch {
    return undefined;
  }
}

/**
 * Upload or paste a Pioneer character file to see the character it makes, what happens to the homebrew it carries
 * (#667) and the content in it no loaded pack has, then create it or cancel (#666). Both the preview and the creating are the server's: it holds every pack, reads the
 * file again on create and never takes the preview's word for it.
 */
@Component({
  selector: 'pio-pioneer-import-page',
  imports: [
    AsyncButton,
    Button,
    DescriptionItem,
    DescriptionList,
    Disclosure,
    FileButton,
    FormField,
    Heading,
    List,
    ListItem,
    Message,
    Page,
    PageBody,
    PageHeader,
    PioneerImportHomebrew,
    Stack,
    Surface,
    Text,
    TextAreaField,
    TranslocoPipe,
  ],
  templateUrl: './pioneer-import-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PioneerImportPage {
  readonly #store = inject(CharacterStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);

  protected readonly model = signal<ImportModel>({ json: '' });
  protected readonly form = form(this.model);

  readonly #text = computed(() => this.model().json.trim());
  readonly #file = computed(() => parsed(this.#text()));

  protected readonly malformed = computed(() => this.#text() !== '' && this.#file() === undefined);

  /** Asked of the server once the text is JSON; a file it can't read comes back as the query's error. */
  protected readonly preview = injectQuery(() => {
    const file = this.#file();
    return {
      queryKey: ['characters', 'pioneer-import-preview', this.#text()],
      queryFn: async (): Promise<PioneerImportPreview> => this.#store.previewPioneerImport(file?.value),
      enabled: file !== undefined,
      retry: false,
      staleTime: 0,
    };
  });

  protected readonly problem = computed((): string | undefined => {
    if (this.malformed()) {
      return this.#i18n.translate('character.import.pioneer.problem.malformed');
    }
    const error = this.preview.error();
    return error === null ? undefined : this.describe(error);
  });

  protected readonly unmatched = computed((): readonly UnmatchedView[] =>
    (this.preview.data()?.unmatched ?? []).map(({ kind, entries }) => ({
      kind,
      labelKey: CONTENT_KIND_KEYS[kind],
      entries: entries.map((entry) => `${slugName(entry.slug)} (${entry.source})`),
    })),
  );

  protected readonly unmatchedCount = computed((): number =>
    this.unmatched().reduce((count, group) => count + group.entries.length, 0),
  );

  protected load(text: string): void {
    this.model.set({ json: text });
  }

  protected cancel(): void {
    this.model.set({ json: '' });
  }

  /** Sends the file itself, not the preview. Opens the new character on Plan. */
  protected readonly create = async (): Promise<void> => {
    const character = await this.#store.importPioneer(this.#file()?.value);
    await this.#router.navigate(['../..', character.id, SheetMode.Plan], { relativeTo: this.#route });
  };

  /** The server's reason when it gave one (a newer format, a character that isn't valid), else a generic retry. */
  protected readonly describeCreateError = (error: unknown): string => this.describe(error);

  protected describe(error: unknown): string {
    const [issue] = error instanceof ApiError ? error.issues : [];
    return issue === undefined
      ? this.#i18n.translate('character.import.pioneer.failed')
      : this.#i18n.translate(issue.message.key, issue.message.params);
  }
}
