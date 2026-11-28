import { describe, it } from 'bun:test';

import angular from 'angular-eslint';
import { RuleTester } from 'eslint';

import { numericFigures } from './numeric-figures';

RuleTester.describe = describe;

RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser: angular.templateParser } });

const FEATURE = 'libs/rules/ui/src/lib/inventory/investments/investments.component.html';

tester.run('numeric-figures', numericFigures, {
  valid: [
    { filename: FEATURE, code: `<fr-text numeric>{{ count() }}</fr-text>` },
    { filename: FEATURE, code: `<fr-text variant="caption" [numeric]="aligned()">{{ check.dc }}</fr-text>` },
    // Fixed width already, or a figure by definition.
    { filename: FEATURE, code: `<fr-text monospace>{{ check.dc }}</fr-text>` },
    { filename: FEATURE, code: `<fr-text minWidth="modifier">{{ modifier }}</fr-text>` },
    { filename: FEATURE, code: `<fr-text [minWidth]="width()">{{ modifier }}</fr-text>` },
    { filename: FEATURE, code: `<fr-text [monospace]="fixed()">{{ total }}</fr-text>` },
    { filename: FEATURE, code: `<fr-text tone="muted" numeric variant="caption">{{ total }}</fr-text>` },
    { filename: FEATURE, code: `<fr-text numeric>{{ total() | number }}</fr-text>` },
    // Prose, and names that only contain a figure's name.
    { filename: FEATURE, code: `<fr-text>{{ rule().packTitle }}</fr-text>` },
    { filename: FEATURE, code: `<fr-text>{{ 'sheet.total' | transloco }}</fr-text>` },
    { filename: FEATURE, code: `<fr-text>Total {{ total }}</fr-text>` },
    { filename: FEATURE, code: `<fr-text>{{ account }}</fr-text>` },
    // Frontier knows no schemas.
    { filename: 'libs/frontier/src/lib/text/text/text.component.html', code: `<fr-text>{{ count }}</fr-text>` },
  ],
  invalid: [
    { filename: FEATURE, code: `<fr-text [numeric]="false">{{ total }}</fr-text>`, errors: [{ messageId: 'figure' }] },
    { filename: FEATURE, code: `<fr-text numeric="false">{{ total }}</fr-text>`, errors: [{ messageId: 'figure' }] },
    { filename: FEATURE, code: `<fr-text>{{ modifier }}</fr-text>`, errors: [{ messageId: 'figure' }] },
    { filename: FEATURE, code: `<fr-text>{{ score }}</fr-text>`, errors: [{ messageId: 'figure' }] },
    { filename: FEATURE, code: `<fr-text>{{ item.bulk }}</fr-text>`, errors: [{ messageId: 'figure' }] },
    { filename: FEATURE, code: `<fr-text>{{ total() | number }}</fr-text>`, errors: [{ messageId: 'figure' }] },
    { filename: FEATURE, code: `<fr-text>{{ count() }}</fr-text>`, errors: [{ messageId: 'figure' }] },
    {
      filename: FEATURE,
      code: `<fr-text variant="caption">{{ check.dc }}</fr-text>`,
      errors: [{ messageId: 'figure' }],
    },
    { filename: FEATURE, code: `<fr-text>{{ view().abilities.ac }}</fr-text>`, errors: [{ messageId: 'figure' }] },
    { filename: FEATURE, code: `<fr-text tone="muted">{{ total }}</fr-text>`, errors: [{ messageId: 'figure' }] },
    {
      filename: FEATURE,
      code: `@for (bonus of bonuses(); track bonus) { <fr-text>{{ bonus }}</fr-text> }`,
      errors: [{ messageId: 'figure' }],
    },
  ],
});
