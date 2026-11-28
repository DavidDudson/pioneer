import { parse } from '@messageformat/parser';
import type { SelectCase, Token } from '@messageformat/parser';

/** Latin letters, and the accented look-alike at the same position in {@link ACCENTED}, so text stays readable and anything left plain stands out. */
const PLAIN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ACCENTED = 'áƀçðéƒĝĥíĵķĺḿñóþɋŕšţúṽŵẋýžÁƁÇÐÉƑĜĤÍĴĶĹḾÑÓÞɊŔŠŢÚṼŴẊÝŽ';

/** How much longer than its source a pseudo-localised text is: long enough to break a layout sized for English. */
const GROWTH = 0.4;

/** Marks the added length, so it is plain which characters the transform invented. */
const FILLER = '~';

function accent(text: string): string {
  return text.replaceAll(/[A-Za-z]/gu, (letter) => ACCENTED.charAt(PLAIN.indexOf(letter)));
}

function grow(text: string): string {
  const padding = text.trim() === '' ? 0 : Math.ceil(text.length * GROWTH);

  return `${accent(text)}${FILLER.repeat(padding)}`;
}

/** Quotes what ICU would otherwise read as syntax: `'`, braces and, inside a plural arm, `#`. */
function escapeContent(text: string, inPlural: boolean): string {
  const escaped = text.replaceAll("'", "''").replaceAll('{', "'{'").replaceAll('}', "'}'");

  return inPlural ? escaped.replaceAll('#', "'#'") : escaped;
}

function serialiseArm(arm: SelectCase, inPlural: boolean, transform: boolean): string {
  return ` ${arm.key} {${serialise(arm.tokens, inPlural, transform)}}`;
}

function serialiseToken(token: Token, inPlural: boolean, transform: boolean): string {
  if (token.type === 'content') {
    return escapeContent(transform ? grow(token.value) : token.value, inPlural);
  }

  if (token.type === 'argument') {
    return `{${token.arg}}`;
  }

  if (token.type === 'octothorpe') {
    return '#';
  }

  if (token.type === 'function') {
    const param = token.param === undefined ? '' : `, ${serialise(token.param, inPlural, false)}`;

    return `{${token.arg}, ${token.key}${param}}`;
  }

  const offset = token.pluralOffset === undefined || token.pluralOffset === 0 ? '' : ` offset:${token.pluralOffset}`;
  const arms = token.cases.map((arm) => serialiseArm(arm, token.type !== 'select', transform)).join('');

  return `{${token.arg}, ${token.type},${offset}${arms}}`;
}

function serialise(tokens: ReadonlyArray<Token>, inPlural: boolean, transform: boolean): string {
  return tokens.map((token) => serialiseToken(token, inPlural, transform)).join('');
}

/**
 * A message with its text accented and about 40% longer and its ICU syntax untouched, so every argument, plural and
 * select still works. Development only: text that stays plain was never routed through a message, and a layout that
 * breaks on the longer text will break on German.
 */
export function pseudoLocalise(message: string): string {
  return serialise(parse(message), false, true);
}

/** A catalog: messages, or groups of them. */
export interface Messages {
  readonly [key: string]: Messages | string;
}

function isGroup(value: Messages | string): value is Messages {
  return value instanceof Object;
}

/** Every message of a catalog pseudo-localised, its nesting kept. */
export function pseudoLocaliseTree(tree: Messages): Messages {
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]): [string, Messages | string] => [
      key,
      isGroup(value) ? pseudoLocaliseTree(value) : pseudoLocalise(value),
    ]),
  );
}
