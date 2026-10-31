import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, DamageTone, Stack } from '@pioneer/frontier';
import { RollTotal } from '@pioneer/rules/dice';
import { expect, userEvent, within } from 'storybook/test';

import { DICE_ROLLER_FACTORY, threeDiceRoller } from './dice-roller';
import type { RollPresentation } from './roll-presentation';
import { RollPresenter } from './roll-presenter';
import { RollStage } from './roll-stage.component';

/** The damage tones, with the die faces and the total each demo roll lands on. */
const DEMO_ROLLS: readonly RollPresentation[] = [
  {
    id: 1,
    label: 'Fireball',
    total: RollTotal.parse(21),
    lines: [{ total: 21, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' }],
    groups: [{ notation: '6d6@3,4,3,4,3,4', tone: DamageTone.Fire }],
  },
  {
    id: 2,
    label: 'Longsword',
    total: RollTotal.parse(11),
    lines: [{ total: 11, tone: DamageTone.Physical, typeKey: 'roll.damageType.slashing' }],
    groups: [{ notation: '2d8@4,5', tone: DamageTone.Physical }],
  },
  {
    id: 3,
    label: 'Perception',
    total: RollTotal.parse(16),
    lines: [{ total: 16, tone: undefined, typeKey: undefined }],
    groups: [{ notation: '1d20@9', tone: undefined }],
  },
  {
    id: 4,
    label: 'Flaming sword',
    total: RollTotal.parse(12),
    lines: [
      { total: 6, tone: DamageTone.Physical, typeKey: 'roll.damageType.slashing' },
      { total: 6, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' },
    ],
    groups: [
      { notation: '1d8@6', tone: DamageTone.Physical },
      { notation: '1d6@6', tone: DamageTone.Fire },
    ],
  },
];

/** Buttons that roll the demo rolls, with the stage they play on. */
@Component({
  selector: 'pio-roll-stage-demo',
  imports: [Button, RollStage, Stack],
  templateUrl: './roll-stage-demo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class RollStageDemo {
  readonly #presenter = inject(RollPresenter);
  protected readonly rolls = DEMO_ROLLS;

  protected present(roll: RollPresentation): void {
    this.#presenter.present(roll);
  }
}

type RollStageStory = StoryObj<RollStageDemo>;

const meta: Meta<RollStageDemo> = {
  title: 'Play/Roll stage',
  component: RollStageDemo,
  decorators: [moduleMetadata({ providers: [{ provide: DICE_ROLLER_FACTORY, useValue: threeDiceRoller }] })],
};
export default meta;

/** Press a button: the dice roll across the whole canvas, then the toast appears bottom centre. */
export const Rolls: RollStageStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Fireball' }));
    await expect(await canvas.findByText('21', undefined, { timeout: 15_000 })).toBeVisible();
    await expect(canvas.getByText('Fireball', { selector: 'span' })).toBeVisible();
  },
};
