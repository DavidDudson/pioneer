import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import type { ClassOption } from '@pioneer/character/domain';
import { frontierMessages } from '@pioneer/frontier';
import { ContentId } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import en from '../../../i18n/en.json';
import { CharacterGenerator } from '../../data/character-generator';
import { ClassRoleOptions } from '../../data/class-role-options';
import { WeaponBaseOptions } from '../../data/weapon-bases';
import { present } from '../../testing/inventory-sheet-testing';
import { GenerateCharacterPage } from './generate-character-page.component';

const FIGHTER = { id: ContentId.parse('7d1c4a5e-0b6c-4c58-9d3f-1c2f6a8e9b01'), name: 'Fighter', roles: ['melee'] };
const WIZARD = { id: ContentId.parse('2b9e3f10-5a47-4d6e-8c21-7f4d0a3b5c02'), name: 'Wizard', roles: ['spellcaster'] };
const CLASSES = [FIGHTER, WIZARD] as unknown as readonly ClassOption[];

const generate = vi.fn<CharacterGenerator['generate']>();

const buttons = (root: HTMLElement): HTMLButtonElement[] => [...root.querySelectorAll('button')];
const named = (root: HTMLElement, text: string): HTMLButtonElement => {
  const found = buttons(root).find((button) => button.textContent.trim() === text);
  if (found === undefined) {
    throw new Error(`no ${text} button`);
  }
  return found;
};

describe(GenerateCharacterPage, () => {
  let root: HTMLElement;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    generate.mockReset();
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { ...frontierMessages, character: en } },
          preloadLangs: true,
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        // After the testing module, so ICU replaces its default transpiler.
        provideTranslocoMessageformat(),
        provideRouter([{ path: '', component: GenerateCharacterPage }]),
        provideTanStackQuery(new QueryClient()),
        { provide: CharacterGenerator, useValue: { generate } },
        {
          provide: ClassRoleOptions,
          useValue: {
            classes: (): readonly ClassOption[] => CLASSES,
            playing: (role: string): readonly ClassOption[] =>
              CLASSES.filter((each) => each.roles.includes(role as never)),
          },
        },
        { provide: WeaponBaseOptions, useValue: { bases: (): readonly [] => [] } },
      ],
    });
    harness = await RouterTestingHarness.create('/');
    root = present(harness.routeNativeElement);
    await harness.fixture.whenStable();
  });

  it('opens on the archetype step, with the later steps not rendered', () => {
    expect(root.textContent).toContain('What do you want to play?');
    expect(root.textContent).not.toContain('Pick a class that plays it');
  });

  it('offers the five archetypes', () => {
    const labels = buttons(root).map((button) => button.textContent.trim());
    expect(labels).toStrictEqual(expect.arrayContaining(['Spellcaster', 'Melee', 'Ranged', 'Tank', 'Healer']));
  });

  it('keeps Next off until an archetype is chosen', async () => {
    expect(named(root, 'Next').disabled).toBe(true);
    named(root, 'Melee').click();
    await harness.fixture.whenStable();
    expect(named(root, 'Next').disabled).toBe(false);
  });

  it('moves to the class step after an archetype, collapsing the archetype to its summary', async () => {
    named(root, 'Melee').click();
    await harness.fixture.whenStable();
    named(root, 'Next').click();
    await harness.fixture.whenStable();
    expect(root.textContent).toContain('Pick a class that plays it');
    expect(root.querySelector('[aria-label="Edit Archetype"]')).not.toBeNull();
  });

  it('sends the role, no class lock for any class, and the name on Finish', async () => {
    generate.mockRejectedValue(new Error('not under test'));
    named(root, 'Melee').click();
    await harness.fixture.whenStable();
    const advance = async (): Promise<void> => {
      named(root, 'Next').click();
      await harness.fixture.whenStable();
    };
    await advance();
    await advance();
    await advance();
    const name = present(root.querySelector('input'));
    name.value = 'Aldric';
    name.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    named(root, 'Finish').click();
    await harness.fixture.whenStable();
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ role: 'melee', locks: [], name: 'Aldric' }));
  });
});
