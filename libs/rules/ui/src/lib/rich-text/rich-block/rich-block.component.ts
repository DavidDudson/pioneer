import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Divider, HeadingLevel, Skeleton } from '@pioneer/frontier';
import type { HeadingNode, ParagraphNode, RuleNode, TableNode } from '@pioneer/rules/sdk';

import { RichProse } from '../rich-prose/rich-prose.component';
import { RichTable } from '../rich-table/rich-table.component';

/** Any block but a list: lists hold rich text, so `pio-rich-text` renders them itself. */
export type LeafBlock = ParagraphNode | HeadingNode | TableNode | RuleNode;

/**
 * One block that holds no further blocks: a paragraph, heading, table or thematic break. Tables load on demand,
 * so text without one never pays for the table library.
 */
@Component({
  selector: 'pio-rich-block',
  imports: [Divider, RichProse, RichTable, Skeleton],
  templateUrl: './rich-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichBlock {
  public readonly block = input.required<LeafBlock>();
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Two);
}
