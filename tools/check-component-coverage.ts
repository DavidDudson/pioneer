/**
 * Fails when a frontier component has no sibling spec (`<name>.component.spec.ts`) or story
 * (`<name>.stories.ts`). A part whose behaviour only shows through the component that assembles it opts out below,
 * naming the spec or story that covers it; the check fails if that file goes missing or the part gains its own.
 */
import { Glob } from 'bun';

import { findCoverageGaps } from './component-coverage.ts';

const ROOT = 'libs/frontier/src/lib';

/** Parts covered by the component that assembles them. Paths are relative to `ROOT`. */
const EXEMPTIONS = {
  'async/async-region/async-view.component.ts': {
    reason: 'The states of a query, shared by fr-async-region, fr-section and fr-async-list.',
    spec: 'async/async-region/async-region.component.spec.ts',
    story: 'async/async-region/async-region.stories.ts',
  },
  'actions/stepper/step.component.ts': {
    reason: 'One step of fr-stepper; its Back, Next and Edit only work inside it.',
    spec: 'actions/stepper/stepper.component.spec.ts',
    story: 'actions/stepper/stepper.stories.ts',
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
  'data/table/table-notice/table-notice.component.ts': {
    reason: "What an empty or failed table says in its body; it only renders inside a table's cell.",
    spec: 'data/table/table-states.spec.ts',
    story: 'data/table/table.stories.ts',
  },
  'layout/card/card-content.component.ts': {
    reason: 'A body of the card; it only projects its content, padded from the card.',
    spec: 'layout/card/card.component.spec.ts',
    story: 'layout/card/card.stories.ts',
  },
  'layout/card/card-footer.component.ts': {
    reason: 'The end row of the card; the card draws the rule above it.',
    spec: 'layout/card/card.component.spec.ts',
    story: 'layout/card/card.stories.ts',
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
  'list/item/item-actions.component.ts': {
    reason: 'The trailing part of fr-list-item; only meaningful inside it.',
    spec: 'list/list-item/list-item.component.spec.ts',
    story: 'list/list-item/list-item.stories.ts',
  },
  'list/item/item-content.component.ts': {
    reason: 'The middle part of fr-list-item; only meaningful inside it.',
    spec: 'list/list-item/list-item.component.spec.ts',
    story: 'list/list-item/list-item.stories.ts',
  },
  'list/item/item-media.component.ts': {
    reason: 'The leading part of fr-list-item; only meaningful inside it.',
    spec: 'list/list-item/list-item.component.spec.ts',
    story: 'list/list-item/list-item.stories.ts',
  },
  'feedback/alert/alert-title.component.ts': {
    reason: 'The heading line of fr-alert; only meaningful inside it.',
    spec: 'feedback/alert/alert.component.spec.ts',
    story: 'feedback/alert/alert.stories.ts',
  },
  'feedback/alert/alert-description.component.ts': {
    reason: 'The detail line of fr-alert; only meaningful inside it.',
    spec: 'feedback/alert/alert.component.spec.ts',
    story: 'feedback/alert/alert.stories.ts',
  },
  'feedback/empty-state/empty-state-media.component.ts': {
    reason: 'The leading part of fr-empty-state; only meaningful inside it.',
    spec: 'feedback/empty-state/empty-state.component.spec.ts',
    story: 'feedback/empty-state/empty-state.stories.ts',
  },
  'feedback/empty-state/empty-state-header.component.ts': {
    reason: 'Groups the title and description of fr-empty-state; only meaningful inside it.',
    spec: 'feedback/empty-state/empty-state.component.spec.ts',
    story: 'feedback/empty-state/empty-state.stories.ts',
  },
  'feedback/empty-state/empty-state-title.component.ts': {
    reason: 'The title of fr-empty-state; only meaningful inside it.',
    spec: 'feedback/empty-state/empty-state.component.spec.ts',
    story: 'feedback/empty-state/empty-state.stories.ts',
  },
  'feedback/empty-state/empty-state-description.component.ts': {
    reason: 'The description of fr-empty-state; only meaningful inside it.',
    spec: 'feedback/empty-state/empty-state.component.spec.ts',
    story: 'feedback/empty-state/empty-state.stories.ts',
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
