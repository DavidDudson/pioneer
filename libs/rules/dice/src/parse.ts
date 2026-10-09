import { DamageTypeSchema } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { DamageCategorySchema, KeepMode, Sign, TermKind } from './expression';
import type { DamageTags, DiceExpression, Keep, Term } from './expression';
import { DiceMessage } from './messages';
import { DiceSyntaxError } from './syntax-error';
import { TokenKind, tokenize } from './tokens';
import type { Numeral, NumberToken, Tag, Token } from './tokens';
import {
  DICE_COUNT_MAX,
  DICE_COUNT_MIN,
  DiceCount,
  DIE_SIZE_MAX,
  DIE_SIZE_MIN,
  DieSize,
  EXPRESSION_LENGTH_MAX,
  FLAT_VALUE_MAX,
  FlatValue,
  TERM_COUNT_MAX,
  TextPosition,
} from './units';
import type { DiceExpressionText } from './units';

export interface ParseSuccess {
  readonly ok: true;
  readonly expression: DiceExpression;
}

/** What is wrong, as a message descriptor, and where (1-based) in the text. */
export interface ParseFailure {
  readonly ok: false;
  readonly error: MessageDescriptor;
  readonly position: TextPosition;
}

export type ParseOutcome = ParseSuccess | ParseFailure;

const FIRST = TextPosition.parse(1);

function fail(descriptor: MessageDescriptor, position: TextPosition): never {
  throw new DiceSyntaxError(descriptor, position);
}

/** Tokens read front to back. Running out where something is required is "ends too early". */
class TokenStream {
  readonly #tokens: readonly Token[];
  #next = 0;

  public constructor(tokens: readonly Token[]) {
    this.#tokens = tokens;
  }

  public peek(): Token | undefined {
    return this.#tokens[this.#next];
  }

  public take(): Token {
    const current = this.#tokens[this.#next];
    if (current === undefined) {
      return fail(message(DiceMessage.UnexpectedEnd), this.#end());
    }
    this.#next += 1;
    return current;
  }

  public takeNumber(): NumberToken {
    const token = this.take();
    return token.kind === TokenKind.Number ? token : unexpected(token);
  }

  #end(): TextPosition {
    const last = this.#tokens.at(-1);
    return last === undefined ? FIRST : TextPosition.parse(last.position + last.lexeme.length);
  }
}

function unexpected(token: Token): never {
  return fail(message(DiceMessage.UnexpectedToken, { found: token.lexeme, position: token.position }), token.position);
}

function diceCount(value: Numeral, position: TextPosition): DiceCount {
  const count = DiceCount.safeParse(value);
  return count.success
    ? count.data
    : fail(message(DiceMessage.DiceCount, { minimum: DICE_COUNT_MIN, maximum: DICE_COUNT_MAX, position }), position);
}

function dieSize(token: NumberToken): DieSize {
  const size = DieSize.safeParse(token.value);
  const { position } = token;
  return size.success
    ? size.data
    : fail(message(DiceMessage.DieSize, { minimum: DIE_SIZE_MIN, maximum: DIE_SIZE_MAX, position }), position);
}

function flatValue(token: NumberToken): FlatValue {
  const value = FlatValue.safeParse(token.value);
  const { position } = token;
  return value.success
    ? value.data
    : fail(message(DiceMessage.FlatValue, { maximum: FLAT_VALUE_MAX, position }), position);
}

/** `kh` / `kl` with an optional count (default 1), which may not exceed the dice rolled. */
function keep(stream: TokenStream, count: DiceCount): Keep | undefined {
  const token = stream.peek();
  if (token?.kind !== TokenKind.Keep) {
    return undefined;
  }
  stream.take();
  const amount = stream.peek();
  const kept = amount?.kind === TokenKind.Number ? stream.takeNumber() : undefined;
  const keepCount = kept === undefined ? DiceCount.parse(DICE_COUNT_MIN) : diceCount(kept.value, kept.position);
  if (keepCount > count) {
    const position = kept?.position ?? token.position;
    return fail(message(DiceMessage.KeepCount, { keep: keepCount, count, position }), position);
  }
  return { mode: token.mode === KeepMode.Lowest ? KeepMode.Lowest : KeepMode.Highest, count: keepCount };
}

function addTag(tags: DamageTags, tag: Tag): DamageTags {
  const type = DamageTypeSchema.safeParse(tag.name);
  const category = DamageCategorySchema.safeParse(tag.name);
  const conflict = (type.success && tags.type !== undefined) || (category.success && tags.category !== undefined);
  const { position } = tag;
  if (conflict) {
    return fail(message(DiceMessage.ConflictingTag, { found: tag.name, position }), position);
  }
  if (type.success) {
    return { ...tags, type: type.data };
  }
  if (category.success) {
    return { ...tags, category: category.data };
  }
  return fail(message(DiceMessage.UnknownTag, { found: tag.name, position }), position);
}

function readTags(stream: TokenStream): DamageTags {
  const next = stream.peek();
  if (next?.kind !== TokenKind.Tags) {
    return {};
  }
  stream.take();
  let tags: DamageTags = {};
  for (const tag of next.tags) {
    tags = addTag(tags, tag);
  }
  return tags;
}

/** The rest of a dice term after its count and `d`: size, then optional keep and tags. */
function diceTerm(stream: TokenStream, sign: Sign, count: DiceCount): Term {
  const size = dieSize(stream.takeNumber());
  const kept = keep(stream, count);
  const tags = readTags(stream);
  return kept === undefined
    ? { kind: TermKind.Dice, sign, count, size, tags }
    : { kind: TermKind.Dice, sign, count, size, keep: kept, tags };
}

/** Dice (`2d6`, or `d6` for one die) or a flat number, with optional keep and tags. */
function term(stream: TokenStream, sign: Sign): Term {
  const first = stream.take();
  if (first.kind === TokenKind.Die) {
    return diceTerm(stream, sign, DiceCount.parse(DICE_COUNT_MIN));
  }
  if (first.kind !== TokenKind.Number) {
    return unexpected(first);
  }
  if (stream.peek()?.kind !== TokenKind.Die) {
    return { kind: TermKind.Flat, sign, value: flatValue(first), tags: readTags(stream) };
  }
  stream.take();
  return diceTerm(stream, sign, diceCount(first.value, first.position));
}

function signOf(token: Token): Sign {
  return token.kind === TokenKind.Sign ? token.sign : unexpected(token);
}

function expression(stream: TokenStream): DiceExpression {
  const leading = stream.peek();
  const terms = [term(stream, leading?.kind === TokenKind.Sign ? signOf(stream.take()) : Sign.Plus)];
  for (let next = stream.peek(); next !== undefined; next = stream.peek()) {
    const sign = signOf(stream.take());
    if (terms.length === TERM_COUNT_MAX) {
      return fail(message(DiceMessage.TooManyTerms, { maximum: TERM_COUNT_MAX }), next.position);
    }
    terms.push(term(stream, sign));
  }
  return { terms };
}

/**
 * Parses PF2e dice notation: `1d20+7`, `2d6+1d4[fire]+4`, `4d6kh3`, `1d6[persistent,bleed]`.
 * Tags in brackets belong to the term just before them. Never throws: any mistake is a failed outcome
 * whose error is a message descriptor (ADR-0009).
 */
export function parseDiceExpression(text: DiceExpressionText): ParseOutcome {
  if (text.trim() === '') {
    return { ok: false, error: message(DiceMessage.Empty), position: FIRST };
  }
  if (text.length > EXPRESSION_LENGTH_MAX) {
    const position = TextPosition.parse(EXPRESSION_LENGTH_MAX + 1);
    return { ok: false, error: message(DiceMessage.TooLong, { maximum: EXPRESSION_LENGTH_MAX }), position };
  }
  try {
    return { ok: true, expression: expression(new TokenStream(tokenize(text))) };
  } catch (error) {
    if (error instanceof DiceSyntaxError) {
      return { ok: false, error: error.descriptor, position: error.position };
    }
    throw error;
  }
}
