import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app.component';
import { appConfig } from './app/app.config';

try {
  await bootstrapApplication(App, appConfig);
} catch (error: unknown) {
  reportError(error);
}
