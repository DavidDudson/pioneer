import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LocaleFormat } from '@pioneer/frontier';
import { Combobox } from '@pioneer/frontier/data';
import type { ComboboxOption } from '@pioneer/frontier/data';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { entryTarget } from '@pioneer/rules/ui';

import { BROWSE_KINDS } from '../browser/browse-kinds';
import { injectBrowseSearch, searchFromQuery } from '../browser/browse-search';
import { GlobalSearchIndex } from './global-search-index';
import { mergeBelow, nameMatches } from './global-search-results';
import { isSearchShortcut } from './global-search-shortcut';

const SearchMessage = {
  Label: 'shell.search.label',
  Placeholder: 'shell.search.placeholder',
} as const;

/** The message key of each kind the search finds, spelled out in full so the key check sees them. */
const KIND_MESSAGES: Readonly<Partial<Record<ContentKind, string>>> = {
  [ContentKind.Action]: 'shell.search.kind.action',
  [ContentKind.Armor]: 'shell.search.kind.armor',
  [ContentKind.Consumable]: 'shell.search.kind.consumable',
  [ContentKind.Creature]: 'shell.search.kind.creature',
  [ContentKind.Equipment]: 'shell.search.kind.equipment',
  [ContentKind.Feat]: 'shell.search.kind.feat',
  [ContentKind.Kit]: 'shell.search.kind.kit',
  [ContentKind.Rune]: 'shell.search.kind.rune',
  [ContentKind.Shield]: 'shell.search.kind.shield',
  [ContentKind.Spell]: 'shell.search.kind.spell',
  [ContentKind.Treasure]: 'shell.search.kind.treasure',
  [ContentKind.Weapon]: 'shell.search.kind.weapon',
};

/** What the list is made from: the words typed, the entries their names match and what the server found for them. */
interface Incoming {
  readonly words: string;
  readonly local: readonly ContentId[];
  readonly server: readonly ContentId[];
}

/**
 * The shell's global content search (public, no account), opened with `/` or Ctrl/Cmd+K. Names match as you type, in
 * the kinds loaded so far: they load one at a time when the browser is idle, so typing never waits. The server's
 * full-text results for the same words are added below once they arrive, and entries already listed never move.
 * Arrow keys move through the list, Enter opens the entry and Escape closes.
 */
@Component({
  selector: 'pio-global-search',
  imports: [Combobox, TranslocoPipe],
  templateUrl: './global-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'shortcut($event)', '(focusin)': 'warm()' },
})
export class GlobalSearch {
  readonly #index = inject(GlobalSearchIndex);
  readonly #router = inject(Router);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #language = toSignal(this.#i18n.langChanges$);
  protected readonly combobox = viewChild.required<Combobox<ContentId>>(Combobox);

  protected readonly Message = SearchMessage;
  /** Every keystroke, and the words once typing goes quiet: those the server is asked about. */
  readonly #typed = signal('');
  readonly #quiet = signal('');

  readonly #server = injectBrowseSearch(() => {
    const words = searchFromQuery(this.#quiet());
    return words === undefined ? undefined : { words, kinds: BROWSE_KINDS };
  });
  readonly #incoming = computed<Incoming>(() => {
    const words = this.#typed().trim();
    const held = this.#index.byId();
    // Matches of words typed since are not this query's: they would only be dropped as stale.
    const found = this.#quiet().trim() === words ? (this.#server.data() ?? []) : [];
    return {
      words,
      local: nameMatches(this.#index.entries(), words, (left, right) => this.#format.compare(left, right)).map(
        (entry) => entry.id,
      ),
      server: found.filter((id) => held.has(id)),
    };
  });
  /** The ids listed, best first: for the same words only ever added to below, so the list never reshuffles. */
  readonly #shown = linkedSignal<Incoming, readonly ContentId[]>({
    source: this.#incoming,
    computation: (next, previous) => {
      const kept = previous?.source.words === next.words ? previous.value : [];
      return mergeBelow(mergeBelow(kept, next.local), next.server);
    },
  });

  protected readonly options = computed<readonly ComboboxOption<ContentId>[]>(() => {
    this.#language();
    const held = this.#index.byId();
    return this.#shown().flatMap((id) => {
      const entry = held.get(id);
      if (entry === undefined) {
        return [];
      }
      const kind = KIND_MESSAGES[entry.kind];
      const option: ComboboxOption<ContentId> = { value: entry.id, label: entry.name };
      return [kind === undefined ? option : { ...option, description: this.#i18n.translate(kind) }];
    });
  });
  /** Skeleton rows only while there is nothing to list yet and the server may still have something. */
  protected readonly loading = computed(
    () => this.#typed().trim() !== '' && this.options().length === 0 && this.#server.isFetching(),
  );

  /** Starts loading the kinds names are matched in, as soon as the box is used. */
  protected warm(): void {
    this.#index.warm();
  }

  protected type(text: string): void {
    this.#typed.set(text);
    this.warm();
  }

  protected search(text: string): void {
    this.#quiet.set(text);
  }

  protected async open(): Promise<void> {
    const id = this.combobox().value();
    const entry = id === undefined ? undefined : this.#index.byId().get(id);
    if (entry === undefined) {
      return;
    }
    this.#clear();
    const target = entryTarget(entry);
    await this.#router.navigate(typeof target === 'string' ? [target] : [...target]);
  }

  protected cancel(): void {
    this.#clear();
  }

  protected shortcut(event: KeyboardEvent): void {
    if (isSearchShortcut(event)) {
      event.preventDefault();
      this.combobox().focus();
    }
  }

  #clear(): void {
    // Set on the control itself: a binding would only reach it on the next change detection, after it restored the label.
    this.combobox().value.set(undefined);
    this.#typed.set('');
    this.#quiet.set('');
  }
}
