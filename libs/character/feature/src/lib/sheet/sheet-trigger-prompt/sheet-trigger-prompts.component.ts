import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ContentId } from '@pioneer/rules/sdk';

import { SheetTriggerPrompt } from './sheet-trigger-prompt.component';

/** The abilities one event fired for the player to decide, numbered so a new event starts a new prompt. */
export interface TriggerPrompt {
  readonly id: number;
  readonly abilities: ReadonlyArray<ContentId>;
}

/** The prompts a turn boundary raised, each with a state of its own so a decline lasts only for its event. */
@Component({
  selector: 'pio-sheet-trigger-prompts',
  imports: [SheetTriggerPrompt],
  templateUrl: './sheet-trigger-prompts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
})
export class SheetTriggerPrompts {
  public readonly prompts = input.required<ReadonlyArray<TriggerPrompt>>();
}
