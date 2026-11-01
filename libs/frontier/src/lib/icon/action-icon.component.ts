import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import { Glyph } from '../text/glyph/glyph.component';
import { Size } from '../tokens';
import type { Tone } from '../tokens';
import { ACTION_SHAPES, ActionShape } from './action-glyphs';
import { Icon } from './icon.component';

/** What an action costs, as the symbol shows it. */
export const ActionIconCost = { One: 'one', Two: 'two', Three: 'three', Free: 'free', Reaction: 'reaction' } as const;
export type ActionIconCost = ValueOf<typeof ActionIconCost>;

const COST_SHAPES: Readonly<Record<ActionIconCost, readonly ActionShape[]>> = {
  [ActionIconCost.One]: [ActionShape.Action],
  [ActionIconCost.Two]: [ActionShape.Action, ActionShape.Action],
  [ActionIconCost.Three]: [ActionShape.Action, ActionShape.Action, ActionShape.Action],
  [ActionIconCost.Free]: [ActionShape.Free],
  [ActionIconCost.Reaction]: [ActionShape.Reaction],
};

/**
 * The symbol for what an action costs: one, two or three diamonds, an open diamond for a free action, a turning arrow
 * for a reaction. `upTo` makes a range ("one to three actions") by drawing the cost, a rule, and the cost it runs to.
 * Read out as `label`, already translated; the drawing is hidden from screen readers.
 */
@Component({
  selector: 'fr-action-icon',
  imports: [Glyph, Icon],
  templateUrl: './action-icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center align-middle' },
})
export class ActionIcon {
  public readonly cost = input.required<ActionIconCost>();
  /** The most actions of a variable cost; drawn after a "to". */
  public readonly upTo = input<ActionIconCost | undefined>(undefined);
  public readonly label = input.required<string>();
  public readonly size = input<Size>(Size.Sm);
  public readonly tone = input<Tone | undefined>(undefined);

  protected readonly shapes = computed((): readonly (typeof ACTION_SHAPES)[ActionShape][] => {
    const end = this.upTo();
    const drawn =
      end === undefined ? COST_SHAPES[this.cost()] : [...COST_SHAPES[this.cost()], ActionShape.To, ...COST_SHAPES[end]];
    return drawn.map((shape) => ACTION_SHAPES[shape]);
  });
}
