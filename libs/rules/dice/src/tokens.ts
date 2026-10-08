import { message } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { KeepMode, Sign } from './expression';
import { DiceMessage } from './messages';
import { DiceSyntaxError } from './syntax-error';
import { TextPosition } from './units';
import type { DiceExpressionText } from './units';

/** A slice of expression text, kept so errors can quote what was found. */
export const Lexeme = z.string().brand<'Lexeme'>();
export type Lexeme = z.infer<typeof Lexeme>;

/** An unsigned whole number as written. Range checks happen where its meaning is known (count, size, flat). */
export const Numeral = z.number().int().nonnegative().brand<'Numeral'>();
export type Numeral = z.infer<typeof Numeral>;

export const TokenKind = {
  Number: 'number',
  Die: 'die',
  Keep: 'keep',
  Sign: 'sign',
  Tags: 'tags',
} as const;
export type TokenKind = ValueOf<typeof TokenKind>;

/** One name inside `[...]`, trimmed and lower-cased. */
export interface Tag {
  readonly name: Lexeme;
  readonly position: TextPosition;
}

interface TokenBase {
  readonly lexeme: Lexeme;
  readonly position: TextPosition;
}

export interface NumberToken extends TokenBase {
  readonly kind: typeof TokenKind.Number;
  readonly value: Numeral;
}
export interface DieToken extends TokenBase {
  readonly kind: typeof TokenKind.Die;
}
export interface KeepToken extends TokenBase {
  readonly kind: typeof TokenKind.Keep;
  readonly mode: KeepMode;
}
export interface SignToken extends TokenBase {
  readonly kind: typeof TokenKind.Sign;
  readonly sign: Sign;
}
export interface TagsToken extends TokenBase {
  readonly kind: typeof TokenKind.Tags;
  readonly tags: readonly Tag[];
}
export type Token = NumberToken | DieToken | KeepToken | SignToken | TagsToken;

/** Everything outside brackets, one alternative per token kind; leading whitespace is skipped. */
const TOKEN = /\s*(?:(?<digits>\d+)|(?<keep>k[hl])|(?<die>d)|(?<sign>[+-])|(?<tagList>\[[^\]]*\]))/iuy;
/** Whitespace, then either the end or the next character, which no token matched. */
const STRAY = /\s*(?<found>[\s\S]?)/uy;
const TAG_OPEN = Lexeme.parse('[');
const TAG_SEPARATOR = ',';
const KEEP_LOWEST = 'kl';

/** The position `characters.length` characters after `position`. */
const after = (position: TextPosition, characters: Lexeme): TextPosition =>
  TextPosition.parse(position + characters.length);

/** `[persistent, fire]` at `position` → its tags with their own positions. */
function tagsIn(bracketed: Lexeme, position: TextPosition): Tag[] {
  let next = after(position, TAG_OPEN);
  return bracketed
    .slice(1, -1)
    .split(TAG_SEPARATOR)
    .map((raw) => {
      const leading = Lexeme.parse(raw.slice(0, raw.length - raw.trimStart().length));
      const tag = { name: Lexeme.parse(raw.trim().toLowerCase()), position: after(next, leading) };
      next = after(next, Lexeme.parse(`${raw}${TAG_SEPARATOR}`));
      return tag;
    });
}

function tokenOf(match: RegExpExecArray, lexeme: Lexeme, position: TextPosition): Token {
  const { digits, keep, sign, tagList } = match.groups ?? {};
  if (digits !== undefined) {
    return { kind: TokenKind.Number, lexeme, position, value: Numeral.parse(Number(digits)) };
  }
  if (keep !== undefined) {
    const mode = keep.toLowerCase() === KEEP_LOWEST ? KeepMode.Lowest : KeepMode.Highest;
    return { kind: TokenKind.Keep, lexeme, position, mode };
  }
  if (sign !== undefined) {
    return { kind: TokenKind.Sign, lexeme, position, sign: sign === Sign.Minus ? Sign.Minus : Sign.Plus };
  }
  if (tagList !== undefined) {
    return { kind: TokenKind.Tags, lexeme, position, tags: tagsIn(lexeme, position) };
  }
  return { kind: TokenKind.Die, lexeme, position };
}

function tokenFrom(match: RegExpExecArray): Token {
  const [matched] = match;
  const lexeme = Lexeme.parse(matched.trimStart());
  // `match.index` is 0-based and includes the skipped whitespace.
  return tokenOf(match, lexeme, TextPosition.parse(match.index + matched.length - lexeme.length + 1));
}

/** Splits expression text into tokens, or throws a {@link DiceSyntaxError} at the first character that fits none. */
export function tokenize(text: DiceExpressionText): Token[] {
  const tokens: Token[] = [];
  // A failed sticky match resets `lastIndex` to 0, so track where the last token ended.
  let end = 0;
  TOKEN.lastIndex = end;
  for (let match = TOKEN.exec(text); match !== null; match = TOKEN.exec(text)) {
    tokens.push(tokenFrom(match));
    end = TOKEN.lastIndex;
  }
  STRAY.lastIndex = end;
  const found = STRAY.exec(text)?.groups?.['found'] ?? '';
  if (found !== '') {
    // `lastIndex` is just past the stray character: its 1-based position.
    const position = TextPosition.parse(STRAY.lastIndex);
    throw new DiceSyntaxError(message(DiceMessage.UnexpectedCharacter, { found, position }), position);
  }
  return tokens;
}
