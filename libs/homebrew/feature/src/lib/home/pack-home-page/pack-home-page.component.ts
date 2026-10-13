import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  DescriptionItem,
  DescriptionList,
  Heading,
  Page,
  SelectField,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import type { HomebrewPack } from '@pioneer/homebrew/domain';
import { PackVisibility } from '@pioneer/rules/sdk';
import { HttpStatus } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';
import { filter, merge } from 'rxjs';

import { HomebrewStore } from '../../data/homebrew-store';

/** How each visibility reads, as full message keys: what it is, and who can see the pack because of it. */
const VISIBILITY_MESSAGES = {
  [PackVisibility.Private]: 'homebrew.pack.visibilityPrivate',
  [PackVisibility.Campaign]: 'homebrew.pack.visibilityCampaign',
  [PackVisibility.Public]: 'homebrew.pack.visibilityPublic',
} as const satisfies Record<PackVisibility, string>;

/**
 * One pack's home: its slug, author, visibility and how many entries it holds. Its owner can change the visibility
 * here and it saves as it is chosen. If the server refuses (campaigns still enable the pack) the reason shows on
 * the field and the pack stays as it was. Anyone else who can read the pack is told so when they try.
 */
@Component({
  selector: 'pio-pack-home-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DateDisplay,
    DescriptionItem,
    DescriptionList,
    Heading,
    Page,
    SelectField,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './pack-home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackHomePage {
  /** Route param, bound by `withComponentInputBinding`; the store validates it. */
  public readonly id = input.required<string>();

  protected readonly store = inject(HomebrewStore);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or the `homebrew` message scope finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly title = computed(() => this.store.selected.data()?.title);
  protected readonly visibilityMessages = VISIBILITY_MESSAGES;
  protected readonly visibilityOptions = computed((): readonly SelectOption<PackVisibility>[] => {
    this.#messages();
    return Object.values(PackVisibility).map((visibility) => ({
      value: visibility,
      label: this.#i18n.translate(VISIBILITY_MESSAGES[visibility]),
    }));
  });

  /** Why the last change was refused, until the next one. */
  protected readonly visibilityError = signal<string | undefined>(undefined);
  /** The choice being saved, shown until the server answers so a refused one does not linger in the select. */
  protected readonly chosen = signal<PackVisibility | undefined>(undefined);
  protected readonly saving = signal(false);

  public constructor() {
    effect(() => {
      this.store.select(this.id());
    });
  }

  protected async chooseVisibility(pack: HomebrewPack, visibility: PackVisibility | undefined): Promise<void> {
    if (visibility === undefined || visibility === pack.visibility) {
      return;
    }
    this.visibilityError.set(undefined);
    this.chosen.set(visibility);
    this.saving.set(true);
    try {
      await this.store.setVisibility(pack.id, visibility);
    } catch (error) {
      this.visibilityError.set(this.#describe(error));
    } finally {
      this.chosen.set(undefined);
      this.saving.set(false);
    }
  }

  /** The server's own reason when it gave one the viewer can act on (a 409), else a general failure. */
  #describe(error: unknown): string {
    if (error instanceof ApiError && error.isConflict) {
      return this.#i18n.translate(error.descriptor.key, error.descriptor.params);
    }
    if (error instanceof ApiError && error.status === HttpStatus.Forbidden) {
      return this.#i18n.translate('homebrew.pack.visibilityForbidden');
    }
    return this.#i18n.translate('homebrew.pack.visibilityFailed');
  }
}
