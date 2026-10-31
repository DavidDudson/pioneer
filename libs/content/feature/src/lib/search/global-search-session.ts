import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { BadgeTone, LocaleFormat } from '@pioneer/frontier';
import type { ComboboxOption, ComboboxTag } from '@pioneer/frontier/data';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';
import { RARITY_TONES } from '@pioneer/rules/ui';

import { BROWSE_KINDS } from '../browser/browse-kinds';
import { injectBrowseSearch, searchFromQuery } from '../browser/browse-search';
import { GlobalSearchIndex } from './global-search-index';
import { mergeBelow, nameMatches } from './global-search-results';

/** The message key of each kind the search finds, spelled out in full so the key check sees them. */
/** The Legacy badge's label, shared with the content browser. */
const LEGACY_MESSAGE = 'contentBrowser.legacy.label';

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

/** Most traits an option shows; the rest are one open away. */
const TRAITS_SHOWN = 3;

/** What the list is made from: the words typed, the entries their names match and what the server found for them. */
interface Incoming {
  readonly words: string;
  readonly local: readonly ContentId[];
  readonly server: readonly ContentId[];
}

/**
 * One search box's state, shared by the shell's global search and the sheet's side panel: names match as you type, in
 * the kinds loaded so far, and the server's full-text results for the same words are added below once they arrive.
 * Entries already listed never move. Provide it on the component that owns the box.
 */
@Injectable()
export class GlobalSearchSession {
  readonly #index = inject(GlobalSearchIndex);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #language = toSignal(this.#i18n.langChanges$);

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
    // Blank words ask the server nothing, yet its query still holds the answer to the words before.
    const found = words !== '' && this.#quiet().trim() === words ? (this.#server.data() ?? []) : [];
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

  /** The words last typed, whole. */
  public readonly words = this.#typed.asReadonly();

  public readonly options = computed<readonly ComboboxOption<ContentId>[]>(() => {
    this.#language();
    const held = this.#index.byId();
    const legacy = this.#index.legacy();
    return this.#shown().flatMap((id) => {
      const entry = held.get(id);
      if (entry === undefined) {
        return [];
      }
      return [{ value: entry.id, label: entry.name, tags: this.#tagsOf(entry, legacy.has(entry.id)) }];
    });
  });
  /** What the name alone cannot say: the kind, the level when it has one, and the first traits, toned by rarity. */
  #tagsOf(entry: ContentEntry, legacy: boolean): readonly ComboboxTag[] {
    const kind = KIND_MESSAGES[entry.kind];
    const level = 'level' in entry && typeof entry.level === 'number' ? entry.level : undefined;
    const tone = RARITY_TONES[entry.rarity];
    return [
      ...(kind === undefined ? [] : [{ label: this.#i18n.translate(kind), tone: BadgeTone.Info }]),
      ...(legacy ? [{ label: this.#i18n.translate(LEGACY_MESSAGE), tone: BadgeTone.Warning }] : []),
      ...(level === undefined
        ? []
        : [{ label: this.#i18n.translate('shell.search.level', { level: this.#format.number(level) }) }]),
      ...entry.traits.slice(0, TRAITS_SHOWN).map((trait): ComboboxTag => ({ label: trait, tone })),
    ];
  }

  /** Skeleton rows only while there is nothing to list yet and the server may still have something. */
  public readonly loading = computed(
    () => this.#typed().trim() !== '' && this.options().length === 0 && this.#server.isFetching(),
  );

  /** The entry listed under `id`, once its kind has loaded. */
  public entry(id: ContentId | undefined): ContentEntry | undefined {
    return id === undefined ? undefined : this.#index.byId().get(id);
  }

  /** Starts loading the kinds names are matched in, as soon as the box is used. */
  public warm(): void {
    this.#index.warm();
  }

  public type(text: string): void {
    this.#typed.set(text);
    this.warm();
  }

  public search(text: string): void {
    this.#quiet.set(text);
  }

  /** Sets the words without typing them, as a restored link does; the server is asked at once. */
  public restore(text: string): void {
    this.type(text);
    this.search(text);
  }

  public clear(): void {
    this.#typed.set('');
    this.#quiet.set('');
  }
}
