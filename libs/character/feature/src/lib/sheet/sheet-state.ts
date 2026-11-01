import { computed, inject, Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { itemContent, maxHitPoints, resourceMaxima, withPlay } from '@pioneer/character/domain';
import type { Character, ResourceMaxima } from '@pioneer/character/domain';
import type { RuleId, VitalsInPlay } from '@pioneer/rules/engine';
import { FocusPoints, SpellPreparation } from '@pioneer/rules/sdk';
import type { ContentRegistry, HitPoints, Selector } from '@pioneer/rules/sdk';
import type { EntryPreviews, Investment, NamedStatistic, OriginNames, Vital } from '@pioneer/rules/ui';

import { CharacterStore } from '../data/character-store';
import { CHARACTER_CONTENT_KINDS, injectContentRegistry } from '../data/content-registry-query';
import { PlayStore } from '../data/play-store';
import { sheetBuildPicks } from './sheet-build-picks';
import type { BuildPicks } from './sheet-build-picks';
import { sheetConditionPreviews } from './sheet-condition-previews';
import { activeFormOf, withoutForms } from './sheet-effects';
import type { EffectView } from './sheet-effects';
import { sheetFetchingPreviews } from './sheet-entry-previews';
import { EQUIPMENT_CONTENT_KINDS, readsEquipment, sheetInvestments } from './sheet-equipment';
import { sheetFocus } from './sheet-focus-spells';
import { sheetIdentity } from './sheet-identity';
import type { IdentityParams } from './sheet-identity';
import { samePlayed } from './sheet-played';
import type { PlayedInputs } from './sheet-played';
import { SPELL_CONTENT_KINDS } from './sheet-prepared-spells';
import { claimSituation, NO_CLAIMS } from './sheet-situations';
import type { SituationClaims } from './sheet-situations';
import { namedStatistics, sheetDerivation, sheetVitalsInPlay } from './sheet-statistics';
// oxlint-disable-next-line import/max-dependencies -- the state every region of the sheet reads: the character, its forms and what the engine derives
import { sheetArmorClass, sheetVitals } from './sheet-vitals';

/**
 * What every tab of one character's sheet reads: the character, the content registries the engine reads, and the build
 * picks with what the engine derived from them. Provided by the sheet page, so the header and each routed tab share
 * one copy, and the registries load once however often the tab changes.
 */
@Injectable()
export class SheetState {
  readonly #i18n = inject(TranslocoService);
  public readonly store = inject(CharacterStore);
  readonly #play = inject(PlayStore);

  /** Who the sheet names where it says who set something by hand: the override authors the server named. */
  public readonly originNames: Signal<OriginNames> = computed((): OriginNames => ({
    users: new Map(this.store.authors()?.map(({ userId, displayName }) => [userId, displayName])),
  }));

  /**
   * What the play state read says that derivations use: the conditions active now and the toggles as the player left
   * them. A play edit replaces it without touching the build.
   */
  readonly #played = computed((): PlayedInputs | undefined => this.#play.play.data()?.play, {
    equal: samePlayed,
  });
  /** The open character with the conditions and effects active now and its toggles, forms included. */
  readonly #full: Signal<Character | undefined> = computed((): Character | undefined => {
    const selected = this.store.selected();
    const played = this.#played();
    return selected === undefined || played === undefined
      ? selected
      : withPlay(selected, {
          ...selected.document.play,
          conditions: [...played.conditions],
          effects: [...played.effects],
          environments: [...played.environments],
          toggles: played.toggles,
        });
  });

  /**
   * The form the character is in (#528), whether or not the base view hides it; undefined in no form or while the
   * content that names it loads.
   */
  public readonly activeForm: Signal<EffectView | undefined> = computed((): EffectView | undefined => {
    const registry = this.equipment.data();
    const full = this.#full();
    return registry === undefined || full === undefined
      ? undefined
      : activeFormOf(registry, full.document.play.effects);
  });

  readonly #baseView = signal(false);

  /** Whether a battle form has the character's worn and held gear melded into it (#532); not in the base view. */
  public readonly melded: Signal<boolean> = computed(() => this.activeForm() !== undefined && !this.#baseView());

  /**
   * Whether the sheet shows the character without its form (#528), for reference. A display preference only: the form
   * stays active and nothing is sent.
   */
  public readonly baseView: Signal<boolean> = this.#baseView.asReadonly();

  /**
   * The open character with the conditions active now and its toggles, so every derivation (statistics, Strikes)
   * reads them. In the base view it has none of its polymorph effects, so the sheet reads as it would out of form.
   */
  public readonly character: Signal<Character | undefined> = computed((): Character | undefined => {
    const full = this.#full();
    const registry = this.equipment.data();
    return full === undefined || registry === undefined || !this.#baseView()
      ? full
      : withPlay(full, { ...full.document.play, effects: [...withoutForms(registry, full.document.play.effects)] });
  });

  /** The registry the engine reads, shared with the ancestry options, so it loads once. */
  public readonly registry = injectContentRegistry(CHARACTER_CONTENT_KINDS);
  /**
   * The registry with the item and condition kinds too, so the character's equipment and Bulk reach the engine. It
   * loads only once the character carries something or has a condition, so a sheet with neither never fetches them for it.
   */
  public readonly equipment = injectContentRegistry(EQUIPMENT_CONTENT_KINDS, () => readsEquipment(this.#full()));
  /** The query the engine's registry comes from, so the regions that wait on it show its pending and failed states. */
  public readonly engineQuery = computed(() => (readsEquipment(this.#full()) ? this.equipment : this.registry));
  /** The registry the engine reads: with the item kinds once anything is carried, undefined while they load. */
  readonly #engineRegistry = computed((): ContentRegistry | undefined =>
    readsEquipment(this.#full()) ? this.equipment.data() : this.registry.data(),
  );

  /** The registry the engine reads, for a roll that derives a statistic again; undefined while it loads. */
  public readonly engine: Signal<ContentRegistry | undefined> = this.#engineRegistry;

  /**
   * The previews the header's conditions open: each entry with its value and what it changes for this character, read
   * from the engine's registry.
   */
  public readonly conditionPreviews: EntryPreviews = sheetConditionPreviews(this.#engineRegistry, this.character);

  /** The previews for the names of the character's actions, Strikes and effects, fetched when the registry lacks one. */
  public readonly previews: EntryPreviews = sheetFetchingPreviews(this.#engineRegistry, this.character);

  readonly #claims = signal<SituationClaims>(NO_CLAIMS);

  /** The situations claimed for the next roll of each statistic (#537); a roll uses its own and lets them go. */
  public readonly claims: Signal<SituationClaims> = this.#claims.asReadonly();

  /** What the engine derives for each statistic a Pathbuilder import reports as different, for its breakdown (#312). */
  public readonly importStatistics: Signal<ReadonlyMap<Selector, NamedStatistic>> = computed(() => {
    const report = this.store.importReport();
    const registry = this.#engineRegistry();
    const character = this.character();
    return report === undefined || registry === undefined || character === undefined
      ? new Map()
      : namedStatistics(
          registry,
          character,
          report.discrepancies.differences.map(({ selector }) => selector),
        );
  });

  /** The root slot, subclass and key attribute pickers, the build summary, and what the engine derives. */
  public readonly picks: BuildPicks = sheetBuildPicks({
    registry: this.registry.data,
    engineRegistry: this.#engineRegistry,
    character: this.character,
    slots: this.store.slots,
    select: async (slot, selection, loreName) => this.store.selectSlot(slot, selection, loreName),
    clear: async (slot) => this.store.clearSlot(slot),
    translate: (key, params) => this.#i18n.translate(key, params),
    claims: this.claims,
  });

  /** The invested items and what each turns on, from the statistics; undefined while they load. */
  public readonly investments = computed((): readonly Investment[] | undefined => {
    const registry = this.#engineRegistry();
    const character = this.character();
    const statistics = this.picks.statistics();
    return registry === undefined || character === undefined || statistics === undefined
      ? undefined
      : sheetInvestments(character, itemContent(registry), { statistics, melded: this.melded() });
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

  /** Armor Class with its rank and what sets it, for its block; undefined while it loads. */
  public readonly armorClass = computed((): Vital | undefined => {
    const registry = this.#engineRegistry();
    const character = this.character();
    const statistics = this.picks.statistics();
    return registry === undefined || character === undefined || statistics === undefined
      ? undefined
      : sheetArmorClass(registry, character, { statistics, entryNames: this.picks.entryNames() });
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

  /**
   * What the character's rule elements give besides the numbers above: fast healing, regeneration, temporary Hit
   * Points and a change of size. Undefined while the registry loads and until the character has an ancestry.
   */
  public readonly grantedVitals = computed((): VitalsInPlay | undefined => {
    const registry = this.#engineRegistry();
    const character = this.character();
    return registry === undefined || character === undefined ? undefined : sheetVitalsInPlay(registry, character);
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

  /** Shows the sheet without the character's form, or with it again. */
  public setBaseView(on: boolean): void {
    this.#baseView.set(on);
  }

  /** Claims the situation of a conditional line for the next roll of `selector`, or lets it go. */
  public claim(selector: Selector, rule: RuleId, on: boolean): void {
    this.#claims.update((claims) => claimSituation(claims, { selector, rule, on }));
  }

  /** Lets go of the situations claimed for `selector`, as its roll uses them up. */
  public release(selector: Selector): void {
    this.#claims.update((claims) => {
      const next = new Map(claims);
      next.delete(selector);
      return next;
    });
  }
}
