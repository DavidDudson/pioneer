import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideShieldAlert, LucideShieldBan, LucideShieldHalf } from '@lucide/angular';
import type { LucideIcon } from '@lucide/angular';
import { Button, HoverCard, HoverCardContent, Icon, Stack } from '@pioneer/frontier';
import { DefenceStatusKind } from '@pioneer/rules/engine';
import type { AdjustmentLine, Defences, ImmunityLine } from '@pioneer/rules/engine';
import type { ContentId, DamageException, Immunity } from '@pioneer/rules/sdk';

import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import { DefenceKind } from '../defence-kind';
import { DefencesMessage } from '../defences-messages';
import { DefencesView } from '../defences.component';

/** One kind the character has, with the icon and the message naming it. */
interface ActiveKind {
  readonly kind: DefenceKind;
  readonly icon: LucideIcon;
  readonly label: string;
  /** The kind as the one-item list `pio-defences` takes. */
  readonly kinds: readonly DefenceKind[];
}

/** The kinds in the order they show, each with its icon and name. */
const KINDS: readonly ActiveKind[] = [
  {
    kind: DefenceKind.Resistances,
    icon: LucideShieldHalf,
    label: DefencesMessage.Resistances,
    kinds: [DefenceKind.Resistances],
  },
  {
    kind: DefenceKind.Immunities,
    icon: LucideShieldBan,
    label: DefencesMessage.Immunities,
    kinds: [DefenceKind.Immunities],
  },
  {
    kind: DefenceKind.Weaknesses,
    icon: LucideShieldAlert,
    label: DefencesMessage.Weaknesses,
    kinds: [DefenceKind.Weaknesses],
  },
];

/** Whether a line counts: one that applies or may, not one a better line supersedes or one that failed. */
function isActive({ status }: ImmunityLine | AdjustmentLine): boolean {
  return status.kind === DefenceStatusKind.Applied || status.kind === DefenceStatusKind.Conditional;
}

function linesOf(defences: Defences, kind: DefenceKind): readonly (ImmunityLine | AdjustmentLine)[] {
  const byKind: Readonly<Record<DefenceKind, readonly (ImmunityLine | AdjustmentLine)[]>> = {
    [DefenceKind.Immunities]: defences.immunities,
    [DefenceKind.Weaknesses]: defences.weaknesses,
    [DefenceKind.Resistances]: defences.resistances,
  };
  return byKind[kind];
}

/**
 * An icon for each of resistances, immunities and weaknesses the character has in force, each opening the lines of its
 * kind on hover. Nothing shows while the character has none, or while the defences load.
 *
 * Read-only and presentational (ADR-0028): the caller passes the engine's `Defences` and the names the lines refer to.
 *
 * ```html
 * <pio-defence-icons [defences]="defences()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-defence-icons',
  imports: [Button, DefencesView, HoverCard, HoverCardContent, Icon, Stack, TranslocoPipe],
  templateUrl: './defence-icons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefenceIcons {
  /** Undefined while loading: nothing shows. */
  public readonly defences = input.required<Defences | undefined>();
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly immunityNames = input<ReadonlyMap<Immunity, string>>(new Map());
  public readonly exceptionNames = input<ReadonlyMap<DamageException, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly active = computed((): readonly ActiveKind[] => {
    const defences = this.defences();
    if (defences === undefined) {
      return [];
    }
    return KINDS.filter(({ kind }) => linesOf(defences, kind).some((line) => isActive(line)));
  });
}
