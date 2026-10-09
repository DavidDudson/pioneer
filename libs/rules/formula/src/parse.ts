import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { BinaryOperator, NodeKind } from './ast';
import type { FormulaNode } from './ast';
import { ARITY, ArgumentCount, FormulaFunctionSchema } from './functions';
import type { FormulaFunction } from './functions';
import { FormulaMessage } from './messages';
import { FormulaSyntaxError } from './syntax-error';
import { TokenKind, tokenize } from './tokens';
import type { NameToken, Token } from './tokens';
import {
  FORMULA_LENGTH_MAX,
  FORMULA_NUMBER_MAX,
  FormulaNumber,
  NESTING_DEPTH_MAX,
  NODE_COUNT_MAX,
  NodeCount,
  ReferencePath,
  TextPosition,
} from './units';
import type { FormulaText } from './units';

export interface ParseSuccess {
  readonly ok: true;
  readonly formula: FormulaNode;
}

/** What is wrong, as a message descriptor, and where (1-based) in the text. */
export interface ParseFailure {
  readonly ok: false;
  readonly error: MessageDescriptor;
  readonly position: TextPosition;
}

export type ParseOutcome = ParseSuccess | ParseFailure;

const FIRST = TextPosition.parse(1);
const REFERENCE_SIGIL = '@';

function fail(descriptor: MessageDescriptor, position: TextPosition): never {
  throw new FormulaSyntaxError(descriptor, position);
}

function unexpected(token: Token): never {
  return fail(
    message(FormulaMessage.UnexpectedToken, { found: token.lexeme, position: token.position }),
    token.position,
  );
}

/**
 * Recursive descent over the tokens, front to back. Tracks nesting depth and node count so a formula
 * stays inside the limits however it is written.
 */
class Parser {
  readonly #tokens: readonly Token[];
  #next = 0;
  #depth = NodeCount.parse(0);
  #nodes = NodeCount.parse(0);

  public constructor(tokens: readonly Token[]) {
    this.#tokens = tokens;
  }

  public formula(): FormulaNode {
    const formula = this.#sum();
    const extra = this.#peek();
    return extra === undefined ? formula : unexpected(extra);
  }

  #peek(): Token | undefined {
    return this.#tokens[this.#next];
  }

  #take(): Token {
    const current = this.#tokens[this.#next];
    if (current === undefined) {
      return fail(message(FormulaMessage.UnexpectedEnd), this.#end());
    }
    this.#next += 1;
    return current;
  }

  #expect(kind: TokenKind): Token {
    const token = this.#take();
    return token.kind === kind ? token : unexpected(token);
  }

  #end(): TextPosition {
    const last = this.#tokens.at(-1);
    return last === undefined ? FIRST : TextPosition.parse(last.position + last.lexeme.length);
  }

  /** Counts a node at `position`, failing once the formula has more than the limit. */
  #node<TNode extends FormulaNode>(node: TNode): TNode {
    this.#nodes = NodeCount.parse(this.#nodes + 1);
    if (this.#nodes > NODE_COUNT_MAX) {
      return fail(message(FormulaMessage.TooManyNodes, { maximum: NODE_COUNT_MAX }), node.position);
    }
    return node;
  }

  /** Runs `read` one level deeper (a group, a call's arguments, a negation), failing past the limit. */
  #nested(position: TextPosition, read: () => FormulaNode): FormulaNode {
    this.#depth = NodeCount.parse(this.#depth + 1);
    if (this.#depth > NESTING_DEPTH_MAX) {
      return fail(message(FormulaMessage.TooDeep, { maximum: NESTING_DEPTH_MAX, position }), position);
    }
    const node = read();
    this.#depth = NodeCount.parse(this.#depth - 1);
    return node;
  }

  /** A sum one level deeper: inside a group or a call's arguments. */
  #expression(position: TextPosition): FormulaNode {
    return this.#nested(position, () => this.#sum());
  }

  /** `term (('+' | '-') term)*`, left-associative. */
  #sum(): FormulaNode {
    let left = this.#term();
    for (let next = this.#peek(); next?.kind === TokenKind.Operator; next = this.#peek()) {
      if (next.operator !== BinaryOperator.Add && next.operator !== BinaryOperator.Subtract) {
        break;
      }
      this.#take();
      const right = this.#term();
      left = this.#node({ kind: NodeKind.Binary, operator: next.operator, left, right, position: next.position });
    }
    return left;
  }

  /** `unary (('*' | '/') unary)*`, left-associative. */
  #term(): FormulaNode {
    let left = this.#unary();
    for (let next = this.#peek(); next?.kind === TokenKind.Operator; next = this.#peek()) {
      if (next.operator !== BinaryOperator.Multiply && next.operator !== BinaryOperator.Divide) {
        break;
      }
      this.#take();
      const right = this.#unary();
      left = this.#node({ kind: NodeKind.Binary, operator: next.operator, left, right, position: next.position });
    }
    return left;
  }

  /** `'-' unary | primary`. */
  #unary(): FormulaNode {
    const next = this.#peek();
    if (next?.kind !== TokenKind.Operator || next.operator !== BinaryOperator.Subtract) {
      return this.#primary();
    }
    this.#take();
    const { position } = next;
    const operand = this.#nested(position, () => this.#unary());
    return this.#node({ kind: NodeKind.Negate, operand, position });
  }

  /** A number, a reference, a call or a parenthesised expression. */
  #primary(): FormulaNode {
    const token = this.#take();
    const { position } = token;
    switch (token.kind) {
      case TokenKind.Number: {
        return this.#node({ kind: NodeKind.Number, value: numberOf(token), position });
      }
      case TokenKind.Reference: {
        return this.#node({ kind: NodeKind.Reference, path: referenceOf(token), position });
      }
      case TokenKind.Name: {
        return this.#call(token);
      }
      case TokenKind.Open: {
        const inner = this.#expression(position);
        this.#expect(TokenKind.Close);
        return inner;
      }
      case TokenKind.Operator:
      case TokenKind.Close:
      case TokenKind.Comma: {
        return unexpected(token);
      }
      default: {
        const unreachable: never = token;
        throw new TypeError(`Unhandled formula token: ${JSON.stringify(unreachable)}`);
      }
    }
  }

  /** `name '(' (expression (',' expression)*)? ')'`, with the argument count checked against the function. */
  #call(token: NameToken): FormulaNode {
    const name = functionOf(token);
    const open = this.#peek();
    const { position } = token;
    if (open?.kind !== TokenKind.Open) {
      return fail(message(FormulaMessage.NotCalled, { found: token.lexeme, position }), position);
    }
    this.#take();
    const args = this.#arguments(position);
    checkArity(name, ArgumentCount.parse(args.length), position);
    return this.#node({ kind: NodeKind.Call, name, args, position });
  }

  /** After a call's `(`: its arguments up to and including the `)`. */
  #arguments(position: TextPosition): FormulaNode[] {
    if (this.#peek()?.kind === TokenKind.Close) {
      this.#take();
      return [];
    }
    const args = [this.#expression(position)];
    for (let next = this.#take(); next.kind !== TokenKind.Close; next = this.#take()) {
      if (next.kind !== TokenKind.Comma) {
        return unexpected(next);
      }
      args.push(this.#expression(position));
    }
    return args;
  }
}

function numberOf(token: Token): FormulaNumber {
  const value = FormulaNumber.safeParse(Number(token.lexeme));
  const { position } = token;
  return value.success
    ? value.data
    : fail(message(FormulaMessage.NumberTooLarge, { maximum: FORMULA_NUMBER_MAX, position }), position);
}

function referenceOf(token: Token): ReferencePath {
  const path = ReferencePath.safeParse(token.lexeme.slice(REFERENCE_SIGIL.length));
  const { position } = token;
  return path.success
    ? path.data
    : fail(message(FormulaMessage.InvalidReference, { found: token.lexeme, position }), position);
}

function functionOf(token: NameToken): FormulaFunction {
  const name = FormulaFunctionSchema.safeParse(token.lexeme);
  const { position } = token;
  return name.success
    ? name.data
    : fail(message(FormulaMessage.UnknownFunction, { found: token.lexeme, position }), position);
}

function checkArity(name: FormulaFunction, given: ArgumentCount, position: TextPosition): void {
  const { min, max } = ARITY[name];
  if (max === undefined && given < min) {
    fail(message(FormulaMessage.ArgumentCountAtLeast, { name, minimum: min, given, position }), position);
  }
  if (max !== undefined && (given < min || given > max)) {
    fail(message(FormulaMessage.ArgumentCount, { name, expected: max, given, position }), position);
  }
}

/**
 * Parses a formula: whole numbers, `+ - * /`, unary minus, parentheses, `@` references and calls to the
 * functions in {@link FormulaFunction}, such as `max(1, floor(@actor.level / 2))`. Never throws: any
 * mistake is a failed outcome whose error is a message descriptor (ADR-0009).
 */
export function parseFormula(text: FormulaText): ParseOutcome {
  if (text.trim() === '') {
    return { ok: false, error: message(FormulaMessage.Empty), position: FIRST };
  }
  if (text.length > FORMULA_LENGTH_MAX) {
    const position = TextPosition.parse(FORMULA_LENGTH_MAX + 1);
    return { ok: false, error: message(FormulaMessage.TooLong, { maximum: FORMULA_LENGTH_MAX }), position };
  }
  try {
    return { ok: true, formula: new Parser(tokenize(text)).formula() };
  } catch (error) {
    if (error instanceof FormulaSyntaxError) {
      return { ok: false, error: error.descriptor, position: error.position };
    }
    throw error;
  }
}
