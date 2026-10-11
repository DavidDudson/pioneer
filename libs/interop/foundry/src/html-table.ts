import { BlockKind, InlineKind, InlineLabel } from '@pioneer/rules/sdk';
import type { BlockNode, InlineContent, InlineNode, TableNode } from '@pioneer/rules/sdk';
import { isTag, isText } from 'domhandler';
import type { ChildNode, Element } from 'domhandler';

/** An HTML `<table>` as a rich text table, for `htmlToRichText`. */

/**
 * What reading a table needs from the converter: a cell's inline content, the blocks of content found where a table
 * has no place for it, and a place to report attributes.
 */
export interface TableContext {
  readonly inline: (nodes: readonly ChildNode[]) => InlineContent;
  readonly blocks: (nodes: readonly ChildNode[]) => BlockNode[];
  readonly report: (element: Element) => void;
}

/** A table being read, and what was found in it outside its captions, rows and cells. */
interface Reader extends TableContext {
  readonly strays: ChildNode[];
}

const LABEL_MAX = InlineLabel.maxLength ?? Number.POSITIVE_INFINITY;
const ROW: ReadonlySet<string> = new Set(['tr']);
const ROW_PARTS: ReadonlySet<string> = new Set(['tr', 'thead', 'tbody', 'tfoot']);
const CELLS: ReadonlySet<string> = new Set(['th', 'td']);
const CAPTION: ReadonlySet<string> = new Set(['caption']);
const TABLE_PARTS: ReadonlySet<string> = new Set([...ROW_PARTS, ...CAPTION]);
const CAPTION_BREAK: InlineContent = [{ type: InlineKind.LineBreak }];
const HEAD = 'thead';
const HEADING_CELL = 'th';

interface Row {
  readonly cells: readonly InlineContent[];
  /** In `thead`, or every cell a `th`. */
  readonly heading: boolean;
}

interface Caption {
  /** Every caption's text, a line each. */
  readonly content: InlineContent;
  readonly label?: InlineLabel;
  /** A caption too long for a label, kept as a paragraph before the table; several captions are one, a line each. */
  readonly paragraph?: BlockNode;
}

function childElements(element: Element, names: ReadonlySet<string>, context: TableContext): Element[] {
  const children = element.children.filter((child): child is Element => isTag(child) && names.has(child.name));
  for (const child of children) {
    context.report(child);
  }
  return children;
}

function isWhitespace(node: ChildNode): boolean {
  return isText(node) && node.data.trim() === '';
}

/** Keeps the children a table has no place for (text, `div`, `colgroup`), to be read as blocks after it. */
function collectStrays(element: Element, allowed: ReadonlySet<string>, reader: Reader): void {
  const strays = element.children.filter(
    (child) => !(isTag(child) && allowed.has(child.name)) && (isTag(child) || (isText(child) && !isWhitespace(child))),
  );
  reader.strays.push(...strays);
}

function rowOf(row: Element, group: string, context: Reader): Row {
  collectStrays(row, CELLS, context);
  const cells = childElements(row, CELLS, context);
  const allHeadings = cells.length > 0 && cells.every((cell) => cell.name === HEADING_CELL);
  return { cells: cells.map((cell) => context.inline(cell.children)), heading: group === HEAD || allHeadings };
}

/** Rows in document order, whether in a row group or directly in the table. */
function rowsOf(table: Element, context: Reader): Row[] {
  collectStrays(table, TABLE_PARTS, context);
  return childElements(table, ROW_PARTS, context)
    .flatMap((part) => {
      if (ROW.has(part.name)) {
        return [rowOf(part, '', context)];
      }
      collectStrays(part, ROW, context);
      return childElements(part, ROW, context).map((row) => rowOf(row, part.name, context));
    })
    .filter((row) => row.cells.length > 0);
}

function captionOf(table: Element, context: TableContext): Caption {
  const content: InlineNode[] = [];
  for (const caption of childElements(table, CAPTION, context)) {
    const line = context.inline(caption.children);
    content.push(...(content.length > 0 && line.length > 0 ? CAPTION_BREAK : []), ...line);
  }
  const text = content
    .map((node) => (node.type === InlineKind.Text ? node.text : ' '))
    .join('')
    .trim();
  if (text === '' && content.length === 0) {
    return { content };
  }
  // A label is plain text: a caption with a link, check or glyph keeps them as a paragraph instead.
  const isPlain = content.every((node) => node.type === InlineKind.Text || node.type === InlineKind.LineBreak);
  return isPlain && text.length <= LABEL_MAX
    ? { content, label: InlineLabel.parse(text) }
    : { content, paragraph: { type: BlockKind.Paragraph, content } };
}

/**
 * The first row is the header when it is in `thead` or all `th` and rows follow it; a table with no cells is dropped.
 * Content the table has no place for follows it, each piece a block of its own; a caption with no rows is a paragraph.
 */
export function tableOf(table: Element, context: TableContext): BlockNode[] {
  const reader: Reader = { ...context, strays: [] };
  const caption = captionOf(table, reader);
  const rows = rowsOf(table, reader);
  const before = caption.paragraph === undefined ? [] : [caption.paragraph];
  const after = reader.strays.flatMap((stray) => context.blocks([stray]));
  const [first, ...rest] = rows;
  if (first === undefined) {
    const captionOnly: BlockNode[] =
      caption.content.length === 0 ? [] : [{ type: BlockKind.Paragraph, content: caption.content }];
    return [...captionOnly, ...after];
  }
  const hasHeader = first.heading && rest.length > 0;
  const node: TableNode = {
    type: BlockKind.Table,
    ...(caption.label === undefined ? {} : { caption: caption.label }),
    ...(hasHeader ? { header: first.cells } : {}),
    rows: (hasHeader ? rest : rows).map((row) => row.cells),
  };
  return [...before, node, ...after];
}
