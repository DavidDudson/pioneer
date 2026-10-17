import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, Stack, Text } from '@pioneer/frontier';
import { SpellPicker, TRADITION_MESSAGES } from '@pioneer/rules/ui';

import type { RestPreparedEntry } from '../sheet-rest-prepared';

/** A spell staged for a slot, or the stage cleared when `spell` is undefined. */
export interface StagedSpell {
  readonly slot: string;
  readonly spell: string | undefined;
}

/**
 * The prepared entries' ranks daily preparations can change (#580): a Change per rank opens a picker per slot of it,
 * and a spell picked is staged for the preview, not saved, until daily preparations is confirmed.
 */
@Component({
  selector: 'pio-sheet-rest-prepared',
  imports: [Button, SpellPicker, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-rest-prepared.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRestPrepared {
  public readonly entries = input.required<readonly RestPreparedEntry[]>();
  /** The spells staged so far, by slot. */
  public readonly staged = input.required<Readonly<Record<string, string>>>();
  public readonly disabled = input(false);
  public readonly picked = output<StagedSpell>();

  protected readonly traditions = TRADITION_MESSAGES;

  /** The rank whose slots are open to pick in. */
  protected readonly open = signal<string | undefined>(undefined);

  protected readonly toggle = (rank: string): void => {
    this.open.update((open) => (open === rank ? undefined : rank));
  };
}
