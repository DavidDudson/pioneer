import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Button, ButtonVariant, HoverCard, HoverCardContent, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import type { ContentId, Proficiency, StatisticKind } from '@pioneer/rules/sdk';

import { BreakdownView } from '../breakdown/breakdown.component';
import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { ProficiencyBadge } from '../proficiency-badge/proficiency-badge.component';
import type { RankSource } from '../proficiency-badge/proficiency-badge.component';
import { VitalBasisKind } from '../vitals/vital';
import type { Vital } from '../vitals/vital';

/** Message keys the block renders with, spelled out so the key check sees them. */
const ArmorClassMessage = { Unarmored: 'rules.vitals.unarmored' } as const;

/** Armor Class as shown: its total, and what the hover holds. */
interface ShownArmorClass {
  readonly name: string;
  /** The total, or undefined when the engine could not derive it. */
  readonly total: string | undefined;
  /** Why there is no total. */
  readonly error: string | undefined;
  readonly statistic: StatisticValue | undefined;
  readonly kind: StatisticKind;
  readonly rank: Proficiency | undefined;
  readonly rankSources: readonly RankSource[];
  /** What sets it, worded: the worn armour's name, or unarmored. */
  readonly basis: string | undefined;
}

/**
 * The Armor Class block of the sheet: its rank badge and name, the total large, and the breakdown and what sets it in
 * a popover on hover.
 *
 * Read-only and presentational (ADR-0028): the caller passes the vital, or undefined while it loads, and the display
 * names of the entries the breakdown lines come from.
 *
 * ```html
 * <pio-armor-class [vital]="armor()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-armor-class',
  imports: [BreakdownView, Button, HoverCard, HoverCardContent, ProficiencyBadge, Stack, Text],
  templateUrl: './armor-class.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArmorClass {
  /** Undefined while loading: nothing shows. */
  public readonly vital = input.required<Vital | undefined>();
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly inline = ButtonVariant.Inline;

  readonly #format = inject(LocaleFormat);
  readonly #i18n = inject(TranslocoService);

  protected readonly shown = computed((): ShownArmorClass | undefined => {
    const vital = this.vital();
    if (vital === undefined) {
      return undefined;
    }
    this.#format.locale();
    const { statistic, rank, basis } = vital;
    const { result, kind, nameKey, rankSources } = statistic;
    const name = nameKey === undefined ? statistic.name : this.#i18n.translate(nameKey);
    const basisText = this.#basisText(basis);
    if (!result.ok) {
      return {
        name,
        total: undefined,
        error: this.#i18n.translate(result.error.key, result.error.params),
        statistic: undefined,
        kind,
        rank,
        rankSources: rankSources ?? [],
        basis: basisText,
      };
    }
    return {
      name,
      total: this.#format.number(result.total),
      error: undefined,
      statistic: result,
      kind,
      rank,
      rankSources: rankSources ?? [],
      basis: basisText,
    };
  });

  #basisText(basis: Vital['basis']): string | undefined {
    if (basis?.kind === VitalBasisKind.Armor) {
      return basis.name;
    }
    return basis?.kind === VitalBasisKind.Unarmored ? this.#i18n.translate(ArmorClassMessage.Unarmored) : undefined;
  }
}
