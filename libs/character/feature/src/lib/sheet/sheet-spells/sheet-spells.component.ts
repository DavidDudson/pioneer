import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { heldCount } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Grid, Segmented, Skeleton, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ENTRY_PREVIEWS, SpellRowList } from '@pioneer/rules/ui';
import type { EntryPreviews, FocusLine, InnateLine, SpellRowLine } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { sheetCounted } from '../sheet-counted';
import { injectFilterSources } from '../sheet-filter-sources';
import { sheetFocus, sheetInnate } from '../sheet-focus-spells';
import { SheetFormLimits } from '../sheet-form-limits/sheet-form-limits.component';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';
import { SheetPreparedSpells } from '../sheet-prepared-spells/sheet-prepared-spells.component';
import { sheetSectionPreviews } from '../sheet-section-previews';
import { SpellItemCasting } from '../sheet-spell-item-casting';
import { sheetSpellList } from '../sheet-spell-list';
import { preparedFieldsOf } from '../sheet-spell-picks';
// oxlint-disable-next-line import/max-dependencies -- the one place every spell list of the sheet is composed, with what a form forbids of them
import { SheetSpellResources } from '../sheet-spell-resources/sheet-spell-resources.component';
import { SPELL_TARGET_FILTER_MESSAGES, SpellTargetFilter } from '../sheet-spell-targets';
import type { SpellSpend } from '../sheet-spell-use';
import { SheetSpender } from '../sheet-spender';

/**
 * The open character's spells (#1784): every spell it can cast, prepared, spontaneous, focus or innate, as one alphabetical
 * list with a row per source, and under it a picker per prepared slot (#478). The spells load only once the character has
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
    Segmented,
    Skeleton,
    SpellRowList,
    Stack,
    TranslocoPipe,
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
  /** Which spells the lists show by what they target. */
  protected readonly targetFilter = signal<SpellTargetFilter>(SpellTargetFilter.All);
  /** The filter's choices, worded in the viewer's locale. */
  protected readonly targetOptions = computed((): readonly SelectOption<SpellTargetFilter>[] =>
    Object.values(SpellTargetFilter).map((value) => ({
      value,
      label: this.#i18n.translate(SPELL_TARGET_FILTER_MESSAGES[value]),
    })),
  );
  /** Every spell the character can cast, one row per source, that passes the filter. */
  protected readonly spellList = computed((): readonly SpellRowLine[] =>
    sheetSpellList(
      { focus: this.focus(), innate: this.innate(), prepared: this.prepared(), items: this.items.rows() },
      this.targetFilter(),
    ),
  );
}
