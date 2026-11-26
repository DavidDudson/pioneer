import type { Routes } from '@angular/router';

import { characterSheetRoute, provideSheetScopes } from '../sheet.routes';

/** The routes a sheet spec mounts under `characters`: the sheet with the providers it needs from its parent route. */
export const SHEET_TEST_ROUTES: Routes = [
  { path: '', providers: provideSheetScopes(), children: [characterSheetRoute] },
];
