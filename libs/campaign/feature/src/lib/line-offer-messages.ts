import type { Type } from '@angular/core';
import type { TranslocoService } from '@jsverse/transloco';
import { Locale } from '@pioneer/shared/kernel';
import { loadMessageScopes } from '@pioneer/shared/web';
import type { MessageScope } from '@pioneer/shared/web';

/** The campaign messages the offer controls read, which a sheet does not load with its own route. */
const OFFER_SCOPES: readonly MessageScope[] = [
  { scope: 'campaign', messages: { [Locale.English]: async () => import('../i18n/en.json') } },
];

/**
 * Loads the control that offers an inventory line, with the messages it reads. The sheet may not import the campaign
 * feature, so the app hands this to it as `INVENTORY_LINE_OFFER`.
 */
export async function loadLineOffer(i18n: TranslocoService): Promise<Type<unknown>> {
  await loadMessageScopes(i18n, OFFER_SCOPES);
  const { CampaignOfferItem } = await import('./home/campaign-offer-item/campaign-offer-item.component');
  return CampaignOfferItem;
}

/**
 * Loads the control that offers coins from a character's purse, with the messages it reads. The sheet may not import the
 * campaign feature, so the app hands this to it as `PURSE_OFFER`.
 */
export async function loadPurseOffer(i18n: TranslocoService): Promise<Type<unknown>> {
  await loadMessageScopes(i18n, OFFER_SCOPES);
  const { CampaignOfferCoins } = await import('./home/campaign-offer-coins/campaign-offer-coins.component');
  return CampaignOfferCoins;
}
