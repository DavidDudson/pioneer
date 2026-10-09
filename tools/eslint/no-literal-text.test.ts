import { describe, it } from 'bun:test';

import angular from 'angular-eslint';
import { RuleTester } from 'eslint';

import { noLiteralText } from './no-literal-text';

RuleTester.describe = describe;
RuleTester.it = it;
// No itOnly: Bun throws on reading `it.only` when CI is set, and no case uses `only`.

const tester = new RuleTester({ languageOptions: { parser: angular.templateParser } });

tester.run('no-literal-text', noLiteralText, {
  valid: [
    { code: `<p>{{ 'character.list.empty' | transloco }}</p>` },
    { code: `<fr-text-field [label]="'character.list.nameLabel' | transloco" />` },
    { code: `<span aria-hidden="true">✓</span>` },
    { code: `<span>{{ name }} · {{ level }}</span>` },
    { code: `<span>+</span>` },
    { code: `<fr-stack gap="md" direction="horizontal" />` },
    { code: `<fr-description-item [term]="'character.sheet.speed' | transloco" />` },
    { code: `<fr-description-item [term]="speedLabel()" />` },
    { code: `<fr-link href="https://paizo.com">{{ 'shell.communityUse.siteLink' | transloco }}</fr-link>` },
  ],
  invalid: [
    { code: `<p>No characters yet.</p>`, errors: [{ messageId: 'text' }] },
    { code: `<span>Level {{ level }}</span>`, errors: [{ messageId: 'text' }] },
    { code: `<fr-text-field label="Name" />`, errors: [{ messageId: 'attribute' }] },
    { code: `<input placeholder="Valeros" />`, errors: [{ messageId: 'attribute' }] },
    { code: `<nav aria-label="Main"></nav>`, errors: [{ messageId: 'attribute' }] },
    { code: `<fr-select ariaLabel="Theme" />`, errors: [{ messageId: 'attribute' }] },
    { code: `<fr-description-item term="Speed" />`, errors: [{ messageId: 'attribute' }] },
    { code: `<fr-description-item [term]="'Speed'" />`, errors: [{ messageId: 'attribute' }] },
    { code: `<fr-text-field [label]="'Name'" />`, errors: [{ messageId: 'attribute' }] },
    { code: `<p>Größe</p>`, errors: [{ messageId: 'text' }] },
  ],
});
