import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { LocaleFormat, Skeleton, Stack } from '@pioneer/frontier';
import { DefenceStatusKind } from '@pioneer/rules/engine';
import type {
  AdjustmentLine,
  Defences,
  DefenceStatus,
  ImmunityLine,
  ModifierLabel,
  RuleId,
} from '@pioneer/rules/engine';
import { formatSummary } from '@pioneer/rules/predicate';
import { DAMAGE_GROUP_TYPES, DamageGroup, DamageGroupSchema, DamageTypeSchema } from '@pioneer/rules/sdk';
import type { ContentId, DamageAdjustmentTarget, DamageException, Immunity } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import { DAMAGE_TYPE_MESSAGES } from '../rich-text/rich-text-messages';
import { DefenceList } from './defence-list/defence-list.component';
import { DAMAGE_GROUP_MESSAGES, DefencesMessage } from './defences-messages';
import type { ShownDefence, ShownList, Standing } from './shown-defences';

/** Display names the caller resolved for the entries and slugs the lines name. */
interface DefenceNames {
  readonly entries: ReadonlyMap<ContentId, string>;
  readonly immunities: ReadonlyMap<Immunity, string>;
  readonly exceptions: ReadonlyMap<DamageException, string>;
}

/** The list a line is in, so a superseded line can name the one that counts instead, and the names to show. */
interface ListContext {
  readonly lines: readonly (ImmunityLine | AdjustmentLine)[];
  readonly names: DefenceNames;
}

const LOADING_LISTS = ['immunities', 'weaknesses', 'resistances'] as const;

/**
 * A character's immunities, weaknesses and resistances (play-and-campaigns.md, "Defences panel"), each list under
 * its own heading and an empty list saying so. An entry reads as its value and target, then any exceptions
 * ("Resistance 5 physical (bleed, bludgeoning, piercing, slashing), except adamantine"); a group is spelled out
 * with the types it covers. A line that does not simply apply is marked in text, conditional with when it holds,
 * superseded with what counts instead, or failed with why, and every line names where it comes from.
 *
 * Read-only and presentational (ADR-0028): the caller passes the engine's `Defences`, or undefined while they load,
 * and the display names of the entries, immunities and exceptions it names. A missing name shows its id.
 *
 * ```html
 * <pio-defences [defences]="defences()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-defences',
  imports: [DefenceList, Skeleton, Stack],
  templateUrl: './defences.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefencesView {
  /** Undefined while loading: the panel then shows skeletons shaped like its three lists. */
  public readonly defences = input.required<Defences | undefined>();
  /** Display names of the entries the lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Display names of immunities that are not damage types (`sleep`, `critical-hits`). */
  public readonly immunityNames = input<ReadonlyMap<Immunity, string>>(new Map());
  /** Display names of the damage traits weaknesses and resistances make exceptions for (`adamantine`). */
  public readonly exceptionNames = input<ReadonlyMap<DamageException, string>>(new Map());

  /** One loading placeholder per list. */
  protected readonly loadingLists = LOADING_LISTS;

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope (`rules`, `predicate`, `engine`) finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly lists = computed((): readonly ShownList[] | undefined => {
    this.#messages();
    this.#format.locale();
    const defences = this.defences();
    if (defences === undefined) {
      return undefined;
    }
    const { immunities, weaknesses, resistances } = defences;
    const names: DefenceNames = {
      entries: this.entryNames(),
      immunities: this.immunityNames(),
      exceptions: this.exceptionNames(),
    };
    return [
      {
        heading: this.#i18n.translate(DefencesMessage.Immunities),
        empty: this.#i18n.translate(DefencesMessage.NoImmunities),
        defences: immunities.map((line) => this.#immunity(line, { lines: immunities, names })),
      },
      {
        heading: this.#i18n.translate(DefencesMessage.Weaknesses),
        empty: this.#i18n.translate(DefencesMessage.NoWeaknesses),
        defences: weaknesses.map((line) =>
          this.#adjustment(DefencesMessage.Weakness, line, { lines: weaknesses, names }),
        ),
      },
      {
        heading: this.#i18n.translate(DefencesMessage.Resistances),
        empty: this.#i18n.translate(DefencesMessage.NoResistances),
        defences: resistances.map((line) =>
          this.#adjustment(DefencesMessage.Resistance, line, { lines: resistances, names }),
        ),
      },
    ];
  });

  #immunity(line: ImmunityLine, context: ListContext): ShownDefence {
    const damageType = DamageTypeSchema.safeParse(line.type);
    const target = damageType.success
      ? this.#i18n.translate(DAMAGE_TYPE_MESSAGES[damageType.data])
      : (context.names.immunities.get(line.type) ?? line.type);
    return {
      key: `${line.id}-${line.type}`,
      text: this.#i18n.translate(DefencesMessage.Immunity, { target }),
      ...this.#standing(line, context),
    };
  }

  #adjustment(key: string, line: AdjustmentLine, context: ListContext): ShownDefence {
    const exceptions = line.exceptions.map((exception) => context.names.exceptions.get(exception) ?? exception);
    return {
      key: `${line.id}-${line.type}`,
      text: this.#i18n.translate(key, {
        hasValue: line.value === undefined ? 'no' : 'yes',
        value: line.value === undefined ? '' : this.#format.number(line.value),
        target: this.#target(line.type),
        hasExceptions: exceptions.length === 0 ? 'no' : 'yes',
        exceptions: this.#format.list(exceptions, 'disjunction'),
      }),
      ...this.#standing(line, context),
    };
  }

  /** A damage type's name, or a group's with the types it covers; `all` reads as "all damage". */
  #target(target: DamageAdjustmentTarget): string {
    const group = DamageGroupSchema.safeParse(target);
    if (!group.success) {
      const damageType = DamageTypeSchema.parse(target);
      return this.#i18n.translate(DAMAGE_TYPE_MESSAGES[damageType]);
    }
    const name = this.#i18n.translate(DAMAGE_GROUP_MESSAGES[group.data]);
    if (group.data === DamageGroup.All) {
      return name;
    }
    const types = DAMAGE_GROUP_TYPES[group.data].map((type) => this.#i18n.translate(DAMAGE_TYPE_MESSAGES[type]));
    return this.#i18n.translate(DefencesMessage.GroupTypes, { group: name, types: this.#format.list(types, 'unit') });
  }

  /** How a line stands and what explains it, then where it comes from. */
  #standing(line: ImmunityLine | AdjustmentLine, context: ListContext): Standing {
    const from = this.#i18n.translate(DefencesMessage.From, { name: this.#labelName(line.label, context.names) });
    const { status } = line;
    if (status.kind === DefenceStatusKind.Applied) {
      return { status: undefined, details: [from] };
    }
    const detail = this.#detail(status, context);
    return { status: status.kind, details: detail === undefined ? [from] : [detail, from] };
  }

  #detail(
    status: Exclude<DefenceStatus, { readonly kind: typeof DefenceStatusKind.Applied }>,
    context: ListContext,
  ): string | undefined {
    switch (status.kind) {
      case DefenceStatusKind.Conditional: {
        if (status.summary === undefined) {
          return undefined;
        }
        const summary = formatSummary(status.summary, {
          message: (descriptor) => this.#translate(descriptor),
          list: (items, style): string => this.#format.list(items, style),
        });
        return this.#i18n.translate(DefencesMessage.AppliesWhen, { summary });
      }
      case DefenceStatusKind.Superseded: {
        return this.#i18n.translate(DefencesMessage.SupersededBy, { name: this.#ruleName(status.by, context) });
      }
      case DefenceStatusKind.Failed: {
        const error = this.#translate(status.error);
        return status.when === undefined ? error : this.#i18n.translate(DefencesMessage.FailedConditional, { error });
      }
      default: {
        return status satisfies never;
      }
    }
  }

  /** The line a rule id names, by its label; the id itself if no line in the list has it. */
  #ruleName(id: RuleId, { lines, names }: ListContext): string {
    const line = lines.find((candidate) => candidate.id === id);
    return line === undefined ? id : this.#labelName(line.label, names);
  }

  #labelName(label: ModifierLabel, names: DefenceNames): string {
    if ('text' in label) {
      return label.text;
    }
    if ('entry' in label) {
      return names.entries.get(label.entry) ?? label.entry;
    }
    return this.#translate(label.message);
  }

  #translate(descriptor: MessageDescriptor): string {
    return this.#i18n.translate(descriptor.key, descriptor.params);
  }
}
