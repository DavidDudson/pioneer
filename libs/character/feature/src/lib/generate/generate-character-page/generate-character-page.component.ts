import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CHARACTER_NAMES, CLASS_SLOT } from '@pioneer/character/domain';
import type {
  CharacterId,
  CharacterName,
  GenerateCharacterBody,
  GenerationTheme,
  Seed,
} from '@pioneer/character/domain';
import {
  Drawer,
  Link,
  Page,
  PageBody,
  PageHeader,
  Stack,
  Step,
  StepBody,
  Stepper,
  Surface,
  Text,
  TextField,
  ToggleButton,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ChoiceValue, ClassRole } from '@pioneer/rules/sdk';
import type { Attribute, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';
import { OptionPicker } from '@pioneer/rules/ui';
import { filter, map, merge } from 'rxjs';

import { CharacterGenerator } from '../../data/character-generator';
import { ClassRoleOptions } from '../../data/class-role-options';
import { GenerateCharacterFields, GenerateCharacterForm } from '../../data/generate-character-form';
import { NO_THEME_CHOICE, themeOfChoice } from '../../data/generation-theme-choice';
import type { GenerationThemeChoice } from '../../data/generation-theme-choice';
import { WeaponBaseOptions } from '../../data/weapon-bases';
import { RollTableInput } from '../../roll-table/roll-table-input.component';
import { RollTable } from '../../roll-table/roll-table.component';
import { ROLE_MESSAGES, THEME_ATTRIBUTES, WEAPON_CATEGORY_MESSAGES, WEAPON_GROUP_MESSAGES } from './generate-theme';

interface DetailsModel {
  readonly seed: string;
  readonly name: string;
}

/** A character that was just generated, as the result reports it. */
interface MadeCharacter {
  readonly id: CharacterId;
  readonly name: CharacterName;
  readonly seed: Seed;
  /** The theme the character was made under; undefined when none was asked for. */
  readonly theme: GenerationTheme | undefined;
}

/** The key of `messages` that `picked` names, or undefined for no choice. */
function keyOf<TKey extends WeaponCategory | WeaponGroup>(
  messages: Readonly<Record<TKey, string>>,
  picked: string | undefined,
): TKey | undefined {
  return Object.keys(messages).find((value): value is TKey => value === picked);
}

const FIRST_STEP = 0;
const STEP_PARAM = 'step';

/**
 * Makes a level 1 character at random, one question at a time: an archetype (a role), then optionally a class that
 * plays it, a style (attributes and a weapon to favour), and a name and seed. The step is in the URL. The result shows
 * the seed once, with a link to the sheet, where the character is levelled up in the planner.
 */
@Component({
  selector: 'pio-generate-character-page',
  imports: [
    Drawer,
    FormField,
    Link,
    OptionPicker,
    Page,
    PageBody,
    PageHeader,
    RollTable,
    RollTableInput,
    Stack,
    Step,
    StepBody,
    Stepper,
    Surface,
    Text,
    TextField,
    ToggleButton,
    TranslocoPipe,
  ],
  templateUrl: './generate-character-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerateCharacterPage {
  readonly #generator = inject(CharacterGenerator);
  readonly #i18n = inject(TranslocoService);
  readonly #classes = inject(ClassRoleOptions);
  readonly #weaponBases = inject(WeaponBaseOptions);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the select labels are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));
  readonly #stepParam = toSignal(this.#route.queryParamMap.pipe(map((params) => Number(params.get(STEP_PARAM)))), {
    initialValue: FIRST_STEP,
  });

  protected readonly roles = Object.values(ClassRole);
  protected readonly roleMessages = ROLE_MESSAGES;
  protected readonly names = CHARACTER_NAMES;
  protected readonly themeAttributes = THEME_ATTRIBUTES;
  protected readonly namesOpen = signal(false);
  protected readonly role = signal<ClassRole | undefined>(undefined);
  /** The chosen class's id; '' for any class that plays the role. */
  protected readonly classId = signal('');
  protected readonly themeChoice = signal<GenerationThemeChoice>(NO_THEME_CHOICE);
  protected readonly result = signal<MadeCharacter | undefined>(undefined);
  protected readonly failed = signal(false);
  protected readonly pending = signal(false);

  /** The step in the URL, but never past the first until an archetype is chosen. */
  protected readonly step = computed(() => {
    const asked = this.#stepParam();
    return this.role() === undefined || !Number.isInteger(asked) || asked < FIRST_STEP ? FIRST_STEP : asked;
  });

  protected readonly details = signal<DetailsModel>({ seed: '', name: '' });
  protected readonly form = form(this.details, (path) => {
    validateStandardSchema(path, GenerateCharacterFields);
  });

  /** What a picker shows while nothing is chosen. */
  protected readonly noChoice = computed(() => {
    this.#messages();
    return this.#i18n.translate('character.list.theme.weaponNone');
  });
  protected readonly classOptions = computed((): readonly SelectOption<string>[] => {
    this.#messages();
    const role = this.role();
    const any: SelectOption<string> = { value: '', label: this.#i18n.translate('character.generate.anyClass') };
    const played = role === undefined ? [] : this.#classes.playing(role);
    return [any, ...played.map((each) => ({ value: each.id, label: String(each.name) }))];
  });
  protected readonly categoryOptions = computed(() => {
    this.#messages();
    return this.#options(WEAPON_CATEGORY_MESSAGES);
  });
  protected readonly groupOptions = computed(() => {
    this.#messages();
    return this.#options(WEAPON_GROUP_MESSAGES);
  });
  protected readonly baseOptions = computed(() => {
    this.#messages();
    const none: SelectOption<string> = { value: '', label: this.#i18n.translate('character.list.theme.weaponNone') };
    return [none, ...this.#weaponBases.bases().map(({ base, name }) => ({ value: base, label: name }))];
  });

  protected readonly roleSummary = computed(() => {
    this.#messages();
    const role = this.role();
    return role === undefined ? '' : this.#i18n.translate(ROLE_MESSAGES[role]);
  });
  protected readonly classSummary = computed(() => {
    this.#messages();
    const chosen = this.classOptions().find((option) => option.value === this.classId());
    return chosen?.label ?? this.#i18n.translate('character.generate.anyClass');
  });
  protected readonly styleSummary = computed(() => {
    this.#messages();
    const { favoured, category, group, base } = this.themeChoice();
    const parts = [
      ...favoured.map((attribute) =>
        this.#i18n.translate(THEME_ATTRIBUTES.find((each) => each.attribute === attribute)?.label ?? ''),
      ),
      ...[category, group, base].filter((each) => each !== undefined),
    ];
    return parts.length === 0 ? this.#i18n.translate('character.generate.noStyle') : parts.join(', ');
  });

  protected async goTo(step: number): Promise<void> {
    await this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { [STEP_PARAM]: step },
      queryParamsHandling: 'merge',
    });
  }

  protected isRole(role: ClassRole): boolean {
    return this.role() === role;
  }

  /** Choosing another archetype drops a class the new one does not play. */
  protected chooseRole(role: ClassRole): void {
    this.role.set(role);
    const played = this.#classes.playing(role).some((each) => each.id === this.classId());
    this.classId.update((current) => (played ? current : ''));
  }

  protected isFavoured(attribute: Attribute): boolean {
    return this.themeChoice().favoured.includes(attribute);
  }

  protected favour(attribute: Attribute, on: boolean): void {
    this.themeChoice.update((choice) => ({
      ...choice,
      favoured: on ? [...choice.favoured, attribute] : choice.favoured.filter((favoured) => favoured !== attribute),
    }));
  }

  protected chooseCategory(category: string | undefined): void {
    this.themeChoice.update((choice) => ({
      ...choice,
      category: keyOf(WEAPON_CATEGORY_MESSAGES, category),
      base: undefined,
    }));
  }

  protected chooseGroup(group: string | undefined): void {
    this.themeChoice.update((choice) => ({ ...choice, group: keyOf(WEAPON_GROUP_MESSAGES, group), base: undefined }));
  }

  /** A base fixes the category and group its weapons share; with no base chosen those stay as they were. */
  protected chooseBase(picked: string | undefined): void {
    const chosen = this.#weaponBases.bases().find(({ base }) => base === picked);
    this.themeChoice.update((choice) =>
      chosen === undefined
        ? { ...choice, base: undefined }
        : { ...choice, category: chosen.category, group: chosen.group, base: chosen.base },
    );
  }

  /** Makes the character from the answers; the stepper's Finish. */
  protected async generate(): Promise<void> {
    const role = this.role();
    if (role === undefined || this.pending()) {
      return;
    }
    this.pending.set(true);
    this.failed.set(false);
    try {
      const body = this.#body(role);
      const { character, seed } = await this.#generator.generate(body);
      this.result.set({ id: character.id, name: character.name, seed, theme: body.theme });
    } catch {
      this.failed.set(true);
    } finally {
      this.pending.set(false);
    }
  }

  /** The request for the answers so far: the role, the class lock when one is chosen, the theme, name and seed. */
  #body(role: ClassRole): GenerateCharacterBody {
    const theme = themeOfChoice(this.themeChoice());
    const classId = this.classId();
    const locks = classId === '' ? [] : [{ slot: CLASS_SLOT, selection: ChoiceValue.parse(classId) }];
    return { ...GenerateCharacterForm.parse(this.details()), role, locks, ...(theme === undefined ? {} : { theme }) };
  }

  /** The options of a weapon select: no choice first, then each value named by its message. */
  #options(messages: Readonly<Record<string, string>>): readonly SelectOption<string>[] {
    const none: SelectOption<string> = { value: '', label: this.#i18n.translate('character.list.theme.weaponNone') };
    return [none, ...Object.entries(messages).map(([value, key]) => ({ value, label: this.#i18n.translate(key) }))];
  }
}
