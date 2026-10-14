import { RuleElementKey } from '@pioneer/rules/sdk';

import { expandLocalize } from './foundry-lang';
import type { LangValues } from './foundry-lang';
import type { FoundryLang } from './foundry-release';
import { htmlToRichText } from './html-rich-text';

/**
 * Foundry's `Note` in Pioneer's spelling (ADR-0008): `selector` is `selectors` (`translate-modifiers.ts`), a title of
 * `{item|name}` is the name of the item, and `text` is rich text, read as a description is: HTML, or plain text as a
 * paragraph, with `@Localize` inlined. What this cannot carry over (a title or text read from the item, `{item|description}`,
 * a selector built from the item's id, and text that holds no words) is left as it is, so the element fails and is
 * kept for the backlog.
 */

const ITEM_NAME = '{item|name}';
const ITEM_REFERENCE = '{item|';

/** What a note's text and title are read against. */
export interface NoteContext {
  readonly lang: FoundryLang;
  readonly values: LangValues;
}

/** `text` as HTML: plain text is a paragraph. */
function asHtml(text: string): string {
  return text.trimStart().startsWith('<') ? text : `<p>${text}</p>`;
}

/** A note's `text` as rich text; text that reads the item, or holds no words, as it is. */
function richTextOf(text: unknown, { lang, values }: NoteContext): unknown {
  if (typeof text !== 'string' || text.includes(ITEM_REFERENCE)) {
    return text;
  }
  const expanded = expandLocalize(asHtml(text), lang, values);
  const { richText } = htmlToRichText(expanded.text);
  return expanded.unresolved.length > 0 || richText.length === 0 ? text : richText;
}

/** A `Note` with `text` rich text and its title's `{item|name}` the item's name; any other element as it is. */
export function withNoteText(raw: unknown, context: NoteContext): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.Note) {
    return raw;
  }
  const title = 'title' in raw && raw.title === ITEM_NAME ? { title: context.values.item } : {};
  const text = 'text' in raw ? { text: richTextOf(raw.text, context) } : {};
  return { ...raw, ...title, ...text };
}
