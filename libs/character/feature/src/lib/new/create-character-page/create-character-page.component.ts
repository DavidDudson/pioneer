import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { BACKGROUND_SLOT, CLASS_SLOT, HERITAGE_SLOT } from '@pioneer/character/domain';
import { Page, PageBody, PageHeader, Stack, Step, StepBody, Stepper, Text, TextInput } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { OptionPicker } from '@pioneer/rules/ui';
import { Temporal } from '@pioneer/shared/kernel';
import { map } from 'rxjs';

import { CHARACTER_CONTENT_KINDS, injectContentRegistry } from '../../data/content-registry-query';
import { draftCharacter, DraftField, draftOf, validName } from '../../data/creation-draft';
import type { CreationDraft } from '../../data/creation-draft';
import { CreationDraftSaver } from '../../data/creation-draft-saver';
import { OriginChoiceOptions } from '../../data/origin-choice-options';
import { sheetRootOptions, sheetSubclass } from '../../sheet/sheet-build';
import type { SheetSubclass } from '../../sheet/sheet-build';

const FIRST_STEP = 0;
const STEP_PARAM = 'step';
const NO_OPTIONS: readonly SelectOption<string>[] = [];
/** What choosing a part empties, because its options were read over the part chosen. */
const DROPPED: Readonly<Record<DraftField, readonly DraftField[]>> = {
  name: [],
  ancestry: [DraftField.Heritage],
  heritage: [],
  background: [],
  class: [DraftField.Subclass],
  subclass: [],
};

/** Whether `options` offers `value`. */
function isOffered(options: readonly SelectOption<string>[], value: string): boolean {
  return options.some((option) => option.value === value);
}

/** The label of the option that has `value`; empty when none does. */
function labelOf(options: readonly SelectOption<string>[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? '';
}

type QueryChanges = Readonly<Record<string, string | number | undefined>>;

/**
 * The first half of the level 1 builder: a name, ancestry, heritage, background and class, one question at a time. What
 * is chosen lives in the URL, so a reload restores it and leaving saves nothing. Finishing makes the character and
 * opens the rest of level 1 (boosts, skills, feats) on it.
 */
@Component({
  selector: 'pio-create-character-page',
  imports: [OptionPicker, Page, PageBody, PageHeader, Stack, Step, StepBody, Stepper, Text, TextInput, TranslocoPipe],
  templateUrl: './create-character-page.component.html',
  providers: [CreationDraftSaver],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCharacterPage {
  readonly #saver = inject(CreationDraftSaver);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #origins = inject(OriginChoiceOptions);
  readonly #registry = injectContentRegistry(CHARACTER_CONTENT_KINDS);
  readonly #params = toSignal(this.#route.queryParamMap);
  readonly #stepParam = toSignal(this.#route.queryParamMap.pipe(map((params) => Number(params.get(STEP_PARAM)))), {
    initialValue: FIRST_STEP,
  });

  protected readonly pending = signal(false);
  protected readonly failed = signal(false);

  protected readonly draft = computed((): CreationDraft => {
    const params = this.#params();
    return draftOf((field) => params?.get(field) ?? undefined);
  });

  /** The character the draft would make, so each step's options read over the picks before it. */
  readonly #character = computed(() => draftCharacter(this.draft(), Temporal.Now.instant()));

  protected readonly ancestryOptions = computed((): readonly SelectOption<string>[] =>
    this.#origins.ancestries().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly heritageOptions = computed(() => this.#rootOptions(HERITAGE_SLOT));
  protected readonly backgroundOptions = computed(() => this.#rootOptions(BACKGROUND_SLOT));
  protected readonly classOptions = computed(() => this.#rootOptions(CLASS_SLOT));
  protected readonly subclass = computed((): SheetSubclass | undefined => {
    const registry = this.#registry.data();
    const character = this.#character();
    return registry === undefined || character === undefined || this.draft().class === ''
      ? undefined
      : sheetSubclass(registry, character);
  });
  protected readonly subclassOptions = computed(() => this.subclass()?.options ?? NO_OPTIONS);

  protected readonly validName = computed(() => validName(this.draft().name));
  protected readonly validAncestry = computed(() => isOffered(this.ancestryOptions(), this.draft().ancestry));
  protected readonly validHeritage = computed(() => isOffered(this.heritageOptions(), this.draft().heritage));
  protected readonly validBackground = computed(() => isOffered(this.backgroundOptions(), this.draft().background));
  protected readonly validClass = computed(
    () =>
      isOffered(this.classOptions(), this.draft().class) &&
      (this.subclassOptions().length === 0 || isOffered(this.subclassOptions(), this.draft().subclass)),
  );

  /** The step in the URL, but never past the first one still unanswered. */
  protected readonly step = computed(() => {
    const asked = this.#stepParam();
    const answered = [this.validName(), this.validAncestry(), this.validHeritage(), this.validBackground()];
    const unanswered = answered.indexOf(false);
    const limit = unanswered === -1 ? answered.length : unanswered;
    return Number.isInteger(asked) && asked > FIRST_STEP ? Math.min(asked, limit) : FIRST_STEP;
  });

  protected readonly ancestrySummary = computed(() => labelOf(this.ancestryOptions(), this.draft().ancestry));
  protected readonly heritageSummary = computed(() => labelOf(this.heritageOptions(), this.draft().heritage));
  protected readonly backgroundSummary = computed(() => labelOf(this.backgroundOptions(), this.draft().background));
  protected readonly classSummary = computed(() => labelOf(this.classOptions(), this.draft().class));

  protected async goTo(step: number): Promise<void> {
    await this.#merge({ [STEP_PARAM]: step });
  }

  /** Choosing a part drops the picks read over it: a new ancestry clears the heritage. */
  protected async choose(field: DraftField, value: string | undefined): Promise<void> {
    const cleared = Object.fromEntries(DROPPED[field].map((each) => [each, undefined]));
    await this.#merge({ ...cleared, [field]: value === '' ? undefined : value });
  }

  /** Makes the character from the draft, and opens the rest of level 1 on it. */
  protected async create(): Promise<void> {
    if (this.pending()) {
      return;
    }
    this.pending.set(true);
    this.failed.set(false);
    try {
      const id = await this.#saver.save(this.draft(), this.subclass()?.key);
      await this.#router.navigate([id], { relativeTo: this.#route });
    } catch {
      this.failed.set(true);
    } finally {
      this.pending.set(false);
    }
  }

  async #merge(queryParams: QueryChanges): Promise<void> {
    await this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  #rootOptions(slot: typeof HERITAGE_SLOT): readonly SelectOption<string>[] {
    const registry = this.#registry.data();
    const character = this.#character();
    return registry === undefined || character === undefined ? NO_OPTIONS : sheetRootOptions(registry, character, slot);
  }
}
