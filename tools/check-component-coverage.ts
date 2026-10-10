/**
 * Fails when a frontier component has no sibling spec (`<name>.component.spec.ts`) or no story in its folder
 * (`*.stories.ts`). A part whose behaviour only shows through the component that assembles it opts out below,
 * naming the spec or story that covers it; the check fails if that file goes missing or the part gains its own.
 */
import { Glob } from 'bun';

import { findCoverageGaps } from './component-coverage.ts';
import type { Exemption } from './component-coverage.ts';

const ROOT = 'libs/frontier/src/lib';

/** Parts covered by the component that assembles them. Paths are relative to `ROOT`. */
const EXEMPTIONS: Readonly<Record<string, Exemption>> = {
  'controls/combobox/combobox-status.component.ts': {
    reason: "The combobox's loading and no-matches states.",
    spec: 'controls/combobox/combobox.component.spec.ts',
  },
  'data/table/header-cell/header-cell.component.ts': {
    reason: 'Only renders inside a table header.',
    story: 'data/table/table.stories.ts',
  },
  'forms/field/error/error.component.ts': {
    reason: 'A field part, shown assembled.',
    story: 'forms/field/field.stories.ts',
  },
  'forms/field/hint/hint.component.ts': {
    reason: 'A field part, shown assembled.',
    story: 'forms/field/field.stories.ts',
  },
  'forms/field/label/label.component.ts': {
    reason: 'A field part, shown assembled.',
    story: 'forms/field/field.stories.ts',
  },
  'inline-edit/save-status/save-status.component.ts': {
    reason: "The inline field's save feedback.",
    story: 'inline-edit/inline-field/inline-field.stories.ts',
  },
  'list/description-item/description-item.component.ts': {
    reason: 'A description list row; its markup is only valid inside the list.',
    spec: 'list/description-list/description-list.component.spec.ts',
    story: 'list/description-list/description-list.stories.ts',
  },
  'list/list-item/list-item.component.ts': {
    reason: 'A list row; its markup is only valid inside the list.',
    spec: 'list/list/list.component.spec.ts',
    story: 'list/list/list.stories.ts',
  },
  'text/text/phrase.component.ts': {
    reason: 'Internal to fr-text, reached through its element input.',
    spec: 'text/text/text.component.spec.ts',
  },
  'text/text/stress.component.ts': {
    reason: 'Internal to fr-text, reached through its element input.',
    spec: 'text/text/text.component.spec.ts',
  },
};

const files = new Set(await Array.fromAsync(new Glob('**/*.ts').scan({ cwd: ROOT })));
const gaps = findCoverageGaps(files, EXEMPTIONS);
if (gaps.length > 0) {
  throw new Error(`Frontier components without a spec or story (under ${ROOT}):\n- ${gaps.join('\n- ')}`);
}
