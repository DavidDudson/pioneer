import type { Routes } from '@angular/router';
import {
  CharacterGenerator,
  characterSheetRoute,
  CharacterStore,
  provideCharacterMessages,
} from '@pioneer/character/feature';
import { CRUMB } from '@pioneer/frontier';
import { rollMessages } from '@pioneer/play/ui';
import { diceMessages } from '@pioneer/rules/dice';
import { engineMessages } from '@pioneer/rules/engine';
import { formulaMessages } from '@pioneer/rules/formula';
import { predicateMessages } from '@pioneer/rules/predicate';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { loadWithMessages, provideMessageScope } from '@pioneer/shared/web';

/**
 * Lazy routes for the character bounded context: the list, the creation flows and, from `character/feature`, the
 * sheet. The sheet renders engine output, so rules text from `rules/sdk`, `rules/formula`, `rules/predicate` and
 * `rules/engine` loads as their own `rules`, `formula`, `predicate` and `engine` scopes; the roll card adds the
 * `roll` and `dice` ones.
 */
export const characterRoutes: Routes = [
  {
    path: '',
    data: { [CRUMB]: 'character.list.title' },
    providers: [
      CharacterStore,
      CharacterGenerator,
      provideCharacterMessages(),
      provideMessageScope('roll', { [Locale.English]: async () => rollMessages.roll }),
      provideMessageScope('dice', { [Locale.English]: async () => diceMessages.dice }),
      provideMessageScope('rules', { [Locale.English]: async () => rulesMessages.rules }),
      provideMessageScope('formula', { [Locale.English]: async () => formulaMessages.formula }),
      provideMessageScope('predicate', { [Locale.English]: async () => predicateMessages.predicate }),
      provideMessageScope('engine', { [Locale.English]: async () => engineMessages.engine }),
    ],
    children: [
      {
        path: '',
        loadComponent: loadWithMessages(async () => {
          const { CharacterListPage } = await import('./list/character-list-page/character-list-page.component');

          return CharacterListPage;
        }),
      },
      {
        path: 'new',
        data: { [CRUMB]: 'character.new.title' },
        children: [
          {
            path: '',
            loadComponent: loadWithMessages(async () => {
              const { CreationChoicePage } = await import('./new/creation-choice-page/creation-choice-page.component');

              return CreationChoicePage;
            }),
          },
          {
            path: 'import',
            data: { [CRUMB]: 'character.new.import.title' },
            children: [
              {
                path: '',
                loadComponent: loadWithMessages(async () => {
                  const { ImportHubPage } = await import('./import/import-hub-page/import-hub-page.component');

                  return ImportHubPage;
                }),
              },
              {
                path: 'pathbuilder',
                data: { [CRUMB]: 'character.import.title' },
                loadComponent: loadWithMessages(async () => {
                  const { PathbuilderImportPage } =
                    await import('./import/pathbuilder-import-page/pathbuilder-import-page.component');

                  return PathbuilderImportPage;
                }),
              },
              {
                path: 'backup',
                data: { [CRUMB]: 'character.import.pioneer.title' },
                loadComponent: loadWithMessages(async () => {
                  const { PioneerImportPage } =
                    await import('./import/pioneer-import-page/pioneer-import-page.component');

                  return PioneerImportPage;
                }),
              },
            ],
          },
          {
            path: 'generate',
            data: { [CRUMB]: 'character.generate.title' },
            loadComponent: loadWithMessages(async () => {
              const { GenerateCharacterPage } =
                await import('./generate/generate-character-page/generate-character-page.component');

              return GenerateCharacterPage;
            }),
          },
          {
            path: 'create',
            data: { [CRUMB]: 'character.create.title' },
            children: [
              {
                path: '',
                loadComponent: loadWithMessages(async () => {
                  const { CreateCharacterPage } =
                    await import('./new/create-character-page/create-character-page.component');

                  return CreateCharacterPage;
                }),
              },
              {
                path: ':id',
                data: { [CRUMB]: 'character.create.levelOne.title' },
                loadComponent: loadWithMessages(async () => {
                  const { CreateLevelOnePage } =
                    await import('./new/create-level-one-page/create-level-one-page.component');

                  return CreateLevelOnePage;
                }),
              },
            ],
          },
        ],
      },
      { path: 'import/pathbuilder', redirectTo: '/characters/new/import/pathbuilder' },
      { path: 'import/pioneer', redirectTo: '/characters/new/import/backup' },
      characterSheetRoute,
    ],
  },
];
