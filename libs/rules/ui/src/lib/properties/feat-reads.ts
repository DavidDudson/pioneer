import { BlockKind, InlineKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentKind, InlineNode, RichText } from '@pioneer/rules/sdk';

import { ActionKind } from '../picker-cells/picker-cell-messages';

/** The words of rich text: its text, and each reference by its label or the name of the entry it names. */
export function richTextWords(text: RichText, nameOf: (id: ContentId) => string | undefined): string {
  const inline = (node: InlineNode): string => {
    if (node.type === InlineKind.Text) {
      return node.text;
    }

    return node.type === InlineKind.Ref ? (node.label ?? nameOf(node.id) ?? '') : '';
  };

  return text
    .map((block) => (block.type === BlockKind.Paragraph ? block.content.map((node) => inline(node)).join('') : ''))
    .join(' ')
    .trim();
}

/** A feat's cost: its action glyph, a variable one, or none for a passive feat. */
export function featActionKind(entry: ContentEntry & { readonly kind: typeof ContentKind.Feat }): ActionKind {
  const { cost, upTo } = entry.data.action ?? {};

  if (cost === undefined) {
    return ActionKind.Passive;
  }

  return upTo === undefined ? cost : ActionKind.Variable;
}
