import { BlockKind, InlineKind, RichTextString } from '@pioneer/rules/sdk';
import type { BlockNode, InlineNode, RichText } from '@pioneer/rules/sdk';

const PARAGRAPH_BREAK = /\n{2,}/u;
const LINE_BREAK = '\n';
const BREAK: readonly InlineNode[] = [{ type: InlineKind.LineBreak }];

/** A paragraph's lines as inline nodes, a line break between each and nothing for an empty line. */
function paragraphContent(paragraph: string): readonly InlineNode[] {
  const lines = paragraph
    .split(LINE_BREAK)
    .map((line): readonly InlineNode[] =>
      line === '' ? [] : [{ type: InlineKind.Text, text: RichTextString.parse(line) }],
    );
  return lines.flatMap((line, index) => (index === 0 ? [line] : [BREAK, line])).flat();
}

/**
 * The rich text of the plain text a prose field is edited as: a paragraph per blank-line-separated run, a line break
 * per newline. Empty text is no paragraphs, which clears the field.
 */
export function proseToRichText(prose: string): RichText {
  const normalised = prose.replaceAll('\r\n', LINE_BREAK).trim();
  if (normalised === '') {
    return [];
  }
  return normalised
    .split(PARAGRAPH_BREAK)
    .map((paragraph): BlockNode => ({ type: BlockKind.Paragraph, content: paragraphContent(paragraph) }));
}

/** One inline node as the plain text it edits as: its text, a newline for a break, and nothing for the rest. */
function inlineText(node: InlineNode): string {
  if (node.type === InlineKind.Text) {
    return node.text;
  }
  return node.type === InlineKind.LineBreak ? LINE_BREAK : '';
}

/** One block as plain text; only paragraphs and headings carry text a prose field edits. */
function blockText(block: BlockNode): string {
  return block.type === BlockKind.Paragraph || block.type === BlockKind.Heading
    ? block.content.map((node) => inlineText(node)).join('')
    : '';
}

/** The plain text a prose field's rich text is edited as: the inverse of `proseToRichText` for what that makes. */
export function richTextToProse(text: RichText): string {
  return text
    .map((block) => blockText(block))
    .filter((paragraph) => paragraph !== '')
    .join(`${LINE_BREAK}${LINE_BREAK}`);
}
