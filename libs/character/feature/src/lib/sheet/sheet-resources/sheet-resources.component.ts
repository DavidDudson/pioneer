import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { currentResource, PlayCommandField, Resource, ResourceCount } from '@pioneer/character/domain';
import type { PlayCommand, ResourceMaxima, ResourcesSpent } from '@pioneer/character/domain';
import { AsyncButton, AsyncData, AsyncPending, AsyncRegion, Meter, Skeleton, Stack, Text } from '@pioneer/frontier';

import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';

/** The message key of each pool's name. */
const LABELS: Readonly<Record<Resource, string>> = {
  [Resource.HeroPoints]: 'character.sheet.resources.heroPoints',
  [Resource.FocusPoints]: 'character.sheet.resources.focusPoints',
};

const ONE = ResourceCount.parse(1);

/** One pool of points as the header shows it. */
interface ResourceView {
  readonly resource: Resource;
  readonly labelKey: string;
  readonly current: ResourceCount;
  readonly max: ResourceCount;
}

/** The pools that hold anything, with what is held in each. */
function viewsOf(spent: ResourcesSpent, maxima: ResourceMaxima): readonly ResourceView[] {
  return Object.values(Resource)
    .filter((resource) => maxima[resource] > 0)
    .map((resource): ResourceView => ({
      resource,
      labelKey: LABELS[resource],
      current: currentResource(spent, resource, maxima),
      max: maxima[resource],
    }));
}

/**
 * Hero points and focus points for the sheet header (#345), each a meter of the points held with a button to spend one
 * and one to regain one. Hero points always show; the focus pool shows once the character's focus spells give one.
 * Spending the last hero point of a dying character is Heroic Recovery, which the server applies.
 */
@Component({
  selector: 'pio-sheet-resources',
  imports: [AsyncButton, AsyncData, AsyncPending, AsyncRegion, Meter, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-resources.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetResources {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #sheet = inject(SheetState);

  protected readonly playQuery = this.#play.play;
  protected readonly engineQuery = this.#sheet.engineQuery;

  protected readonly rows = computed((): readonly ResourceView[] | undefined => {
    const maxima = this.#sheet.resourceMaxima();
    const read = this.#play.play.data();
    return maxima === undefined || read === undefined ? undefined : viewsOf(read.play.resources, maxima);
  });

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  protected readonly spend =
    (resource: Resource): (() => Promise<void>) =>
    async (): Promise<void> =>
      this.#send({ field: PlayCommandField.SpendResource, resource, amount: ONE });
  protected readonly regain =
    (resource: Resource): (() => Promise<void>) =>
    async (): Promise<void> =>
      this.#send({ field: PlayCommandField.RegainResource, resource, amount: ONE });

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  async #send(command: PlayCommand): Promise<void> {
    this.busy.set(true);
    try {
      await this.#play.send(command);
    } finally {
      this.busy.set(false);
    }
  }
}
