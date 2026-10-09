import { Sign, TermKind } from './expression';
import type { DamageTags, DiceExpression, Term } from './expression';
import { DiceExpressionText } from './units';

function formatTags(tags: DamageTags): DiceExpressionText {
  const names = [tags.category, tags.type].filter((name) => name !== undefined);
  return DiceExpressionText.parse(names.length === 0 ? '' : `[${names.join(',')}]`);
}

/** One term in canonical notation, without its sign: `2d6`, `4d6kh3`, `1d6[persistent,fire]`, `7`. */
export function formatTerm(term: Term): DiceExpressionText {
  const tags = formatTags(term.tags);
  if (term.kind === TermKind.Flat) {
    return DiceExpressionText.parse(`${term.value}${tags}`);
  }
  const keep = term.keep === undefined ? '' : `${term.keep.mode}${term.keep.count}`;
  return DiceExpressionText.parse(`${term.count}d${term.size}${keep}${tags}`);
}

/** Canonical notation for an expression; parsing it gives the same expression back. */
export function formatExpression(expression: DiceExpression): DiceExpressionText {
  const text = expression.terms
    .map((term, index) => {
      const sign = term.sign === Sign.Minus || index > 0 ? term.sign : '';
      return `${sign}${formatTerm(term)}`;
    })
    .join('');
  return DiceExpressionText.parse(text);
}
