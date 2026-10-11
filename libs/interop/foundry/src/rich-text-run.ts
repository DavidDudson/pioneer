import { BlockKind, InlineKind, RichTextString } from '@pioneer/rules/sdk';
import type { BlockNode, InlineContent, InlineNode, TextMark, TextNode } from '@pioneer/rules/sdk';

/**
 * Inline runs as `htmlToRichText` gathers them, before they are `InlineContent`: text may still be empty, only
 * whitespace, or longer than a `RichTextString`. `normalised` makes a run valid inline content.
 */

export type Marks = readonly TextMark[];

/** Text as HTML gave it, with the marks around it. */
interface Piece {
  readonly type: typeof InlineKind.Text;
  readonly text: string;
  readonly marks: Marks;
}

export type RunNode = Piece | Exclude<InlineNode, TextNode>;
export type Run = readonly RunNode[];

const TEXT_MAX = RichTextString.maxLength ?? Number.POSITIVE_INFINITY;
const SPACES = /\s+/gu;
const GRAPHEMES = new Intl.Segmenter();
const LINE_BREAK: RunNode = { type: InlineKind.LineBreak };

function isPiece(node: RunNode | undefined): node is Piece {
  return node?.type === InlineKind.Text;
}

function withText({ marks }: Piece, text: string): Piece {
  return { type: InlineKind.Text, text, marks };
}

function sameMarks(left: Piece, right: Piece): boolean {
  return left.marks.join(',') === right.marks.join(',');
}

/** Adjacent text with the same marks as one piece, its whitespace collapsed. */
function merged(run: Run): RunNode[] {
  const out: RunNode[] = [];
  for (const node of run) {
    const last = out.at(-1);
    if (isPiece(node) && isPiece(last) && sameMarks(last, node)) {
      out[out.length - 1] = withText(last, `${last.text}${node.text}`);
    } else {
      out.push(node);
    }
  }
  return out.map((node) => (isPiece(node) ? withText(node, node.text.replaceAll(SPACES, ' ')) : node));
}

/** At the start of a run or line, or after a space, a space adds nothing. */
function opensLine(node: RunNode | undefined): boolean {
  return node === undefined || node.type === InlineKind.LineBreak || (isPiece(node) && node.text.endsWith(' '));
}

/** Before a line break or at the end of a run, a space adds nothing. */
function closesLine(node: RunNode | undefined): boolean {
  return node === undefined || node.type === InlineKind.LineBreak;
}

function isEmpty(node: RunNode): boolean {
  return isPiece(node) && node.text === '';
}

/** Drops spaces at line edges and doubled ones, and the text that leaves empty. */
function trimmed(run: Run): RunNode[] {
  const starts: RunNode[] = [];
  for (const node of run) {
    const kept = isPiece(node) && opensLine(starts.at(-1)) ? withText(node, node.text.trimStart()) : node;
    if (!isEmpty(kept)) {
      starts.push(kept);
    }
  }
  const ends: RunNode[] = [];
  for (const node of starts.toReversed()) {
    const kept = isPiece(node) && closesLine(ends.at(-1)) ? withText(node, node.text.trimEnd()) : node;
    if (!isEmpty(kept)) {
      ends.push(kept);
    }
  }
  return ends.toReversed();
}

function withoutEdgeBreaks(run: Run): Run {
  const first = run.findIndex((node) => node.type !== InlineKind.LineBreak);
  const last = run.findLastIndex((node) => node.type !== InlineKind.LineBreak);
  return first === -1 ? [] : run.slice(first, last + 1);
}

/** Text cut into chunks no longer than a `RichTextString`, never inside a character. */
function chunks(text: string): string[] {
  const out = [''];
  for (const { segment } of GRAPHEMES.segment(text)) {
    const last = out.at(-1) ?? '';
    if (last.length + segment.length > TEXT_MAX) {
      out.push(segment);
    } else {
      out[out.length - 1] = `${last}${segment}`;
    }
  }
  return out;
}

/** A piece as text nodes, split where it is longer than a `RichTextString`. */
function textNodes({ text, marks }: Piece): TextNode[] {
  return chunks(text).map((chunk) => {
    const value = RichTextString.parse(chunk);
    return marks.length === 0 ? { type: InlineKind.Text, text: value } : { type: InlineKind.Text, text: value, marks };
  });
}

/** A run as inline content: whitespace collapsed and trimmed, empty text and edge line breaks dropped. */
export function normalised(run: Run): InlineContent {
  return withoutEdgeBreaks(trimmed(merged(run))).flatMap((node): InlineNode[] =>
    isPiece(node) ? textNodes(node) : [node],
  );
}

/** Inline content back as a run, to be joined and normalised again. */
function runOf(content: InlineContent): RunNode[] {
  return content.map((node): RunNode =>
    node.type === InlineKind.Text ? { type: InlineKind.Text, text: node.text, marks: node.marks ?? [] } : node,
  );
}

/** Runs one after another, each on its own line. */
export function joined(runs: readonly Run[]): RunNode[] {
  const out: RunNode[] = [];
  for (const run of runs.filter((each) => each.length > 0)) {
    if (out.length > 0) {
      out.push(LINE_BREAK);
    }
    out.push(...run);
  }
  return out;
}

/** A block flattened to one run, its parts on separate lines (a list inside a table cell). */
export function runOfBlock(block: BlockNode): RunNode[] {
  if (block.type === BlockKind.Paragraph || block.type === BlockKind.Heading) {
    return runOf(block.content);
  }
  if (block.type === BlockKind.List) {
    return joined(block.items.map((item) => joined(item.map((each) => runOfBlock(each)))));
  }
  if (block.type === BlockKind.Table) {
    return joined([...(block.header ?? []), ...block.rows.flat()].map((cell) => runOf(cell)));
  }
  return [];
}
