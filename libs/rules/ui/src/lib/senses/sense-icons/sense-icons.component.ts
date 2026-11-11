import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { IconGlyph } from '@pioneer/frontier';
import { HoverCard, HoverCardContent, Icon, LocaleFormat, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { SenseInPlay } from '@pioneer/rules/engine';
import { SenseAcuity } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { Eye, EyeOff, ScanEye } from 'lucide';
import { filter, merge } from 'rxjs';

import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import { SenseList } from '../sense-list/sense-list.component';
import { SensesMessage } from '../senses-messages';
import type { ShownSense } from '../shown-senses';
import { wordSense } from '../word-sense';

/** A sense as a row: the icon for its acuity, its name, and the sense worded as the panel words it, for the popover. */
interface SenseRow {
  readonly icon: IconGlyph;
  readonly name: string;
  readonly sense: ShownSense;
}

/** The sharper the sense, the more open the eye: precise sees, imprecise only scans, vague barely notices. */
const ICONS: Readonly<Record<SenseAcuity, IconGlyph>> = {
  [SenseAcuity.Precise]: Eye,
  [SenseAcuity.Imprecise]: ScanEye,
  [SenseAcuity.Vague]: EyeOff,
};

/**
 * A character's senses as icon rows: each its acuity's icon and its name ("Darkvision"), opening its acuity, range
 * and where it comes from on hover. The sheet's top block; the Encounter tab's `pio-senses` lists the same senses in
 * full.
 *
 * Read-only and presentational (ADR-0028): the caller passes the engine's `SenseInPlay` list, or undefined while it
 * loads, and the display names of the entries it names.
 *
 * ```html
 * <pio-sense-icons [senses]="senses()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-sense-icons',
  imports: [HoverCard, HoverCardContent, Icon, SenseList, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sense-icons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SenseIcons {
  /** Undefined while loading: a placeholder shows. */
  public readonly senses = input.required<readonly SenseInPlay[] | undefined>();
  /** Display names of the senses and of the entries the origins come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly None = SensesMessage.None;

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly rows = computed((): readonly SenseRow[] | undefined => {
    this.#messages();
    this.#format.locale();
    const words = { i18n: this.#i18n, format: this.#format, names: this.entryNames() };
    return this.senses()?.map((sense) => ({
      icon: ICONS[sense.acuity],
      name: words.names.get(sense.sense) ?? sense.sense,
      sense: wordSense(sense, words),
    }));
  });
}
