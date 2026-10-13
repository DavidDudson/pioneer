import { signal } from '@angular/core';

import { tableSchema } from '../../data/table/table-schema';
import { succeedSlowly } from '../../testing/story-actions';
import { BadgeTone } from '../../text/badge/badge.component';
import type { PickerSort } from './picker.component';

/* A pretend server for the picker stories: 400 feats, searched, sorted and handed out a page at a time. */

export interface Feat {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly kind: string;
  /** Why the feat can't be picked, when it can't. */
  readonly locked?: string;
}

const FEAT_COUNT = 400;
const PAGE_SIZE = 25;
const LEVELS = 20;
const LOCKED_EVERY = 7;
const LOCKED_REMAINDER = 3;
const KINDS = ['General', 'Skill', 'Ancestry', 'Class'] as const;

export const FEATS: readonly Feat[] = Array.from({ length: FEAT_COUNT }, (_entry, index) => ({
  id: `feat-${index + 1}`,
  name: `Feat ${index + 1}`,
  level: (index % LEVELS) + 1,
  kind: KINDS[index % KINDS.length] ?? 'General',
  ...(index % LOCKED_EVERY === LOCKED_REMAINDER ? { locked: 'Needs expert in Athletics' } : {}),
}));

export const COLUMNS = tableSchema<Feat>()
  .addText({ id: 'name', header: 'Name', value: (feat) => feat.name, width: 'md' })
  .addText({ id: 'level', header: 'Level', value: (feat) => feat.level, width: 'sm' })
  .addTag({
    id: 'kind',
    header: 'Kind',
    value: (feat) => ({ label: feat.kind, tone: feat.kind === 'Class' ? BadgeTone.Info : BadgeTone.Neutral }),
    width: 'sm',
  })
  .build();

function compare(left: Feat, right: Feat, column: string): number {
  if (column === 'level') {
    return left.level - right.level;
  }
  if (left.name === right.name) {
    return 0;
  }
  return left.name < right.name ? -1 : 1;
}

/** What the server would send for a query and an order: every match, ordered. */
function matching(query: string, sort: PickerSort | undefined): readonly Feat[] {
  const needle = query.trim().toLowerCase();
  const found = FEATS.filter((feat) => feat.name.toLowerCase().includes(needle));
  if (sort === undefined) {
    return found;
  }
  const direction = sort.descending ? -1 : 1;
  return found.toSorted((left, right) => compare(left, right, sort.column) * direction);
}

/** Holds the rows the picker shows, and answers `searched`, `sorted` and `loadMore` slowly, like a request would. */
export class FeatServer {
  public readonly rows = signal<readonly Feat[]>([]);
  public readonly loading = signal(false);
  public readonly loadingMore = signal(false);
  public readonly hasMore = signal(false);
  #query = '';
  #sort: PickerSort | undefined = undefined;

  public async search(query: string): Promise<void> {
    this.#query = query;
    await this.#load(false);
  }

  public async sort(sort: PickerSort | undefined): Promise<void> {
    this.#sort = sort;
    await this.#load(false);
  }

  public async more(): Promise<void> {
    await this.#load(true);
  }

  async #load(more: boolean): Promise<void> {
    (more ? this.loadingMore : this.loading).set(true);
    await succeedSlowly();
    const matches = matching(this.#query, this.#sort);
    const shown = more ? this.rows().length + PAGE_SIZE : PAGE_SIZE;
    this.rows.set(matches.slice(0, shown));
    this.hasMore.set(matches.length > shown);
    this.loading.set(false);
    this.loadingMore.set(false);
  }
}
