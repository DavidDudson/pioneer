import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  Field,
  FieldError,
  FieldHint,
  Heading,
  Label,
  List,
  ListItem,
  Message,
  Page,
  Select,
  Stack,
  Surface,
  Text,
  TextArea,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { filter, merge } from 'rxjs';

import { CheckStatus, checkRulesJson, formatPath, RULES_SCHEMA_KEYS, RulesSchema, rulesExample } from '../rules-check';
import type { CheckOutcome } from '../rules-check';

const JSON_ROWS = 12;

/** Paste rules JSON, pick a schema, and see whether it validates and, if not, where and why. */
@Component({
  selector: 'pio-rules-playground-page',
  imports: [
    Field,
    FieldError,
    FieldHint,
    Heading,
    Label,
    List,
    ListItem,
    Message,
    Page,
    Select,
    Stack,
    Surface,
    Text,
    TextArea,
    TranslocoPipe,
  ],
  templateUrl: './rules-playground-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesPlaygroundPage {
  protected readonly CheckStatus = CheckStatus;
  protected readonly rows = JSON_ROWS;
  protected readonly formatPath = formatPath;

  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or a message scope (`play`) finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));
  protected readonly schemas = computed((): readonly SelectOption<RulesSchema>[] => {
    this.#messages();
    return Object.values(RulesSchema).map((schema) => ({
      value: schema,
      label: this.#i18n.translate(RULES_SCHEMA_KEYS[schema]),
    }));
  });

  protected readonly schema = signal<RulesSchema>(RulesSchema.Predicate);
  protected readonly text = signal(rulesExample(RulesSchema.Predicate));
  protected readonly outcome = computed((): CheckOutcome => checkRulesJson(this.schema(), this.text()));

  /** A new schema starts from its example, so the page always shows something that passes. */
  protected choose(schema: RulesSchema | undefined): void {
    if (schema === undefined || schema === this.schema()) {
      return;
    }
    this.schema.set(schema);
    this.text.set(rulesExample(schema));
  }
}
