import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { SPELL_RANK_MAX, SpellRank } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { OptionPicker } from '../option-picker/option-picker.component';
import { spellCastLine } from '../spell-list/spell-detail-line-of';
import type { SpellCastLine } from '../spell-list/spell-detail-line-of';
import { SpellFields } from '../spell-list/spell-fields.component';
import { EntryEffectsView } from './entry-effects.component';
import type { PreviewEffect, PreviewRanks } from './entry-preview';
import { EntryPreviewMessage } from './entry-preview-messages';

/**
 * A spell at the rank the reader picks, from its own rank up: what casting it takes and does there (damage, area and
 * the rest, heightened) and, for a character, what it changes at that rank. Presentational: the caller finds the cast
 * and the effects for each rank.
 *
 * ```html
 * <pio-entry-ranks [ranks]="preview.ranks" [name]="preview.name" />
 * ```
 */
@Component({
  selector: 'pio-entry-ranks',
  imports: [EntryEffectsView, OptionPicker, SpellFields, Stack, Text, TranslocoPipe],
  templateUrl: './entry-ranks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryRanksView {
  public readonly ranks = input.required<PreviewRanks>();
  /** The spell's name, which a variant without one of its own takes. */
  public readonly name = input.required<string>();

  protected readonly Message = EntryPreviewMessage;

  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** The rank picked; the spell's own until the reader picks another. */
  readonly #picked = signal<SpellRank | undefined>(undefined);

  protected readonly rank = computed((): SpellRank => this.#picked() ?? this.ranks().from);

  protected readonly options = computed((): readonly SelectOption<string>[] => {
    this.#messages();
    const first: number = this.ranks().from;
    const options: SelectOption<string>[] = [];
    for (let rank = first; rank <= SPELL_RANK_MAX; rank += 1) {
      options.push({ value: String(rank), label: this.#i18n.translate(EntryPreviewMessage.Rank, { rank }) });
    }
    return options;
  });

  protected readonly cast = computed((): SpellCastLine => {
    this.#messages();
    const translate = (key: string, params?: Readonly<Record<string, string | number>>): string =>
      this.#i18n.translate(key, params);
    return spellCastLine(this.ranks().cast(this.rank()), this.name(), translate);
  });

  protected readonly effects = computed((): readonly PreviewEffect[] | undefined =>
    this.ranks().effects?.(this.rank()),
  );

  protected pick(value: string | undefined): void {
    const parsed = SpellRank.safeParse(Number(value));
    if (parsed.success && parsed.data >= this.ranks().from) {
      this.#picked.set(parsed.data);
    }
  }
}
