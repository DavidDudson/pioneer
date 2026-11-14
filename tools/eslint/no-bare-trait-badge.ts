/**
 * A trait is a `pio-trait-chip`, so it opens its card: a template may not render one as a bare `fr-badge` or
 * `fr-tag`. A template has no types, so a trait is recognised by what it is called: an interpolation or `[label]`
 * binding in the badge that reads `trait`, `traits`, `strike.traits` or anything ending in `Trait` or `Traits`.
 * Not flagged: a literal (`label="Trait"`), a filter option and a trait named inside a sentence, none of which are
 * a `Trait` bound to a badge. `libs/frontier` is exempt, as it knows no schemas.
 */
import type { Rule } from 'eslint';

const FRONTIER = /(?:^|\/)libs\/frontier\//u;
const BADGES = new Set(['fr-badge', 'fr-tag']);
/** What a badge shows: its interpolations and its `[label]` binding. */
const SHOWN = /\{\{(?<interpolation>[^}]*)\}\}|\[label\]="(?<label>[^"]*)"/gu;
const STRING_LITERAL = /'[^']*'/gu;
/** The identifiers and member paths of an expression: `ability.traits`, `trait`. */
const PATH = /[\w$.]+/gu;
/** What names a trait: `trait`, `traits`, or a name ending in `Trait` or `Traits` (`ownTrait`), never `portrait`. */
const TRAIT_NAME = /^(?:traits?|\w*Traits?)$/u;

interface ElementNode {
  readonly name?: unknown;
  readonly sourceSpan?: { readonly start: { readonly offset: number }; readonly end: { readonly offset: number } };
}

function readsTrait(source: string): boolean {
  return [...source.matchAll(SHOWN)].some(({ groups }) => {
    const shown = (groups?.['interpolation'] ?? groups?.['label'] ?? '').replaceAll(STRING_LITERAL, '');
    return (shown.match(PATH) ?? []).some((path) => TRAIT_NAME.test(path.split('.').at(-1) ?? ''));
  });
}

export const noBareTraitBadge: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Require pio-trait-chip instead of a bare badge for a trait' },
    messages: {
      bare: '`<{{name}}>` renders a trait as a bare badge. Use `<pio-trait-chip [trait]="…" />` so it opens the trait\'s card.',
    },
    schema: [],
  },
  create(context) {
    if (FRONTIER.test(context.filename)) {
      return {};
    }
    return {
      Element(node: unknown): void {
        const { name, sourceSpan } = node as ElementNode;
        if (typeof name !== 'string' || !BADGES.has(name) || sourceSpan === undefined) {
          return;
        }
        const source = context.sourceCode.text.slice(sourceSpan.start.offset, sourceSpan.end.offset);
        if (readsTrait(source)) {
          context.report({
            loc: context.sourceCode.getLocFromIndex(sourceSpan.start.offset),
            messageId: 'bare',
            data: { name },
          });
        }
      },
    };
  },
};
