import { describe, it } from 'bun:test';

import angular from 'angular-eslint';
import { RuleTester } from 'eslint';

import { noNativeElements } from './no-native-elements';

RuleTester.describe = describe;
RuleTester.it = it;
// No itOnly: Bun throws on reading `it.only` when CI is set, and no case uses `only`.

const tester = new RuleTester({ languageOptions: { parser: angular.templateParser } });

const FEATURE = 'libs/character/feature/src/lib/sheet/sheet.component.html';
const frontier = (path: string): string => `libs/frontier/src/lib/${path}`;

tester.run('no-native-elements', noNativeElements, {
  valid: [
    { filename: FEATURE, code: `<fr-stack gap="md"><pio-breakdown /></fr-stack>` },
    { filename: FEATURE, code: `<ng-container><router-outlet /></ng-container>` },
    { filename: frontier('layout/box/box.component.html'), code: `<div><span><ng-content /></span></div>` },
    {
      filename: frontier('shell/shell.component.html'),
      code: `<header></header><nav></nav><main></main><footer></footer>`,
    },
    {
      filename: frontier('layout/card/card.component.html'),
      code: `<section><article><aside></aside></article></section>`,
    },
    { filename: frontier('actions/button/button.component.html'), code: `<button type="button"></button>` },
    { filename: frontier('controls/select/select.component.html'), code: `<button type="button"></button>` },
    { filename: frontier('list/description-item/description-item.component.html'), code: `<dt></dt><dd></dd>` },
    { filename: frontier('data/table/table.component.html'), code: `<table><colgroup><col /></colgroup></table>` },
    { filename: frontier('data/chart/chart.component.html'), code: `<tanstack-chart />` },
    { filename: frontier('icon/icon.component.html'), code: `<svg><path d="M0 0" /></svg>` },
    { filename: frontier('layout/stack/stack.component.html'), code: `<fr-text><fr-icon /></fr-text>` },
  ],
  invalid: [
    { filename: FEATURE, code: `<div></div>`, errors: [{ messageId: 'outside' }] },
    { filename: FEATURE, code: `<tanstack-chart />`, errors: [{ messageId: 'outside' }] },
    {
      filename: frontier('layout/card/card.component.html'),
      code: `<button></button>`,
      errors: [{ messageId: 'owned' }],
    },
    {
      filename: frontier('data/virtual-list/virtual-list.component.html'),
      code: `<tanstack-chart />`,
      errors: [{ messageId: 'owned' }],
    },
    ...[
      'code',
      'kbd',
      'pre',
      'abbr',
      'blockquote',
      'q',
      'cite',
      'fieldset',
      'legend',
      'progress',
      'meter',
      'output',
      'picture',
      'video',
      'audio',
      'canvas',
      'h5',
    ].map((name) => ({
      filename: frontier('layout/card/card.component.html'),
      code: `<${name}></${name}>`,
      errors: [{ messageId: 'unowned' }],
    })),
    ...['select', 'template', 'slot', 'dialog', 'noscript'].map((name) => ({
      filename: frontier('controls/select/select.component.html'),
      code: `<${name}></${name}>`,
      errors: [{ messageId: 'banned' }],
    })),
    { filename: frontier('layout/card/card.component.html'), code: `<kbd></kbd>`, errors: [{ messageId: 'unowned' }] },
    {
      filename: frontier('layout/card/card.component.html'),
      code: `<svg><g><path d="M0 0" /></g></svg>`,
      errors: [{ messageId: 'owned' }],
    },
    {
      filename: frontier('layout/card/card.component.html'),
      code: `<math><mi>x</mi></math>`,
      errors: [{ messageId: 'unowned' }],
    },
    { filename: FEATURE, code: `<svg></svg>`, errors: [{ messageId: 'outside' }] },
    { filename: FEATURE, code: `<svg:rect />`, errors: [{ messageId: 'outside' }] },
    { filename: frontier('layout/card/card.component.html'), code: `<svg:rect />`, errors: [{ messageId: 'owned' }] },
    {
      filename: frontier('layout/card/card.component.html'),
      code: `<svg></svg><svg:rect />`,
      errors: [{ messageId: 'owned' }, { messageId: 'owned' }],
    },
    {
      filename: frontier('layout/card/card.component.html'),
      code: `<marquee></marquee>`,
      errors: [{ messageId: 'unknown' }],
    },
    {
      filename: frontier('layout/card/card.component.html'),
      code: `<pio-breakdown />`,
      errors: [{ messageId: 'app' }],
    },
    {
      filename: frontier('layout/card/card.component.html'),
      code: `<router-outlet />`,
      errors: [{ messageId: 'app' }],
    },
  ],
});
