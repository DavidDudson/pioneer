import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { currentResource, PlayCommandField, Resource, ResourceCount } from '@pioneer/character/domain';
import type { PlayCommand, ResourceMaxima, ResourcesSpent } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Pips, Skeleton, Stack, Text } from '@pioneer/frontier';

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
 * Hero points and focus points (#345, #633), each a row of pips, one per point, filled for the points held: a press
 * fills up to a pip or empties the last filled one. Hero points always show; the focus pool shows once the character's
 * focus spells give one. `pool` shows only that one: the header shows focus points, the skills rail hero points.
 * Spending the last hero point of a dying character is Heroic Recovery, which the server applies.
 */
@Component({
  selector: 'pio-sheet-resources',
  imports: [AsyncData, AsyncPending, AsyncRegion, Pips, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-resources.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetResources {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #sheet = inject(SheetState);

  protected readonly playQuery = this.#play.play;
  protected readonly engineQuery = this.#sheet.engineQuery;

  /** The one pool to show; all of them when unset. */
  public readonly pool = input<Resource | undefined>();

  protected readonly rows = computed((): readonly ResourceView[] | undefined => {
    const maxima = this.#sheet.resourceMaxima();
    const read = this.#play.play.data();
    const only = this.pool();
    return maxima === undefined || read === undefined
      ? undefined
      : viewsOf(read.play.resources, maxima).filter(({ resource }) => only === undefined || resource === only);
  });

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  /** The points a pip press asked for, until the server answers: the pips show it, then what was saved. */
  readonly #asked = signal<Partial<Record<Resource, ResourceCount>>>({});

  /** What went wrong with the last press, in words; undefined when it went through. */
  protected readonly error = signal<string | undefined>(undefined);

  /** The points the pips of `row` show: the press in flight, else what is held. */
  protected readonly shown = ({ resource, current }: ResourceView): ResourceCount => this.#asked()[resource] ?? current;

  /**
   * A press on a pip of `row` set the points held to `value`: one more or one less is a regain or a spend (a spend of
   * the last hero point of a dying character is Heroic Recovery, which the server applies), a bigger jump sets the points.
   */
  protected readonly set = async (row: ResourceView, value: number): Promise<void> => {
    const asked = ResourceCount.parse(Math.max(value, 0));
    const step = asked - row.current;
    if (step === 0) {
      return;
    }
    const { resource } = row;
    const command: PlayCommand =
      Math.abs(step) === 1
        ? {
            field: step > 0 ? PlayCommandField.RegainResource : PlayCommandField.SpendResource,
            resource,
            amount: ONE,
          }
        : { field: PlayCommandField.SetResource, resource, current: asked };
    this.#asked.update((now) => ({ ...now, [resource]: asked }));
    await this.#send(command, resource);
  };

  /** The server's reason (a conflict), else the sheet's own wording. */
  #describe(error: unknown): string {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  }

  async #send(command: PlayCommand, resource: Resource): Promise<void> {
    this.busy.set(true);
    this.error.set(undefined);
    try {
      await this.#play.send(command);
    } catch (error: unknown) {
      this.error.set(this.#describe(error));
    } finally {
      this.#asked.update(({ [resource]: _answered, ...rest }) => rest);
      this.busy.set(false);
    }
  }
}
