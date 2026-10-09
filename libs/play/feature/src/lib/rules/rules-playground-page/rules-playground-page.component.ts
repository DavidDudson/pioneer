import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  Field,
  FieldError,
  FieldHint,
  Heading,
  Label,
  Page,
  Select,
  Stack,
  Surface,
  TextArea,
  TextInput,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { filter, merge } from 'rxjs';

import { FormulaReferences } from '../formula-references/formula-references.component';
import {
  CheckStatus,
  checkTool,
  EXAMPLE_FACTS,
  EXAMPLE_RULE_ELEMENTS,
  EXAMPLE_STATISTIC_INPUTS,
  RULES_TOOL_KEYS,
  rulesExample,
  RulesTool,
  ToolKind,
} from '../rules-tool';
import type { ReferenceEntries, ToolCheck } from '../rules-tool';
import { StatisticsFields } from '../statistics-fields/statistics-fields.component';
import { ToolResult } from '../tool-result/tool-result.component';
import { VerdictFields } from '../verdict-fields/verdict-fields.component';

const JSON_ROWS = 12;

/**
 * Paste rules JSON, pick a schema, and see whether it validates and, if not, where and why. The formula
 * tool parses formula text instead, points at the first mistake, and evaluates it with reference values; the verdict tool evaluates a predicate
 * against roll options and shows which statements hold; the statistics tool derives each statistic's breakdown from
 * definitions, the character's inputs, rule elements and roll options.
 */
@Component({
  selector: 'pio-rules-playground-page',
  imports: [
    Field,
    FieldError,
    FieldHint,
    FormulaReferences,
    Heading,
    Label,
    Page,
    Select,
    Stack,
    StatisticsFields,
    Surface,
    TextArea,
    TextInput,
    ToolResult,
    TranslocoPipe,
    VerdictFields,
  ],
  templateUrl: './rules-playground-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesPlaygroundPage {
  protected readonly CheckStatus = CheckStatus;
  protected readonly ToolKind = ToolKind;
  protected readonly rows = JSON_ROWS;

  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or a message scope (`play`) finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));
  protected readonly schemas = computed((): readonly SelectOption<RulesTool>[] => {
    this.#messages();
    return Object.values(RulesTool).map((tool) => ({
      value: tool,
      label: this.#i18n.translate(RULES_TOOL_KEYS[tool]),
    }));
  });

  protected readonly schema = signal<RulesTool>(RulesTool.Predicate);
  protected readonly text = signal(rulesExample(RulesTool.Predicate));
  /** What has been typed for each formula reference; kept across edits so a value survives retyping. */
  protected readonly referenceEntries = signal<ReferenceEntries>(new Map());
  /** Roll options for the verdict and statistics tools, one per line. Kept when switching tools. */
  protected readonly facts = signal(EXAMPLE_FACTS);
  /** The character's inputs for the statistics tool, as JSON. Kept when switching tools. */
  protected readonly statisticInputs = signal(EXAMPLE_STATISTIC_INPUTS);
  /** Rule elements for the statistics tool, as a JSON array. Kept when switching tools. */
  protected readonly statisticRules = signal(EXAMPLE_RULE_ELEMENTS);
  /** The chosen tool's answer for the current text. */
  protected readonly result = computed((): ToolCheck =>
    checkTool(this.schema(), this.text(), {
      facts: this.facts(),
      entries: this.referenceEntries(),
      statisticInputs: this.statisticInputs(),
      statisticRules: this.statisticRules(),
    }),
  );

  /** A new schema starts from its example, so the page always shows something that passes. */
  protected choose(tool: RulesTool | undefined): void {
    if (tool === undefined || tool === this.schema()) {
      return;
    }
    this.schema.set(tool);
    this.text.set(rulesExample(tool));
    // The boxes go with the tool, and a box made again would show a stale number for an emptied entry.
    this.referenceEntries.set(new Map());
  }
}
