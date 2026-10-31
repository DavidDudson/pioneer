import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button, ButtonVariant, Disclosure, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { RollToggles } from '@pioneer/play/ui';
import type { RollToggleChange, RollToggleView } from '@pioneer/play/ui';
import { RuleId } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import { BreakdownView, conditionalLineText, numberStyle } from '@pioneer/rules/ui';
import type { ConditionWords } from '@pioneer/rules/ui';

import { SheetRolls } from '../sheet-rolls';
import { SheetState } from '../sheet-state';

/** What the choices so far leave the check at, and the toggles to change them with, already worded. */
interface SetupDisplay {
  readonly name: string;
  readonly modifier: string;
  readonly situations: readonly RollToggleView[];
  readonly remembered: readonly RollToggleView[];
}

/**
 * A check being set up before it is rolled (#340), in the header: the situations that would add to this roll (+1
 * against undead, a second attack's penalty) and the toggles the character keeps (rage), each a button. The modifier
 * and the breakdown under it follow what is on. Rolling takes the choices with it; the situations count for that
 * roll only, while a kept toggle stays as it was left.
 */
@Component({
  selector: 'pio-sheet-roll-setup',
  imports: [BreakdownView, Button, Disclosure, RollToggles, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-roll-setup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRollSetup {
  protected readonly rolls = inject(SheetRolls);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #sheet = inject(SheetState);
  protected readonly entryNames = this.#sheet.picks.entryNames;
  protected readonly originNames = this.#sheet.originNames;
  protected readonly kind = StatisticKind.Check;
  protected readonly secondary = ButtonVariant.Secondary;

  protected readonly display = computed((): SetupDisplay | undefined => {
    const setup = this.rolls.setup();
    if (setup === undefined) {
      return undefined;
    }
    const words: ConditionWords = {
      i18n: this.#i18n,
      format: this.#format,
      names: { entries: this.entryNames() },
    };
    return {
      name: setup.name,
      modifier: this.#format.number(setup.statistic.total, numberStyle(this.kind)),
      situations: setup.conditional.map((line): RollToggleView => ({
        id: line.modifier.id,
        text: conditionalLineText(line, words),
        on: setup.chosen.has(line.modifier.id),
      })),
      remembered: setup.toggles.map(({ key, origin, on }): RollToggleView => ({
        id: key,
        text: words.names.entries.get(origin.entry) ?? origin.entry,
        on,
      })),
    };
  });

  protected chooseSituation({ id, on }: RollToggleChange): void {
    this.rolls.choose(RuleId.parse(id), on);
  }

  protected async flipToggle({ id, on }: RollToggleChange): Promise<void> {
    const slot = this.rolls.setup()?.toggles.find(({ key }) => key === id);
    if (slot !== undefined) {
      await this.rolls.toggle(slot, on);
    }
  }
}
