import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { translateSignal, TranslocoPipe } from '@jsverse/transloco';
import { Button, Dropdown, Stack, ThemeChoice, ThemeStore } from '@pioneer/frontier';

interface ThemeOption {
  readonly choice: ThemeChoice;
  readonly label: string;
}

/**
 * The theme dropdown. Dynamic, the default, follows the open campaign's or character's theme and falls back to
 * Frontier; the others fix it.
 */
@Component({
  selector: 'pio-theme-menu',
  imports: [Button, Dropdown, Stack, TranslocoPipe],
  templateUrl: './theme-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeMenu {
  protected readonly appearance = inject(ThemeStore);
  readonly #dynamic = translateSignal('shell.appearance.themes.dynamic');
  readonly #frontier = translateSignal('shell.appearance.themes.frontier');
  readonly #tavern = translateSignal('shell.appearance.themes.tavern');
  protected readonly options = computed<readonly ThemeOption[]>(() => [
    { choice: ThemeChoice.Dynamic, label: this.#dynamic() },
    { choice: ThemeChoice.Frontier, label: this.#frontier() },
    { choice: ThemeChoice.Tavern, label: this.#tavern() },
  ]);
  protected readonly current = computed(
    () => this.options().find((option) => option.choice === this.appearance.choice())?.label ?? '',
  );

  protected choose(choice: ThemeChoice): void {
    this.appearance.choice.set(choice);
  }
}
