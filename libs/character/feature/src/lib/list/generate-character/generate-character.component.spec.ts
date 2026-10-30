import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import en from '../../../i18n/en.json';
import { CharacterGenerator } from '../../data/character-generator';
import { GenerateCharacter } from './generate-character.component';

/** The character messages in French, with the one label the spec reads changed. */
const FRENCH = { ...en, list: { ...en.list, theme: { ...en.list.theme, weaponNone: 'Aucun choix' } } };

describe(GenerateCharacter, () => {
  it('reads the weapon select labels again when the language changes', async () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { ...frontierMessages, character: en }, fr: { ...frontierMessages, character: FRENCH } },
          preloadLangs: true,
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'en' },
        }),
      ],
      providers: [
        provideRouter([]),
        provideTanStackQuery(new QueryClient()),
        { provide: CharacterGenerator, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(GenerateCharacter);
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector('pio-option-picker button');
    expect(select?.textContent).toContain('No choice');

    TestBed.inject(TranslocoService).setActiveLang('fr');
    await fixture.whenStable();

    expect(select?.textContent).toContain('Aucun choix');
  });
});
