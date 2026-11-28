import type { Rule } from 'eslint';
import * as z from 'zod';

import { ELEVATION_MESSAGES, elevationProblem } from '../elevation.ts';
import { holdsClasses } from './class-slots.ts';

const FRONTIER = /(?:^|\/)libs\/frontier\//u;
const STRING = z.string();

/** What a literal node holds, or a template element's cooked text. */
type LiteralValue = string | number | bigint | boolean | RegExp | null | undefined;

/** These components paint their own fill, and specs and stories are not components. */
const ELEVATION_EXEMPT = /(?:^|\/)libs\/frontier\/src\/lib\/(?:controls|actions|text\/gem)\/|\.(?:spec|stories)\.ts$/u;

/** A frontier panel or overlay takes its surface from an elevation level, not a `bg-surface-*` class. */
export const elevationLevels: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Require frontier panels and overlays to declare an elevation level' },
    messages: ELEVATION_MESSAGES,
    schema: [],
  },
  create(context) {
    if (!FRONTIER.test(context.filename) || ELEVATION_EXEMPT.test(context.filename)) {
      return {};
    }

    const check = (node: Rule.Node, value: LiteralValue): void => {
      const text = STRING.safeParse(value);
      const problem = text.success ? elevationProblem(text.data) : undefined;

      if (problem !== undefined && holdsClasses(node)) {
        context.report({ node, messageId: problem.messageId, data: { variant: problem.variant } });
      }
    };

    return {
      Literal(node): void {
        check(node, node.value);
      },
      TemplateElement(node): void {
        check(node, node.value.cooked);
      },
    };
  },
};
