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
  Skeleton,
  Stack,
  Surface,
  TextArea,
  TextInput,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ContentKind, REGISTERED_KINDS } from '@pioneer/rules/sdk';
import type { RegisteredKind } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import {
  CheckStatus,
  checkTool,
  CONTENT_KIND_KEYS,
  contentEntryExample,
  EXAMPLE_FACTS,
  EXAMPLE_FILTER_QUERY,
  EXAMPLE_GRANT_LEVEL,
  EXAMPLE_GRANT_PICKS,
  EXAMPLE_GRANT_ROOTS,
  EXAMPLE_GRANT_TOGGLES,
  EXAMPLE_OVERRIDES,
  EXAMPLE_RULE_ELEMENTS,
  EXAMPLE_STATISTIC_INPUTS,
  RULES_TOOL_KEYS,
  rulesExample,
  RulesTool,
  ToolKind,
} from '../rules-tool';
import type { ReferenceEntries, ToolCheck } from '../rules-tool';
import { STATISTIC_DEFINITIONS, StatisticSource } from '../statistic-sources';
import { TOOL_FIELDS } from '../tool-fields';
import { ToolResult } from '../tool-result/tool-result.component';

const JSON_ROWS = 12;

/** Where the statistics tool's definitions are: in place, still loading from a pack, or lost to a failed load. */
const SourceLoad = { Idle: 'idle', Loading: 'loading', Failed: 'failed' } as const;
type SourceLoad = ValueOf<typeof SourceLoad>;

/**
 * Paste rules JSON, pick a schema, and see whether it validates and, if not, where and why. The formula
 * tool parses formula text instead, points at the first mistake, and evaluates it with reference values; the verdict tool evaluates a predicate
 * against roll options and shows which statements hold; the statistics tool derives each statistic's breakdown from
 * definitions, the character's inputs, rule elements and roll options; the grants tool resolves grants from root
 * entries down through the picks, each with the chain that put it on the character, and lists the choices to make.
 */
@Component({
  selector: 'pio-rules-playground-page',
  imports: [
    Field,
    FieldError,
    FieldHint,
    Heading,
    Label,
    Page,
    Select,
    Skeleton,
    Stack,
    Surface,
    TextArea,
    TextInput,
    ToolResult,
    TranslocoPipe,
    ...TOOL_FIELDS,
  ],
  templateUrl: './rules-playground-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesPlaygroundPage {
  protected readonly CheckStatus = CheckStatus;
  protected readonly ToolKind = ToolKind;
  protected readonly SourceLoad = SourceLoad;
  protected readonly RulesTool = RulesTool;
  protected readonly rows = JSON_ROWS;

  readonly #i18n = inject(TranslocoService);
  readonly #loadDefinitions = inject(STATISTIC_DEFINITIONS);
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

  /** Example entries for the content entry mode, one per kind with a schema. */
  protected readonly entryKinds = computed((): readonly SelectOption<RegisteredKind>[] => {
    this.#messages();
    return REGISTERED_KINDS.map((kind) => ({ value: kind, label: this.#i18n.translate(CONTENT_KIND_KEYS[kind]) }));
  });

  /** The kind whose example the content entry mode last loaded. */
  protected readonly entryKind = signal<RegisteredKind>(ContentKind.Ancestry);

  /** Where the statistics tool last loaded its definitions from. */
  protected readonly statisticSource = signal<StatisticSource>(StatisticSource.Example);

  /** Whether the definitions of the chosen source are in place, loading or failed to load. */
  protected readonly statisticLoad = signal<SourceLoad>(SourceLoad.Idle);

  /** Counts source requests, so only the latest one's definitions land. */
  #statisticRequest = 0;

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
  /** The grants tool's root entries, one slug per line. Kept when switching tools. */
  protected readonly grantRoots = signal(EXAMPLE_GRANT_ROOTS);
  /** Rule elements set by hand for the statistics tool, as a JSON array. Kept when switching tools. */
  protected readonly statisticOverrides = signal(EXAMPLE_OVERRIDES);
  /** The grants tool's picks, one `entry:rule = value` per line. Kept when switching tools. */
  protected readonly grantPicks = signal(EXAMPLE_GRANT_PICKS);
  /** The grants tool's toggles, one `entry:rule = on`, `off` or a suboption per line. Kept when switching tools. */
  protected readonly grantToggles = signal(EXAMPLE_GRANT_TOGGLES);
  /** The grants tool's character level. Kept when switching tools. */
  protected readonly grantLevel = signal(EXAMPLE_GRANT_LEVEL);
  /** The filters tool's query, as it would follow `?` in a URL. Kept when switching tools. */
  protected readonly filterQuery = signal(EXAMPLE_FILTER_QUERY);
  /** The chosen tool's answer for the current text. */
  protected readonly result = computed((): ToolCheck =>
    checkTool(this.schema(), this.text(), {
      facts: this.facts(),
      entries: this.referenceEntries(),
      statisticInputs: this.statisticInputs(),
      statisticRules: this.statisticRules(),
      grantRoots: this.grantRoots(),
      statisticOverrides: this.statisticOverrides(),
      grantPicks: this.grantPicks(),
      grantToggles: this.grantToggles(),
      grantLevel: this.grantLevel(),
      filterQuery: this.filterQuery(),
    }),
  );

  /** Load the example entry of another kind into the content entry mode. */
  protected chooseEntryKind(kind: RegisteredKind | undefined): void {
    if (kind === undefined || kind === this.entryKind()) {
      return;
    }
    this.entryKind.set(kind);
    this.text.set(contentEntryExample(kind));
  }

  /**
   * Load the definitions of another source into the statistics tool. A pack loads lazily: the definitions are
   * replaced by a skeleton until it arrives, an answer to an older request or for another tool is dropped, and a
   * failed load restores the previous source so the pack can be picked again.
   */
  protected async chooseStatisticSource(source: StatisticSource): Promise<void> {
    if (source === this.statisticSource()) {
      return;
    }
    const previous = this.statisticSource();
    const request = this.#startLoading(source);
    const definitions = await this.#loadDefinitions(source).catch(() => undefined);
    if (this.#isLatest(request)) {
      this.#land(definitions, previous);
    }
  }

  /** Marks `source` chosen and loading, as a new request that outdates every earlier one. */
  #startLoading(source: StatisticSource): number {
    this.#statisticRequest += 1;
    this.statisticSource.set(source);
    this.statisticLoad.set(SourceLoad.Loading);
    return this.#statisticRequest;
  }

  /** Puts loaded definitions in place, or goes back to `previous` and says the load failed. */
  #land(definitions: string | undefined, previous: StatisticSource): void {
    if (definitions === undefined) {
      this.statisticSource.set(previous);
      this.statisticLoad.set(SourceLoad.Failed);
      return;
    }
    this.text.set(definitions);
    this.statisticLoad.set(SourceLoad.Idle);
  }

  #isLatest(request: number): boolean {
    return request === this.#statisticRequest && this.schema() === RulesTool.Statistics;
  }

  /** A new schema starts from its example, so the page always shows something that passes. */
  protected choose(tool: RulesTool | undefined): void {
    if (tool === undefined || tool === this.schema()) {
      return;
    }
    this.schema.set(tool);
    this.text.set(rulesExample(tool));
    this.entryKind.set(ContentKind.Ancestry);
    this.statisticSource.set(StatisticSource.Example);
    this.statisticLoad.set(SourceLoad.Idle);
    this.#statisticRequest += 1;
    // The boxes go with the tool, and a box made again would show a stale number for an emptied entry.
    this.referenceEntries.set(new Map());
  }
}
