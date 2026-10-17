import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { Params } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ContentBrowserTier } from '@pioneer/content/ui';
import type { ContentBrowserState } from '@pioneer/content/ui';
import { Button, Stack } from '@pioneer/frontier';
import { Combobox } from '@pioneer/frontier/data';
import type { ContentId } from '@pioneer/rules/sdk';

import { refOf } from '../browser/browse-state';
import { ContentBrowser } from '../browser/content-browser.component';
import { GlobalSearchSession } from '../search/global-search-session';
import { isSearchShortcut } from '../search/global-search-shortcut';
import { DRAWER_OPEN, DRAWER_PARAM, entryFromParam, entryToParam, PanelParam } from './side-panel-state';

const PanelMessage = {
  Label: 'shell.search.label',
  Placeholder: 'shell.search.placeholder',
  Back: 'content.sidePanel.back',
} as const;

/**
 * The content search and reader for a page's docked drawer (the sheet's side panel). The search is the shell's global
 * search, with the same name matches, merged server results and keyboard behaviour; picking a result reads the entry
 * under the box, with a link back to the results. The words, the entry and the drawer being open are in the address
 * (`sq`, `se`, `drawer`), so a reload or a shared link restores them. Ctrl/Cmd+K, or `/` outside a text field, opens
 * the drawer on the search box.
 */
@Component({
  selector: 'pio-content-side-panel',
  imports: [Button, Combobox, ContentBrowser, Stack, TranslocoPipe],
  templateUrl: './content-side-panel.component.html',
  providers: [GlobalSearchSession],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'shortcut($event)', '(focusin)': 'session.warm()' },
})
export class ContentSidePanel {
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #injector = inject(Injector);
  protected readonly session = inject(GlobalSearchSession);
  protected readonly combobox = viewChild.required<Combobox<ContentId>>(Combobox);
  readonly #params = toSignal(this.#route.queryParamMap, { requireSync: false });

  protected readonly Message = PanelMessage;
  protected readonly tier = ContentBrowserTier.Preview;

  /** The words the box shows when nothing is picked: the address's, or what the box last put back. */
  protected readonly query = signal('');
  /** The words last written to the address, so only a change from outside is taken back in. */
  #written: string | undefined;

  readonly #fromAddress = computed(() => this.#params()?.get(PanelParam.Query) ?? '');
  /** The entry being read, as the browser's state, or nothing while the results show. */
  protected readonly state = computed<ContentBrowserState | undefined>(() => {
    const selected = entryFromParam(this.#params()?.get(PanelParam.Entry) ?? undefined);
    return selected === undefined ? undefined : { kinds: [selected.kind], query: '', filters: [], selected };
  });

  public constructor() {
    effect(() => {
      const words = this.#fromAddress();
      untracked(() => {
        if (words !== this.#written) {
          this.#written = words;
          this.query.set(words);
          this.session.restore(words);
        }
      });
    });
  }

  /** Opens the drawer on the search box. */
  public async reveal(): Promise<void> {
    await this.#navigate({ [DRAWER_PARAM]: DRAWER_OPEN }, true);
    this.focusSearch();
  }

  /** Puts the cursor in the search box once the drawer has taken its own focus. */
  public focusSearch(): void {
    afterNextRender(
      () => {
        this.combobox().focus();
      },
      { injector: this.#injector },
    );
  }

  protected async searched(words: string): Promise<void> {
    this.session.search(words);
    this.#written = words;
    await this.#navigate({ [PanelParam.Query]: words === '' ? undefined : words }, true);
  }

  /** Reads the picked result: the box keeps the words, the entry shows under it. */
  protected async read(): Promise<void> {
    const combobox = this.combobox();
    const entry = this.session.entry(combobox.value());
    if (entry === undefined) {
      return;
    }
    const words = this.session.words().trim();
    this.#written = words;
    this.query.set(words);
    // Set on the control itself: a binding would only reach it on the next change detection, after it showed the label.
    combobox.value.set(undefined);
    await this.#navigate(
      { [PanelParam.Query]: words === '' ? undefined : words, [PanelParam.Entry]: entryToParam(refOf(entry)) },
      false,
    );
  }

  /** Back to the results of the same words. */
  protected async back(): Promise<void> {
    await this.#navigate({ [PanelParam.Entry]: undefined }, false);
    this.combobox().open();
    this.focusSearch();
  }

  protected async shortcut(event: KeyboardEvent): Promise<void> {
    if (isSearchShortcut(event)) {
      event.preventDefault();
      await this.reveal();
    }
  }

  async #navigate(queryParams: Params, replaceUrl: boolean): Promise<void> {
    try {
      await this.#router.navigate([], {
        relativeTo: this.#route,
        queryParams,
        queryParamsHandling: 'merge',
        replaceUrl,
      });
    } catch {
      // A navigation that is cancelled leaves the address as it was.
    }
  }
}
