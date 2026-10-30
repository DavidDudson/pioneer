import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState, List, ListItem, Skeleton } from '@pioneer/frontier';
import type { SlotKey } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { ChoiceLine } from './choice-line';
import { ChoiceRow } from './choice-row/choice-row.component';
import { ChoicesMessage } from './choices-messages';

const LOADING_ROWS = 3;

/** A choice the viewer kept or let go of. */
export interface ChoiceLockChange {
  readonly slot: SlotKey;
  readonly locked: boolean;
}

/**
 * Every choice a character has, each with what is picked and a badge for its state, so a planned or broken choice
 * shows instead of vanishing. An invalid choice carries its reason beneath it.
 *
 * Presentational (ADR-0028): the caller turns the character's slots into lines, or passes undefined while they load.
 * Pickers are the builder's (#27). With `lockable`, each chosen choice gets a toggle that keeps it while the rest are
 * re-rolled; the caller holds which are kept.
 *
 * ```html
 * <pio-choices [lines]="choiceLines()" lockable [locked]="kept()" (lockChange)="keep($event)" />
 * ```
 */
@Component({
  selector: 'pio-choices',
  imports: [ChoiceRow, EmptyState, List, ListItem, Skeleton, TranslocoPipe],
  templateUrl: './choices.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoicesView {
  /** The choices in sheet order, or undefined while they load. */
  public readonly lines = input<readonly ChoiceLine[] | undefined>();
  /** Whether chosen choices offer the keep toggle. */
  public readonly lockable = input(false, { transform: booleanAttribute });
  /** The slots that are kept. */
  public readonly locked = input<ReadonlySet<SlotKey>>(new Set());
  /** Why a choice could not be kept, by slot; each shows beneath its choice. */
  public readonly problems = input<ReadonlyMap<SlotKey, MessageDescriptor>>(new Map());
  /** A keep toggle was pressed. */
  public readonly lockChange = output<ChoiceLockChange>();

  protected readonly Message = ChoicesMessage;
  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);
}
