import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import contentMessages from '../../i18n/en.json';
import { ContentSidePanel } from './content-side-panel.component';
import { loadSidePanel } from './side-panel-messages';

describe(loadSidePanel, () => {
  it('returns the panel once its own, the entry browser and the rules messages are loaded', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => ({}) })] });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const i18n = TestBed.inject(TranslocoService);

    const panel = await loadSidePanel(i18n);

    expect(panel).toBe(ContentSidePanel);
    expect(i18n.translate('content.sidePanel.back')).toBe(contentMessages.sidePanel.back);
    // An unloaded scope would hand back the key itself.
    for (const key of ['contentBrowser.entry.missingTitle', 'rules.key.format']) {
      expect(i18n.translate(key)).not.toBe(key);
    }
  });
});
