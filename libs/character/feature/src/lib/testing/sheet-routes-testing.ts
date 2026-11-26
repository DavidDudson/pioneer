import type { Routes } from '@angular/router';
import { rollMessages } from '@pioneer/play/ui';
import { diceMessages } from '@pioneer/rules/dice';
import { engineMessages } from '@pioneer/rules/engine';
import { formulaMessages } from '@pioneer/rules/formula';
import { predicateMessages } from '@pioneer/rules/predicate';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { provideMessageScope } from '@pioneer/shared/web';

import { CharacterGenerator } from '../data/character-generator';
import { CharacterStore } from '../data/character-store';
import { characterSheetRoute, provideCharacterMessages } from '../sheet.routes';

/** The routes a sheet spec mounts under `characters`: the sheet with the providers `character/flows` gives it. */
export const SHEET_TEST_ROUTES: Routes = [
  {
    path: '',
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
    children: [characterSheetRoute],
  },
];
