import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Disclosure, EmptyState, LocaleFormat, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { SenseInPlay } from '@pioneer/rules/engine';
import type { ContentId } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { SenseList } from './sense-list/sense-list.component';
import { SensesMessage } from './senses-messages';
import type { ShownSenses } from './shown-senses';
import { wordSense } from './word-sense';

/**
 * A character's senses (play-and-campaigns.md, "Statistics and breakdowns"): each as its name, acuity and range, with
 * its origin chain and sources. A sense a battle form gives is marked "from <form>", and when the form replaces the
 * character's own senses those are one disclosure away.
 *
 * Read-only and presentational (ADR-0028): the caller passes the engine's `SenseInPlay` lists, or undefined while
 * they load, and the display names of the entries they name. A missing name shows its id, except in an origin chain,
 * where a missing entry reads "an entry".
 *
 * ```html
 * <pio-senses [senses]="senses()" [own]="own()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-senses',
  imports: [Disclosure, EmptyState, SenseList, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './senses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensesView {
  /** Undefined while loading: the panel then shows a skeleton. */
  public readonly senses = input.required<readonly SenseInPlay[] | undefined>();
  /** The senses the character has without its battle form, when the form replaced them; none otherwise. */
  public readonly own = input<readonly SenseInPlay[]>([]);
  /** Display names of the senses and of the entries the origins come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for what the origin chains refer to beyond entries: users, slots, items, events and packs. */
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly None = SensesMessage.None;
  protected readonly Own = SensesMessage.Own;

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly shown = computed((): ShownSenses | undefined => {
    this.#messages();
    this.#format.locale();
    const senses = this.senses();
    const own = this.own();
    const words = { i18n: this.#i18n, format: this.#format, names: this.entryNames() };
    return senses === undefined
      ? undefined
      : {
          senses: senses.map((sense) => wordSense(sense, words)),
          own: own.map((sense) => wordSense(sense, words)),
          empty: senses.length === 0,
          hasOwn: own.length > 0,
        };
  });
}
