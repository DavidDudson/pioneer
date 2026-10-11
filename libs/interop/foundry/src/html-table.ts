import { BlockKind, InlineKind, InlineLabel } from '@pioneer/rules/sdk';
import type { BlockNode, InlineContent, TableNode } from '@pioneer/rules/sdk';
import { isTag } from 'domhandler';
import type { ChildNode, Element } from 'domhandler';

/** An HTML `<table>` as a rich text table, for `htmlToRichText`. */

/** What reading a table needs from the converter: a cell's inline content, and a place to report attributes. */
export interface TableContext {
  readonly inline: (nodes: readonly ChildNode[]) => InlineContent;
  readonly report: (element: Element) => void;
}

const LABEL_MAX = InlineLabel.maxLength ?? Number.POSITIVE_INFINITY;
const ROW: ReadonlySet<string> = new Set(['tr']);
const ROW_PARTS: ReadonlySet<string> = new Set(['tr', 'thead', 'tbody', 'tfoot']);
const CELLS: ReadonlySet<string> = new Set(['th', 'td']);
const CAPTION: ReadonlySet<string> = new Set(['caption']);
const HEAD = 'thead';
const HEADING_CELL = 'th';

interface Row {
  readonly cells: readonly InlineContent[];
  /** In `thead`, or every cell a `th`. */
  readonly heading: boolean;
}

interface Caption {
  readonly label?: InlineLabel;
  /** A caption too long for a label, kept as a paragraph before the table. */
  readonly paragraph?: BlockNode;
}

function childElements(element: Element, names: ReadonlySet<string>, context: TableContext): Element[] {
  const children = element.children.filter((child): child is Element => isTag(child) && names.has(child.name));
  for (const child of children) {
    context.report(child);
  }
  return children;
}

function rowOf(row: Element, group: string, context: TableContext): Row {
  const cells = childElements(row, CELLS, context);
  const allHeadings = cells.length > 0 && cells.every((cell) => cell.name === HEADING_CELL);
  return { cells: cells.map((cell) => context.inline(cell.children)), heading: group === HEAD || allHeadings };
}

/** Rows in document order, whether in a row group or directly in the table. */
function rowsOf(table: Element, context: TableContext): Row[] {
  return childElements(table, ROW_PARTS, context)
    .flatMap((part) =>
      ROW.has(part.name)
        ? [rowOf(part, '', context)]
        : childElements(part, ROW, context).map((row) => rowOf(row, part.name, context)),
    )
    .filter((row) => row.cells.length > 0);
}

function captionOf(table: Element, context: TableContext): Caption {
  const content = childElements(table, CAPTION, context).flatMap((caption) => context.inline(caption.children));
  const text = content
    .map((node) => (node.type === InlineKind.Text ? node.text : ' '))
    .join('')
    .trim();
  if (text === '') {
    return {};
  }
  return text.length <= LABEL_MAX
    ? { label: InlineLabel.parse(text) }
    : { paragraph: { type: BlockKind.Paragraph, content } };
}

/** The first row is the header when it is in `thead` or all `th` and rows follow it; a table with no cells is dropped. */
export function tableOf(table: Element, context: TableContext): BlockNode[] {
  const caption = captionOf(table, context);
  const rows = rowsOf(table, context);
  const before = caption.paragraph === undefined ? [] : [caption.paragraph];
  const [first, ...rest] = rows;
  if (first === undefined) {
    return before;
  }
  const hasHeader = first.heading && rest.length > 0;
  const node: TableNode = {
    type: BlockKind.Table,
    ...(caption.label === undefined ? {} : { caption: caption.label }),
    ...(hasHeader ? { header: first.cells } : {}),
    rows: (hasHeader ? rest : rows).map((row) => row.cells),
  };
  return [...before, node];
}
