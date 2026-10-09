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

import { checkFormula } from '../formula-check';
import type { FormulaCheck, ReferenceEntries } from '../formula-check';
import { FormulaReferences } from '../formula-references/formula-references.component';
import { FormulaResult } from '../formula-result/formula-result.component';
import { CheckStatus, checkRulesJson, RULES_TOOL_KEYS, rulesExample, RulesTool } from '../rules-check';
import type { CheckOutcome } from '../rules-check';
import { RulesResult } from '../rules-result/rules-result.component';

const JSON_ROWS = 12;

/**
 * Paste rules JSON, pick a schema, and see whether it validates and, if not, where and why. The formula
 * tool parses formula text instead, points at the first mistake, and evaluates it with reference values.
 */
@Component({
  selector: 'pio-rules-playground-page',
  imports: [
    Field,
    FieldError,
    FieldHint,
    FormulaReferences,
    FormulaResult,
    Heading,
    Label,
    Page,
    RulesResult,
    Select,
    Stack,
    Surface,
    TextArea,
    TextInput,
    TranslocoPipe,
  ],
  templateUrl: './rules-playground-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesPlaygroundPage {
  protected readonly CheckStatus = CheckStatus;
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
  /** The formula check while the formula tool is chosen, otherwise undefined. */
  protected readonly formula = computed((): FormulaCheck | undefined => {
    const tool = this.schema();
    return tool === RulesTool.Formula ? checkFormula(this.text(), this.referenceEntries()) : undefined;
  });
  /** The JSON check while a schema is chosen, otherwise undefined. */
  protected readonly outcome = computed((): CheckOutcome | undefined => {
    const tool = this.schema();
    return tool === RulesTool.Formula ? undefined : checkRulesJson(tool, this.text());
  });

  /** A new schema starts from its example, so the page always shows something that passes. */
  protected choose(tool: RulesTool | undefined): void {
    if (tool === undefined || tool === this.schema()) {
      return;
    }
    this.schema.set(tool);
    this.text.set(rulesExample(tool));
  }
}
