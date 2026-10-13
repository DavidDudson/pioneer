import { computed, inject, Injectable } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { itemContent, maxHitPoints, resourceMaxima } from '@pioneer/character/domain';
import type { Character, ResourceMaxima } from '@pioneer/character/domain';
import { FocusPoints, SpellPreparation } from '@pioneer/rules/sdk';
import type { ContentRegistry, HitPoints } from '@pioneer/rules/sdk';
import type { Investment, Vital } from '@pioneer/rules/ui';

import { CharacterStore } from '../data/character-store';
import { CHARACTER_CONTENT_KINDS, injectContentRegistry } from '../data/content-registry-query';
import { sheetBuildPicks } from './sheet-build-picks';
import type { BuildPicks } from './sheet-build-picks';
import { carriesAnything, EQUIPMENT_CONTENT_KINDS, sheetInvestments } from './sheet-equipment';
import { sheetFocus } from './sheet-focus-spells';
import { sheetIdentity } from './sheet-identity';
import type { IdentityParams } from './sheet-identity';
import { SPELL_CONTENT_KINDS } from './sheet-prepared-spells';
import { sheetDerivation } from './sheet-statistics';
import { sheetVitals } from './sheet-vitals';

/**
 * What every tab of one character's sheet reads: the character, the content registries the engine reads, and the build
 * picks with what the engine derived from them. Provided by the sheet page, so the header and each routed tab share
 * one copy, and the registries load once however often the tab changes.
 */
@Injectable()
export class SheetState {
  readonly #i18n = inject(TranslocoService);
  public readonly store = inject(CharacterStore);
  public readonly character: Signal<Character | undefined> = this.store.selected;

  /** The registry the engine reads, shared with the ancestry options, so it loads once. */
  public readonly registry = injectContentRegistry(CHARACTER_CONTENT_KINDS);
  /**
   * The registry with the item and condition kinds too, so the character's equipment and Bulk reach the engine. It
   * loads only once the character carries something, so a sheet with nothing carried never fetches them for it.
   */
  public readonly equipment = injectContentRegistry(EQUIPMENT_CONTENT_KINDS, () => carriesAnything(this.character()));
  /** The query the engine's registry comes from, so the regions that wait on it show its pending and failed states. */
  public readonly engineQuery = computed(() => (carriesAnything(this.character()) ? this.equipment : this.registry));
  /** The registry the engine reads: with the item kinds once anything is carried, undefined while they load. */
  readonly #engineRegistry = computed((): ContentRegistry | undefined =>
    carriesAnything(this.character()) ? this.equipment.data() : this.registry.data(),
  );

  /** The root slot, subclass and key attribute pickers, the build summary, and what the engine derives. */
  public readonly picks: BuildPicks = sheetBuildPicks({
    registry: this.registry.data,
    engineRegistry: this.#engineRegistry,
    character: this.character,
    slots: this.store.slots,
    select: async (slot, selection) => this.store.selectSlot(slot, selection),
    clear: async (slot) => this.store.clearSlot(slot),
    translate: (key) => this.#i18n.translate(key),
  });

  /** The invested items and what each turns on, from the statistics; undefined while they load. */
  public readonly investments = computed((): readonly Investment[] | undefined => {
    const registry = this.#engineRegistry();
    const character = this.character();
    const statistics = this.picks.statistics();
    return registry === undefined || character === undefined || statistics === undefined
      ? undefined
      : sheetInvestments(character, itemContent(registry), statistics);
  });

  /** AC, saves and Perception with their ranks, for the header; undefined while they load. */
  public readonly vitals = computed((): readonly Vital[] | undefined => {
    const registry = this.#engineRegistry();
    const character = this.character();
    const statistics = this.picks.statistics();
    return registry === undefined || character === undefined || statistics === undefined
      ? undefined
      : sheetVitals(registry, character, { statistics, entryNames: this.picks.entryNames() });
  });

  /**
   * Maximum Hit Points as the engine derives `hp:max`: undefined while the registry loads, and while the character has
   * no ancestry or class to derive it from.
   */
  public readonly maxHitPoints = computed((): HitPoints | undefined => {
    const registry = this.#engineRegistry();
    const character = this.character();
    return registry === undefined || character === undefined
      ? undefined
      : maxHitPoints(sheetDerivation(registry, character));
  });

  /** Whether one of the character's spellcasting entries is a focus entry, so the focus pool needs its spells. */
  readonly #focuses = computed(
    () => this.picks.spellcasting()?.some((entry) => entry.preparation === SpellPreparation.Focus) ?? false,
  );
  /** The registry with the spells, loaded once the character has a focus entry; the spells tab shares the query. */
  readonly #spells = injectContentRegistry(SPELL_CONTENT_KINDS, () => this.#focuses());

  /**
   * The most each pool of points holds (#345): 3 hero points, and a focus pool from the focus spells. Undefined while
   * the build or the spells a focus pool reads load, so a pool is never shown at a maximum it is about to leave.
   */
  public readonly resourceMaxima = computed((): ResourceMaxima | undefined => {
    const character = this.character();
    if (character === undefined || this.picks.spellcasting() === undefined) {
      return undefined;
    }
    if (!this.#focuses()) {
      return resourceMaxima(FocusPoints.parse(0));
    }
    const spells = this.#spells.data();
    return spells === undefined
      ? undefined
      : resourceMaxima(sheetFocus(spells, character)?.pool ?? FocusPoints.parse(0));
  });

  /** The header's one-line identity; undefined while the build loads. */
  public readonly identity = computed((): IdentityParams | undefined => {
    const character = this.character();
    const lines = this.picks.buildLines();
    return character === undefined || lines === undefined ? undefined : sheetIdentity(character, lines);
  });
}
