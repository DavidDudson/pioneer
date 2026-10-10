import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Heading, HeadingLevel, Text } from '@pioneer/frontier';
import type { HeadingNode, ParagraphNode } from '@pioneer/rules/sdk';

import { RichInline } from '../rich-inline/rich-inline.component';

const DEEPEST = HeadingLevel.Four;

/** A paragraph or a heading. */
@Component({
  selector: 'pio-rich-prose',
  imports: [Heading, RichInline, Text],
  templateUrl: './rich-prose.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichProse {
  public readonly block = input.required<ParagraphNode | HeadingNode>();
  /** The outline level of the text's level-1 headings. */
  public readonly headingLevel = input.required<HeadingLevel>();

  protected readonly level = computed((): HeadingLevel | undefined => {
    const block = this.block();
    if (block.type !== 'heading') {
      return undefined;
    }
    const level = Math.min(this.headingLevel() + block.level - 1, DEEPEST);
    return Object.values(HeadingLevel).find((candidate) => candidate === level) ?? DEEPEST;
  });
}
