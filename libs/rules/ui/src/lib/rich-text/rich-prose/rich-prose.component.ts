import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Heading, HeadingLevel, Text } from '@pioneer/frontier';
import { RichTextHeadingLevel } from '@pioneer/rules/sdk';
import type { HeadingNode, ParagraphNode } from '@pioneer/rules/sdk';

import { RichInline } from '../rich-inline/rich-inline.component';

/** A description's headings sit one level below the entry's own title. */
const OUTLINE_LEVEL: Readonly<Record<RichTextHeadingLevel, HeadingLevel>> = {
  [RichTextHeadingLevel.One]: HeadingLevel.Two,
  [RichTextHeadingLevel.Two]: HeadingLevel.Three,
  [RichTextHeadingLevel.Three]: HeadingLevel.Four,
};

/** A paragraph or a heading. */
@Component({
  selector: 'pio-rich-prose',
  imports: [Heading, RichInline, Text],
  templateUrl: './rich-prose.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichProse {
  public readonly block = input.required<ParagraphNode | HeadingNode>();

  protected readonly level = computed((): HeadingLevel | undefined => {
    const block = this.block();
    return block.type === 'heading' ? OUTLINE_LEVEL[block.level] : undefined;
  });
}
