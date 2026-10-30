import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PERCEPTION } from '@pioneer/character/domain';
import { Button, ButtonVariant, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { Selector } from '@pioneer/rules/sdk';

import { PlayStore } from '../../data/play-store';
import { OptionPicker } from '../option-picker/option-picker.component';
import { defaultInitiative, initiativeChoices } from '../sheet-initiative';
import type { InitiativeChoice } from '../sheet-initiative';
import { SheetRolls } from '../sheet-rolls';
import { SheetState } from '../sheet-state';

/** `+7` or `-1`: a modifier with its sign. */
function modifierText(total: number): string {
  return total < 0 ? `-${Math.abs(total)}` : `+${total}`;
}

/**
 * The initiative roll offered on entering an encounter (#506): Perception or any skill or Lore with its modifier as an
 * initiative roll, starting on the one the exploration activity suggests. The roll goes to the last roll's card and is
 * kept nowhere else; it can be rolled again, or skipped. Either way the character is already in the encounter.
 */
@Component({
  selector: 'pio-sheet-initiative',
  imports: [OptionPicker, Button, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-initiative.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetInitiative {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #rolls = inject(SheetRolls);
  readonly #state = inject(SheetState);
  readonly #picked = signal<Selector | undefined>(undefined);

  /** Closes the picker: the roll was made, or skipped. */
  public readonly closed = output();

  protected readonly ghost = ButtonVariant.Ghost;
  protected readonly rolled = signal(false);

  /** Perception, then each skill and Lore, with its modifier as an initiative roll. */
  protected readonly choices = computed((): readonly InitiativeChoice[] => {
    const registry = this.#state.engine();
    const character = this.#state.character();
    const skills = this.#state.picks.skills();
    if (registry === undefined || character === undefined || skills === undefined) {
      return [];
    }
    const perception = registry.statisticsFor(PERCEPTION).at(-1)?.definition.name ?? PERCEPTION;
    return initiativeChoices({ registry, character }, perception, skills);
  });

  /** What is picked: the player's pick, else the suggestion of the exploration activity, else Perception. */
  protected readonly current = computed((): InitiativeChoice | undefined => {
    const choices = this.choices();
    const registry = this.#state.engine();
    const picked = choices.find(({ selector }) => selector === this.#picked());
    if (picked !== undefined || registry === undefined) {
      return picked;
    }
    return defaultInitiative(registry, this.#play.play.data()?.play.exploration, choices);
  });

  protected readonly options = computed((): readonly SelectOption<string>[] =>
    this.choices().map(({ selector, name, total }) => ({
      value: selector,
      label: this.#i18n.translate('character.sheet.initiative.option', { name, modifier: modifierText(total) }),
    })),
  );

  protected readonly pick = (value: string | undefined): void => {
    this.#picked.set(value === undefined ? undefined : Selector.parse(value));
  };

  protected readonly roll = (): void => {
    const choice = this.current();
    if (choice !== undefined) {
      this.#rolls.rollInitiative(choice.name, choice.selector);
      this.rolled.set(true);
    }
  };
}
