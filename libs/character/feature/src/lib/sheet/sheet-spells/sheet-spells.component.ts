import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { heldCount } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Grid, Skeleton, Stack } from '@pioneer/frontier';
import { ENTRY_PREVIEWS, SpellFilter, SpellRowList, TRADITION_MESSAGES } from '@pioneer/rules/ui';
import type { EntryPreviews, FocusLine, InnateLine } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { sheetCounted } from '../sheet-counted';
import { injectFilterSources } from '../sheet-filter-sources';
import { sheetFocus, sheetInnate } from '../sheet-focus-spells';
import { SheetFormLimits } from '../sheet-form-limits/sheet-form-limits.component';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';
import { PREPARED_HEADINGS, SheetPreparedSpells } from '../sheet-prepared-spells/sheet-prepared-spells.component';
import { sheetSectionPreviews } from '../sheet-section-previews';
import { injectSpellFilters } from '../sheet-spell-filters';
import { SpellItemCasting } from '../sheet-spell-item-casting';
import type { SpellOrigins } from '../sheet-spell-list';
// oxlint-disable-next-line import/max-dependencies -- the one place every spell list of the sheet is composed, with what a form forbids of them
import { preparedFieldsOf } from '../sheet-spell-picks';
import { SheetSpellResources } from '../sheet-spell-resources/sheet-spell-resources.component';
import type { SpellSpend } from '../sheet-spell-use';
import { SheetSpender } from '../sheet-spender';

/**
 * The open character's spells (#1784): every spell it can cast, prepared, spontaneous, focus or innate, as one alphabetical
 * list with a row per source, filtered by target, trait, damage type, action cost and source (#1785) with the filters in the URL, and under it a picker per prepared slot (#478). The spells load only once the character has
 * an entry, so a sheet without one never fetches them.
 */
@Component({
  selector: 'pio-sheet-spells',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Grid,
    SheetFormLimits,
    SheetPreparedSpells,
    SheetSpellResources,
    Skeleton,
    SpellFilter,
    SpellRowList,
    Stack,
  ],
  templateUrl: './sheet-spells.component.html',
  providers: [
    SpellItemCasting,
    { provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(SheetSpells).previews },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSpells {
  /** Whether the character has a spellcasting entry. */
  public readonly casts = input(false);

  readonly #store = inject(CharacterStore);
  readonly #filters = injectFilterSources();
  readonly #play = inject(PlayStore);
  readonly #spender = inject(SheetSpender);
  readonly #i18n = inject(TranslocoService);
  protected readonly items = inject(SpellItemCasting);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the pickers' rows are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** The registry with the spells; loads once the character casts. */
  protected readonly spells = injectContentRegistry(SPELL_CONTENT_KINDS, () => this.casts());
  /** What a spell row previews on hover, read from the loaded spells. */
  public readonly previews: EntryPreviews = sheetSectionPreviews(() => this.spells.data());
  /** What casting is checked against: the turn, the slots left under each key and the Focus Points left. */
  protected readonly spend = computed((): SpellSpend | undefined => {
    const registry = this.spells.data();
    const character = this.#store.selected();
    const read = this.#play.play.data();
    if (registry === undefined || character === undefined || read === undefined) {
      return undefined;
    }
    const maxima = sheetCounted(registry, character).slots;
    const { resources } = read.play;
    const pool = sheetFocus(registry, character)?.pool ?? 0;
    return {
      turn: this.#spender.turn(),
      slotsLeft: (key) => heldCount({ spent: resources.slots, maxima, key }),
      focusLeft: Math.max(pool - resources['focus-points'], 0),
    };
  });

  /** One pick per prepared slot at the character's level, by entry and rank. */
  protected readonly prepared = preparedFieldsOf({
    registry: this.spells.data,
    character: this.#store.selected,
    slots: this.#store.slots,
    select: async (slot, selection) => this.#store.selectSlot(slot, selection),
    clear: async (slot) => this.#store.clearSlot(slot),
    translate: (key, params) => this.#i18n.translate(key, params),
    messages: this.#messages,
    spend: this.spend,
    filters: this.#filters,
  });
  /** The character's focus spells and focus pool; undefined without a focus entry or while the spells load. */
  protected readonly focus = computed((): FocusLine | undefined => {
    const registry = this.spells.data();
    const character = this.#store.selected();
    return registry === undefined || character === undefined
      ? undefined
      : sheetFocus(registry, character, {
          translate: (key, params) => this.#i18n.translate(key, params),
          spend: this.spend(),
        });
  });
  /** The character's innate spells; undefined without an innate entry or while the spells load. */
  protected readonly innate = computed((): InnateLine | undefined => {
    const registry = this.spells.data();
    const character = this.#store.selected();
    return registry === undefined || character === undefined
      ? undefined
      : sheetInnate(registry, character, (key, params) => this.#i18n.translate(key, params));
  });
  /** Where each spell comes from, as the source filter lists it: the entry or item that grants it. */
  readonly #origins = computed((): SpellOrigins => ({
    focus: this.focus(),
    innate: this.innate(),
    prepared: this.prepared(),
    items: this.items.rows(),
    preparedSource: ({ preparation, tradition }): string => {
      const traditionName: string = this.#i18n.translate(TRADITION_MESSAGES[tradition]);
      const heading: string = this.#i18n.translate(PREPARED_HEADINGS[preparation], { tradition: traditionName });
      return heading;
    },
  }));
  /** The filters of the list, and the spells that pass them. */
  protected readonly filters = injectSpellFilters({
    origins: this.#origins,
    translate: (key) => this.#i18n.translate(key),
    messages: this.#messages,
  });
}
