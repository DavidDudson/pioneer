import { computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { CampaignStore } from './data/campaign-store';

/** The open campaign's name for the breadcrumb trail: `undefined` while it loads, the page's own title if it fails. */
export function campaignCrumb(): Signal<string | undefined> {
  const store = inject(CampaignStore);
  const i18n = inject(TranslocoService);
  return computed(
    () => store.selected.data()?.name ?? (store.selected.isError() ? i18n.translate('campaign.home.title') : undefined),
  );
}
