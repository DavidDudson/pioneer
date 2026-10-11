import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { DateDisplay, Stack, Text } from '@pioneer/frontier';
import { OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentId, EventRef, Origin, OriginHop, PackId } from '@pioneer/rules/sdk';
import type { Temporal, UserId, ValueOf } from '@pioneer/shared/kernel';
import { filter, merge } from 'rxjs';

import { SourceLineView } from '../source-line/source-line.component';
import { OriginChainMessage } from './origin-chain-messages';
import { NO_ORIGIN_NAMES } from './origin-names';
import type { OriginNames } from './origin-names';

const SegmentKind = { Text: 'text', Date: 'date' } as const;
type SegmentKind = ValueOf<typeof SegmentKind>;

/** The chain as flat segments, joins included, so the template adds no whitespace of its own. */
type Segment =
  | { readonly kind: typeof SegmentKind.Text; readonly text: string }
  /** When a user set an override, shown relative to now. */
  | { readonly kind: typeof SegmentKind.Date; readonly at: Temporal.Instant };

type ConditionHop = Extract<OriginHop, { readonly kind: typeof OriginHopKind.Condition }>;
type OverrideHop = Extract<OriginHop, { readonly kind: typeof OriginHopKind.Override }>;

function text(value: string): Segment {
  return { kind: SegmentKind.Text, text: value };
}

/**
 * Where a line comes from (rules-engine.md, "Provenance"): its origin's hops, outermost first, each in words ("chosen
 * for class", "granted by Fighter", "Breastplate, worn", "Frightened 1, applied by Demoralize", "set by Ada 2 days
 * ago, “House rule”"), then the entry holding the rule element, as one sentence; then that entry's sources.
 *
 * Read-only and presentational (ADR-0028): the caller passes the origin, the display names of the entries it names,
 * and the other names it resolved. A missing entry name shows its id, a missing user reads "a user", a missing slot
 * shows its key, a missing item reads "an item", and an unknown event is left out.
 *
 * ```html
 * <pio-origin-chain [origin]="line.origin" [entryNames]="names()" [names]="originNames()" />
 * ```
 */
@Component({
  selector: 'pio-origin-chain',
  imports: [DateDisplay, SourceLineView, Stack, Text],
  templateUrl: './origin-chain.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OriginChainView {
  public readonly origin = input.required<Origin>();
  /** Display names of the entries the chain names. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly names = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly SegmentKind = SegmentKind;
  protected readonly authors = computed((): ReadonlyMap<UserId, string> => this.names().users ?? new Map());
  protected readonly packs = computed((): ReadonlyMap<PackId, string> => this.names().packs ?? new Map());

  readonly #i18n = inject(TranslocoService);
  /** Ticks when the locale changes or the `rules` scope finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly segments = computed((): readonly Segment[] => {
    this.#messages();
    const { hops, entry } = this.origin();
    const steps = [...hops.map((hop) => this.#hop(hop)), [text(this.#entry(entry))]];
    const then = text(this.#i18n.translate(OriginChainMessage.Then));
    const segments: Segment[] = [];
    for (const step of steps) {
      if (segments.length > 0) {
        segments.push(then);
      }
      segments.push(...step);
    }
    return segments;
  });

  #hop(hop: OriginHop): readonly Segment[] {
    switch (hop.kind) {
      case OriginHopKind.Choice: {
        const slot = this.names().slots?.get(hop.slot) ?? hop.slot;
        return [text(this.#i18n.translate(OriginChainMessage.Choice, { slot }))];
      }
      case OriginHopKind.Grant: {
        return [text(this.#i18n.translate(OriginChainMessage.Grant, { name: this.#entry(hop.by) }))];
      }
      case OriginHopKind.Inventory: {
        const item = this.names().items?.get(hop.item) ?? this.#i18n.translate(OriginChainMessage.UnknownItem);
        return [text(this.#i18n.translate(OriginChainMessage.Inventory, { item, state: hop.state }))];
      }
      case OriginHopKind.Condition: {
        return [text(this.#condition(hop))];
      }
      case OriginHopKind.Effect: {
        return [text(this.#appliedBy(this.#entry(hop.effect), hop.appliedBy))];
      }
      case OriginHopKind.Override: {
        return this.#override(hop);
      }
      case OriginHopKind.Variant: {
        return [text(this.#entry(hop.rule))];
      }
      default: {
        return hop satisfies never;
      }
    }
  }

  #condition(hop: ConditionHop): string {
    const condition = this.#i18n.translate(OriginChainMessage.Condition, {
      name: this.#entry(hop.condition),
      hasValue: hop.value === undefined ? 'no' : 'yes',
      value: hop.value ?? '',
    });
    return this.#appliedBy(condition, hop.appliedBy);
  }

  /** Who set it, then when, relative to now, then their note. */
  #override(hop: OverrideHop): readonly Segment[] {
    const user = this.names().users?.get(hop.by) ?? this.#i18n.translate(OriginChainMessage.UnknownUser);
    const setBy: Segment[] = [
      text(this.#i18n.translate(OriginChainMessage.SetBy, { user })),
      { kind: SegmentKind.Date, at: hop.at },
    ];
    if (hop.note !== undefined) {
      setBy.push(text(this.#i18n.translate(OriginChainMessage.Note, { note: hop.note })));
    }
    return setBy;
  }

  /** A condition or effect, with the campaign event that applied it when the caller could name it. */
  #appliedBy(hop: string, appliedBy: EventRef | undefined): string {
    const event = appliedBy === undefined ? undefined : this.names().events?.get(appliedBy);
    return event === undefined ? hop : this.#i18n.translate(OriginChainMessage.AppliedBy, { hop, event });
  }

  #entry(entry: ContentId): string {
    return this.entryNames().get(entry) ?? entry;
  }
}
