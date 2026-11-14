import { describe, it } from 'bun:test';

import angular from 'angular-eslint';
import { RuleTester } from 'eslint';

import { noBareTraitBadge } from './no-bare-trait-badge';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser: angular.templateParser } });

const FEATURE = 'libs/rules/ui/src/lib/entry-preview/entry-card.component.html';

tester.run('no-bare-trait-badge', noBareTraitBadge, {
  valid: [
    { filename: FEATURE, code: `<pio-trait-chip [trait]="trait" />` },
    { filename: FEATURE, code: `@for (trait of traits(); track trait) { <pio-trait-chip [trait]="trait" /> }` },
    // Not a trait: a rarity, a value, a literal.
    { filename: FEATURE, code: `<fr-badge>{{ rarity }}</fr-badge>` },
    { filename: FEATURE, code: `<fr-badge>{{ preview().value }}</fr-badge>` },
    { filename: FEATURE, code: `<fr-tag label="Trait" />` },
    { filename: FEATURE, code: `<fr-badge>{{ 'trait' }}</fr-badge>` },
    { filename: FEATURE, code: `<fr-tag [label]="shownLabel()" [tone]="tone()" />` },
    // A name that only contains the letters.
    { filename: FEATURE, code: `<fr-badge>{{ portrait }}</fr-badge>` },
    // Frontier knows no schemas.
    { filename: 'libs/frontier/src/lib/text/tag/tag.component.html', code: `<fr-badge>{{ trait }}</fr-badge>` },
  ],
  invalid: [
    { filename: FEATURE, code: `<fr-badge>{{ trait }}</fr-badge>`, errors: [{ messageId: 'bare' }] },
    { filename: FEATURE, code: `<fr-tag [label]="trait" />`, errors: [{ messageId: 'bare' }] },
    { filename: FEATURE, code: `<fr-badge>{{ ability.traits[0] }}</fr-badge>`, errors: [{ messageId: 'bare' }] },
    { filename: FEATURE, code: `<fr-badge>{{ strike.ownTrait }}</fr-badge>`, errors: [{ messageId: 'bare' }] },
    {
      filename: FEATURE,
      code: `@for (trait of preview().traits; track trait) { <fr-badge>{{ trait }}</fr-badge> }`,
      errors: [{ messageId: 'bare' }],
    },
  ],
});
