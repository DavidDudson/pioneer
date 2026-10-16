/**
 * Fails when a frontier component has no sibling spec (`<name>.component.spec.ts`) or story
 * (`<name>.stories.ts`). A part whose behaviour only shows through the component that assembles it opts out below,
 * naming the spec or story that covers it; the check fails if that file goes missing or the part gains its own.
 */
import { Glob } from 'bun';

import { findCoverageGaps } from './component-coverage.ts';
import type { Exemption } from './component-coverage.ts';

const ROOT = 'libs/frontier/src/lib';

/** Parts covered by the component that assembles them. Paths are relative to `ROOT`. */
const EXEMPTIONS: Readonly<Record<string, Exemption>> = {
  'actions/section-link/section-link.component.ts': {
    reason: 'One link of fr-section-index; only meaningful inside it.',
    spec: 'actions/section-index/section-index.component.spec.ts',
    story: 'actions/section-index/section-index.stories.ts',
  },
  'actions/tab/tab.component.ts': {
    reason: 'One tab of fr-tabs; its roving focus only works inside them.',
    spec: 'actions/tabs/tabs.component.spec.ts',
    story: 'actions/tabs/tabs.stories.ts',
  },
  'controls/combobox/combobox-status.component.ts': {
    reason: "The combobox's loading and no-matches states.",
    spec: 'controls/combobox/combobox.component.spec.ts',
    story: 'controls/combobox/combobox.stories.ts',
  },
  'controls/picker/picker-grid.component.ts': {
    reason: "The open panel of fr-picker: its header and virtualised rows, driven by the picker's search box.",
    spec: 'controls/picker/picker.component.spec.ts',
    story: 'controls/picker/picker.stories.ts',
  },
  'controls/picker/picker-row.component.ts': {
    reason: "One row of fr-picker's grid; its cells only work inside the grid.",
    spec: 'controls/picker/picker.component.spec.ts',
    story: 'controls/picker/picker.stories.ts',
  },
  'controls/filter-bar/filter-editor.component.ts': {
    reason: 'The panel of fr-filter-bar where a filter is made or changed.',
    spec: 'controls/filter-bar/filter-bar.component.spec.ts',
    story: 'controls/filter-bar/filter-bar.stories.ts',
  },
  'controls/filter-bar/filter-values.component.ts': {
    reason: "The value half of fr-filter-bar's panel.",
    spec: 'controls/filter-bar/filter-bar.component.spec.ts',
    story: 'controls/filter-bar/filter-bar.stories.ts',
  },
  'data/table/column-chooser/column-chooser.component.ts': {
    reason: "The table's Columns panel; it only renders above a table.",
    story: 'data/table/table.stories.ts',
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
  'layout/page-body/page-body.component.ts': {
    reason: 'A part of the page with no behaviour of its own: it projects its content.',
    spec: 'layout/page/page.component.spec.ts',
    story: 'layout/page/page.stories.ts',
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
    story: 'text/text/text.stories.ts',
  },
  'text/text/stress.component.ts': {
    reason: 'Internal to fr-text, reached through its element input.',
    spec: 'text/text/text.component.spec.ts',
    story: 'text/text/text.stories.ts',
  },
};

const files = new Set(await Array.fromAsync(new Glob('**/*.ts').scan({ cwd: ROOT })));
const gaps = findCoverageGaps(files, EXEMPTIONS);
if (gaps.length > 0) {
  throw new Error(`Frontier components without a spec or story (under ${ROOT}):\n- ${gaps.join('\n- ')}`);
}
