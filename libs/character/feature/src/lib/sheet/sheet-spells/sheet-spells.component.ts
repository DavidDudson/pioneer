import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { heldCount } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Grid, Segmented, Skeleton, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ENTRY_PREVIEWS, FocusSpellsView, SpellAccessListView } from '@pioneer/rules/ui';
import type { EntryPreviews, FocusLine } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { sheetCounted } from '../sheet-counted';
import { sheetEntryPreviews } from '../sheet-entry-previews';
import { sheetFocus } from '../sheet-focus-spells';
import { sheetSpellAccess, SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';
import type { SheetSpellAccess } from '../sheet-prepared-spells';
import { SheetPreparedSpells } from '../sheet-prepared-spells/sheet-prepared-spells.component';
import { preparedFieldsOf } from '../sheet-spell-picks';
import { filterFocus, filterPrepared, SPELL_TARGET_FILTER_MESSAGES, SpellTargetFilter } from '../sheet-spell-targets';
import type { SpellSpend } from '../sheet-spell-use';
import { SheetSpender } from '../sheet-spender';
import { SpellAccess } from '../spell-access/spell-access.component';

const LOADING_SLOTS = 3;

/**
 * The open character's spell picks under its spellcasting entries (#478): a pick per prepared slot, its focus spells
 * (ADR-0050), and the uncommon and rare spells it has access to. The spells load only once the character has an entry, so a sheet without one never
 * fetches them.
 */
@Component({
  selector: 'pio-sheet-spells',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    FocusSpellsView,
    Grid,
    SheetPreparedSpells,
    Segmented,
    Skeleton,
    SpellAccess,
    SpellAccessListView,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './sheet-spells.component.html',
  providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(SheetSpells).previews }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSpells {
  /** Whether the character has a spellcasting entry. */
  public readonly casts = input(false);
  /** Whether one of its entries is a focus entry, so its focus spells show a placeholder while they load. */
  public readonly focuses = input(false);

  /** Placeholder pickers while the spells load: a 1st-level caster's first row. */
  protected readonly loadingSlots = Array.from({ length: LOADING_SLOTS }, (_unused, index) => index);

  readonly #store = inject(CharacterStore);
  readonly #play = inject(PlayStore);
  readonly #spender = inject(SheetSpender);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the pickers' rows are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** The registry with the spells; loads once the character casts. */
  protected readonly spells = injectContentRegistry(SPELL_CONTENT_KINDS, () => this.casts());
  /** What a spell row previews on hover, read from the loaded spells. */
  public readonly previews: EntryPreviews = sheetEntryPreviews(() => this.spells.data());
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
  /** Which spells the lists show by what they target. */
  protected readonly targetFilter = signal<SpellTargetFilter>(SpellTargetFilter.All);
  /** The filter's choices, worded in the viewer's locale. */
  protected readonly targetOptions = computed((): readonly SelectOption<SpellTargetFilter>[] =>
    Object.values(SpellTargetFilter).map((value) => ({
      value,
      label: this.#i18n.translate(SPELL_TARGET_FILTER_MESSAGES[value]),
    })),
  );
  /** The prepared and repertoire picks that pass the filter. */
  protected readonly shownPrepared = computed(() => filterPrepared(this.prepared(), this.targetFilter()));
  /** The focus spells that pass the filter. */
  protected readonly shownFocus = computed((): FocusLine | undefined => {
    const focusLine = this.focus();
    return focusLine === undefined ? undefined : filterFocus(focusLine, this.targetFilter());
  });
  /** The uncommon and rare spells the build has access to, and those it may add; undefined while the spells load. */
  protected readonly access = computed((): SheetSpellAccess | undefined => {
    const registry = this.spells.data();
    const character = this.#store.selected();
    return registry === undefined || character === undefined ? undefined : sheetSpellAccess(registry, character);
  });
}
