import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

/** The stress elements `fr-text` renders through `fr-text-stress`. */
export const StressElement = {
  /** Stress emphasis that changes the meaning of the sentence. Italic. */
  Emphasis: 'em',
  /** Strong importance, such as the degree of success that opens a result line. Bold. */
  Strong: 'strong',
} as const;
export type StressElement = ValueOf<typeof StressElement>;

/** `fr-text`'s stress elements, styled by `fr-text`. Internal: features use `fr-text element="em|strong"`. */
@Component({
  selector: 'fr-text-stress',
  imports: [NgTemplateOutlet],
  templateUrl: './stress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TextStress {
  public readonly element = input.required<StressElement>();
  public readonly classes = input.required<string>();
}
